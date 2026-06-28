import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/site-url";
import { getStripe, getStripePriceId } from "@/lib/stripe";
import { PLANS, isPlanId, normalizeEmail, isValidEmail } from "@/lib/payments";
import { getEarlyBirdAvailability } from "@/lib/early-bird";
import { getServiceSupabase } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * Anonymous checkout-intent endpoint.
 *
 * Called from the pricing "Buy" modal BEFORE the user has an account.
 * Collects first name, last name and email, then creates a Stripe Checkout
 * Session with the email prefilled (and locked) as the customer email.
 *
 * The collected details are carried in the session metadata; the paid_customers
 * record is written server-side by the Stripe webhook ONLY after Stripe confirms
 * a successful payment — never trusted from the frontend.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const rawEmail = typeof body.email === "string" ? body.email : "";
    const email = normalizeEmail(rawEmail);
    const planId = body.planId;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
    }
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (!isPlanId(planId)) {
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    if (planId === "early_bird") {
      const availability = await getEarlyBirdAvailability(supabase);
      if (availability.soldOut) {
        return NextResponse.json(
          { error: "The founding rate is sold out. Please choose the regular plan." },
          { status: 409 },
        );
      }
    }

    const planConfig = PLANS[planId];
    const priceId = getStripePriceId(planConfig.plan, planConfig.offer);
    if (!priceId) {
      return NextResponse.json({ error: "Stripe price ID is not configured." }, { status: 500 });
    }

    const stripe = getStripe();
    const siteUrl = getSiteUrl();
    const fullName = `${firstName} ${lastName}`.trim();

    // Create (or reuse) a Stripe customer so the email is prefilled and locked
    // in Checkout and is available to the webhook.
    const customer = await stripe.customers.create({
      email,
      name: fullName,
      metadata: {
        first_name: firstName,
        last_name: lastName,
        plan_id: planId,
      },
    });

    const metadata: Record<string, string> = {
      first_name: firstName,
      last_name: lastName,
      email,
      plan_id: planId,
      plan_type: planConfig.plan,
      offer: planConfig.offer ?? "",
    };

    // Existing registered users renew → login. New payers → protected register.
    const { data: paidRecord } = await supabase
      .from("paid_customers")
      .select("has_registered, user_id")
      .eq("email", email)
      .maybeSingle();

    let hasExistingAccount = Boolean(paidRecord?.has_registered || paidRecord?.user_id);
    if (!hasExistingAccount) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      hasExistingAccount = Boolean(profileRow?.id);
    }

    const successBase = hasExistingAccount ? "/login" : "/register";
    const successQuery = hasExistingAccount
      ? `session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}&renewed=1`
      : `session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}${successBase}?${successQuery}`,
      cancel_url: `${siteUrl}/?checkout=cancelled#pricing`,
      allow_promotion_codes: true,
      metadata,
      subscription_data: { metadata },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[checkout/create-session]", error);
    const message = error instanceof Error ? error.message : "Failed to start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
