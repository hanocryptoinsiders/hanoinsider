import type { SupabaseClient } from "@supabase/supabase-js";

export const EARLY_BIRD_LIMIT = 20;
export const REGULAR_MONTHLY_PRICE = 79;
export const EARLY_BIRD_MONTHLY_PRICE = 49;

export type EarlyBirdAvailability = {
  limit: number;
  claimed: number;
  remaining: number;
  soldOut: boolean;
};

export async function getEarlyBirdAvailability(
  supabase: SupabaseClient,
): Promise<EarlyBirdAvailability> {
  const { count, error } = await supabase
    .from("paid_customers")
    .select("*", { count: "exact", head: true })
    .eq("selected_plan", "early_bird")
    .eq("payment_status", "paid");

  if (error) {
    console.error("[early-bird] availability count failed:", error.message);
  }

  const claimed = count ?? 0;
  const remaining = Math.max(0, EARLY_BIRD_LIMIT - claimed);

  return {
    limit: EARLY_BIRD_LIMIT,
    claimed,
    remaining,
    soldOut: remaining === 0,
  };
}

export function formatEarlyBirdSpotLabel(availability: EarlyBirdAvailability): string {
  if (availability.soldOut) {
    return "Founding rate sold out";
  }

  if (availability.remaining === 1) {
    return "1 founding spot left";
  }

  return `${availability.remaining} founding spots left`;
}
