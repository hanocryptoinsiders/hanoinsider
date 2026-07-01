import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { getServiceSupabase } from "@/lib/supabase/service";
import {
  REFERRAL_COOKIE,
  VISITOR_COOKIE,
  validateReferralCode,
} from "@/lib/referrals";

export async function POST(request: Request) {
  try {
    const { referralCode, landingPage, referrerUrl } = await request.json();

    if (!referralCode) {
      return NextResponse.json({ error: "Missing referral code" }, { status: 400 });
    }

    const cookieStore = await cookies();
    let visitorId = cookieStore.get(VISITOR_COOKIE)?.value;
    if (!visitorId) {
      visitorId = crypto.randomUUID();
    }

    cookieStore.set(VISITOR_COOKIE, visitorId, {
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    });

    const supabase = getServiceSupabase();
    const validated = await validateReferralCode(supabase, referralCode);

    if (!validated) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: "Invalid or inactive referral code",
      });
    }

    cookieStore.set(REFERRAL_COOKIE, validated.referralCode, {
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existingClick } = await supabase
      .from("referral_clicks")
      .select("id")
      .eq("affiliate_id", validated.affiliateId)
      .eq("visitor_id", visitorId)
      .gt("created_at", oneHourAgo)
      .limit(1)
      .maybeSingle();

    if (!existingClick) {
      const rawIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
      const ipHash = crypto.createHash("sha256").update(rawIp).digest("hex");
      const userAgent = request.headers.get("user-agent") || null;

      const { error: insertError } = await supabase.from("referral_clicks").insert({
        affiliate_id: validated.affiliateId,
        referral_code: validated.referralCode,
        visitor_id: visitorId,
        ip_hash: ipHash,
        user_agent: userAgent,
        landing_page: landingPage || "/pricing",
        referrer_url: referrerUrl || null,
      });

      if (insertError) {
        console.error("[referral-click] Error logging click:", insertError.message);
      }
    }

    return NextResponse.json({
      success: true,
      valid: true,
      duplicate: Boolean(existingClick),
      visitorId,
    });
  } catch (error: unknown) {
    console.error("[referral-click] API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("ref");
  if (!code) {
    return NextResponse.json({ valid: false });
  }

  try {
    const supabase = getServiceSupabase();
    const validated = await validateReferralCode(supabase, code);
    return NextResponse.json({ valid: Boolean(validated) });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
