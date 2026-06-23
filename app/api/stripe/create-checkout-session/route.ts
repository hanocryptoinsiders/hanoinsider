import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/site-url";
import { getStripe, getStripePriceId } from "@/lib/stripe";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env vars");
  return createServiceClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const plan = body.plan === "yearly" || body.plan === "quarterly" ? body.plan : "monthly";
    const offer = typeof body.offer === "string" ? body.offer : undefined;
    const priceId = getStripePriceId(plan, offer);

    if (!priceId) {
      return NextResponse.json({ error: "Stripe price ID is not configured" }, { status: 500 });
    }

    const serviceClient = getServiceSupabase();
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("stripe_customer_id, email, full_name")
      .eq("id", user.id)
      .single();

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email || undefined,
        name: profile?.full_name || user.user_metadata?.full_name || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await serviceClient
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const siteUrl = getSiteUrl();

    // Check if the user has been referred by a friend to apply 10% off
    const { data: referral } = await serviceClient
      .from("referrals")
      .select("id")
      .eq("referred_user_id", user.id)
      .eq("status", "signed_up")
      .maybeSingle();

    const couponId = process.env.STRIPE_REFERRAL_10_OFF_COUPON_ID;

    const sessionParams: any = {
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?checkout=cancelled`,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      metadata: {
        user_id: user.id,
        plan_type: plan,
        offer: offer ?? "",
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_type: plan,
          offer: offer ?? "",
        },
      },
    };

    if (referral && couponId) {
      sessionParams.discounts = [{ coupon: couponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[stripe/create-checkout-session]", error);
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
