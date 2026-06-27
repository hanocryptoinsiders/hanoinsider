"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
 *
 * Unlike grantPremiumAction (which is a no-expiry comp grant), this sets
 * `subscription_current_period_end`, so the daily cron will send the
 * 7/3/1-day + expiry-day reminders and auto-revoke access when the term ends.
 *
 * Renewing while still active extends from the current period end; renewing an
 * expired/free member starts a fresh term from today. Default term: 30 days.
 */
export async function grantCryptoMembershipAction(targetUserId: string, termDays = 30) {
  const admin = await getCurrentProfile();
  if (!admin || admin.role !== "admin") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const supabase = await createClient();

  // Extend from the later of (now, current period end) so renewals stack.
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
      premium_source: "crypto",
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
 * Sets premium_source = 'manual' for audit trail.
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
      subscription_status: "inactive",
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
