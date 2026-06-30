import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { manuallyApproveCryptoIntent } from "@/lib/crypto/payment-intents";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const txHash = typeof body.txHash === "string" ? body.txHash : null;
  const note = typeof body.note === "string" ? body.note : null;

  const outcome = await manuallyApproveCryptoIntent(id, user.id, { txHash, note });
  if (outcome.status !== "confirmed") {
    return NextResponse.json(
      { error: `Could not activate (${outcome.reason ?? outcome.status}).`, status: outcome.status },
      { status: 400 },
    );
  }
  return NextResponse.json({ success: true, status: outcome.status });
}
