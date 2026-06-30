import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rejectCryptoIntent } from "@/lib/crypto/payment-intents";

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
  const note = typeof body.note === "string" ? body.note : null;

  const result = await rejectCryptoIntent(id, user.id, note);
  if (!result.success) return NextResponse.json({ error: result.error || "Failed to reject" }, { status: 400 });
  return NextResponse.json({ success: true });
}
