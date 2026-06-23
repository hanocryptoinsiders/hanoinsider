import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  if (!stripe) {
    stripe = new Stripe(secretKey);
  }

  return stripe;
}

export function getStripePriceId(plan: "monthly" | "yearly" | "quarterly", offer?: string) {
  if (offer === "early_bird") {
    return process.env.STRIPE_EARLY_BIRD_PRICE_ID || process.env.STRIPE_REGULAR_MONTHLY_PRICE_ID;
  }

  if (plan === "monthly") return process.env.STRIPE_REGULAR_MONTHLY_PRICE_ID;
  if (plan === "yearly") return process.env.STRIPE_YEARLY_PRICE_ID;
  if (plan === "quarterly") return process.env.STRIPE_QUARTERLY_PRICE_ID;

  return process.env.STRIPE_REGULAR_MONTHLY_PRICE_ID;
}
