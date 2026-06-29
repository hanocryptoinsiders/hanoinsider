import type { SupabaseClient } from "@supabase/supabase-js";
import { hasActiveSubscription } from "@/lib/subscription-access";

export type CheckoutEligibilityStatus =
  | "can_checkout"
  | "active_subscriber"
  | "pending_registration";

export type CheckoutEligibility = {
  status: CheckoutEligibilityStatus;
};

export async function getCheckoutEligibility(
  supabase: SupabaseClient,
  email: string
): Promise<CheckoutEligibility> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_premium, subscription_status, subscription_current_period_end")
    .eq("email", email)
    .maybeSingle();

  if (profile && hasActiveSubscription(profile)) {
    return { status: "active_subscriber" };
  }

  const { data: paid } = await supabase
    .from("paid_customers")
    .select("payment_status, has_registered, user_id")
    .eq("email", email)
    .maybeSingle();

  if (
    paid?.payment_status === "paid" &&
    !paid.has_registered &&
    !paid.user_id
  ) {
    return { status: "pending_registration" };
  }

  return { status: "can_checkout" };
}

export function checkoutEligibilityMessage(status: CheckoutEligibilityStatus): string {
  switch (status) {
    case "active_subscriber":
      return "This email already has an active membership. Please log in to access your dashboard.";
    case "pending_registration":
      return "You've already paid with this email. Create your account instead of paying again.";
    default:
      return "";
  }
}
