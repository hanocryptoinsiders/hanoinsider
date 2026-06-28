"use server";

import { requireAdmin } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase/service";
import { sendEmailBatch } from "@/lib/email/resend";
import { buildCommunityUpdateEmail } from "@/lib/email/community-email";

const MIN_INTERVAL_MS = 60_000; // at most one broadcast per minute per admin desk
const MAX_RECIPIENTS = 500;

export type SendCommunityEmailResult =
  | { success: true; sent: number; skipped: number }
  | { success: false; error: string };

async function getPaidRecipientEmails(): Promise<string[]> {
  const supabase = getServiceSupabase();
  const emails = new Set<string>();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("email, is_premium, role, subscription_status, status")
    .not("email", "is", null);

  for (const p of profiles ?? []) {
    if (!p.email) continue;
    if (p.status && p.status !== "active") continue;
    const paid =
      p.is_premium === true ||
      p.role === "premium" ||
      p.role === "admin" ||
      p.subscription_status === "active";
    if (paid) emails.add(p.email.trim().toLowerCase());
  }

  const { data: paidCustomers } = await supabase
    .from("paid_customers")
    .select("email")
    .eq("payment_status", "paid")
    .not("email", "is", null);

  for (const row of paidCustomers ?? []) {
    if (row.email) emails.add(row.email.trim().toLowerCase());
  }

  return Array.from(emails).filter(Boolean);
}

export async function previewCommunityEmailRecipients(): Promise<{ count: number }> {
  await requireAdmin();
  const list = await getPaidRecipientEmails();
  return { count: list.length };
}

export async function sendCommunityEmail(
  subject: string,
  message: string,
): Promise<SendCommunityEmailResult> {
  const { user } = await requireAdmin();
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();

  if (!trimmedSubject || trimmedSubject.length > 200) {
    return { success: false, error: "Subject is required (max 200 characters)." };
  }
  if (!trimmedMessage || trimmedMessage.length > 10_000) {
    return { success: false, error: "Message is required (max 10,000 characters)." };
  }

  const supabase = getServiceSupabase();

  const { data: recent } = await supabase
    .from("community_email_log")
    .select("created_at")
    .eq("sent_by", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent?.created_at) {
    const elapsed = Date.now() - new Date(recent.created_at).getTime();
    if (elapsed < MIN_INTERVAL_MS) {
      return {
        success: false,
        error: "Please wait at least one minute between community broadcasts.",
      };
    }
  }

  const recipients = await getPaidRecipientEmails();
  if (recipients.length === 0) {
    return { success: false, error: "No paid subscriber emails found." };
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return {
      success: false,
      error: `Too many recipients (${recipients.length}). Limit is ${MAX_RECIPIENTS}; contact support for larger sends.`,
    };
  }

  const built = buildCommunityUpdateEmail(trimmedSubject, trimmedMessage);
  const payload = recipients.map((recipient) => ({
    to: recipient,
    subject: built.subject,
    html: built.html,
    text: built.text,
    tags: [{ name: "type", value: "community_update" }],
  }));

  const result = await sendEmailBatch(payload);

  if (result.skipped) {
    return { success: true, sent: 0, skipped: recipients.length };
  }

  if (result.error) {
    return {
      success: false,
      error:
        result.sent > 0
          ? `Send partially failed after ${result.sent} of ${recipients.length} recipients: ${result.error}`
          : `Send failed: ${result.error}`,
    };
  }

  const sent = result.sent;
  const skipped = Math.max(0, recipients.length - sent);

  await supabase.from("community_email_log").insert({
    subject: trimmedSubject,
    sent_by: user.id,
    recipient_count: sent,
  });

  return { success: true, sent, skipped };
}
