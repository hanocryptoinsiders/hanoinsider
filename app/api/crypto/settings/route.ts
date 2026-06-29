import { NextResponse } from "next/server";
import { getPublicCryptoSettings } from "@/lib/crypto-payments";

export const runtime = "nodejs";

/** Public: active manual crypto payment settings (no private keys). */
export async function GET() {
  const settings = getPublicCryptoSettings();
  return NextResponse.json(settings);
}
