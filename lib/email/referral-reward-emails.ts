/**
 * lib/email/referral-reward-emails.ts
 * Sent when admin marks a referral reward as completed.
 */

import { sendEmail } from "@/lib/email/resend";

export type ReferralRewardEmailParams = {
  to: string;
  recipientName: string | null;
  rewardType: "referrer" | "referred";
  amount: number;
  currency: string;
  network: string;
  transactionHash: string | null;
};

function buildReferralRewardEmail(params: ReferralRewardEmailParams) {
  const name = params.recipientName || "Hano Insider";
  const isReferrer = params.rewardType === "referrer";
  const subject = isReferrer
    ? "Your referral reward has been sent"
    : "Your referral bonus has been sent";

  const headline = isReferrer
    ? "Thank you for sharing Hano Insiders"
    : "Your referral reward is on the way";

  const bodyLine = isReferrer
    ? `We've sent your $${params.amount.toFixed(2)} ${params.currency} referral reward on ${params.network} for a successful referral.`
    : `We've sent your $${params.amount.toFixed(2)} ${params.currency} referral bonus (${Math.round(20)}% of your package) on ${params.network}.`;

  const txLine = params.transactionHash
    ? `<p style="margin:16px 0 0;font-size:14px;color:#666;">Transaction: <code style="background:#f4f4f4;padding:2px 6px;border-radius:4px;word-break:break-all;">${params.transactionHash}</code></p>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0c0d10;color:#fff;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:#141519;border:1px solid #2a2b32;border-radius:12px;padding:32px;">
    <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#888;margin:0 0 8px;">Hano Insiders</p>
    <h1 style="font-size:22px;margin:0 0 16px;color:#fff;">${headline}</h1>
    <p style="font-size:15px;line-height:1.6;color:#ccc;margin:0;">Hi ${name},</p>
    <p style="font-size:15px;line-height:1.6;color:#ccc;margin:16px 0 0;">${bodyLine}</p>
    ${txLine}
    <p style="font-size:14px;line-height:1.6;color:#888;margin:24px 0 0;">You can view your referral history anytime in your dashboard.</p>
  </div>
</body>
</html>`;

  const text = [
    `Hi ${name},`,
    "",
    bodyLine,
    params.transactionHash ? `Transaction: ${params.transactionHash}` : "",
    "",
    "View your referral history in your Hano Insiders dashboard.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

export async function sendReferralRewardCompletedEmail(params: ReferralRewardEmailParams) {
  const { subject, html, text } = buildReferralRewardEmail(params);
  return sendEmail({ to: params.to, subject, html, text });
}
