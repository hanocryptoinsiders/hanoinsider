import { getSiteUrl } from "@/lib/site-url";

const BRAND = "Hano Insiders";
const ACCENT = "#e6b450";

export type BuiltCommunityEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Converts plain-text admin message to simple HTML paragraphs. */
function messageToHtml(message: string): string {
  return escapeHtml(message)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px 0;">${p.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function buildCommunityUpdateEmail(subject: string, message: string): BuiltCommunityEmail {
  const dashboardUrl = `${getSiteUrl()}/dashboard`;
  const bodyHtml = messageToHtml(message.trim());
  const text = `${message.trim()}\n\n— ${BRAND}\nOpen your dashboard: ${dashboardUrl}`;

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#0e0f12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0e0f12;padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#16181d;border:1px solid #24272e;border-radius:16px;">
<tr><td style="padding:28px 36px 0 36px;"><p style="margin:0;font-size:18px;font-weight:700;color:#fff;">${BRAND}</p><div style="height:3px;width:44px;background:${ACCENT};border-radius:3px;margin-top:10px;"></div></td></tr>
<tr><td style="padding:24px 36px 8px 36px;"><h1 style="margin:0 0 14px 0;font-size:22px;color:#fff;">${escapeHtml(subject)}</h1><div style="font-size:15px;line-height:1.65;color:#c4c8d0;">${bodyHtml}</div></td></tr>
<tr><td style="padding:20px 36px 30px 36px;"><a href="${dashboardUrl}" style="display:inline-block;background:${ACCENT};color:#0e0f12;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:10px;">Open dashboard</a></td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  return { subject: subject.trim(), html, text };
}
