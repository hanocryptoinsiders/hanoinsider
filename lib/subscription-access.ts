/** Shared subscription access checks (safe for client + server). */

export type SubscriptionProfile = {
  role?: string;
  is_premium?: boolean;
  subscription_status?: string;
  subscription_current_period_end?: string | null;
};

export function hasActiveSubscription(profile: SubscriptionProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  if (profile.is_premium !== true && profile.role !== "premium") return false;
  if (
    profile.subscription_status &&
    ["expired", "cancelled", "canceled", "past_due", "inactive"].includes(profile.subscription_status)
  ) {
    return false;
  }
  if (profile.subscription_current_period_end) {
    const periodEnd = new Date(profile.subscription_current_period_end).getTime();
    if (Number.isFinite(periodEnd) && periodEnd < Date.now()) return false;
  }
  return true;
}
