import { getSiteUrl } from "@/lib/site-url";

type WelcomeArgs = {
  firstName?: string | null;
  planLabel?: string | null;
};

export type BuiltEmail = {
  subject: string;
  html: string;
  text: string;
};

const BRAND = "Hano Insiders";
const ACCENT = "#e6b450";

function firstName(name?: string | null): string {
  if (!name) return "there";
  return name.trim().split(/\s+/)[0] || "there";
}

export function buildWelcomeEmail(args: WelcomeArgs): BuiltEmail {
  const name = firstName(args.firstName);
  const plan = args.planLabel?.trim() || "membership";
  const registerUrl = `${getSiteUrl()}/register`;
  const dashboardUrl = `${getSiteUrl()}/dashboard`;

  const subject = `Welcome to ${BRAND} — your ${plan} is confirmed`;
  const bodyHtml = `Hi ${name},<br /><br />
    Thank you for joining <strong style="color:#ffffff;">${BRAND}</strong>. Your payment for <strong style="color:#ffffff;">${plan}</strong> was successful.<br /><br />
  If you have not created your account yet, use the same email address you paid with to complete registration. Once you are in, your full member dashboard, market data, and insights will be ready.`;

  const text = `Hi ${name},\n\nThank you for joining ${BRAND}. Your payment for ${plan} was successful.\n\nComplete registration (use the same email you paid with): ${registerUrl}\n\nMember dashboard: ${dashboardUrl}\n\nNeed help? Reply to this email.\n\n— ${BRAND}`;

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#0e0f12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0e0f12;padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#16181d;border:1px solid #24272e;border-radius:16px;">
<tr><td style="padding:28px 36px 0 36px;"><p style="margin:0;font-size:18px;font-weight:700;color:#fff;">${BRAND}</p><div style="height:3px;width:44px;background:${ACCENT};border-radius:3px;margin-top:10px;"></div></td></tr>
<tr><td style="padding:24px 36px 8px 36px;"><h1 style="margin:0 0 14px 0;font-size:22px;color:#fff;">You're in — welcome aboard</h1><div style="font-size:15px;line-height:1.65;color:#c4c8d0;">${bodyHtml}</div></td></tr>
<tr><td style="padding:20px 36px 8px 36px;"><a href="${registerUrl}" style="display:inline-block;background:${ACCENT};color:#0e0f12;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:10px;">Complete registration</a></td></tr>
<tr><td style="padding:18px 36px 30px 36px;"><p style="margin:0;font-size:12px;line-height:1.6;color:#6b7079;">Already registered? <a href="${dashboardUrl}" style="color:${ACCENT};">Open your dashboard</a>.</p></td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  return { subject, html, text };
}
