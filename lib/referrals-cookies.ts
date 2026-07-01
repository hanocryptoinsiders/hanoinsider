import { cookies } from "next/headers";
import { getServiceSupabase } from "@/lib/supabase/service";
import {
  REFERRAL_COOKIE,
  validateReferralCode,
  type ValidatedReferral,
} from "@/lib/referrals";

/** Reads and re-validates the referral cookie server-side (never trust client input). */
export async function getValidatedReferralFromCookies(
  payerEmail?: string | null,
): Promise<ValidatedReferral | null> {
  const cookieStore = await cookies();
  const referralCode = cookieStore.get(REFERRAL_COOKIE)?.value;
  if (!referralCode) return null;

  const supabase = getServiceSupabase();
  return validateReferralCode(supabase, referralCode, { payerEmail });
}
