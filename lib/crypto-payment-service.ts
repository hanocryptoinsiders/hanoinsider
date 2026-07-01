import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabase/service";
import { normalizeEmail, isValidEmail } from "@/lib/payments";
import {
  getReceivingWalletAddress,
  isValidCryptoOption,
  resolvePlanForCrypto,
  type ManualCryptoPaymentRow,
  type CryptoCurrency,
  type CryptoNetwork,
} from "@/lib/crypto-payments";
import {
  isValidTransactionHash,
  isValidWalletAddress,
  normalizeTransactionHash,
  normalizeWalletAddress,
  parseAmountPaid,
  resolveProofImageMime,
  sanitizeAdminNotes,
  sanitizeFullName,
  sanitizeUserNotes,
} from "@/lib/crypto-sanitize";
import {
  sendCryptoProofReceivedEmail,
  sendCryptoApprovalEmails,
  sendCryptoPaymentRejectedEmail,
} from "@/lib/email/send-crypto-payment-emails";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, any, any>;

const PROOF_BUCKET = "crypto-payment-proofs";
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export type CreateCryptoSubmissionInput = {
  fullName: string;
  email: string;
  planId: string;
  amountPaid: unknown;
  currency: string;
  network: string;
  transactionHash: string;
  senderWalletAddress: string;
  proofScreenshotPath?: string | null;
  userNotes?: string | null;
};

export type CreateCryptoSubmissionResult =
  | { success: true; id: string }
  | { success: false; error: string; code?: string };

