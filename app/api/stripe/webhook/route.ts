import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { sendWelcomeEmailIfNeeded } from "@/lib/email/send-welcome";
import { normalizeEmail } from "@/lib/payments";

export const runtime = "nodejs";

type SB = SupabaseClient<any, any, any>;

function getServiceClient(): SB {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function unixToIso(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function isActiveStripeStatus(status: string) {
  return status === "active" || status === "trialing";
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook signature";
    console.error("[stripe/webhook] Signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Persist the paid customer FIRST — this is the source of truth that
        // later gates registration eligibility and dashboard access.
        await recordPaidCustomer(supabase, session);
        if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
          const meta = session.metadata ?? {};
          const rawEmail = meta.email || session.customer_details?.email || session.customer_email || "";
          if (rawEmail) {
            await sendWelcomeEmailIfNeeded(supabase, {
              email: normalizeEmailLocal(rawEmail),
              firstName: meta.first_name || null,
              planId: meta.plan_id || meta.plan_type || null,
              checkoutSessionId: session.id,
            });
          }
        }
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          await syncStripeSubscription(supabase, subscription, event);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncStripeSubscription(supabase, event.data.object as Stripe.Subscription, event);
        break;
      }

      case "invoice.paid": {
        await handleAffiliateCommission(supabase, event.data.object as Stripe.Invoice, event);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe/webhook] Handler error:", error);
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function normalizeEmailLocal(email: string) {
  return normalizeEmail(email);
}

/**
 * Records (or refreshes) the paid_customers row after Stripe confirms payment.
 * Email is normalized before storage. has_registered is never reset here so a
 * later webhook replay cannot un-register an existing account.
 */
async function recordPaidCustomer(supabase: SB, session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const rawEmail = meta.email || session.customer_details?.email || session.customer_email || "";
  if (!rawEmail) {
    console.error("[stripe/webhook] checkout.session.completed missing email:", session.id);
    return;
  }
  const email = normalizeEmailLocal(rawEmail);

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  const isPaid = session.payment_status === "paid" || session.payment_status === "no_payment_required";

  const { data: existing } = await supabase
    .from("paid_customers")
    .select("id, has_registered")
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
  };

  if (existing) {
    await supabase.from("paid_customers").update(base).eq("id", existing.id);
  } else {
    await supabase.from("paid_customers").insert({ ...base, has_registered: false });
  }
}

async function syncStripeSubscription(supabase: SB, subscription: Stripe.Subscription, event: Stripe.Event) {
  const sub = subscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
    trial_start?: number | null;
    trial_end?: number | null;
  };
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
  const item = subscription.items.data[0];
  const status = subscription.status;
  const planType = subscription.metadata?.plan_type || inferPlanType(item?.price?.recurring?.interval);
  const periodStart = unixToIso(sub.current_period_start);
  const periodEnd = unixToIso(sub.current_period_end);
  const active = isActiveStripeStatus(status);

  const userId = await findUserIdForSubscription(supabase, subscription);

  // Always persist subscription snapshot on paid_customers (covers pre-registration payments).
  const customerEmail = await resolveStripeCustomerEmail(customerId);
  if (customerEmail) {
    await supabase
      .from("paid_customers")
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: status,
        subscription_current_period_end: periodEnd,
        payment_status: active ? "paid" : status,
      })
      .eq("email", customerEmail);
  } else {
    await supabase
      .from("paid_customers")
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: status,
        subscription_current_period_end: periodEnd,
      })
      .eq("stripe_customer_id", customerId);
  }

  if (!userId) {
    console.warn("[stripe/webhook] Subscription recorded on paid_customers; user not registered yet:", subscription.id);
    return;
  }

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      provider: "stripe",
      provider_customer_id: customerId,
      provider_subscription_id: subscription.id,
      provider_plan_id: item?.price?.product ? String(item.price.product) : null,
      provider_price_id: item?.price?.id ?? null,
      plan_type: planType,
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      trial_start: unixToIso(sub.trial_start),
      trial_end: unixToIso(sub.trial_end),
      raw_payload: event,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider_subscription_id" }
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("premium_source")
    .eq("id", userId)
    .single();

  if (profile?.premium_source && profile.premium_source !== "stripe") {
    return;
  }

  await supabase
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      is_premium: active,
      role: active ? "premium" : "free",
      subscription_status: active ? "active" : status,
      subscription_plan: planType,
      subscription_current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      premium_source: "stripe",
    })
    .eq("id", userId);

  await supabase
    .from("paid_customers")
    .update({
      payment_status: active ? "paid" : status,
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      subscription_current_period_end: periodEnd,
    })
    .eq("user_id", userId);
}

