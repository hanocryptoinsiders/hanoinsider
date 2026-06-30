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

// ─── Automatic on-chain crypto config (single option: USDT BEP20 on BSC) ──────

/** Receiving wallet used when no env override is set. EVM (0x) address. */
export const DEFAULT_RECEIVING_WALLET = "0x1b9b412726fb86eef215eb4ec9cef58a095fdc38";
/** Binance-Peg USDT (BSC-USD) — 18 decimals on BNB Smart Chain. */
export const DEFAULT_BSC_USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";
/** Binance-Peg USDC — 18 decimals on BNB Smart Chain (what relay.link delivers). */
export const DEFAULT_BSC_USDC_CONTRACT = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
export const DEFAULT_BSC_USDT_DECIMALS = 18;
export const DEFAULT_BSC_CHAIN_ID = 56;

export type AcceptedToken = { contract: string; decimals: number; symbol: string };

/**
 * Stablecoins we accept as payment on BSC. Defaults to BOTH USDC and USDT so a
 * buyer can pay with either (and bridges like relay.link, which deliver USDC,
 * still match). Any custom CRYPTO_TOKEN_CONTRACT is merged in too.
 */
export function getAcceptedTokens(): AcceptedToken[] {
  const tokens: AcceptedToken[] = [
    { contract: DEFAULT_BSC_USDC_CONTRACT, decimals: 18, symbol: "USDC" },
    { contract: DEFAULT_BSC_USDT_CONTRACT, decimals: 18, symbol: "USDT" },
  ];
  const custom = process.env.CRYPTO_TOKEN_CONTRACT?.trim();
  if (custom && !tokens.some((t) => t.contract.toLowerCase() === custom.toLowerCase())) {
    const decimals = Number(process.env.CRYPTO_TOKEN_DECIMALS);
    tokens.push({
      contract: custom,
      decimals: Number.isFinite(decimals) && decimals > 0 ? decimals : 18,
      symbol: process.env.CRYPTO_CURRENCY?.trim() || "USDT",
    });
  }
  return tokens;
}

export type OnchainCryptoConfig = {
  currency: string;
  network: "BSC";
  networkLabel: string;
  chainId: number;
  wallet: string;
  tokenContract: string;
  tokenDecimals: number;
  windowMinutes: number;
  minConfirmations: number;
  toleranceUsd: number;
  acceptedTokens: AcceptedToken[];
};

/** Minutes a buyer has to complete payment before the intent expires. */
export function getCryptoWindowMinutes(): number {
  const raw = Number(process.env.CRYPTO_PAYMENT_WINDOW_MINUTES ?? "10");
  return Number.isFinite(raw) && raw > 0 ? raw : 10;
}

/**
 * How much under the exact amount we still accept (USD/stablecoin units).
 * Covers exchange fees deducted from the send. Overpayment is always accepted.
 * Default $0.50.
 */
export function getCryptoAmountToleranceUsd(): number {
  const raw = Number(process.env.CRYPTO_AMOUNT_TOLERANCE_USD ?? "0.5");
  return Number.isFinite(raw) && raw >= 0 ? raw : 0.5;
}

/** Confirmations required before a transfer is treated as final. */
export function getMinConfirmations(): number {
  const raw = Number(process.env.CRYPTO_MIN_CONFIRMATIONS ?? "3");
  return Number.isFinite(raw) && raw >= 0 ? raw : 3;
}

/**
 * Amount (in USD == stablecoin units) we require for a given plan.
 * Set CRYPTO_PRICE_USD_OVERRIDE to charge a flat test amount (e.g. 1) without
 * touching Stripe pricing. Unset → the real per-plan price.
 */
export function getCryptoExpectedAmountUsd(planId: PlanId): number {
  const override = Number(process.env.CRYPTO_PRICE_USD_OVERRIDE);
  if (Number.isFinite(override) && override > 0) return override;
  return getPlanAmountUsd(planId);
}

export function getOnchainCryptoConfig(): OnchainCryptoConfig {
  const wallet = (
    process.env.CRYPTO_RECEIVING_WALLET ||
    process.env.CRYPTO_WALLET_USDT_BSC ||
    DEFAULT_RECEIVING_WALLET
  ).trim();
  const tokenDecimals = Number(process.env.CRYPTO_TOKEN_DECIMALS);
  const chainId = Number(process.env.CRYPTO_CHAIN_ID);

  return {
    currency: process.env.CRYPTO_CURRENCY?.trim() || "USDT",
    network: "BSC",
    networkLabel: "BNB Smart Chain (BEP20)",
    chainId: Number.isFinite(chainId) && chainId > 0 ? chainId : DEFAULT_BSC_CHAIN_ID,
    wallet,
    tokenContract: (process.env.CRYPTO_TOKEN_CONTRACT || DEFAULT_BSC_USDT_CONTRACT).trim(),
    tokenDecimals: Number.isFinite(tokenDecimals) && tokenDecimals > 0 ? tokenDecimals : DEFAULT_BSC_USDT_DECIMALS,
    windowMinutes: getCryptoWindowMinutes(),
    minConfirmations: getMinConfirmations(),
    toleranceUsd: getCryptoAmountToleranceUsd(),
    acceptedTokens: getAcceptedTokens(),
  };
}

export type PublicCryptoSettings = {
  enabled: boolean;
  windowMinutes: number;
  supportEmail: string;
  currency: string;
  network: string;
  networkLabel: string;
  chainId: number;
  walletAddress: string;
  plans: Array<{
    id: PlanId;
    name: string;
    priceLabel: string;
    amountUsd: number;
  }>;
};

export function getPublicCryptoSettings(): PublicCryptoSettings {
  const config = getOnchainCryptoConfig();

  return {
    enabled: isCryptoPaymentsEnabled() && Boolean(config.wallet),
    windowMinutes: config.windowMinutes,
    supportEmail: getSupportEmail(),
    currency: config.currency,
    network: config.network,
    networkLabel: config.networkLabel,
    chainId: config.chainId,
    walletAddress: config.wallet,
    plans: (["regular", "early_bird"] as PlanId[]).map((id) => ({
      id,
      name: PLANS[id].name,
      priceLabel: PLANS[id].priceLabel,
      amountUsd: getCryptoExpectedAmountUsd(id),
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
