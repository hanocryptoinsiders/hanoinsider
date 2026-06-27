import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email/resend";
import { buildSubscriptionEmail, type SubscriptionEmailType } from "@/lib/email/subscription-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Reminder emails keyed by exact whole-days remaining until expiry. */
const REMINDER_BY_DAYS: Record<number, SubscriptionEmailType> = {
  7: "reminder_7",
  3: "reminder_3",
  1: "reminder_1",
  0: "expiry_day",
};

/**
 * Authorizes the cron request. Accepts (in order):
 *   - Authorization: Bearer <CRON_SECRET>   (Vercel Cron sends this automatically
 *                                            when CRON_SECRET is set in the project)
 *   - x-cron-secret: <CRON_SECRET>
 *   - ?secret=<CRON_SECRET>
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth && auth === `Bearer ${secret}`) return true;
  if (request.headers.get("x-cron-secret") === secret) return true;
  if (new URL(request.url).searchParams.get("secret") === secret) return true;
  return false;
}

/** Whole days from local midnight today until the given timestamp. */
function daysUntil(periodEnd: string): number {
  const end = new Date(periodEnd).getTime();
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  return Math.ceil((end - midnight.getTime()) / DAY_MS);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const now = Date.now();
  const nowIso = new Date().toISOString();

  // Candidates: premium members with an expiry date within the next 8 days
  // (covers the 7-day reminder) OR already in the past (need revoking).
  const horizonIso = new Date(now + 8 * DAY_MS).toISOString();
  const { data: members, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, subscription_current_period_end, subscription_plan, premium_source, subscription_status",
    )
    .eq("is_premium", true)
    .not("subscription_current_period_end", "is", null)
    .lte("subscription_current_period_end", horizonIso);

  if (error) {
    console.error("[cron/subscriptions] query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = {
    checked: members?.length ?? 0,
    emailsSent: 0,
    emailsSkippedNoKey: 0,
    alreadySent: 0,
    revoked: 0,
    errors: [] as string[],
  };

  for (const m of members ?? []) {
    const periodEnd = m.subscription_current_period_end as string | null;
    if (!periodEnd) continue;

    // Lifetime / early-bird never expires → never remind or revoke.
    if (m.subscription_plan === "early_bird" || m.premium_source === "lifetime") {
      continue;
    }

    const expired = new Date(periodEnd).getTime() <= now;
    const dleft = daysUntil(periodEnd);

    // Decide which (if any) email applies on this run.
    let type: SubscriptionEmailType | null = null;
    if (expired) {
      type = "expired";
    } else if (Object.prototype.hasOwnProperty.call(REMINDER_BY_DAYS, dleft)) {
      type = REMINDER_BY_DAYS[dleft];
    }

    // Send + log the email first (so a revoke never hides the "expired" notice
    // from the next query — the row is still is_premium=true during this run).
    if (type && m.email) {
      const { data: existing } = await supabase
        .from("subscription_email_log")
        .select("id")
        .eq("user_id", m.id)
        .eq("email_type", type)
        .eq("period_end", periodEnd)
        .maybeSingle();

      if (existing) {
        results.alreadySent++;
      } else {
        const tmpl = buildSubscriptionEmail(type, { name: m.full_name, periodEnd });
        const sendRes = await sendEmail({
          to: m.email,
          subject: tmpl.subject,
          html: tmpl.html,
          text: tmpl.text,
          tags: [{ name: "type", value: type }],
        });

        if (sendRes.skipped) {
          results.emailsSkippedNoKey++;
        } else if (sendRes.error) {
          results.errors.push(`${m.email} (${type}): ${sendRes.error}`);
        } else {
          // Record only real sends so they retry once the API key is configured.
          const { error: logErr } = await supabase.from("subscription_email_log").insert({
            user_id: m.id,
            email: m.email,
            email_type: type,
            period_end: periodEnd,
            resend_id: sendRes.id,
          });
          if (logErr) results.errors.push(`log ${m.email} (${type}): ${logErr.message}`);
          results.emailsSent++;
        }
      }
    }

    // Auto-revoke access for anyone whose plan has expired.
    if (expired) {
      const { error: revokeErr } = await supabase
        .from("profiles")
        .update({
          is_premium: false,
          role: "free",
          subscription_status: "expired",
          updated_at: nowIso,
        })
        .eq("id", m.id)
        .eq("is_premium", true);
      if (revokeErr) {
        results.errors.push(`revoke ${m.email}: ${revokeErr.message}`);
      } else {
        results.revoked++;
      }
    }
  }

  return NextResponse.json(results);
}
