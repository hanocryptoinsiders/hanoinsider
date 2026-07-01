import { NextResponse } from "next/server";
import { normalizeEmail, isValidEmail } from "@/lib/payments";
import { getRegistrationEligibilityStatus } from "@/lib/registration-eligibility";

export const runtime = "nodejs";

/**
 * Lightweight registration-eligibility check for inline UX on the register page.
 * Returns one of: "eligible" | "not_paid" | "pending_crypto_review" | "already_registered".
 * The authoritative enforcement still lives in /api/auth/register.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(typeof body.email === "string" ? body.email : "");

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ status: "invalid" });
    }

    const status = await getRegistrationEligibilityStatus(email);
    return NextResponse.json({ status });
  } catch (error) {
    console.error("[auth/check-eligibility]", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
