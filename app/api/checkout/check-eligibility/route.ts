import { NextResponse } from "next/server";
import { getCheckoutEligibility } from "@/lib/checkout-eligibility";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isValidEmail, normalizeEmail } from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(typeof body.email === "string" ? body.email : "");

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ status: "invalid" }, { status: 400 });
    }

    const eligibility = await getCheckoutEligibility(getServiceSupabase(), email);
    return NextResponse.json(eligibility);
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
