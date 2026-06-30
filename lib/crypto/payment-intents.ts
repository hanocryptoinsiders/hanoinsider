/**
 * lib/crypto/payment-intents.ts
 *
 * Lifecycle for automatic on-chain crypto payments:
 *   1. createCryptoIntent  — buyer commits to a plan; we mint a row with the
 *      exact amount + receiving wallet + a short payment window.
 *   2. verifyAndSettleIntent — checks the chain for the transfer; on success
 *      marks the intent confirmed, flips the customer to paid (and upgrades an
 *      already-registered profile straight to premium), and emails them.
 *   3. pollPendingIntents — batch verification for the Railway worker / cron;
 *      also expires intents whose window has elapsed.
 *
 * Server-only (uses the Supabase service role). Never import into client code.
 */

import { getServiceSupabase } from "@/lib/supabase/service";
import { normalizeEmail, isValidEmail, isPlanId, PLANS, type PlanId } from "@/lib/payments";
import {
  getOnchainCryptoConfig,
  getCryptoExpectedAmountUsd,
} from "@/lib/crypto-payments";
import { sanitizeFullName, isValidTransactionHash, normalizeTransactionHash } from "@/lib/crypto-sanitize";
import { getOnchainProvider, verifyOnchainPayment } from "@/lib/crypto/onchain";
import { sendCryptoPaymentReceivedEmail } from "@/lib/email/send-crypto-payment-emails";

export type IntentStatus = "pending" | "confirmed" | "expired" | "failed";

export type PublicIntent = {
  id: string;
  status: IntentStatus;
  walletAddress: string;
  amount: number;
  currency: string;
  network: string;
  networkLabel: string;
  chainId: number;
  expiresAt: string;
  windowMinutes: number;
  email: string;
  planName: string;
  transactionHash: string | null;
};

export type CreateIntentInput = {
  fullName?: string | null;
  email: string;
  planId: string;
};

export type CreateIntentResult =
  | { success: true; intent: PublicIntent }
  | { success: false; error: string; code: string };

// ─── Helpers ──────────────────────────────────────────────────────────────

function toPublicIntent(row: Record<string, unknown>, windowMinutes: number): PublicIntent {
  const config = getOnchainCryptoConfig();
  return {
    id: String(row.id),
    status: row.status as IntentStatus,
    walletAddress: String(row.receiving_wallet_address),
    amount: Number(row.expected_amount),
    currency: String(row.currency),
    network: String(row.network),
    networkLabel: config.networkLabel,
    chainId: Number(row.chain_id),
    expiresAt: String(row.expires_at),
    windowMinutes,
    email: String(row.email),
    planName: String(row.plan_name),
    transactionHash: (row.transaction_hash as string | null) ?? null,
  };
}

/** Hashes already consumed by a confirmed intent — never reusable. */
async function getUsedTxHashes(supabase: ReturnType<typeof getServiceSupabase>): Promise<Set<string>> {
  const { data } = await supabase
    .from("crypto_payment_intents")
    .select("transaction_hash")
    .eq("status", "confirmed")
    .not("transaction_hash", "is", null);
  const set = new Set<string>();
  for (const r of data ?? []) {
    const h = (r as { transaction_hash?: string | null }).transaction_hash;
    if (h) set.add(h.trim().toLowerCase());
  }
  return set;
}

// ─── Create ───────────────────────────────────────────────────────────────

