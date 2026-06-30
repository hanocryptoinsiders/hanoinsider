import { NextResponse } from "next/server";
import { getCryptoIntent, verifyAndSettleIntent } from "@/lib/crypto/payment-intents";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Public: poll an intent's status. Runs a fresh on-chain check on each call so
 * the buyer gets near-instant confirmation while the page is open (the Railway
 * watcher does the same out-of-band so confirmation still happens if they
 * close the tab).
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing intent id" }, { status: 400 });
  }

  const existing = await getCryptoIntent(id);
  if (!existing) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Re-verify pending intents on demand; confirmed/expired short-circuit.
  if (existing.status === "pending") {
    const outcome = await verifyAndSettleIntent(id);
    const refreshed = await getCryptoIntent(id);
    return NextResponse.json({
      status: outcome.status,
      reason: outcome.reason ?? null,
      intent: refreshed ?? existing,
    });
  }

  return NextResponse.json({ status: existing.status, reason: null, intent: existing });
}
