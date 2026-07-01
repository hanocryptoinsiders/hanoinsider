import { getServiceSupabase } from "@/lib/supabase/service";
import { normalizeEmail } from "@/lib/payments";

/** Lightweight pending-crypto check — kept out of crypto-payment-service so auth routes do not pull email/crypto bundles at import time. */
export async function hasPendingCryptoPayment(email: string): Promise<boolean> {
  try {
    const supabase = getServiceSupabase();
    const normalized = normalizeEmail(email);
    const { data } = await supabase
      .from("manual_crypto_payments")
      .select("id")
      .eq("email", normalized)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

export type RegistrationEligibilityStatus =
  | "eligible"
  | "not_paid"
  | "pending_crypto_review"
  | "already_registered";

export async function getRegistrationEligibilityStatus(
  email: string,
): Promise<RegistrationEligibilityStatus> {
  const supabase = getServiceSupabase();
  const normalized = normalizeEmail(email);

  const { data: paid } = await supabase
    .from("paid_customers")
    .select("payment_status, has_registered, user_id")
    .eq("email", normalized)
    .maybeSingle();

  if (!paid || paid.payment_status !== "paid") {
    if (await hasPendingCryptoPayment(normalized)) {
      return "pending_crypto_review";
    }
    return "not_paid";
  }

  if (paid.has_registered || paid.user_id) {
    return "already_registered";
  }

  return "eligible";
}