export async function createCryptoPaymentSubmission(
  input: CreateCryptoSubmissionInput,
): Promise<CreateCryptoSubmissionResult> {
  const fullName = sanitizeFullName(input.fullName);
  const email = normalizeEmail(input.email);
  const plan = resolvePlanForCrypto(input.planId);
  const amountPaid = parseAmountPaid(input.amountPaid);
  const currency = input.currency as CryptoCurrency;
  const network = input.network as CryptoNetwork;
  const transactionHash = normalizeTransactionHash(input.transactionHash);
  const senderWalletAddress = normalizeWalletAddress(input.senderWalletAddress);
  const userNotes = sanitizeUserNotes(input.userNotes);
  const proofScreenshotPath =
    typeof input.proofScreenshotPath === "string" && input.proofScreenshotPath.trim()
      ? input.proofScreenshotPath.trim()
      : null;

  if (!fullName) return { success: false, error: "Full name is required.", code: "invalid_name" };
  if (!email || !isValidEmail(email)) return { success: false, error: "Enter a valid email address.", code: "invalid_email" };
  if (!plan) return { success: false, error: "Invalid plan selected.", code: "invalid_plan" };
  if (!amountPaid) return { success: false, error: "Enter a valid amount paid.", code: "invalid_amount" };
  if (!isValidCryptoOption(currency, network)) {
    return { success: false, error: "Invalid currency or network.", code: "invalid_crypto_option" };
  }
  if (!isValidTransactionHash(transactionHash)) {
    return { success: false, error: "Enter a valid transaction hash.", code: "invalid_tx_hash" };
  }
  if (!isValidWalletAddress(senderWalletAddress)) {
    return { success: false, error: "Enter a valid sender wallet address.", code: "invalid_sender_wallet" };
  }

  const receivingWalletAddress = getReceivingWalletAddress(currency, network);
  if (!receivingWalletAddress) {
    return { success: false, error: "This payment option is not available.", code: "wallet_not_configured" };
  }

  const supabase = getServiceSupabase();

  const { data: existingTx } = await supabase
    .from("manual_crypto_payments")
    .select("id")
    .eq("transaction_hash", transactionHash)
    .maybeSingle();

  if (existingTx) {
    return {
      success: false,
      error: "This transaction hash has already been submitted.",
      code: "duplicate_tx_hash",
    };
  }

  const { data: paidCustomer } = await supabase
    .from("paid_customers")
    .select("payment_status, has_registered")
    .eq("email", email)
    .maybeSingle();

  if (paidCustomer?.payment_status === "paid" && !paidCustomer.has_registered) {
    return {
      success: false,
      error: "This email already has an approved payment. Please register instead.",
      code: "already_paid",
    };
  }

  if (paidCustomer?.payment_status === "paid" && paidCustomer.has_registered) {
    return {
      success: false,
      error: "This email already has an active account. Please log in.",
      code: "already_registered",
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("manual_crypto_payments")
    .insert({
      full_name: fullName,
      email,
      plan_id: plan.planId,
      plan_name: plan.planName,
      expected_amount: plan.expectedAmount,
      amount_paid: amountPaid,
      currency,
      network,
      receiving_wallet_address: receivingWalletAddress,
      sender_wallet_address: senderWalletAddress,
      transaction_hash: transactionHash,
      proof_screenshot_path: proofScreenshotPath,
      user_notes: userNotes,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    if (insertError?.code === "23505") {
      return {
        success: false,
        error: "This transaction hash has already been submitted.",
        code: "duplicate_tx_hash",
      };
    }
    console.error("[crypto] submission insert error:", insertError?.message, insertError?.code, insertError?.details);
    return {
      success: false,
      error: insertError?.message || "Failed to submit payment proof. Please try again.",
      code: "db_error",
    };
  }

  try {
    await sendCryptoProofReceivedEmail({
      email,
      fullName,
      planName: plan.planName,
    });
  } catch (emailError) {
    console.error("[crypto] proof received email error:", emailError);
  }

  return { success: true, id: inserted.id };
}

export async function uploadCryptoProofScreenshot(file: File): Promise<
  | { success: true; path: string }
  | { success: false; error: string }
> {
  const mime = resolveProofImageMime(file);
  if (!mime) {
    return { success: false, error: "Unsupported file type. Use JPG, PNG, or WebP." };
  }
  if (file.size > MAX_PROOF_BYTES) {
    return { success: false, error: "File too large. Maximum size is 5 MB." };
  }

  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const path = `proofs/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = getServiceSupabase();
  const { error } = await supabase.storage.from(PROOF_BUCKET).upload(path, buffer, {
    contentType: mime,
    upsert: false,
    cacheControl: "3600",
  });

  if (error) {
    console.error("[crypto] proof upload error:", error.message, error);
    return { success: false, error: "Could not upload screenshot. Try again or submit without it." };
  }

  return { success: true, path };
}

export async function getSignedProofUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function fetchAdminCryptoPayments(
  filters?: { status?: "pending" | "approved" | "rejected"; search?: string },
): Promise<ManualCryptoPaymentRow[]> {
  const supabase = getServiceSupabase();
  let query = supabase
    .from("manual_crypto_payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[crypto] admin fetch error:", error.message);
    return [];
  }

  let rows = (data ?? []) as ManualCryptoPaymentRow[];
  const search = filters?.search?.trim().toLowerCase();
  if (search) {
    rows = rows.filter(
      (r) =>
        r.email.toLowerCase().includes(search) ||
        r.transaction_hash.toLowerCase().includes(search) ||
        r.full_name.toLowerCase().includes(search),
    );
  }
  return rows;
}

function splitFullName(fullName: string): { firstName: string | null; lastName: string | null } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export type ApproveRejectResult = { success: true } | { success: false; error: string };

export async function approveCryptoPayment(
  paymentId: string,
  adminUserId: string,
  adminNotes?: string | null,
): Promise<ApproveRejectResult> {
  const supabase = getServiceSupabase();
  const notes = sanitizeAdminNotes(adminNotes);

  const { data: payment, error: fetchError } = await supabase
    .from("manual_crypto_payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (fetchError || !payment) {
    return { success: false, error: "Payment submission not found." };
  }
  if (payment.status !== "pending") {
    return { success: false, error: "This payment has already been reviewed." };
  }

  const { firstName, lastName } = splitFullName(payment.full_name);
  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("manual_crypto_payments")
    .update({
      status: "approved",
      admin_notes: notes,
      reviewed_by: adminUserId,
      reviewed_at: now,
    })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return { success: false, error: "Could not approve payment. It may have already been reviewed." };
  }

  const { data: existingPaid } = await supabase
    .from("paid_customers")
    .select("id, has_registered, user_id")
    .eq("email", payment.email)
    .maybeSingle();

  if (existingPaid?.has_registered || existingPaid?.user_id) {
    await supabase
      .from("manual_crypto_payments")
      .update({ status: "pending", reviewed_by: null, reviewed_at: null, admin_notes: null })
      .eq("id", paymentId);
    return { success: false, error: "This email already has a registered account." };
  }

  const paidPayload = {
    email: payment.email,
    first_name: firstName,
    last_name: lastName,
    selected_plan: payment.plan_id,
    payment_status: "paid",
    payment_provider: "manual_crypto",
    manual_crypto_payment_id: payment.id,
    paid_at: now,
    has_registered: false,
    user_id: null,
  };

  let paidRowId: string;
  if (existingPaid) {
    const { error: paidUpdateError } = await supabase
      .from("paid_customers")
      .update(paidPayload)
      .eq("id", existingPaid.id);
    if (paidUpdateError) {
      console.error("[crypto] paid_customers update error:", paidUpdateError);
      await supabase
        .from("manual_crypto_payments")
        .update({ status: "pending", reviewed_by: null, reviewed_at: null, admin_notes: null })
        .eq("id", paymentId);
      return { success: false, error: "Failed to mark customer as paid." };
    }
    paidRowId = existingPaid.id;
  } else {
    const { data: insertedPaid, error: paidInsertError } = await supabase
      .from("paid_customers")
      .insert(paidPayload)
      .select("id")
      .single();
    if (paidInsertError || !insertedPaid) {
      console.error("[crypto] paid_customers insert error:", paidInsertError);
      await supabase
        .from("manual_crypto_payments")
        .update({ status: "pending", reviewed_by: null, reviewed_at: null, admin_notes: null })
        .eq("id", paymentId);
      return { success: false, error: "Failed to mark customer as paid." };
    }
    paidRowId = insertedPaid.id;
  }

  await supabase
    .from("manual_crypto_payments")
    .update({ paid_customer_id: paidRowId })
    .eq("id", paymentId);

  try {
    await sendCryptoApprovalEmails(supabase, {
      email: payment.email,
      fullName: payment.full_name,
      planId: payment.plan_id,
      planName: payment.plan_name,
    });
  } catch (emailError) {
    console.error("[crypto] approval emails error:", emailError);
  }

  return { success: true };
}

export async function rejectCryptoPayment(
  paymentId: string,
  adminUserId: string,
  adminNotes?: string | null,
): Promise<ApproveRejectResult> {
  const supabase = getServiceSupabase();
  const notes = sanitizeAdminNotes(adminNotes);

  const { data: payment, error: fetchError } = await supabase
    .from("manual_crypto_payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (fetchError || !payment) {
    return { success: false, error: "Payment submission not found." };
  }
  if (payment.status !== "pending") {
    return { success: false, error: "This payment has already been reviewed." };
  }

  const { error: updateError } = await supabase
    .from("manual_crypto_payments")
    .update({
      status: "rejected",
      admin_notes: notes,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("status", "pending");

  if (updateError) {
    return { success: false, error: "Could not reject payment." };
  }

  await sendCryptoPaymentRejectedEmail({
    email: payment.email,
    fullName: payment.full_name,
    planName: payment.plan_name,
    adminNotes: notes,
  });

  return { success: true };
}

export async function hasPendingCryptoPayment(email: string): Promise<boolean> {
  const { hasPendingCryptoPayment: check } = await import("@/lib/registration-eligibility");
  return check(email);
}
