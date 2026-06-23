"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateUserAction(
  targetUserId: string,
  updates: {
    role: "free" | "premium" | "admin";
    is_premium: boolean;
    subscription_status: "active" | "inactive" | "cancelled" | "expired";
    status: "active" | "suspended" | "banned";
  },
  confirmSelfDemotion?: boolean
) {
  // 1. Authenticate and check admin role on server side
  const currentAdmin = await getCurrentProfile();
  if (!currentAdmin || currentAdmin.role !== "admin") {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  // 2. Prevent self-demotion without explicit confirmation
  if (targetUserId === currentAdmin.id) {
    if (updates.role !== "admin" && !confirmSelfDemotion) {
      return {
        success: false,
        requiresConfirmation: true,
        error: "Warning: You are attempting to remove your own admin role. Please check 'Confirm self-demotion' to proceed.",
      };
    }
  }

  // 3. Perform update in public.profiles using supabase client
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      role: updates.role,
      is_premium: updates.is_premium,
      subscription_status: updates.subscription_status,
      status: updates.status,
      premium_source: "manual",
    })
    .eq("id", targetUserId);

  if (error) {
    console.error("Error updating user profile:", error);
    return { success: false, error: error.message || "Failed to update profile." };
  }

  // 4. Trigger Next.js revalidation so layout & page fetch fresh data
  revalidatePath("/admin/users");
  revalidatePath("/admin");

  return { success: true };
}
