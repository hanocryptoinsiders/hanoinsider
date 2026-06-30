import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabaseSafe } from "@/lib/supabase/service";
import type { ManualCryptoPaymentRow } from "@/lib/crypto-payments";

const PROOF_BUCKET = "crypto-payment-proofs";

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

export type CryptoPaymentAdminRow = ManualCryptoPaymentRow & {
  proof_screenshot_url: string | null;
};

const PAID_CUSTOMERS_SELECT_FULL =
  "id, email, first_name, last_name, selected_plan, stripe_customer_id, stripe_subscription_id, payment_status, subscription_status, subscription_current_period_end, paid_at, created_at, has_registered, user_id, payment_provider, manual_crypto_payment_id";

const PAID_CUSTOMERS_SELECT_LEGACY =
  "id, email, first_name, last_name, selected_plan, stripe_customer_id, stripe_subscription_id, payment_status, subscription_status, subscription_current_period_end, paid_at, created_at, has_registered, user_id";

type PaidCustomerRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  selected_plan: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  payment_status: string;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  paid_at: string | null;
  created_at: string;
  has_registered: boolean;
  user_id: string | null;
  payment_provider?: string | null;
  manual_crypto_payment_id?: string | null;
};

async function queryPaidCustomers(
  supabase: SupabaseClient,
): Promise<{ rows: PaidCustomerRow[]; error?: string }> {
  const primary = await supabase
    .from("paid_customers")
    .select(PAID_CUSTOMERS_SELECT_FULL)
    .order("paid_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (!primary.error) {
    return { rows: (primary.data ?? []) as PaidCustomerRow[] };
  }

  if (
    primary.error.message.includes("payment_provider") ||
    primary.error.message.includes("manual_crypto_payment_id")
  ) {
    const fallback = await supabase
      .from("paid_customers")
      .select(PAID_CUSTOMERS_SELECT_LEGACY)
      .order("paid_at", { ascending: false, nullsFirst: false })
      .limit(200);

    if (fallback.error) {
      return { rows: [], error: fallback.error.message };
    }
    return { rows: (fallback.data ?? []) as PaidCustomerRow[] };
  }

  return { rows: [], error: primary.error.message };
}

function appendPaidCustomerRows(
  rows: SubscriptionRow[],
  paidRows: PaidCustomerRow[],
  seenEmails: Set<string>,
  seenSubIds: Set<string>,
) {
  for (const p of paidRows) {
    const paymentProvider =
      p.payment_provider ??
      (p.manual_crypto_payment_id ? "manual_crypto" : p.stripe_customer_id ? "stripe" : "manual_crypto");

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

export async function loadAdminSubscriptionsData(): Promise<{
  rows: SubscriptionRow[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const rows: SubscriptionRow[] = [];
    const seenEmails = new Set<string>();
    const seenSubIds = new Set<string>();

    const { data: subscriptions, error: subsError } = await supabase
      .from("subscriptions")
      .select(
        `
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
      `,
      )
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

    let paid = await queryPaidCustomers(supabase);

    if (
      paid.error &&
      (paid.error.toLowerCase().includes("permission") ||
        paid.error.toLowerCase().includes("policy") ||
        paid.error.includes("42501"))
    ) {
      const service = getServiceSupabaseSafe();
      if (service.supabase) {
        const servicePaid = await queryPaidCustomers(service.supabase);
        paid = servicePaid;
      } else {
        return {
          rows,
          error:
            "Could not read paid customers. Add SUPABASE_SERVICE_ROLE_KEY on production or apply migration 022_paid_customers_admin_read.sql.",
        };
      }
    } else if (paid.error) {
      console.error("[admin/subscriptions] paid_customers fetch error:", paid.error);
    }

    if (!paid.error) {
      appendPaidCustomerRows(rows, paid.rows, seenEmails, seenSubIds);
    }

    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { rows, error: paid.error && rows.length === 0 ? paid.error : undefined };
  } catch (error) {
    console.error("[admin/subscriptions] loadAdminSubscriptionsData:", error);
    return {
      rows: [],
      error: error instanceof Error ? error.message : "Failed to load subscription data",
    };
  }
}

async function signedProofUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function loadAdminCryptoPaymentsData(): Promise<{
  payments: CryptoPaymentAdminRow[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("manual_crypto_payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      const missingTable =
        error.message.includes("manual_crypto_payments") ||
        error.message.includes("does not exist") ||
        error.code === "42P01";

      if (missingTable) {
        return {
          payments: [],
          error: "Crypto payments table not found. Apply migration 021_manual_crypto_payments.sql on production.",
        };
      }

      const service = getServiceSupabaseSafe();
      if (service.supabase) {
        const retry = await service.supabase
          .from("manual_crypto_payments")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500);
        if (retry.error) {
          return { payments: [], error: retry.error.message };
        }
        const payments = await Promise.all(
          ((retry.data ?? []) as ManualCryptoPaymentRow[]).map(async (row) => ({
            ...row,
            proof_screenshot_url: row.proof_screenshot_path
              ? await signedProofUrl(supabase, row.proof_screenshot_path)
              : null,
          })),
        );
        return { payments };
      }

      return { payments: [], error: error.message };
    }

    const payments = await Promise.all(
      ((data ?? []) as ManualCryptoPaymentRow[]).map(async (row) => ({
        ...row,
        proof_screenshot_url: row.proof_screenshot_path
          ? await signedProofUrl(supabase, row.proof_screenshot_path)
          : null,
      })),
    );

    return { payments };
  } catch (error) {
    console.error("[admin/subscriptions] loadAdminCryptoPaymentsData:", error);
    return {
      payments: [],
      error: error instanceof Error ? error.message : "Failed to load crypto payments",
    };
  }
}
