import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { normalizeEmail, getPlanAmountUsd, isPlanId } from "@/lib/payments";
import { buildReferralPaidCustomerFields } from "@/lib/referrals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, any, any>;

function unixToIso(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

/**
 * Records (or refreshes) the paid_customers row after Stripe confirms payment.
 * Email is normalized before storage. has_registered is never reset here so a
 * later webhook replay cannot un-register an existing account.
 */
export async function recordPaidCustomerFromCheckoutSession(
  supabase: SB,
  session: Stripe.Checkout.Session,
) {
  const meta = session.metadata ?? {};
  const rawEmail = meta.email || session.customer_details?.email || session.customer_email || "";
  if (!rawEmail) {
    console.error("[stripe/paid-customer] checkout session missing email:", session.id);
    return null;
  }
  const email = normalizeEmail(rawEmail);

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  const isPaid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required" ||
    session.status === "complete";

  const planId = meta.plan_id || meta.plan_type || null;
  let amountPaidUsd: number | null = null;
  if (typeof session.amount_total === "number" && session.amount_total > 0) {
    amountPaidUsd = session.amount_total / 100;
  } else if (planId && isPlanId(planId)) {
    amountPaidUsd = getPlanAmountUsd(planId);
  } else if (meta.amount_paid_usd) {
    amountPaidUsd = parseFloat(meta.amount_paid_usd);
  }

  const referralFields = await buildReferralPaidCustomerFields(
    supabase,
    meta.referral_code && meta.referrer_user_id
      ? { referralCode: meta.referral_code, referrerUserId: meta.referrer_user_id }
      : null,
    email,
  );

  const { data: existing } = await supabase
    .from("paid_customers")
    .select("id, has_registered, user_id")
    .eq("email", email)
    .maybeSingle();

  const base = {
    first_name: meta.first_name || null,
    last_name: meta.last_name || null,
    email,
    selected_plan: meta.plan_id || meta.plan_type || null,
    stripe_customer_id: customerId,
    stripe_checkout_session_id: session.id,
    payment_status: isPaid ? "paid" : session.payment_status ?? "pending",
    paid_at: isPaid ? new Date().toISOString() : null,
    amount_paid_usd: amountPaidUsd,
    payment_provider: "stripe",
    ...referralFields,
  };

  if (existing) {
    const { error } = await supabase.from("paid_customers").update(base).eq("id", existing.id);
    if (error) {
      console.error("[stripe/paid-customer] update failed:", error.message, session.id);
      return null;
    }
    return {
      email,
      isPaid,
      hasRegistered: Boolean(existing.has_registered || existing.user_id),
    };
  }

  const { error } = await supabase.from("paid_customers").insert({ ...base, has_registered: false });
  if (error) {
    console.error("[stripe/paid-customer] insert failed:", error.message, session.id);
    return null;
  }
  return { email, isPaid, hasRegistered: false };
}

/** Updates paid_customers subscription snapshot before the user registers. */
export async function syncPaidCustomerSubscriptionSnapshot(
  supabase: SB,
  subscription: Stripe.Subscription,
  email: string,
) {
  const sub = subscription as Stripe.Subscription & {
    current_period_end?: number;
  };
  const periodEnd = unixToIso(sub.current_period_end);
  const active = subscription.status === "active" || subscription.status === "trialing";

  await supabase
    .from("paid_customers")
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_current_period_end: periodEnd,
      payment_status: active ? "paid" : subscription.status,
    })
    .eq("email", normalizeEmail(email));
}

export type ConfirmCheckoutResult =
  | {
      ok: true;
      email: string;
      paymentStatus: "paid" | "pending";
      hasRegistered: boolean;
    }
  | { ok: false; error: string; code: string };

/**
 * Retrieves a Stripe Checkout Session and writes paid_customers immediately.
 * Used on /register so buyers are not blocked waiting for the webhook.
 */
export async function confirmStripeCheckoutSession(
  supabase: SB,
  sessionId: string,
  expectedEmail?: string | null,
): Promise<ConfirmCheckoutResult> {
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return { ok: false, error: "Invalid checkout session.", code: "invalid_session" };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
  } catch (error) {
    console.error("[stripe/confirm-checkout] retrieve failed:", error);
    return { ok: false, error: "Could not verify checkout session.", code: "stripe_error" };
  }

  const recorded = await recordPaidCustomerFromCheckoutSession(supabase, session);
  if (!recorded) {
    return { ok: false, error: "Checkout session is missing payment details.", code: "missing_email" };
  }

  if (expectedEmail && normalizeEmail(expectedEmail) !== recorded.email) {
    return {
      ok: false,
      error: "This checkout session does not match the email on this page.",
      code: "email_mismatch",
    };
  }

  if (session.mode === "subscription" && session.subscription) {
    const subscription =
      typeof session.subscription === "string"
        ? await getStripe().subscriptions.retrieve(session.subscription)
        : session.subscription;
    await syncPaidCustomerSubscriptionSnapshot(supabase, subscription, recorded.email);
  }

  return {
    ok: true,
    email: recorded.email,
    paymentStatus: recorded.isPaid ? "paid" : "pending",
    hasRegistered: recorded.hasRegistered,
  };
}
