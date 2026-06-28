/**
 * lib/email/subscription-emails.ts
 *
 * Builders for the subscription-lifecycle emails. Each returns a subject plus
 * HTML and plain-text bodies. Used by /api/cron/subscriptions.
 *
 * Email types:
 *   reminder_7  — 7 days before expiry
 *   reminder_3  — 3 days before expiry
 *   reminder_1  — 1 day before expiry (expires tomorrow)
 *   expiry_day  — the day the plan ends
 *   expired     — access has just been revoked
 */

import { getSiteUrl } from "@/lib/site-url";

export type SubscriptionEmailType =
  | "reminder_7"
  | "reminder_3"
  | "reminder_1"
  | "expiry_day"
  | "expired";

type BuildArgs = {
  name?: string | null;
  /** ISO timestamp of when the membership ends. */
  periodEnd: string;
};

export type BuiltEmail = {
  subject: string;
  html: string;
  text: string;
};

const BRAND = "Hano Insiders";
const ACCENT = "#e6b450"; // warm gold accent

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function firstName(name?: string | null): string {
  if (!name) return "there";
  return name.trim().split(/\s+/)[0] || "there";
}

function renderLayout(opts: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote?: string;
}): string {
  const { preheader, heading, bodyHtml, ctaLabel, ctaUrl, footerNote } = opts;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#0e0f12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0e0f12;padding:32px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#16181d;border:1px solid #24272e;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:28px 36px 0 36px;">
            <p style="margin:0;font-size:18px;font-weight:700;letter-spacing:0.04em;color:#ffffff;">${BRAND}</p>
            <div style="height:3px;width:44px;background:${ACCENT};border-radius:3px;margin-top:10px;"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 36px 8px 36px;">
            <h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.3;color:#ffffff;font-weight:700;">${heading}</h1>
            <div style="font-size:15px;line-height:1.65;color:#c4c8d0;">${bodyHtml}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px 8px 36px;">
            <a href="${ctaUrl}" style="display:inline-block;background:${ACCENT};color:#0e0f12;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:10px;">${ctaLabel}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 36px 30px 36px;">
            ${footerNote ? `<p style="margin:0 0 14px 0;font-size:13px;line-height:1.6;color:#8b909a;">${footerNote}</p>` : ""}
            <hr style="border:none;border-top:1px solid #24272e;margin:8px 0 16px 0;" />
            <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7079;">
              You're receiving this because you hold a ${BRAND} membership.<br />
              Need help? Just reply to this email and we'll get back to you.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function buildSubscriptionEmail(type: SubscriptionEmailType, args: BuildArgs): BuiltEmail {
  const name = firstName(args.name);
  const endDate = formatDate(args.periodEnd);
  const renewUrl = `${getSiteUrl()}/?renew=1#pricing`;

  switch (type) {
    case "reminder_7": {
      const subject = `Your ${BRAND} membership expires in 7 days`;
      const bodyHtml = `Hi ${name},<br /><br />
        This is a friendly heads-up that your ${BRAND} membership is set to expire on <strong style="color:#ffffff;">${endDate}</strong> — that's 7 days away.<br /><br />
        Renew now to keep uninterrupted access to insights, market data, and the full member dashboard.`;
      const text = `Hi ${name},\n\nYour ${BRAND} membership is set to expire on ${endDate} (7 days away).\n\nRenew now to keep uninterrupted access: ${renewUrl}\n\nNeed help? Just reply to this email.\n\n— ${BRAND}`;
      return { subject, text, html: renderLayout({ preheader: `7 days left on your ${BRAND} membership`, heading: "Your membership expires in 7 days", bodyHtml, ctaLabel: "Renew membership", ctaUrl: renewUrl }) };
    }

    case "reminder_3": {
      const subject = `3 days left on your ${BRAND} membership`;
      const bodyHtml = `Hi ${name},<br /><br />
        Just a reminder that your ${BRAND} membership expires on <strong style="color:#ffffff;">${endDate}</strong> — only 3 days left.<br /><br />
        To avoid losing access, renew before then.`;
      const text = `Hi ${name},\n\nYour ${BRAND} membership expires on ${endDate} — only 3 days left.\n\nRenew now: ${renewUrl}\n\nNeed help? Just reply to this email.\n\n— ${BRAND}`;
      return { subject, text, html: renderLayout({ preheader: `Only 3 days left`, heading: "3 days left on your membership", bodyHtml, ctaLabel: "Renew membership", ctaUrl: renewUrl }) };
    }

    case "reminder_1": {
      const subject = `Last reminder: your ${BRAND} membership expires tomorrow`;
      const bodyHtml = `Hi ${name},<br /><br />
        Your ${BRAND} membership expires <strong style="color:#ffffff;">tomorrow, ${endDate}</strong>.<br /><br />
        This is the final reminder before access ends. Renew now to stay in.`;
      const text = `Hi ${name},\n\nYour ${BRAND} membership expires tomorrow, ${endDate}.\n\nThis is the final reminder before access ends. Renew now: ${renewUrl}\n\nNeed help? Just reply to this email.\n\n— ${BRAND}`;
      return { subject, text, html: renderLayout({ preheader: `Your membership expires tomorrow`, heading: "Your membership expires tomorrow", bodyHtml, ctaLabel: "Renew now", ctaUrl: renewUrl }) };
    }

    case "expiry_day": {
      const subject = `Your ${BRAND} membership expires today`;
      const bodyHtml = `Hi ${name},<br /><br />
        Your ${BRAND} membership expires <strong style="color:#ffffff;">today (${endDate})</strong>.<br /><br />
        Renew now to keep your access active — once it lapses, dashboard access will be removed until you renew.`;
      const text = `Hi ${name},\n\nYour ${BRAND} membership expires today (${endDate}).\n\nRenew now to keep your access active: ${renewUrl}\n\nNeed help? Just reply to this email.\n\n— ${BRAND}`;
      return { subject, text, html: renderLayout({ preheader: `Your membership expires today`, heading: "Your membership expires today", bodyHtml, ctaLabel: "Renew now", ctaUrl: renewUrl }) };
    }

    case "expired": {
      const subject = `Your ${BRAND} membership has expired`;
      const bodyHtml = `Hi ${name},<br /><br />
        Your ${BRAND} membership expired on <strong style="color:#ffffff;">${endDate}</strong>. Dashboard access has been removed until you renew.<br /><br />
        We'd love to have you back — renew anytime to instantly restore your full member access.`;
      const text = `Hi ${name},\n\nYour ${BRAND} membership expired on ${endDate}. Dashboard access has been removed until you renew.\n\nRenew anytime to instantly restore full access: ${renewUrl}\n\nNeed help? Just reply to this email.\n\n— ${BRAND}`;
      return { subject, text, html: renderLayout({ preheader: `Your membership has expired`, heading: "Your membership has expired", bodyHtml, ctaLabel: "Reactivate membership", ctaUrl: renewUrl, footerNote: "Your data and settings are saved — renewing restores everything exactly as you left it." }) };
    }
  }
}
