import { createClient } from "@/lib/supabase/server";
import AdminReferralsClient, { type AdminRewardRow } from "./AdminReferralsClient";

export default async function AdminReferralsPage() {
  const supabase = await createClient();

  const { data: rewardsData } = await supabase
    .from("referral_rewards")
    .select("*")
    .order("created_at", { ascending: false });

  const profileIds = new Set<string>();
  for (const r of rewardsData ?? []) {
    if (r.referrer_user_id) profileIds.add(r.referrer_user_id);
    if (r.referred_user_id) profileIds.add(r.referred_user_id);
  }

  const { data: profilesData } = profileIds.size
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", [...profileIds])
    : { data: [] };

  const profilesById = new Map((profilesData ?? []).map((p) => [p.id, p]));

  const rewards: AdminRewardRow[] = (rewardsData ?? []).map((row) => {
    const referrer = profilesById.get(row.referrer_user_id);
    const referred = row.referred_user_id ? profilesById.get(row.referred_user_id) : undefined;
    const isReferrerReward = row.reward_type === "referrer_fixed";
    const recipient = isReferrerReward ? referrer : referred;

    return {
      id: row.id,
      reward_type: isReferrerReward ? "referrer" : "referred",
      amount: parseFloat(String(row.reward_amount ?? 0)),
      currency: row.reward_currency ?? "USDC",
      network: row.reward_network ?? "Base",
      wallet_address: row.wallet_address,
      status: row.status,
      transaction_hash: row.transaction_hash,
      admin_notes: row.admin_notes,
      completed_at: row.paid_at,
      created_at: row.created_at,
      recipient_name: recipient?.full_name ?? null,
      recipient_email: recipient?.email ?? row.referred_email ?? null,
      referrer_name: referrer?.full_name ?? null,
      referrer_email: referrer?.email ?? null,
      referred_name: referred?.full_name ?? null,
      referred_email: referred?.email ?? row.referred_email ?? null,
      referral_code: row.referral_code ?? "",
      selected_plan: row.package_id ?? row.package_name ?? null,
      package_amount_paid: parseFloat(String(row.package_amount_paid ?? 0)),
      payment_provider: null,
      payment_reference: row.paid_customer_id ?? null,
      payment_status: "paid",
      registration_status: row.referred_user_id ? "registered" : "pending",
    };
  });

  return <AdminReferralsClient rewards={rewards} />;
}
