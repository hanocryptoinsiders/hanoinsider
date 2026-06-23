/**
 * app/admin/affiliates/page.tsx
 *
 * Server Component â€” fetches real affiliate data from Supabase.
 * Admins only (enforced by parent layout).
 */

import { createClient } from "@/lib/supabase/server";
import AdminAffiliatesClient from "./AdminAffiliatesClient";

export type AffiliateRow = {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  referral_code: string;
  commission_rate: number;
  status: "active" | "disabled";
  payout_method: string | null;
  payout_details: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined user details
  user_name?: string | null;
  user_email?: string | null;
};

export type ClickRow = {
  id: string;
  affiliate_id: string;
  referral_code: string | null;
  visitor_id: string;
  created_at: string;
};

export type ReferralRow = {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  referral_code: string | null;
  status: "signed_up" | "converted" | "cancelled";
  first_click_at: string | null;
  signed_up_at: string;
  converted_at: string | null;
  // Joined referred user profile
  referred_name: string | null;
  referred_email: string | null;
};

export type CommissionRow = {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  referral_id: string | null;
  provider: string;
  provider_payment_id: string | null;
  provider_subscription_id: string | null;
  payment_amount: number;
  payment_currency: string;
  commission_rate: number;
  commission_amount: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  payable_at: string | null;
  paid_at: string | null;
  payout_reference: string | null;
  notes: string | null;
  created_at: string;
  // Joined referred user profile
  referred_name: string | null;
  referred_email: string | null;
};

export type PayoutRow = {
  id: string;
  affiliate_id: string;
  amount: number;
  currency: string;
  method: string | null;
  payout_reference: string | null;
  status: string;
  notes: string | null;
  paid_at: string;
  created_at: string;
  // Joined affiliate details
  affiliate_name: string;
  affiliate_code: string;
};

export type ProfileOption = {
  id: string;
  email: string | null;
  full_name: string | null;
};

export default async function AdminAffiliates() {
  const supabase = await createClient();

  // 1. Fetch affiliates with profiles
  const { data: affiliatesData } = await supabase
    .from("affiliates")
    .select(`
      *,
      profiles!user_id (
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  const affiliates: AffiliateRow[] = (affiliatesData ?? []).map((a: any) => ({
    id: a.id,
    user_id: a.user_id,
    name: a.name,
    email: a.email,
    referral_code: a.referral_code,
    commission_rate: parseFloat(a.commission_rate),
    status: a.status,
    payout_method: a.payout_method,
    payout_details: a.payout_details,
    notes: a.notes,
    created_at: a.created_at,
    updated_at: a.updated_at,
    user_name: a.profiles?.full_name || null,
    user_email: a.profiles?.email || null,
  }));

  // 2. Fetch all clicks
  const { data: clicksData } = await supabase
    .from("referral_clicks")
    .select("id, affiliate_id, referral_code, visitor_id, created_at")
    .order("created_at", { ascending: false });

  const clicks: ClickRow[] = (clicksData ?? []).map((c: any) => ({
    id: c.id,
    affiliate_id: c.affiliate_id,
    referral_code: c.referral_code,
    visitor_id: c.visitor_id,
    created_at: c.created_at,
  }));

  // 3. Fetch referrals with referred profile info
  const { data: referralsData } = await supabase
    .from("referrals")
    .select(`
      *,
      profiles!referred_user_id (
        full_name,
        email
      )
    `)
    .order("signed_up_at", { ascending: false });

  const referrals: ReferralRow[] = (referralsData ?? []).map((r: any) => ({
    id: r.id,
    affiliate_id: r.affiliate_id,
    referred_user_id: r.referred_user_id,
    referral_code: r.referral_code,
    status: r.status,
    first_click_at: r.first_click_at,
    signed_up_at: r.signed_up_at,
    converted_at: r.converted_at,
    referred_name: r.profiles?.full_name || null,
    referred_email: r.profiles?.email || null,
  }));

  // 4. Fetch commissions with profile info
  const { data: commissionsData } = await supabase
    .from("affiliate_commissions")
    .select(`
      *,
      profiles!referred_user_id (
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  const commissions: CommissionRow[] = (commissionsData ?? []).map((c: any) => ({
    id: c.id,
    affiliate_id: c.affiliate_id,
    referred_user_id: c.referred_user_id,
    referral_id: c.referral_id,
    provider: c.provider,
    provider_payment_id: c.provider_payment_id,
    provider_subscription_id: c.provider_subscription_id,
    payment_amount: parseFloat(c.payment_amount),
    payment_currency: c.payment_currency,
    commission_rate: parseFloat(c.commission_rate),
    commission_amount: parseFloat(c.commission_amount),
    status: c.status,
    payable_at: c.payable_at,
    paid_at: c.paid_at,
    payout_reference: c.payout_reference,
    notes: c.notes,
    created_at: c.created_at,
    referred_name: c.profiles?.full_name || null,
    referred_email: c.profiles?.email || null,
  }));

  // 5. Fetch payouts with affiliate info
  const { data: payoutsData } = await supabase
    .from("affiliate_payouts")
    .select(`
      *,
      affiliates!affiliate_id (
        name,
        referral_code
      )
    `)
    .order("created_at", { ascending: false });

  const payouts: PayoutRow[] = (payoutsData ?? []).map((p: any) => ({
    id: p.id,
    affiliate_id: p.affiliate_id,
    amount: parseFloat(p.amount),
    currency: p.currency,
    method: p.method,
    payout_reference: p.payout_reference,
    status: p.status,
    notes: p.notes,
    paid_at: p.paid_at,
    created_at: p.created_at,
    affiliate_name: p.affiliates?.name || "Deleted Affiliate",
    affiliate_code: p.affiliates?.referral_code || "deleted",
  }));

  // 6. Fetch profiles for user link dropdown
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .order("email");

  const profiles: ProfileOption[] = (profilesData ?? []).map((p: any) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
  }));

  return (
    <AdminAffiliatesClient
      initialAffiliates={affiliates}
      initialClicks={clicks}
      initialReferrals={referrals}
      initialCommissions={commissions}
      initialPayouts={payouts}
      profiles={profiles}
    />
  );
}
