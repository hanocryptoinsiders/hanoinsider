import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import Link from "next/link";
import ReferralDashboardClient from "./ReferralDashboardClient";
import { ensureMemberReferral, getReferralWallet } from "@/lib/referrals";
import { getServiceSupabase } from "@/lib/supabase/service";

export default function ReferralsPortal() {
  return (
    <>
      <PageHeader
        kicker="REFERRALS"
        title="Referral dashboard."
        desc="Share your link, track referrals, and view USDC rewards on Base."
      />
      <Suspense
        fallback={
          <div className="panel p-5 animate-pulse">
            <div className="h-20 w-full bg-muted rounded mb-4" />
            <div className="h-64 w-full bg-muted rounded" />
          </div>
        }
      >
        <ReferralDataFetcher />
      </Suspense>
    </>
  );
}

async function ReferralDataFetcher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="panel p-8 text-center max-w-md mx-auto mt-12 border border-border/60">
        <p className="text-sm text-muted-foreground">Please sign in to access your referral dashboard.</p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-lg bg-foreground text-background px-4 py-2 text-xs font-semibold hover:bg-foreground/90 transition-all"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const serviceSupabase = getServiceSupabase();
  const memberReferral = await ensureMemberReferral(serviceSupabase, user.id);

  if (!memberReferral) {
    return (
      <div className="panel p-8 text-center max-w-xl mx-auto mt-8">
        <p className="text-sm text-muted-foreground">
          Your referral profile could not be loaded. Please try again or contact support.
        </p>
      </div>
    );
  }

  const walletAddress = await getReferralWallet(serviceSupabase, user.id);

  const { data: affiliateRow } = await supabase
    .from("affiliates")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: clicks } = affiliateRow
    ? await supabase.from("referral_clicks").select("id").eq("affiliate_id", affiliateRow.id)
    : { data: [] };

  const { data: rewardsData } = await supabase
    .from("referral_rewards")
    .select(`
      id,
      reward_type,
      reward_amount,
      reward_currency,
      reward_network,
      status,
      transaction_hash,
      paid_at,
      created_at,
      package_id,
      package_amount_paid,
      referred_user_id,
      profiles!referred_user_id ( full_name, email )
    `)
    .eq("referrer_user_id", user.id)
    .order("created_at", { ascending: false });

  const conversions = (rewardsData ?? [])
    .filter((r: Record<string, unknown>) => r.reward_type === "referrer_fixed")
    .map((r: Record<string, unknown>) => {
      const p = r.profiles as { full_name?: string; email?: string } | null;
      return {
        id: String(r.id),
        referred_name: p?.full_name ?? null,
        referred_email: p?.email ?? null,
        selected_plan: (r.package_id as string) ?? null,
        package_amount_paid: parseFloat(String(r.package_amount_paid ?? 0)),
        registered_at: (r.paid_at as string) ?? null,
        created_at: String(r.created_at),
      };
    });

  const rewards = (rewardsData ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    reward_type: r.reward_type === "referrer_fixed" ? ("referrer" as const) : ("referred" as const),
    amount: parseFloat(String(r.reward_amount ?? 0)),
    currency: String(r.reward_currency ?? "USDC"),
    network: String(r.reward_network ?? "Base"),
    status: String(r.status),
    transaction_hash: (r.transaction_hash as string) ?? null,
    completed_at: (r.paid_at as string) ?? null,
    created_at: String(r.created_at),
  }));

  const { data: referredRewards } = await supabase
    .from("referral_rewards")
    .select("id, reward_type, reward_amount, reward_currency, reward_network, status, transaction_hash, paid_at, created_at")
    .eq("referred_user_id", user.id)
    .order("created_at", { ascending: false });

  const allRewards = [
    ...rewards,
    ...(referredRewards ?? []).map((r) => ({
      id: r.id,
      reward_type: r.reward_type === "referrer_fixed" ? ("referrer" as const) : ("referred" as const),
      amount: parseFloat(String(r.reward_amount ?? 0)),
      currency: r.reward_currency ?? "USDC",
      network: r.reward_network ?? "Base",
      status: r.status,
      transaction_hash: r.transaction_hash,
      completed_at: r.paid_at,
      created_at: r.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <ReferralDashboardClient
      referralCode={memberReferral.referral_code}
      walletAddress={walletAddress}
      clicksCount={clicks?.length ?? 0}
      conversions={conversions}
      rewards={allRewards}
    />
  );
}