export async function createCryptoIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
  const email = normalizeEmail(input.email ?? "");
  const fullName = sanitizeFullName(input.fullName ?? "");

  if (!email || !isValidEmail(email)) {
    return { success: false, error: "Enter a valid email address.", code: "invalid_email" };
  }
  if (!isPlanId(input.planId)) {
    return { success: false, error: "Invalid plan selected.", code: "invalid_plan" };
  }
  const planId = input.planId as PlanId;

  const config = getOnchainCryptoConfig();
  if (!config.wallet) {
    return { success: false, error: "Crypto payments are not configured.", code: "not_configured" };
  }

  const supabase = getServiceSupabase();

  // Eligibility: block emails that already have access or a completed payment.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_premium, subscription_status, subscription_current_period_end")
    .eq("email", email)
    .maybeSingle();
  if (profile?.is_premium === true || profile?.role === "premium" || profile?.role === "admin") {
    return {
      success: false,
      error: "This email already has an active membership. Please log in.",
      code: "active_subscriber",
    };
  }

  const { data: paid } = await supabase
    .from("paid_customers")
    .select("payment_status, has_registered, user_id")
    .eq("email", email)
    .maybeSingle();
  if (paid?.payment_status === "paid" && (paid.has_registered || paid.user_id)) {
    return {
      success: false,
      error: "This email already has an account. Please log in.",
      code: "already_registered",
    };
  }
  if (paid?.payment_status === "paid") {
    return {
      success: false,
      error: "This email already has a completed payment. Please register instead.",
      code: "already_paid",
    };
  }

  const expectedAmount = getCryptoExpectedAmountUsd(planId);
  const expiresAt = new Date(Date.now() + config.windowMinutes * 60 * 1000).toISOString();

  const { data: inserted, error } = await supabase
    .from("crypto_payment_intents")
    .insert({
      full_name: fullName || null,
      email,
      plan_id: planId,
      plan_name: PLANS[planId].name,
      expected_amount: expectedAmount,
      currency: config.currency,
      network: config.network,
      chain_id: config.chainId,
      receiving_wallet_address: config.wallet,
      token_contract_address: config.tokenContract,
      token_decimals: config.tokenDecimals,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    console.error("[crypto/intent] insert error:", error?.message);
    return { success: false, error: "Could not start payment. Please try again.", code: "db_error" };
  }

  return { success: true, intent: toPublicIntent(inserted, config.windowMinutes) };
}

// ─── Status ───────────────────────────────────────────────────────────────

export async function getCryptoIntent(id: string): Promise<PublicIntent | null> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("crypto_payment_intents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return toPublicIntent(data, getOnchainCryptoConfig().windowMinutes);
}

// ─── Verify + settle a single intent ────────────────────────────────────────

export type VerifyOutcome = {
  status: IntentStatus;
  reason?: string;
};

export async function verifyAndSettleIntent(
  id: string,
  opts?: { txHash?: string | null; senderWallet?: string | null; force?: boolean },
): Promise<VerifyOutcome> {
  const supabase = getServiceSupabase();
  const force = opts?.force === true;

  const { data: row } = await supabase
    .from("crypto_payment_intents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!row) return { status: "failed", reason: "not_found" };
  if (row.status === "confirmed") return { status: "confirmed" };
  // Normal polls only touch pending intents; a forced admin re-check may also
  // re-scan an already-expired/failed intent (e.g. a late payment).
  if (row.status !== "pending" && !force) return { status: row.status as IntentStatus };

  const expired = new Date(row.expires_at).getTime() <= Date.now();

  // Persist a user-supplied tx hash up front so the watcher can target it too.
  const submittedHash =
    opts?.txHash && isValidTransactionHash(opts.txHash)
      ? normalizeTransactionHash(opts.txHash)
      : null;
  if (submittedHash && !row.transaction_hash) {
    await supabase
      .from("crypto_payment_intents")
      .update({
        transaction_hash: submittedHash,
        sender_wallet_address: opts?.senderWallet?.trim() || null,
      })
      .eq("id", id)
      .is("transaction_hash", null);
  }

  const config = getOnchainCryptoConfig();
  const provider = getOnchainProvider(Number(row.chain_id));
  if (!provider) {
    await bumpAttempt(supabase, id, "onchain_provider_missing");
    return { status: "pending", reason: "onchain_provider_missing" };
  }

  const usedHashes = await getUsedTxHashes(supabase);
  // Only consider transfers from ~2 min before the intent was created onward,
  // so a pre-existing transfer to the wallet can't be matched to a new intent.
  const notBeforeUnix = Math.floor(new Date(row.created_at).getTime() / 1000) - 2 * 60;

  const result = await verifyOnchainPayment({
    chainId: Number(row.chain_id),
    wallet: String(row.receiving_wallet_address),
    tokens: config.acceptedTokens,
    expectedAmount: Number(row.expected_amount),
    toleranceAmount: config.toleranceUsd,
    notBeforeUnix,
    txHash: submittedHash ?? (row.transaction_hash as string | null),
    usedHashes,
    minConfirmations: config.minConfirmations,
    provider,
  });

  if (!result.ok) {
    await bumpAttempt(supabase, id, result.reason);
    // Expire ONLY when we definitively scanned the chain and found nothing —
    // never on a transport/provider error, which would strand a real payment.
    const scanned =
      result.reason === "no_matching_transfer" || result.reason === "awaiting_confirmations";
    if (expired && !force && scanned) {
      await supabase
        .from("crypto_payment_intents")
        .update({ status: "expired", last_error: result.reason })
        .eq("id", id)
        .eq("status", "pending");
      return { status: "expired", reason: result.reason };
    }
    return { status: "pending", reason: result.reason };
  }

  return settleConfirmed(supabase, id, {
    transaction_hash: result.hash,
    sender_wallet_address: result.from,
    detected_amount: result.detectedAmount,
    currency: result.currency,
  });
}

/**
 * Marks an intent confirmed (guarded so it can only settle once) and runs
 * settlement. Shared by auto-verification and admin manual approval. The unique
 * partial index on confirmed tx hashes prevents one tx settling two intents.
 */
async function settleConfirmed(
  supabase: ReturnType<typeof getServiceSupabase>,
  id: string,
  fields: {
    transaction_hash?: string | null;
    sender_wallet_address?: string | null;
    detected_amount?: number | null;
    currency?: string | null;
    last_error?: string | null;
  },
): Promise<VerifyOutcome> {
  const { data: confirmedRow, error } = await supabase
    .from("crypto_payment_intents")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      last_error: fields.last_error ?? null,
      ...(fields.transaction_hash !== undefined ? { transaction_hash: fields.transaction_hash } : {}),
      ...(fields.sender_wallet_address !== undefined
        ? { sender_wallet_address: fields.sender_wallet_address }
        : {}),
      ...(fields.detected_amount !== undefined ? { detected_amount: fields.detected_amount } : {}),
      ...(fields.currency ? { currency: fields.currency } : {}),
    })
    .eq("id", id)
    .in("status", ["pending", "expired", "failed"])
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[crypto/intent] confirm update error:", error.message);
    await supabase
      .from("crypto_payment_intents")
      .update({ status: "failed", last_error: "duplicate_transaction" })
      .eq("id", id)
      .in("status", ["pending", "expired"]);
    return { status: "failed", reason: "duplicate_transaction" };
  }
  if (!confirmedRow) return { status: "confirmed" }; // already settled by another run
  await settlePaidCustomer(supabase, confirmedRow);
  return { status: "confirmed" };
}

