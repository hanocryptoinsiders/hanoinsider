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
