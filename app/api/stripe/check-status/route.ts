import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isPremium: false, authenticated: false });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium, role, subscription_status, subscription_current_period_end")
      .eq("id", user.id)
      .single();

    const periodEnd = profile?.subscription_current_period_end
      ? new Date(profile.subscription_current_period_end).getTime()
      : null;

    const isPremium =
      profile?.role === "admin" ||
      ((profile?.is_premium === true || profile?.role === "premium") &&
        !["expired", "cancelled", "canceled", "past_due", "inactive"].includes(profile?.subscription_status ?? "") &&
        (!periodEnd || periodEnd > Date.now()));

    return NextResponse.json({ isPremium, authenticated: true });
  } catch {
    return NextResponse.json({ isPremium: false, authenticated: false });
  }
}