async function bumpAttempt(
  supabase: ReturnType<typeof getServiceSupabase>,
  id: string,
  lastError?: string,
) {
  // Lightweight diagnostics: record the latest reason a check didn't settle.
  await supabase
    .from("crypto_payment_intents")
    .update({ last_error: lastError ?? null })
    .eq("id", id)
    .eq("status", "pending");
}

// ─── Settlement: flip customer to paid + activate / email ───────────────────

async function settlePaidCustomer(
  supabase: ReturnType<typeof getServiceSupabase>,
  intent: Record<string, unknown>,
) {
  const email = normalizeEmail(String(intent.email));
  const planId = String(intent.plan_id);
  const planName = String(intent.plan_name);
  const fullName = (intent.full_name as string | null) ?? null;
  const now = new Date().toISOString();
  const { firstName, lastName } = splitName(fullName);

  // Is this email already a registered account? If so, upgrade it directly.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profile?.id) {
    await supabase
      .from("profiles")
      .update({
        is_premium: true,
        role: "premium",
        subscription_status: "active",
        subscription_plan: planId,
        premium_source: "manual",
        updated_at: now,
      })
      .eq("id", profile.id);
  }

  // Upsert the paid_customers source-of-truth row (gates registration).
  const { data: existingPaid } = await supabase
    .from("paid_customers")
    .select("id, has_registered, user_id")
    .eq("email", email)
    .maybeSingle();

  const paidPayload = {
    email,
    first_name: firstName,
    last_name: lastName,
    selected_plan: planId,
    payment_status: "paid",
    payment_provider: "crypto",
    crypto_payment_intent_id: String(intent.id),
    paid_at: now,
    has_registered: existingPaid?.has_registered ?? Boolean(profile?.id),
    user_id: existingPaid?.user_id ?? profile?.id ?? null,
  };

  let paidId: string | null = null;
  if (existingPaid) {
    await supabase.from("paid_customers").update(paidPayload).eq("id", existingPaid.id);
    paidId = existingPaid.id;
  } else {
    const { data: insertedPaid } = await supabase
      .from("paid_customers")
      .insert(paidPayload)
      .select("id")
      .single();
    paidId = insertedPaid?.id ?? null;
  }

  if (paidId) {
    await supabase
      .from("crypto_payment_intents")
      .update({ paid_customer_id: paidId })
      .eq("id", String(intent.id));
  }

  try {
    await sendCryptoPaymentReceivedEmail({
      email,
      fullName: fullName ?? email,
      planName,
      amount: Number(intent.detected_amount ?? intent.expected_amount),
      currency: String(intent.currency),
      alreadyRegistered: Boolean(profile?.id),
    });
  } catch (err) {
    console.error("[crypto/intent] payment received email error:", err);
  }
}

