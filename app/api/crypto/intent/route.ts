import { NextResponse } from "next/server";
import { createCryptoIntent } from "@/lib/crypto/payment-intents";
import { isCryptoPaymentsEnabled } from "@/lib/crypto-payments";

export const runtime = "nodejs";

/** Public: starts an automatic on-chain crypto payment for a plan + email. */
export async function POST(request: Request) {
  if (!isCryptoPaymentsEnabled()) {
    return NextResponse.json({ error: "Crypto payments are not available." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await createCryptoIntent({
    fullName: typeof body.fullName === "string" ? body.fullName : null,
    email: typeof body.email === "string" ? body.email : "",
    planId: typeof body.planId === "string" ? body.planId : "",
  });

  if (!result.success) {
    const status =
      result.code === "db_error" || result.code === "not_configured"
        ? 500
        : result.code === "active_subscriber" || result.code === "already_registered" || result.code === "already_paid"
          ? 409
          : 400;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json({ success: true, intent: result.intent });
}
