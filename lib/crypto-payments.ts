/**
 * Server-side configuration for manual crypto payments.
 * Wallet addresses are read from environment variables — never expose private keys.
 */

import {
  PLANS,
  getPlanAmountUsd,
  isPlanId,
  type PlanId,
} from "@/lib/payments";
import { getSupportEmail } from "@/lib/support-email";

export type CryptoCurrency = "USDT" | "USDC";
export type CryptoNetwork = "TRC20" | "ERC20" | "Solana" | "BSC";

export type CryptoPaymentOption = {
  currency: CryptoCurrency;
  network: CryptoNetwork;
  label: string;
  envKey: string;
};

export const CRYPTO_PAYMENT_OPTIONS: CryptoPaymentOption[] = [
  { currency: "USDT", network: "TRC20", label: "USDT (TRC20 — Tron)", envKey: "CRYPTO_WALLET_USDT_TRC20" },
  { currency: "USDC", network: "ERC20", label: "USDC (ERC20 — Ethereum)", envKey: "CRYPTO_WALLET_USDC_ERC20" },
  { currency: "USDC", network: "Solana", label: "USDC (Solana)", envKey: "CRYPTO_WALLET_USDC_SOLANA" },
  { currency: "USDC", network: "BSC", label: "USDC (BSC — BNB Chain)", envKey: "CRYPTO_WALLET_USDC_BSC" },
];

const CURRENCIES = new Set<CryptoCurrency>(["USDT", "USDC"]);
const NETWORKS = new Set<CryptoNetwork>(["TRC20", "ERC20", "Solana", "BSC"]);

export function isCryptoPaymentsEnabled(): boolean {
  return process.env.CRYPTO_PAYMENTS_ENABLED !== "false";
}

export function getManualVerificationHours(): number {
  const raw = Number(process.env.CRYPTO_MANUAL_VERIFICATION_HOURS ?? "24");
  return Number.isFinite(raw) && raw > 0 ? raw : 24;
}

export function getReceivingWalletAddress(currency: CryptoCurrency, network: CryptoNetwork): string | null {
  const option = CRYPTO_PAYMENT_OPTIONS.find((o) => o.currency === currency && o.network === network);
  if (!option) return null;
  const address = process.env[option.envKey]?.trim();
  return address || null;
}

export function isValidCryptoOption(currency: string, network: string): boolean {
  return CURRENCIES.has(currency as CryptoCurrency) && NETWORKS.has(network as CryptoNetwork);
}

export function getActiveCryptoOptions() {
  return CRYPTO_PAYMENT_OPTIONS.map((option) => {
    const walletAddress = process.env[option.envKey]?.trim() || null;
    return {
      currency: option.currency,
      network: option.network,
      label: option.label,
      walletAddress,
      configured: Boolean(walletAddress),
    };
  }).filter((o) => o.configured);
}

export type PublicCryptoSettings = {
  enabled: boolean;
  verificationHours: number;
  supportEmail: string;
  plans: Array<{
    id: PlanId;
    name: string;
    priceLabel: string;
    amountUsd: number;
  }>;
  paymentOptions: Array<{
    currency: CryptoCurrency;
    network: CryptoNetwork;
    label: string;
    walletAddress: string;
  }>;
};

export function getPublicCryptoSettings(): PublicCryptoSettings {
  const activeOptions = getActiveCryptoOptions();

  return {
    enabled: isCryptoPaymentsEnabled() && activeOptions.length > 0,
    verificationHours: getManualVerificationHours(),
    supportEmail: getSupportEmail(),
    plans: (["regular", "early_bird"] as PlanId[]).map((id) => ({
      id,
      name: PLANS[id].name,
      priceLabel: PLANS[id].priceLabel,
      amountUsd: getPlanAmountUsd(id),
    })),
    paymentOptions: activeOptions.map((o) => ({
      currency: o.currency,
      network: o.network,
      label: o.label,
      walletAddress: o.walletAddress!,
    })),
  };
}

export function resolvePlanForCrypto(planId: unknown): { planId: PlanId; planName: string; expectedAmount: number } | null {
  if (!isPlanId(planId)) return null;
  return {
    planId,
    planName: PLANS[planId].name,
    expectedAmount: getPlanAmountUsd(planId),
  };
}

export type ManualCryptoPaymentRow = {
  id: string;
  full_name: string;
  email: string;
  plan_id: string;
  plan_name: string;
  expected_amount: number;
  amount_paid: number;
  currency: string;
  network: string;
  receiving_wallet_address: string;
  sender_wallet_address: string;
  transaction_hash: string;
  proof_screenshot_path: string | null;
  user_notes: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  paid_customer_id: string | null;
  created_at: string;
  updated_at: string;
};
