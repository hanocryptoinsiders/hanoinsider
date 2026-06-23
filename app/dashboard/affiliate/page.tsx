/**
 * app/dashboard/affiliate/page.tsx
 *
 * Server Component â€” fetches real affiliate stats for the active user.
 * Gated to linked affiliates.
 */

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import AffiliateDashboardClient from "./AffiliateDashboardClient";
import Link from "next/link";

export type ClientReferral = {
  id: string;
  status: string;
  signed_up_at: string;
  referred_name: string | null;
  referred_email: string | null;
};

export type ClientCommission = {
  id: string;
  payment_amount: number;
  commission_amount: number;
  status: string;
  created_at: string;
  referred_name: string | null;
  referred_email: string | null;
};

export default function AffiliatePortal() {
  return (
    <>
      <PageHeader kicker="AFFILIATE" title="Referral dashboard." desc="Share your member link, give friends 10% off, and track successful paid referrals." />
      <Suspense fallback={<div className="panel p-5 animate-pulse"><div className="h-20 w-full bg-muted rounded mb-4"></div><div className="h-64 w-full bg-muted rounded"></div></div>}>
        <AffiliateDataFetcher />
      </Suspense>
    </>
  );
}

async function AffiliateDataFetcher() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="panel p-8 text-center max-w-md mx-auto mt-12 border border-border/60">
        <p className="text-sm text-muted-foreground">Please sign in to access the affiliate dashboard.</p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-lg bg-foreground text-background px-4 py-2 text-xs font-semibold hover:bg-foreground/90 transition-all"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // Retrieve the affiliate profile linked to this user_id
  let { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!affiliate) {
    const generatedCode = `hano-${user.id.slice(0, 8)}`.toLowerCase();
    const { data: createdAffiliate, error: createError } = await supabase
      .from("affiliates")
      .insert({
        user_id: user.id,
        referral_code: generatedCode,
        status: "active",
        commission_rate: 0,
      })
      .select("*")
      .single();

    if (createError || !createdAffiliate) {
      return (
        <div className="panel p-8 text-center max-w-xl mx-auto mt-8 border border-border/60">
          <p className="text-sm text-muted-foreground font-semibold">
            Your referral link will appear here after the affiliate table migration is applied.
          </p>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Friends should receive 10% off through your tracked link once production payment coupons are connected.
          </p>
        </div>
      );
    }

    affiliate = createdAffiliate;
  }

  // Fetch clicks
  const { data: clicks } = await supabase
    .from("referral_clicks")
    .select("id")
    .eq("affiliate_id", affiliate.id);

  // Fetch referrals (with referred profile metadata)
  const { data: referralsData } = await supabase
    .from("referrals")
    .select(`
      id,
      status,
      signed_up_at,
      profiles!referred_user_id (
        email,
        full_name
      )
    `)
    .eq("affiliate_id", affiliate.id)
    .order("signed_up_at", { ascending: false });

  const referrals: ClientReferral[] = (referralsData ?? []).map((r: any) => ({
    id: r.id,
    status: r.status,
    signed_up_at: r.signed_up_at,
    referred_name: r.profiles?.full_name || null,
    referred_email: r.profiles?.email || null,
  }));

  // Fetch commissions
  const { data: commissionsData } = await supabase
    .from("affiliate_commissions")
    .select(`
      id,
      payment_amount,
      commission_amount,
      status,
      created_at,
      profiles!referred_user_id (
        email,
        full_name
      )
    `)
    .eq("affiliate_id", affiliate.id)
    .order("created_at", { ascending: false });

  const commissions: ClientCommission[] = (commissionsData ?? []).map((c: any) => ({
    id: c.id,
    payment_amount: parseFloat(c.payment_amount),
    commission_amount: parseFloat(c.commission_amount),
    status: c.status,
    created_at: c.created_at,
    referred_name: c.profiles?.full_name || null,
    referred_email: c.profiles?.email || null,
  }));

  // Fetch payouts
  const { data: payouts } = await supabase
    .from("affiliate_payouts")
    .select("*")
    .eq("affiliate_id", affiliate.id)
    .order("paid_at", { ascending: false });

  return (
    <AffiliateDashboardClient
      affiliate={affiliate}
      clicksCount={clicks?.length || 0}
      referrals={referrals}
      commissions={commissions}
      payouts={payouts || []}
    />
  );
}
