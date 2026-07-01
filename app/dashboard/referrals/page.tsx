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

  const { data: referrerRewardsData } = await supabase
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
    .eq("reward_type", "referrer_fixed")
    .order("created_at", { ascending: false });

  const conversions = (referrerRewardsData ?? []).map((r: Record<string, unknown>) => {
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

  const referrerRewards = (referrerRewardsData ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    reward_type: "referrer" as const,
    amount: parseFloat(String(r.reward_amount ?? 0)),
    currency: String(r.reward_currency ?? "USDC"),
    network: String(r.reward_network ?? "Base"),
    status: String(r.status),
    transaction_hash: (r.transaction_hash as string) ?? null,
    completed_at: (r.paid_at as string) ?? null,
    created_at: String(r.created_at),
  }));

  const { data: signupBonusData } = await supabase
    .from("referral_rewards")
    .select("id, reward_type, reward_amount, reward_currency, reward_network, status, transaction_hash, paid_at, created_at, package_id, package_amount_paid")
    .eq("referred_user_id", user.id)
    .eq("reward_type", "referred_cashback")
    .order("created_at", { ascending: false })
    .limit(1);

  const signupBonus = signupBonusData?.[0]
    ? {
        id: signupBonusData[0].id,
        reward_type: "referred" as const,
        amount: parseFloat(String(signupBonusData[0].reward_amount ?? 0)),
        currency: signupBonusData[0].reward_currency ?? "USDC",
        network: signupBonusData[0].reward_network ?? "Base",
        status: signupBonusData[0].status,
        transaction_hash: signupBonusData[0].transaction_hash,
        completed_at: signupBonusData[0].paid_at,
        created_at: signupBonusData[0].created_at,
        package_amount_paid: parseFloat(String(signupBonusData[0].package_amount_paid ?? 0)),
      }
    : null;

  return (
    <ReferralDashboardClient
      referralCode={memberReferral.referral_code}
      walletAddress={walletAddress}
      clicksCount={clicks?.length ?? 0}
      conversions={conversions}
      referrerRewards={referrerRewards}
      signupBonus={signupBonus}
    />
  );
}
