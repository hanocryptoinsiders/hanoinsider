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
      body: JSON.stringify({
        from: params.from || getDefaultFrom(),
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo || getDefaultReplyTo(),
        ...(params.tags ? { tags: params.tags } : {}),
      }),
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
