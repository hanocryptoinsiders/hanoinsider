import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { normalizeEmail, isValidEmail, planToRole } from "@/lib/payments";
import { hasPendingCryptoPayment } from "@/lib/registration-eligibility";
import { createReferralRewardsAfterRegistration } from "@/lib/referrals";
import { confirmStripeCheckoutSession } from "@/lib/stripe/paid-customer";

export const runtime = "nodejs";

function isDev() {
  return process.env.NODE_ENV === "development";
}

/**
 * Server-side registration for paid customers.
 *
 * Security model (all checks happen here, server-side, with the service role):
 *   1. The email MUST have a paid_customers record with payment_status = 'paid'.
 *   2. That record must NOT already be registered (one account per paid email).
 *   3. The Supabase auth user is created with email_confirm = true so the
 *      customer can enter the dashboard immediately after registering.
 *   4. The profile is upgraded to the paid role/plan and linked to the record.
 *
 * The frontend is never trusted to grant access — premium is set here only after
 * the paid record is verified.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
    const password = typeof body.password === "string" ? body.password : "";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address.", code: "invalid_email" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters.", code: "weak_password" }, { status: 400 });
    }

    let supabase;
    try {
      supabase = getServiceSupabase();
    } catch (configError) {
      console.error("[auth/register] missing service configuration:", configError);
      return NextResponse.json(
        {
          error: "Registration is temporarily unavailable. Please contact support.",
          code: "server_config",
          ...(isDev() && {
            detail: configError instanceof Error ? configError.message : "Missing Supabase service role env vars",
          }),
        },
        { status: 500 },
      );
    }

    // Stripe redirect can beat the webhook — confirm the session before eligibility checks.
    if (sessionId) {
      const confirmed = await confirmStripeCheckoutSession(supabase, sessionId, email);
      if (!confirmed.ok && confirmed.code === "email_mismatch") {
        return NextResponse.json(
          { error: "This checkout session does not match your email.", code: "session_email_mismatch" },
          { status: 403 },
        );
      }
    }

    // 1. Verify the email has a confirmed paid record.
    const { data: paid, error: paidError } = await supabase
      .from("paid_customers")
      .select(
        "id, email, first_name, last_name, selected_plan, stripe_customer_id, payment_status, has_registered, user_id, payment_provider, referral_code, referrer_user_id, amount_paid_usd, stripe_checkout_session_id, crypto_payment_intent_id",
      )
      .eq("email", email)
      .maybeSingle();

    if (paidError) {
      console.error("[auth/register] paid lookup error:", paidError);
      return NextResponse.json(
        {
          error: "Something went wrong. Please try again.",
          code: "paid_lookup_failed",
          ...(isDev() && { detail: paidError.message }),
        },
        { status: 500 },
      );
    }

    if (!paid || paid.payment_status !== "paid") {
      if (await hasPendingCryptoPayment(email)) {
        return NextResponse.json(
          {
            error: "Your payment has not been verified yet. Please wait for admin approval or contact support.",
            code: "pending_crypto_review",
          },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { error: "Please use the same email address you used during payment.", code: "not_paid" },
        { status: 403 },
      );
    }

    // 2. One account per paid email.
    if (paid.has_registered || paid.user_id) {
      return NextResponse.json(
        { error: "This paid email already has an account. Please log in instead.", code: "already_registered" },
        { status: 409 }
      );
    }

    const fullName = [paid.first_name, paid.last_name].filter(Boolean).join(" ").trim() || null;

    // 3. Create the auth user (email pre-confirmed → immediate dashboard access).
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !created?.user) {
      const msg = createError?.message?.toLowerCase() ?? "";
      if (msg.includes("already") && (msg.includes("registered") || msg.includes("exists"))) {
        // Keep the paid record consistent if an auth user somehow already exists.
        await supabase.from("paid_customers").update({ has_registered: true }).eq("id", paid.id);
        return NextResponse.json(
          { error: "This paid email already has an account. Please log in instead.", code: "already_registered" },
          { status: 409 }
        );
      }
      console.error("[auth/register] createUser error:", createError);
      return NextResponse.json({ error: createError?.message || "Failed to create account." }, { status: 500 });
    }

    const userId = created.user.id;

    // 4. Upgrade the auto-created profile to the paid plan (skip if first user is admin).
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const role = existingProfile?.role === "admin" ? "admin" : planToRole(paid.selected_plan);
    const premiumSource =
      paid.payment_provider === "manual_crypto" || !paid.stripe_customer_id ? "manual" : "stripe";

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        email,
        role,
        is_premium: true,
        subscription_status: "active",
        subscription_plan: paid.selected_plan,
        stripe_customer_id: paid.stripe_customer_id,
        premium_source: premiumSource,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("[auth/register] profile update error:", profileError);
      // Account exists but profile upgrade failed — surface a retryable error.
      return NextResponse.json({ error: "Account created but access setup failed. Contact support." }, { status: 500 });
    }

    // 5. Link the paid record to the new user.
    await supabase
      .from("paid_customers")
      .update({ has_registered: true, user_id: userId })
      .eq("id", paid.id);

    // 5b. Create referral rewards if this payment came through a referral link.
    try {
      await createReferralRewardsAfterRegistration(supabase, userId, paid);
    } catch (referralError) {
      console.error("[auth/register] referral rewards error:", referralError);
    }

    // 6. Link Stripe subscription snapshot if migration 012 columns exist (optional).
    const { data: paidExtras, error: extrasError } = await supabase
      .from("paid_customers")
      .select("stripe_subscription_id, subscription_status, subscription_current_period_end")
      .eq("id", paid.id)
      .maybeSingle();

    if (!extrasError && paidExtras?.stripe_subscription_id) {
      await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          provider: "stripe",
          provider_customer_id: paid.stripe_customer_id,
          provider_subscription_id: paidExtras.stripe_subscription_id,
          plan_type: paid.selected_plan === "early_bird" ? "early_bird" : "monthly",
          status: paidExtras.subscription_status || "active",
          current_period_end: paidExtras.subscription_current_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider_subscription_id" },
      );
    }

    // 7. Establish a browser session server-side so the client does not need a second sign-in hop.
    let sessionEstablished = false;
    try {
      const authClient = await createClient();
      const { error: signInError } = await authClient.auth.signInWithPassword({ email, password });
      if (signInError) {
        console.error("[auth/register] post-create sign-in error:", signInError);
      } else {
        sessionEstablished = true;
      }
    } catch (signInError) {
      console.error("[auth/register] post-create sign-in exception:", signInError);
    }

    return NextResponse.json({ success: true, sessionEstablished });
  } catch (error) {
    console.error("[auth/register]", error);
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json(
      {
        error: isDev() ? message : "Something went wrong. Please try again.",
        code: "server_error",
        ...(isDev() && { detail: message }),
      },
      { status: 500 },
    );
  }
}
