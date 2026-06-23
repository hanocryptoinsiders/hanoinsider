import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  try {
    const { referralCode, landingPage, referrerUrl } = await request.json();

    if (!referralCode) {
      return NextResponse.json({ error: "Missing referral code" }, { status: 400 });
    }

    const cookieStore = await cookies();
    let visitorId = cookieStore.get("hano_visitor_id")?.value;
    if (!visitorId) {
      visitorId = crypto.randomUUID();
    }

    // Set visitor ID cookie (30 days)
    cookieStore.set("hano_visitor_id", visitorId, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    const supabase = getServiceClient();

    // 1. Validate referral code & affiliate status
    const { data: affiliate, error: affiliateError } = await supabase
      .from("affiliates")
      .select("id, status")
      .eq("referral_code", referralCode.toLowerCase().trim())
      .single();

    if (affiliateError || !affiliate || affiliate.status !== "active") {
      // Code is invalid or affiliate is disabled. Do not set ref cookie.
      return NextResponse.json({ success: false, error: "Invalid or inactive referral code" });
    }

    // Set referral code cookie (30 days)
    cookieStore.set("hano_ref", referralCode.toLowerCase().trim(), {
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // 2. Prevent spam clicks (check if click logged for same affiliate and visitor in last 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existingClick } = await supabase
      .from("referral_clicks")
      .select("id")
      .eq("affiliate_id", affiliate.id)
      .eq("visitor_id", visitorId)
      .gt("created_at", oneHourAgo)
      .limit(1)
      .maybeSingle();

    if (existingClick) {
      // Already clicked within the last hour. Skip logging click in DB, but return success since cookies are refreshed.
      return NextResponse.json({ success: true, duplicate: true, visitorId });
    }

    // 3. Log click in referral_clicks table
    const rawIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
    const ipHash = crypto.createHash("sha256").update(rawIp).digest("hex");
    const userAgent = request.headers.get("user-agent") || null;

    const { error: insertError } = await supabase
      .from("referral_clicks")
      .insert({
        affiliate_id: affiliate.id,
        referral_code: referralCode.toLowerCase().trim(),
        visitor_id: visitorId,
        ip_hash: ipHash,
        user_agent: userAgent,
        landing_page: landingPage || "/",
        referrer_url: referrerUrl || null,
      });

    if (insertError) {
      console.error("[referral-click] Error logging click:", insertError.message);
      // Return success anyway so we don't break visitor UI/UX
    }

    return NextResponse.json({ success: true, duplicate: false, visitorId });
  } catch (error: any) {
    console.error("[referral-click] API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
