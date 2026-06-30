import { getSiteUrl } from "@/lib/site-url";
import { getSupportEmail } from "@/lib/support-email";
import type { BuiltEmail } from "@/lib/email/welcome-email";

const BRAND = "Hano Insiders";
const ACCENT = "#9b82dc";

function emailShell(subject: string, heading: string, bodyHtml: string, cta?: { label: string; href: string }) {
  const ctaHtml = cta
    ? `<tr><td style="padding:20px 36px 8px 36px;"><a href="${cta.href}" style="display:inline-block;background:${ACCENT};color:#0e0f12;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:10px;">${cta.label}</a></td></tr>`
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#0e0f12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0e0f12;padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#16181d;border:1px solid #24272e;border-radius:16px;">
<tr><td style="padding:28px 36px 0 36px;"><p style="margin:0;font-size:18px;font-weight:700;color:#fff;">${BRAND}</p><div style="height:3px;width:44px;background:${ACCENT};border-radius:3px;margin-top:10px;"></div></td></tr>
<tr><td style="padding:24px 36px 8px 36px;"><h1 style="margin:0 0 14px 0;font-size:22px;color:#fff;">${heading}</h1><div style="font-size:15px;line-height:1.65;color:#c4c8d0;">${bodyHtml}</div></td></tr>
${ctaHtml}
<tr><td style="padding:18px 36px 30px 36px;"><p style="margin:0;font-size:12px;line-height:1.6;color:#6b7079;">Need help? Reply to this email or contact ${getSupportEmail()}.</p></td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function buildCryptoProofReceivedEmail(args: {
  firstName?: string | null;
  planName: string;
  verificationHours: number;
}): BuiltEmail {
  const name = args.firstName?.trim().split(/\s+/)[0] || "there";
  const subject = `Payment proof received — ${BRAND}`;
  const bodyHtml = `Hi ${name},<br /><br />
    We received your crypto payment proof for <strong style="color:#ffffff;">${args.planName}</strong>.<br /><br />
    Your submission is <strong style="color:#ffffff;">pending manual review</strong>. Our team will verify your transaction on-chain — this typically takes up to <strong style="color:#ffffff;">${args.verificationHours} hours</strong> during business days.<br /><br />
    Please do <strong style="color:#ffffff;">not submit duplicate proof</strong> unless we ask you to. You will receive another email once your payment is approved or if we need more information.`;

  const text = `Hi ${name},\n\nWe received your crypto payment proof for ${args.planName}.\n\nStatus: pending manual review (up to ${args.verificationHours} hours).\n\nDo not submit duplicate proof unless requested.\n\nSupport: ${getSupportEmail()}\n\n— ${BRAND}`;

  return { subject, html: emailShell(subject, "Payment proof received", bodyHtml), text };
}

export function buildCryptoPaymentApprovedEmail(args: {
  firstName?: string | null;
  planName: string;
}): BuiltEmail {
  const name = args.firstName?.trim().split(/\s+/)[0] || "there";
  const registerUrl = `${getSiteUrl()}/register`;
  const dashboardUrl = `${getSiteUrl()}/dashboard`;
  const subject = `Payment verified — complete your ${BRAND} registration`;
  const bodyHtml = `Hi ${name},<br /><br />
    Great news — your crypto payment for <strong style="color:#ffffff;">${args.planName}</strong> has been <strong style="color:#ffffff;">verified successfully</strong>. Your membership access is now approved.<br /><br />
    <strong style="color:#ffffff;">Next step:</strong> create your account using the <strong style="color:#ffffff;">same email address</strong> you used when submitting payment proof. Once registered, your full member dashboard, market data, and insights will be ready.<br /><br />
    Already registered? <a href="${dashboardUrl}" style="color:${ACCENT};">Open your dashboard</a>.`;

  const text = `Hi ${name},\n\nYour crypto payment for ${args.planName} was verified. Your membership is approved.\n\nComplete registration (use the same email from payment): ${registerUrl}\n\nMember dashboard: ${dashboardUrl}\n\nNeed help? Reply to this email.\n\n— ${BRAND}`;

  return {
    subject,
    html: emailShell(subject, "Payment verified — you're approved", bodyHtml, {
      label: "Complete registration",
      href: registerUrl,
    }),
    text,
  };
}

export function buildCryptoPaymentReceivedEmail(args: {
  firstName?: string | null;
  planName: string;
  amount: number;
  currency: string;
  alreadyRegistered: boolean;
}): BuiltEmail {
  const name = args.firstName?.trim().split(/\s+/)[0] || "there";
  const registerUrl = `${getSiteUrl()}/register`;
  const dashboardUrl = `${getSiteUrl()}/dashboard`;
  const amountLabel = `${args.amount} ${args.currency}`;
  const subject = `Payment received — your ${BRAND} access is active`;

  const nextStep = args.alreadyRegistered
    ? `Your membership has been <strong style="color:#ffffff;">activated</strong> on your existing account — just <a href="${dashboardUrl}" style="color:${ACCENT};">open your dashboard</a> and you're in.`
    : `<strong style="color:#ffffff;">Next step:</strong> create your account using the <strong style="color:#ffffff;">same email address</strong> you used for this payment. Your member dashboard, market data, and insights unlock immediately.`;

  const bodyHtml = `Hi ${name},<br /><br />
    We received and verified your crypto payment of <strong style="color:#ffffff;">${amountLabel}</strong> for <strong style="color:#ffffff;">${args.planName}</strong>. Your transaction was confirmed on-chain — nothing else is needed from you to complete the payment.<br /><br />
    ${nextStep}`;

  const text = args.alreadyRegistered
    ? `Hi ${name},\n\nWe received and verified your crypto payment of ${amountLabel} for ${args.planName}. Your membership is active.\n\nOpen your dashboard: ${dashboardUrl}\n\n— ${BRAND}`
    : `Hi ${name},\n\nWe received and verified your crypto payment of ${amountLabel} for ${args.planName}. Your access is approved.\n\nCreate your account (use the same email): ${registerUrl}\n\n— ${BRAND}`;

  return {
    subject,
    html: emailShell(subject, "Payment received — you're in", bodyHtml, {
      label: args.alreadyRegistered ? "Open dashboard" : "Complete registration",
      href: args.alreadyRegistered ? dashboardUrl : registerUrl,
    }),
    text,
  };
}

export function buildCryptoPaymentRejectedEmail(args: {
  firstName?: string | null;
  planName: string;
  adminNotes?: string | null;
}): BuiltEmail {
  const name = args.firstName?.trim().split(/\s+/)[0] || "there";
  const support = getSupportEmail();
  const noteBlock = args.adminNotes
    ? `<br /><br /><strong style="color:#ffffff;">Note from our team:</strong><br />${args.adminNotes}`
    : "";
  const subject = `Payment could not be verified — ${BRAND}`;
  const bodyHtml = `Hi ${name},<br /><br />
    We were unable to verify your crypto payment for <strong style="color:#ffffff;">${args.planName}</strong>.${noteBlock}<br /><br />
    Please contact support at <a href="mailto:${support}" style="color:${ACCENT};">${support}</a> with your correct transaction details (transaction hash, network, and amount sent).`;

  const text = `Hi ${name},\n\nWe could not verify your crypto payment for ${args.planName}.${args.adminNotes ? `\n\nNote: ${args.adminNotes}` : ""}\n\nContact support: ${support}\n\n— ${BRAND}`;

  return { subject, html: emailShell(subject, "Payment not verified", bodyHtml), text };
}
