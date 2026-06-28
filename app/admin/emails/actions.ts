"use server";

import { requireAdmin } from "@/lib/auth";
import { getServiceSupabase } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email/resend";
import { buildCommunityUpdateEmail } from "@/lib/email/community-email";

const BATCH_SIZE = 20;
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
  let sent = 0;
  let skipped = 0;

  // Send one email per recipient so the To header never exposes the full list.
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const result = await sendEmail({
      to: recipient,
      subject: built.subject,
      html: built.html,
      text: built.text,
      tags: [{ name: "type", value: "community_update" }],
    });

    if (result.skipped) {
      skipped++;
    } else if (result.error) {
      return {
        success: false,
        error: `Send failed for recipient ${i + 1} of ${recipients.length}: ${result.error}`,
      };
    } else {
      sent++;
    }

    if (i + 1 < recipients.length && (i + 1) % BATCH_SIZE === 0) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  await supabase.from("community_email_log").insert({
    subject: trimmedSubject,
    sent_by: user.id,
    recipient_count: sent,
  });

  return { success: true, sent, skipped };
}
