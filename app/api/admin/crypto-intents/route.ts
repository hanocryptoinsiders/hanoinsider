import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listCryptoIntents, type IntentStatus } from "@/lib/crypto/payment-intents";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { error: "Forbidden" as const, status: 403 };
  return { user };
}

const STATUSES: IntentStatus[] = ["pending", "confirmed", "expired", "failed"];

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status = statusParam && STATUSES.includes(statusParam as IntentStatus) ? (statusParam as IntentStatus) : undefined;
  const search = url.searchParams.get("search") || undefined;

  const intents = await listCryptoIntents({ status, search });
  return NextResponse.json({ intents });
}
