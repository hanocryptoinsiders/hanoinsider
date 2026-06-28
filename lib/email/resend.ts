/**
 * lib/email/resend.ts
 *
 * Thin wrapper over the Resend REST API for sending transactional email.
 * Used by the subscription cron (expiry reminders) and any other server-side
 * transactional flows.
 *
 * Configuration (env):
 *   RESEND_API_KEY   — required to actually send. If missing, sends are skipped
 *                      (logged) instead of throwing, so cron runs stay green
 *                      until the key is configured.
 *   EMAIL_FROM       — "Display Name <address@verified-domain>". Must be a Resend
 *                      VERIFIED domain. Defaults to the verified hanoinsiders.com.
 *   EMAIL_REPLY_TO   — address replies go to. Defaults to hi@hanoinsiders.com.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_BATCH_ENDPOINT = "https://api.resend.com/emails/batch";
const RESEND_BATCH_LIMIT = 100;

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  from?: string;
  tags?: { name: string; value: string }[];
};

export type SendEmailResult = {
  id: string | null;
  /** True when the send was intentionally skipped (e.g. no API key configured). */
  skipped?: boolean;
  error?: string;
};

export type SendEmailBatchResult = {
  sent: number;
  skipped?: boolean;
  error?: string;
};

function buildResendPayload(params: SendEmailParams) {
  return {
    from: params.from || getDefaultFrom(),
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    html: params.html,
    text: params.text,
    reply_to: params.replyTo || getDefaultReplyTo(),
    ...(params.tags ? { tags: params.tags } : {}),
  };
}

/**
 * The verified sender. Resend will reject sends from an unverified domain, so
 * this defaults to the verified hanoinsiders.com domain. Set EMAIL_FROM to
 * "Hannah <hannah@hanoanimations.com>" once that domain is verified in Resend.
 */
export function getDefaultFrom(): string {
  return process.env.EMAIL_FROM || "Hano Insiders <hi@hanoinsiders.com>";
}

export function getDefaultReplyTo(): string {
  return process.env.EMAIL_REPLY_TO || "hi@hanoinsiders.com";
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY is not set — skipping email send to",
      Array.isArray(params.to) ? params.to.join(", ") : params.to,
    );
    return { id: null, skipped: true, error: "RESEND_API_KEY missing" };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildResendPayload(params)),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend send failed:", res.status, body);
      return { id: null, error: `Resend ${res.status}: ${body}` };
    }

    const data = (await res.json()) as { id?: string };
    return { id: data?.id ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown send error";
    console.error("[email] Resend send threw:", message);
    return { id: null, error: message };
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends up to 100 personalized emails in one Resend API call.
 * Use this for community broadcasts to stay within Resend's request rate limits.
 */
export async function sendEmailBatch(emails: SendEmailParams[]): Promise<SendEmailBatchResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY is not set — skipping batch email send");
    return { sent: 0, skipped: true, error: "RESEND_API_KEY missing" };
  }

  if (emails.length === 0) {
    return { sent: 0 };
  }

  let sent = 0;

  for (const [chunkIndex, chunk] of chunkArray(emails, RESEND_BATCH_LIMIT).entries()) {
    if (chunkIndex > 0) {
      // Resend allows 2 requests/sec — pause between batch API calls.
      await sleep(600);
    }

    try {
      const res = await fetch(RESEND_BATCH_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "x-batch-validation": "permissive",
        },
        body: JSON.stringify(chunk.map((email) => buildResendPayload(email))),
      });

      const body = await res.text();
      if (!res.ok) {
        console.error("[email] Resend batch send failed:", res.status, body);
        return { sent, error: `Resend ${res.status}: ${body}` };
      }

      const data = JSON.parse(body) as {
        data?: Array<{ id?: string }>;
        errors?: Array<{ index: number; message: string }>;
      };

      sent += data.data?.length ?? 0;

      if (data.errors?.length) {
        const details = data.errors
          .map((entry) => `recipient ${entry.index + 1}: ${entry.message}`)
          .join("; ");
        return { sent, error: `Batch send had invalid recipients: ${details}` };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown batch send error";
      console.error("[email] Resend batch send threw:", message);
      return { sent, error: message };
    }
  }

  return { sent };
}
