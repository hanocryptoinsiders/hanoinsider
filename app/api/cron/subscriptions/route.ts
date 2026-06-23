import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function dayDiff(date: string) {
  const target = new Date(date).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today.getTime()) / (24 * 60 * 60 * 1000));
}

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const nowIso = new Date().toISOString();

  const { data: expiring, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, subscription_current_period_end, subscription_status")
    .eq("is_premium", true)
    .not("subscription_current_period_end", "is", null)
    .lte("subscription_current_period_end", new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const reminders = (expiring || [])
    .map((profile) => ({ ...profile, daysUntilExpiry: dayDiff(profile.subscription_current_period_end) }))
    .filter((profile) => [7, 3, 1, 0].includes(profile.daysUntilExpiry));

  const expiredIds = (expiring || [])
    .filter((profile) => new Date(profile.subscription_current_period_end).getTime() < Date.now())
    .map((profile) => profile.id);

  if (expiredIds.length) {
    await supabase
      .from("profiles")
      .update({ is_premium: false, role: "free", subscription_status: "expired", updated_at: nowIso })
      .in("id", expiredIds);
  }

  return NextResponse.json({
    checked: expiring?.length || 0,
    remindersPrepared: reminders.length,
    revoked: expiredIds.length,
    note: "Wire SMTP delivery here using SMTP_* env vars or a transactional email provider. Required reminder days: 7, 3, 1, and 0 days before expiry.",
  });
}