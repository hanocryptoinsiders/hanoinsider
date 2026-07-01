import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const walletAddress =
      typeof body.walletAddress === "string" ? body.walletAddress.trim() : null;

    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: "Enter a valid EVM wallet address (0x…)." }, { status: 400 });
    }

    const service = getServiceSupabase();
    const { data: existing } = await service
      .from("referral_wallets")
      .select("wallet_address")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      if (existing.wallet_address !== walletAddress) {
        await service.from("referral_wallet_history").insert({
          user_id: user.id,
          previous_address: existing.wallet_address,
          new_address: walletAddress || existing.wallet_address,
        });
      }

      const { error } = await service
        .from("referral_wallets")
        .update({ wallet_address: walletAddress || existing.wallet_address })
        .eq("user_id", user.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (walletAddress) {
      const { error } = await service.from("referral_wallets").insert({
        user_id: user.id,
        wallet_address: walletAddress,
      });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[referrals/wallet]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
