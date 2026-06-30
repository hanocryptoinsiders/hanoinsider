"use server";

import { requireAdmin, getCurrentProfile } from "@/lib/auth";
import { getServiceSupabase, getServiceSupabaseSafe } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  fetchAdminCryptoPayments,
  approveCryptoPayment,
  rejectCryptoPayment,
  getSignedProofUrl,
} from "@/lib/crypto-payment-service";
import type { ManualCryptoPaymentRow } from "@/lib/crypto-payments";

export type SubscriptionRow = {
  id: string;
  user_id: string | null;
  provider: string;
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  plan_type: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
  is_premium: boolean;
  premium_source: string | null;
  record_source: "subscription" | "paid_customer" | "profile";
};

export type FetchSubscriptionsResult = {
  rows: SubscriptionRow[];
  error?: string;
};

export async function fetchAdminSubscriptions(): Promise<FetchSubscriptionsResult> {
  await requireAdmin();

  try {
    const service = getServiceSupabaseSafe();
  if (service.error || !service.supabase) {
    return {
      rows: [],
      error:
        "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing on the host. Add it in your deployment environment variables.",
    };
  }

  const supabase = service.supabase;

  const rows: SubscriptionRow[] = [];
  const seenEmails = new Set<string>();
  const seenSubIds = new Set<string>();

  const { data: subscriptions, error: subsError } = await supabase
    .from("subscriptions")
    .select(`
      id,
      user_id,
      provider,
      provider_subscription_id,
      provider_customer_id,
      plan_type,
      status,
      current_period_end,
      cancel_at_period_end,
      created_at,
      profiles!user_id (
        email,
        full_name,
        is_premium,
        premium_source
      )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (subsError) {
    console.error("[admin/subscriptions] subscriptions fetch error:", subsError.message);
    return { rows: [], error: subsError.message };
  }

  for (const s of subscriptions ?? []) {
    const rawProfile = s.profiles as Record<string, unknown> | Record<string, unknown>[] | null;
    const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
    const email = (profile?.email as string) ?? null;
    if (email) seenEmails.add(email.toLowerCase());
    if (s.provider_subscription_id) seenSubIds.add(s.provider_subscription_id);

    rows.push({
      id: s.id as string,
      user_id: s.user_id as string,
      provider: (s.provider as string) || "stripe",
      provider_subscription_id: s.provider_subscription_id as string | null,
      provider_customer_id: s.provider_customer_id as string | null,
      plan_type: s.plan_type as string | null,
      status: (s.status as string) || "unknown",
      current_period_end: s.current_period_end as string | null,
      cancel_at_period_end: (s.cancel_at_period_end as boolean) || false,
      created_at: s.created_at as string,
      user_email: email,
      user_name: (profile?.full_name as string) ?? null,
      is_premium: (profile?.is_premium as boolean) ?? false,
      premium_source: (profile?.premium_source as string) ?? null,
      record_source: "subscription",
    });
  }

  const { data: paidCustomers, error: paidError } = await supabase
    .from("paid_customers")
    .select(
      "id, email, first_name, last_name, selected_plan, stripe_customer_id, stripe_subscription_id, payment_status, subscription_status, subscription_current_period_end, paid_at, created_at, has_registered, user_id, payment_provider, manual_crypto_payment_id",
    )
    .order("paid_at", { ascending: false, nullsFirst: false })
    .limit(200);

  let paidRows = paidCustomers;
  let paidFetchError = paidError;

  // Production DBs that have not run migration 021 yet omit payment_provider.
  if (paidFetchError?.message?.includes("payment_provider")) {
    const fallback = await supabase
      .from("paid_customers")
      .select(
        "id, email, first_name, last_name, selected_plan, stripe_customer_id, stripe_subscription_id, payment_status, subscription_status, subscription_current_period_end, paid_at, created_at, has_registered, user_id",
      )
      .order("paid_at", { ascending: false, nullsFirst: false })
      .limit(200);
    paidRows = fallback.data;
    paidFetchError = fallback.error;
  }

  if (paidFetchError) {
    console.error("[admin/subscriptions] paid_customers fetch error:", paidFetchError.message);
  } else {
    for (const p of paidRows ?? []) {
      const paymentProvider =
        "payment_provider" in p && p.payment_provider
          ? (p.payment_provider as string)
          : p.stripe_customer_id
            ? "stripe"
            : "manual_crypto";

      const emailKey = p.email?.toLowerCase();
      if (emailKey && seenEmails.has(emailKey)) continue;
      if (p.stripe_subscription_id && seenSubIds.has(p.stripe_subscription_id)) continue;

      const status =
        p.payment_status === "paid"
          ? p.has_registered
            ? p.subscription_status || "active"
            : "paid"
          : p.payment_status || "pending";

      rows.push({
        id: p.id,
        user_id: p.user_id,
        provider: paymentProvider === "manual_crypto" ? "manual_crypto" : "stripe",
        provider_subscription_id: p.stripe_subscription_id,
        provider_customer_id: p.stripe_customer_id,
        plan_type: p.selected_plan,
        status,
        current_period_end: p.subscription_current_period_end,
        cancel_at_period_end: false,
        created_at: p.paid_at || p.created_at,
        user_email: p.email,
        user_name: [p.first_name, p.last_name].filter(Boolean).join(" ") || null,
        is_premium: p.payment_status === "paid" && status === "active",
        premium_source: paymentProvider === "manual_crypto" ? "manual" : "stripe",
        record_source: "paid_customer",
      });
      if (emailKey) seenEmails.add(emailKey);
    }
  }

  rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return { rows };
  } catch (error) {
    console.error("[admin/subscriptions] fetchAdminSubscriptions:", error);
    return {
      rows: [],
      error: error instanceof Error ? error.message : "Failed to load subscription data",
    };
  }
}

/**
 * Admin action: manually grant premium to a user.
 * Sets premium_source = 'manual' so Stripe webhooks never revoke it.
 */
export async function grantPremiumAction(targetUserId: string) {
  const admin = await getCurrentProfile();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      is_premium: true,
      role: "premium",
      subscription_status: "active",
      premium_source: "manual",
    })
    .eq("id", targetUserId);

  if (error) {
    console.error("[admin/subscriptions] grant premium error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/users");
  return { success: true };
}

/**
 * Admin action: grant or renew a crypto-paid membership with a fixed term.
 */
export async function grantCryptoMembershipAction(targetUserId: string, termDays = 30) {
  const admin = await getCurrentProfile();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("subscription_current_period_end")
    .eq("id", targetUserId)
    .maybeSingle();

  const now = Date.now();
  const currentEnd = existing?.subscription_current_period_end
    ? new Date(existing.subscription_current_period_end).getTime()
    : 0;
  const base = Math.max(now, currentEnd);
  const periodEnd = new Date(base + termDays * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({
      is_premium: true,
      role: "premium",
      subscription_status: "active",
      subscription_plan: "regular",
      premium_source: "manual",
      subscription_current_period_end: periodEnd,
      cancel_at_period_end: false,
    })
    .eq("id", targetUserId);

  if (error) {
    console.error("[admin/subscriptions] grant crypto membership error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/users");
  return { success: true, periodEnd };
}

/**
 * Admin action: manually revoke premium from a user.
 */
export async function revokePremiumAction(targetUserId: string) {
  const admin = await getCurrentProfile();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      is_premium: false,
      role: "free",
      subscription_status: "expired",
      premium_source: "manual",
    })
    .eq("id", targetUserId);

  if (error) {
    console.error("[admin/subscriptions] revoke premium error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/users");
  return { success: true };
}

export type CryptoPaymentAdminRow = ManualCryptoPaymentRow & {
  proof_screenshot_url: string | null;
};

export type FetchCryptoPaymentsResult = {
  payments: CryptoPaymentAdminRow[];
  error?: string;
};

export async function fetchAdminCryptoPaymentsAction(): Promise<FetchCryptoPaymentsResult> {
  await requireAdmin();

  try {
    const service = getServiceSupabaseSafe();
    if (service.error || !service.supabase) {
      return {
        payments: [],
        error:
          "Crypto payments unavailable: SUPABASE_SERVICE_ROLE_KEY is missing on the host.",
      };
    }

    const rows = await fetchAdminCryptoPayments();
    const payments = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        proof_screenshot_url: row.proof_screenshot_path
          ? await getSignedProofUrl(row.proof_screenshot_path)
          : null,
      })),
    );
    return { payments };
  } catch (error) {
    console.error("[admin/subscriptions] fetchAdminCryptoPaymentsAction:", error);
    return {
      payments: [],
      error: error instanceof Error ? error.message : "Failed to load crypto payments",
    };
  }
}

export async function approveCryptoPaymentAction(paymentId: string, adminNotes?: string | null) {
  const admin = await getCurrentProfile();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const result = await approveCryptoPayment(paymentId, admin.id, adminNotes);
  if (result.success) {
    revalidatePath("/admin/subscriptions");
  }
  return result;
}

export async function rejectCryptoPaymentAction(paymentId: string, adminNotes?: string | null) {
  const admin = await getCurrentProfile();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const result = await rejectCryptoPayment(paymentId, admin.id, adminNotes);
  if (result.success) {
    revalidatePath("/admin/subscriptions");
  }
  return result;
}
