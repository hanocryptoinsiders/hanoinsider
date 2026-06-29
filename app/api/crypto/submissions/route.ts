import { NextResponse } from "next/server";
import {
  createCryptoPaymentSubmission,
  uploadCryptoProofScreenshot,
} from "@/lib/crypto-payment-service";
import { isCryptoPaymentsEnabled } from "@/lib/crypto-payments";

export const runtime = "nodejs";

async function parseSubmissionRequest(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const proofFile = formData.get("proof");
    let proofScreenshotPath: string | null = null;

    if (proofFile instanceof File && proofFile.size > 0) {
      const upload = await uploadCryptoProofScreenshot(proofFile);
      if (!upload.success) {
        return { error: upload.error, code: "upload_failed" as const };
      }
      proofScreenshotPath = upload.path;
    }

    return {
      input: {
        fullName: String(formData.get("fullName") ?? ""),
        email: String(formData.get("email") ?? ""),
        planId: String(formData.get("planId") ?? ""),
        amountPaid: formData.get("amountPaid"),
        currency: String(formData.get("currency") ?? ""),
        network: String(formData.get("network") ?? ""),
        transactionHash: String(formData.get("transactionHash") ?? ""),
        senderWalletAddress: String(formData.get("senderWalletAddress") ?? ""),
        proofScreenshotPath,
        userNotes: String(formData.get("userNotes") ?? "") || null,
      },
    };
  }

  const body = await request.json().catch(() => ({}));
  return {
    input: {
      fullName: typeof body.fullName === "string" ? body.fullName : "",
      email: typeof body.email === "string" ? body.email : "",
      planId: typeof body.planId === "string" ? body.planId : "",
      amountPaid: body.amountPaid,
      currency: typeof body.currency === "string" ? body.currency : "",
      network: typeof body.network === "string" ? body.network : "",
      transactionHash: typeof body.transactionHash === "string" ? body.transactionHash : "",
      senderWalletAddress: typeof body.senderWalletAddress === "string" ? body.senderWalletAddress : "",
      proofScreenshotPath:
        typeof body.proofScreenshotPath === "string" ? body.proofScreenshotPath : null,
      userNotes: typeof body.userNotes === "string" ? body.userNotes : null,
    },
  };
}

export async function POST(request: Request) {
  if (!isCryptoPaymentsEnabled()) {
    return NextResponse.json({ error: "Crypto payments are not available." }, { status: 503 });
  }

  try {
    const parsed = await parseSubmissionRequest(request);
    if ("error" in parsed && parsed.error) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: 400 });
    }

    const result = await createCryptoPaymentSubmission(parsed.input!);

    if (!result.success) {
      const status =
        result.code === "duplicate_tx_hash"
          ? 409
          : result.code === "db_error"
            ? 500
            : 400;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      message:
        "Payment proof received. Your submission is pending manual review. You will receive an email once verified.",
    });
  } catch (error) {
    console.error("[api/crypto/submissions]", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
