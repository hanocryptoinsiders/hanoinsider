import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription-access";

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
      .select("role, is_premium, subscription_status, subscription_current_period_end")
      .eq("id", user.id)
      .single();

    const isPremium = hasActiveSubscription(profile);

    return NextResponse.json({ isPremium, authenticated: true });
  } catch {
    return NextResponse.json({ isPremium: false, authenticated: false });
  }
}
