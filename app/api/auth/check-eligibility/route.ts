import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { normalizeEmail, isValidEmail } from "@/lib/payments";
import { hasPendingCryptoPayment } from "@/lib/crypto-payment-service";

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

    const supabase = getServiceSupabase();
    const { data: paid } = await supabase
      .from("paid_customers")
      .select("payment_status, has_registered, user_id")
      .eq("email", email)
      .maybeSingle();

    if (!paid || paid.payment_status !== "paid") {
      const pendingCrypto = await hasPendingCryptoPayment(email);
      if (pendingCrypto) {
        return NextResponse.json({ status: "pending_crypto_review" });
      }
      return NextResponse.json({ status: "not_paid" });
    }
    if (paid.has_registered || paid.user_id) {
      return NextResponse.json({ status: "already_registered" });
    }
    return NextResponse.json({ status: "eligible" });
  } catch {
    return NextResponse.json({ status: "error" });
  }
}