function splitName(fullName: string | null): { firstName: string | null; lastName: string | null } {
  if (!fullName) return { firstName: null, lastName: null };
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

// ─── Batch: worker / cron ───────────────────────────────────────────────────

export type PollSummary = {
  checked: number;
  confirmed: number;
  expired: number;
  stillPending: number;
  errors: string[];
};

export async function pollPendingIntents(limit = 50): Promise<PollSummary> {
  const supabase = getServiceSupabase();
  const summary: PollSummary = { checked: 0, confirmed: 0, expired: 0, stillPending: 0, errors: [] };

  const { data: pending, error } = await supabase
    .from("crypto_payment_intents")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    summary.errors.push(error.message);
    return summary;
  }

  for (const row of pending ?? []) {
    summary.checked++;
    try {
      const outcome = await verifyAndSettleIntent(String(row.id));
      if (outcome.status === "confirmed") summary.confirmed++;
      else if (outcome.status === "expired") summary.expired++;
      else summary.stillPending++;
    } catch (err) {
      summary.errors.push(err instanceof Error ? err.message : "unknown");
    }
  }

  return summary;
}

// ─── Admin: list / manual approve / reject ──────────────────────────────────

export type CryptoIntentRow = {
  id: string;
  full_name: string | null;
  email: string;
  plan_id: string;
  plan_name: string;
  expected_amount: number;
  detected_amount: number | null;
  currency: string;
  network: string;
  chain_id: number;
  receiving_wallet_address: string;
  transaction_hash: string | null;
  sender_wallet_address: string | null;
  status: IntentStatus;
  expires_at: string;
  confirmed_at: string | null;
  last_error: string | null;
  paid_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function listCryptoIntents(filters?: {
  status?: IntentStatus;
  search?: string;
}): Promise<CryptoIntentRow[]> {
  const supabase = getServiceSupabase();
  let query = supabase
    .from("crypto_payment_intents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) {
    console.error("[crypto/intent] admin list error:", error.message);
    return [];
  }
  let rows = (data ?? []) as CryptoIntentRow[];
  const s = filters?.search?.trim().toLowerCase();
  if (s) {
    rows = rows.filter(
      (r) =>
        r.email?.toLowerCase().includes(s) ||
        (r.transaction_hash ?? "").toLowerCase().includes(s) ||
        (r.full_name ?? "").toLowerCase().includes(s),
    );
  }
  return rows;
}

/** Admin re-runs on-chain verification, ignoring the expiry window. */
export async function recheckCryptoIntent(id: string): Promise<VerifyOutcome> {
  return verifyAndSettleIntent(id, { force: true });
}

/**
 * Admin force-activates a payment that auto-verification couldn't confirm
 * (e.g. paid on the wrong network, or our reader missed it). Marks the intent
 * confirmed, flips the customer to paid, and sends the "Payment received" email.
 */
export async function manuallyApproveCryptoIntent(
  id: string,
  adminUserId: string,
  opts?: { txHash?: string | null; note?: string | null },
): Promise<VerifyOutcome> {
  const supabase = getServiceSupabase();
  const { data: row } = await supabase
    .from("crypto_payment_intents")
    .select("status, expected_amount")
    .eq("id", id)
    .maybeSingle();

  if (!row) return { status: "failed", reason: "not_found" };
  if (row.status === "confirmed") return { status: "confirmed" };

  const txHash =
    opts?.txHash && isValidTransactionHash(opts.txHash)
      ? normalizeTransactionHash(opts.txHash)
      : undefined;
  const note = opts?.note?.trim();

  return settleConfirmed(supabase, id, {
    ...(txHash ? { transaction_hash: txHash } : {}),
    detected_amount: Number(row.expected_amount),
    last_error: `manual_approved_by:${adminUserId}${note ? ` (${note})` : ""}`,
  });
}

export async function rejectCryptoIntent(
  id: string,
  adminUserId: string,
  note?: string | null,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceSupabase();
  const trimmed = note?.trim();
  const { error } = await supabase
    .from("crypto_payment_intents")
    .update({
      status: "failed",
      last_error: `rejected_by:${adminUserId}${trimmed ? ` (${trimmed})` : ""}`,
    })
    .eq("id", id)
    .in("status", ["pending", "expired", "failed"]);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
