import { NextResponse } from "next/server";
import { uploadCryptoProofScreenshot } from "@/lib/crypto-payment-service";
import { isCryptoPaymentsEnabled } from "@/lib/crypto-payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isCryptoPaymentsEnabled()) {
    return NextResponse.json({ error: "Crypto payments are not available." }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const result = await uploadCryptoProofScreenshot(file);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, path: result.path });
  } catch (error) {
    console.error("[api/crypto/upload-proof]", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
