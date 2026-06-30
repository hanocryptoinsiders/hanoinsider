import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recheckCryptoIntent } from "@/lib/crypto/payment-intents";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const outcome = await recheckCryptoIntent(id);
  return NextResponse.json({ status: outcome.status, reason: outcome.reason ?? null });
}