async function resolveStripeCustomerEmail(customerId: string): Promise<string | null> {
  try {
    const customer = await getStripe().customers.retrieve(customerId);
    if (customer.deleted) return null;
    const email = customer.email;
    return email ? normalizeEmailLocal(email) : null;
  } catch {
    return null;
  }
}

async function findUserIdForSubscription(supabase: SB, subscription: Stripe.Subscription) {
  if (subscription.metadata?.user_id) return subscription.metadata.user_id;

  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  const { data: profileByCustomer } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (profileByCustomer?.id) return profileByCustomer.id;

  const { data: paidByCustomer } = await supabase
    .from("paid_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (paidByCustomer?.user_id) return paidByCustomer.user_id;

  const email = await resolveStripeCustomerEmail(customerId);
  if (email) {
    const { data: paidByEmail } = await supabase
      .from("paid_customers")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    if (paidByEmail?.user_id) return paidByEmail.user_id;

    const { data: profileByEmail } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (profileByEmail?.id) return profileByEmail.id;
  }

  return null;
}

function inferPlanType(interval?: string | null) {
  if (interval === "year") return "yearly";
  if (interval === "month") return "monthly";
  return null;
}

async function handleAffiliateCommission(supabase: SB, invoice: Stripe.Invoice, event: Stripe.Event) {
  const inv = invoice as any;
  const subscriptionId =
    typeof inv.subscription === "string"
      ? inv.subscription
      : inv.subscription?.id;
  const paymentId =
    typeof inv.payment_intent === "string"
      ? inv.payment_intent
      : inv.payment_intent?.id || invoice.id;

  if (!subscriptionId || !paymentId || !inv.paid) return;

  const { data: subscriptionRow } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("provider_subscription_id", subscriptionId)
    .maybeSingle();

  const userId = subscriptionRow?.user_id;
  if (!userId) return;

  const { data: referral } = await supabase
    .from("referrals")
    .select("id, affiliate_id, status")
    .eq("referred_user_id", userId)
    .maybeSingle();

  if (!referral) return;

  const { data: existingCommission } = await supabase
    .from("affiliate_commissions")
    .select("id")
    .eq("provider_payment_id", paymentId)
    .maybeSingle();

  if (existingCommission) return;

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("commission_rate, status")
    .eq("id", referral.affiliate_id)
    .single();

  if (!affiliate || affiliate.status !== "active") return;

  if (referral.status === "signed_up") {
    await supabase
      .from("referrals")
      .update({
        status: "converted",
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", referral.id);
  }

  const paymentAmount = (invoice.amount_paid ?? 0) / 100;
  const commissionRate = affiliate.commission_rate ?? 0;
  const payableAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from("affiliate_commissions").insert({
    affiliate_id: referral.affiliate_id,
    referred_user_id: userId,
    referral_id: referral.id,
    provider: "stripe",
    provider_payment_id: paymentId,
    provider_subscription_id: subscriptionId,
    payment_amount: paymentAmount,
    payment_currency: invoice.currency?.toUpperCase() || "USD",
    commission_rate: commissionRate,
    commission_amount: paymentAmount * commissionRate,
    status: "pending",
    payable_at: payableAt,
    raw_payload: event,
  });
}
