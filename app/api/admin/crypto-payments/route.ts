import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchAdminCryptoPayments, getSignedProofUrl } from "@/lib/crypto-payment-service";

export const runtime = "nodejs";

async function requireAdminApi() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user };
}

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if ("error" in auth && auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search") ?? undefined;

  const validStatus =
    status === "pending" || status === "approved" || status === "rejected" ? status : undefined;

  const rows = await fetchAdminCryptoPayments({ status: validStatus, search });

  const withProofUrls = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      proof_screenshot_url: row.proof_screenshot_path
        ? await getSignedProofUrl(row.proof_screenshot_path)
        : null,
    })),
  );

  return NextResponse.json({ payments: withProofUrls });
}
