import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend";
import {
  buildCryptoProofReceivedEmail,
  buildCryptoPaymentApprovedEmail,
  buildCryptoPaymentReceivedEmail,
  buildCryptoPaymentRejectedEmail,
} from "@/lib/email/crypto-payment-emails";
import { getManualVerificationHours } from "@/lib/crypto-payments";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, any, any>;

export async function sendCryptoProofReceivedEmail(args: {
  email: string;
  fullName: string;
  planName: string;
}): Promise<void> {
  const built = buildCryptoProofReceivedEmail({
    firstName: args.fullName,
    planName: args.planName,
    verificationHours: getManualVerificationHours(),
  });

  const result = await sendEmail({
    to: args.email,
    subject: built.subject,
    html: built.html,
    text: built.text,
    tags: [{ name: "type", value: "crypto_proof_received" }],
  });

  if (result.error) {
    console.error("[email] crypto proof received failed:", result.error);
  }
}

/**
 * "Payment received" — sent once an on-chain crypto payment is auto-verified.
 * Tells new buyers to register and already-registered users they're active.
 */
export async function sendCryptoPaymentReceivedEmail(args: {
  email: string;
  fullName: string;
  planName: string;
  amount: number;
  currency: string;
  alreadyRegistered: boolean;
}): Promise<void> {
  const built = buildCryptoPaymentReceivedEmail({
    firstName: args.fullName,
    planName: args.planName,
    amount: args.amount,
    currency: args.currency,
    alreadyRegistered: args.alreadyRegistered,
  });

  const result = await sendEmail({
    to: args.email,
    subject: built.subject,
    html: built.html,
    text: built.text,
    tags: [{ name: "type", value: "crypto_payment_received" }],
  });

  if (result.error) {
    console.error("[email] crypto payment received failed:", result.error);
  }
}

export async function sendCryptoPaymentRejectedEmail(args: {
  email: string;
  fullName: string;
  planName: string;
  adminNotes?: string | null;
}): Promise<void> {
  const built = buildCryptoPaymentRejectedEmail({
    firstName: args.fullName,
    planName: args.planName,
    adminNotes: args.adminNotes,
  });

  const result = await sendEmail({
    to: args.email,
    subject: built.subject,
    html: built.html,
    text: built.text,
    tags: [{ name: "type", value: "crypto_payment_rejected" }],
  });

  if (result.error) {
    console.error("[email] crypto payment rejected failed:", result.error);
  }
}

/**
 * Single merged email after admin approval: payment verified + registration instructions.
 * Idempotent per email via welcome_email_log (same gate as Stripe welcome).
 */
export async function sendCryptoApprovalEmails(
  supabase: SB,
  args: {
    email: string;
    fullName: string;
    planId: string;
    planName: string;
  },
): Promise<void> {
  const email = args.email.trim().toLowerCase();
  if (!email) return;

  const { data: existing } = await supabase
    .from("welcome_email_log")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) return;

  const built = buildCryptoPaymentApprovedEmail({
    firstName: args.fullName,
    planName: args.planName,
  });

  const result = await sendEmail({
    to: email,
    subject: built.subject,
    html: built.html,
    text: built.text,
    tags: [{ name: "type", value: "crypto_payment_approved" }],
  });

  if (result.skipped) {
    console.warn("[email] Crypto approval email skipped for", email, result.error);
    return;
  }

  if (result.error) {
    console.error("[email] Crypto approval email failed for", email, result.error);
    return;
  }

  await supabase.from("welcome_email_log").insert({
    email,
    stripe_checkout_session_id: null,
    resend_id: result.id,
  });
}
