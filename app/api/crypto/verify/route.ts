import { NextResponse } from "next/server";
import { verifyAndSettleIntent, getCryptoIntent } from "@/lib/crypto/payment-intents";
import { isCryptoPaymentsEnabled } from "@/lib/crypto-payments";

export const runtime = "nodejs";

/**
 * Public: buyer submits their transaction hash and asks us to verify now.
 * Stores the hash on the intent and runs an immediate on-chain check.
 */
export async function POST(request: Request) {
  if (!isCryptoPaymentsEnabled()) {
    return NextResponse.json({ error: "Crypto payments are not available." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const intentId = typeof body.intentId === "string" ? body.intentId : "";
  const txHash = typeof body.transactionHash === "string" ? body.transactionHash : null;
  const senderWallet = typeof body.senderWallet === "string" ? body.senderWallet : null;

  if (!intentId) {
    return NextResponse.json({ error: "Missing payment reference." }, { status: 400 });
  }

  const outcome = await verifyAndSettleIntent(intentId, { txHash, senderWallet });
  const intent = await getCryptoIntent(intentId);

  if (!intent) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  return NextResponse.json({ status: outcome.status, reason: outcome.reason ?? null, intent });
}
