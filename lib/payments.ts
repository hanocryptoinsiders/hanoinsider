/**
 * lib/payments.ts
 *
 * Single source of truth for the purchasable plans and shared payment helpers.
 * Used by the pricing modal, the checkout-intent API, and the registration flow.
 */

export type PlanId = "regular" | "early_bird";

export type PlanConfig = {
  id: PlanId;
  name: string;
  priceLabel: string;
  /** Maps to the Stripe billing interval used by getStripePriceId(). */
  plan: "monthly" | "yearly" | "quarterly";
  /** Optional Stripe offer (e.g. early bird price). */
  offer?: string;
};

export const PLANS: Record<PlanId, PlanConfig> = {
  regular: {
    id: "regular",
    name: "Regular Plan",
    priceLabel: "$79 / month",
    plan: "monthly",
  },
  early_bird: {
    id: "early_bird",
    name: "Early Bird Founding",
    priceLabel: "$49 / month for life",
    plan: "monthly",
    offer: "early_bird",
  },
};

/** USD amounts used for manual crypto payments (server-controlled). */
export const PLAN_AMOUNTS_USD: Record<PlanId, number> = {
  regular: 79,
  early_bird: 49,
};

export function getPlanAmountUsd(planId: PlanId): number {
  return PLAN_AMOUNTS_USD[planId];
}

export function isPlanId(value: unknown): value is PlanId {
  return value === "regular" || value === "early_bird";
}

/**
 * Normalizes an email for storage and comparison: trims surrounding whitespace
 * and lowercases. Use everywhere an email is persisted or compared.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Maps a paid plan to the role/access level granted on registration.
 * Every paid plan currently grants the same premium access level; centralized
 * here so the mapping can evolve in one place.
 */
export function planToRole(planId?: string | null): "premium" {
  // All current plans grant premium. `planId` is accepted for future tiers.
  return planId ? "premium" : "premium";
}
