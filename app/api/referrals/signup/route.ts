import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST() {
  try {
    const supabaseServer = await createServerClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceClient();

    // 1. Check if user already has an existing referral attribution
    const { data: existingReferral, error: referralError } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_user_id", user.id)
      .maybeSingle();

    if (existingReferral) {
      // User is already referred. Do not overwrite. Clear cookie if still present.
      const cookieStore = await cookies();
      cookieStore.delete("hano_ref");
      return NextResponse.json({ success: true, attributed: false, message: "Attribution already exists" });
    }

    // 2. Read the hano_ref cookie
    const cookieStore = await cookies();
    const referralCode = cookieStore.get("hano_ref")?.value;

    if (!referralCode) {
      return NextResponse.json({ success: true, attributed: false, message: "No referral cookie found" });
    }

    // 3. Validate affiliate status and code
    const { data: affiliate, error: affiliateError } = await supabase
      .from("affiliates")
      .select("id, user_id, status")
      .eq("referral_code", referralCode.toLowerCase().trim())
      .single();

    if (affiliateError || !affiliate || affiliate.status !== "active") {
      // Invalid code or disabled affiliate. Clear the cookie.
      cookieStore.delete("hano_ref");
      return NextResponse.json({ success: true, attributed: false, message: "Invalid or inactive referral code" });
    }

    // 4. Prevent self-referral
    if (affiliate.user_id === user.id) {
      console.warn(`[referral-signup] Self-referral blocked for user ${user.id}`);
      cookieStore.delete("hano_ref");
      return NextResponse.json({ success: true, attributed: false, message: "Self-referral is not allowed" });
    }

    // 5. Look up first click time from referral_clicks using the visitor ID cookie
    const visitorId = cookieStore.get("hano_visitor_id")?.value;
    let firstClickAt: string | null = null;

    if (visitorId) {
      const { data: firstClick } = await supabase
        .from("referral_clicks")
        .select("created_at")
        .eq("affiliate_id", affiliate.id)
        .eq("visitor_id", visitorId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstClick) {
        firstClickAt = firstClick.created_at;
      }
    }

    if (!firstClickAt) {
      firstClickAt = new Date().toISOString();
    }

    // 6. Insert referral record
    const { error: insertError } = await supabase
      .from("referrals")
      .insert({
        affiliate_id: affiliate.id,
        referred_user_id: user.id,
        referral_code: referralCode.toLowerCase().trim(),
        status: "signed_up",
        first_click_at: firstClickAt,
        signed_up_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("[referral-signup] Error inserting referral record:", insertError.message);
      return NextResponse.json({ error: "Failed to create referral record" }, { status: 500 });
    }

    // Clean up the cookie
    cookieStore.delete("hano_ref");

    return NextResponse.json({ success: true, attributed: true });
  } catch (error: any) {
    console.error("[referral-signup] API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
