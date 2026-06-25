/**
 * app/admin/subscriptions/page.tsx
 *
 * Server Component — fetches real subscription data from Supabase.
 * Admins only (enforced by parent layout).
 */

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import AdminSubscriptionsClient from "./AdminSubscriptionsClient";
import { AdminOverviewSkeleton } from "@/components/loading/skeletons";

export type SubscriptionRow = {
  id: string;
  user_id: string;
  provider: string;
  provider_subscription_id: string | null;
  provider_customer_id: string | null;
  plan_type: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  // Joined from profiles
  user_email: string | null;
  user_name: string | null;
  is_premium: boolean;
  premium_source: string | null;
};

export default function AdminSubscriptions() {
  return (
    <>
      <PageHeader kicker="SUBSCRIPTIONS" title="Membership & revenue." />
      <Suspense fallback={<AdminOverviewSkeleton />}>
        <SubscriptionsDataFetcher />
      </Suspense>
    </>
  );
}

async function SubscriptionsDataFetcher() {
  const supabase = await createClient();

  // Fetch all subscriptions joined with profile data
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(`
      id,
      user_id,
      provider,
      provider_subscription_id,
      provider_customer_id,
      plan_type,
      status,
      current_period_end,
      cancel_at_period_end,
      created_at,
      profiles!user_id (
        email,
        full_name,
        is_premium,
        premium_source
      )
    `)
    .order("created_at", { ascending: false })
    .range(0, 99); // Limiting to 100 for performance as requested
  const rows: SubscriptionRow[] = (subscriptions ?? []).map((s: Record<string, unknown>) => {
    const profile = s.profiles as Record<string, unknown> | null;
    return {
      id: s.id as string,
      user_id: s.user_id as string,
      provider: (s.provider as string) || "stripe",
      provider_subscription_id: s.provider_subscription_id as string | null,
      provider_customer_id: s.provider_customer_id as string | null,
      plan_type: s.plan_type as string | null,
      status: (s.status as string) || "unknown",
      current_period_end: s.current_period_end as string | null,
      cancel_at_period_end: (s.cancel_at_period_end as boolean) || false,
      created_at: s.created_at as string,
      user_email: (profile?.email as string) ?? null,
      user_name: (profile?.full_name as string) ?? null,
      is_premium: (profile?.is_premium as boolean) ?? false,
      premium_source: (profile?.premium_source as string) ?? null,
    };
  });

  // Compute summary analytics
  const activeRows = rows.filter((r) => r.status === "active");
  const monthlyActive = activeRows.filter((r) => r.plan_type === "monthly");
  const quarterlyActive = activeRows.filter((r) => r.plan_type === "quarterly");
  const yearlyActive = activeRows.filter((r) => r.plan_type === "yearly");

  const cancelledLast30 = rows.filter((r) => {
    if (r.status !== "cancelled") return false;
    const d = new Date(r.created_at);
    return Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
  }).length;

  const churnRate =
    activeRows.length + cancelledLast30 > 0
      ? ((cancelledLast30 / (activeRows.length + cancelledLast30)) * 100).toFixed(1)
      : "0.0";

  const analytics = [
    { l: "ACTIVE SUBS", v: `${activeRows.length}`, sub: "Active subscriptions" },
    { l: "MONTHLY / QUARTERLY", v: `${monthlyActive.length} / ${quarterlyActive.length}`, sub: "Monthly / Quarterly plans" },
    { l: "YEARLY", v: `${yearlyActive.length}`, sub: "Yearly plans" },
    { l: "CHURN (30D)", v: `${churnRate}%`, sub: "Cancellations in last 30 days" },
  ];

  if (error) {
    console.error("[admin/subscriptions] fetch error:", error.message);
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
        {analytics.map((s) => (
          <div key={s.l} className="panel p-6">
            <p className="text-[10px] tracking-wider text-muted-foreground">{s.l}</p>
            <p className="font-semibold tracking-tight mt-2 text-3xl">{s.v}</p>
            <p className="text-muted-foreground text-xs mt-1">{s.sub}</p>
          </div>
        ))}
      </div>
      <AdminSubscriptionsClient rows={rows} />
    </>
  );
}
