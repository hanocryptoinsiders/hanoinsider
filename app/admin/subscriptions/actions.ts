"use server";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { approveCryptoPayment, rejectCryptoPayment } from "@/lib/crypto-payment-service";

export type {
  SubscriptionRow,
  CryptoPaymentAdminRow,
} from "@/lib/admin/subscription-data";

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
