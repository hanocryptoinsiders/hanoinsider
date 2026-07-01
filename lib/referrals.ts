/**
 * lib/referrals.ts
 *
 * Member referral program — pay-first flow.
 * Uses existing Supabase tables: affiliates (codes), referral_rewards, referral_wallets.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlanAmountUsd, isPlanId, PLANS, type PlanId } from "@/lib/payments";

export const REFERRER_REWARD_USD = 15;
export const REFERRED_REWARD_PERCENT = 0.2;
export const REWARD_CURRENCY = "USDC";
export const REWARD_NETWORK = "Base";

export const REFERRAL_COOKIE = "hano_ref";
export const VISITOR_COOKIE = "hano_visitor_id";

export type MemberReferral = {
  id: string;
  user_id: string;
  referral_code: string;
  status: "active" | "disabled";
};

export type ValidatedReferral = {
  referralCode: string;
  referrerUserId: string;
  affiliateId: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, any, any>;

export function normalizeReferralCode(code: string): string {
  return code.trim().toLowerCase();
}

export function generateReferralCode(userId: string): string {
  return `hano-${userId.slice(0, 8)}`.toLowerCase();
}

export function getReferralLink(siteUrl: string, referralCode: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/pricing?ref=${encodeURIComponent(referralCode)}`;
}

export function calculateReferredRewardAmount(packageAmountPaid: number): number {
  return Math.round(packageAmountPaid * REFERRED_REWARD_PERCENT * 100) / 100;
}

export function resolvePackageAmountUsd(
  planId: string | null | undefined,
  amountPaidUsd?: number | null,
): number {
  if (typeof amountPaidUsd === "number" && amountPaidUsd > 0) {
    return amountPaidUsd;
  }
  if (planId && isPlanId(planId)) {
    return getPlanAmountUsd(planId);
  }
  return 0;
}

/** Validates referral code via member affiliates row (commission_rate ignored). */
export async function validateReferralCode(
  supabase: SB,
  referralCode: string,
  options?: { excludeUserId?: string | null; payerEmail?: string | null },
): Promise<ValidatedReferral | null> {
  const code = normalizeReferralCode(referralCode);
  if (!code) return null;

  const { data: row, error } = await supabase
    .from("affiliates")
    .select("id, user_id, referral_code, status")
    .eq("referral_code", code)
    .maybeSingle();

  if (error || !row || row.status !== "active" || !row.user_id) {
    return null;
  }

  if (options?.excludeUserId && row.user_id === options.excludeUserId) {
    return null;
  }

  if (options?.payerEmail) {
    const { data: referrerProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", row.user_id)
      .maybeSingle();
    if (
      referrerProfile?.email &&
      referrerProfile.email.toLowerCase() === options.payerEmail.toLowerCase()
    ) {
      return null;
    }
  }

  return {
    referralCode: row.referral_code,
    referrerUserId: row.user_id,
    affiliateId: row.id,
  };
}

/** Ensures member has a referral code row in affiliates (commission_rate = 0). */
export async function ensureMemberReferral(
  supabase: SB,
  userId: string,
): Promise<MemberReferral | null> {
  const { data: existing } = await supabase
    .from("affiliates")
    .select("id, user_id, referral_code, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.user_id) {
    return existing as MemberReferral;
  }

  const referralCode = generateReferralCode(userId);
  const { data: created, error } = await supabase
    .from("affiliates")
    .insert({
      user_id: userId,
      referral_code: referralCode,
      status: "active",
      commission_rate: 0,
    })
    .select("id, user_id, referral_code, status")
    .single();

  if (error || !created) {
    console.error("[referrals] ensureMemberReferral failed:", error?.message);
    return null;
  }

  return created as MemberReferral;
}

export async function getReferralWallet(
  supabase: SB,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("referral_wallets")
    .select("wallet_address")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.wallet_address ?? null;
}

export type AttachReferralInput = {
  referralCode: string;
  referrerUserId: string;
};

export async function buildReferralPaidCustomerFields(
  supabase: SB,
  referral: AttachReferralInput | null,
  payerEmail?: string | null,
): Promise<{
  referral_code: string | null;
  referrer_user_id: string | null;
}> {
  if (!referral) {
    return { referral_code: null, referrer_user_id: null };
  }

  const validated = await validateReferralCode(supabase, referral.referralCode, {
    payerEmail,
  });

  if (!validated || validated.referrerUserId !== referral.referrerUserId) {
    return { referral_code: null, referrer_user_id: null };
  }

  return {
    referral_code: validated.referralCode,
    referrer_user_id: validated.referrerUserId,
  };
}

type PaidCustomerReferralRow = {
  id: string;
  email: string;
  selected_plan: string | null;
  amount_paid_usd: number | null;
  referral_code: string | null;
  referrer_user_id: string | null;
  payment_status: string;
  payment_provider?: string | null;
  stripe_checkout_session_id?: string | null;
  crypto_payment_intent_id?: string | null;
};

/**
 * Creates two pending referral_rewards rows after registration.
 * Idempotent via unique (paid_customer_id, reward_type).
 */
export async function createReferralRewardsAfterRegistration(
  supabase: SB,
  userId: string,
  paid: PaidCustomerReferralRow,
): Promise<{ created: boolean }> {
  if (!paid.referrer_user_id || !paid.referral_code || paid.payment_status !== "paid") {
    return { created: false };
  }

  const validated = await validateReferralCode(supabase, paid.referral_code);
  if (!validated || validated.referrerUserId !== paid.referrer_user_id) {
    return { created: false };
  }

  if (validated.referrerUserId === userId) {
    return { created: false };
  }

  const packageAmount = resolvePackageAmountUsd(paid.selected_plan, paid.amount_paid_usd);
  if (packageAmount <= 0) {
    console.warn("[referrals] Skipping rewards — could not resolve package amount for", paid.email);
    return { created: false };
  }

  const { data: existingReward } = await supabase
    .from("referral_rewards")
    .select("id")
    .eq("paid_customer_id", paid.id)
    .limit(1)
    .maybeSingle();

  if (existingReward) {
    return { created: false };
  }

  const referredRewardAmount = calculateReferredRewardAmount(packageAmount);
  const planId = paid.selected_plan && isPlanId(paid.selected_plan) ? paid.selected_plan : null;
  const planName = planId ? PLANS[planId as PlanId].name : paid.selected_plan;

  const referrerWallet = await getReferralWallet(supabase, paid.referrer_user_id);
  const referredWallet = await getReferralWallet(supabase, userId);
  const now = new Date().toISOString();

  const rewards = [
    {
      referrer_user_id: paid.referrer_user_id,
      referred_user_id: userId,
      referred_email: paid.email,
      paid_customer_id: paid.id,
      reward_type: "referrer_fixed",
      reward_amount: REFERRER_REWARD_USD,
      reward_currency: REWARD_CURRENCY,
      reward_network: REWARD_NETWORK,
      package_id: planId,
      package_name: planName,
      package_amount_paid: packageAmount,
      referral_code: paid.referral_code,
      wallet_address: referrerWallet,
      status: "pending",
      eligible_at: now,
    },
    {
      referrer_user_id: paid.referrer_user_id,
      referred_user_id: userId,
      referred_email: paid.email,
      paid_customer_id: paid.id,
      reward_type: "referred_cashback",
      reward_amount: referredRewardAmount,
      reward_currency: REWARD_CURRENCY,
      reward_network: REWARD_NETWORK,
      package_id: planId,
      package_name: planName,
      package_amount_paid: packageAmount,
      referral_code: paid.referral_code,
      wallet_address: referredWallet,
      status: "pending",
      eligible_at: now,
    },
  ];

  const { error: rewardsError } = await supabase.from("referral_rewards").insert(rewards);

  if (rewardsError) {
    console.error("[referrals] rewards insert failed:", rewardsError.message);
    return { created: false };
  }

  return { created: true };
}
