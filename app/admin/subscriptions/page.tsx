/**
 * app/admin/subscriptions/page.tsx
 *
 * Server Component — fetches real subscription data via service role.
 * Admins only (enforced by parent layout).
 */

import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import AdminSubscriptionsClient from "./AdminSubscriptionsClient";
import { AdminCryptoPaymentsSection } from "./AdminCryptoPaymentsSection";
import { AdminOverviewSkeleton } from "@/components/loading/skeletons";
import { fetchAdminSubscriptions, fetchAdminCryptoPaymentsAction, type SubscriptionRow } from "./actions";

export type { SubscriptionRow };

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
  const [{ rows, error }, cryptoPayments] = await Promise.all([
    fetchAdminSubscriptions(),
    fetchAdminCryptoPaymentsAction(),
  ]);

  const activeRows = rows.filter((r) => r.status === "active" || r.status === "paid");
  const monthlyActive = activeRows.filter((r) => r.plan_type === "monthly");
  const quarterlyActive = activeRows.filter((r) => r.plan_type === "quarterly");
  const yearlyActive = activeRows.filter((r) => r.plan_type === "yearly");

  const cancelledLast30 = rows.filter((r) => {
    if (r.status !== "cancelled" && r.status !== "canceled") return false;
    const d = new Date(r.created_at);
    return Date.now() - d.getTime() < 30 * 24 * 60 * 60 * 1000;
  }).length;

  const churnRate =
    activeRows.length + cancelledLast30 > 0
      ? ((cancelledLast30 / (activeRows.length + cancelledLast30)) * 100).toFixed(1)
      : "0.0";

  const analytics = [
    { l: "ACTIVE SUBS", v: `${activeRows.length}`, sub: "Active paid subscriptions" },
    { l: "MONTHLY / QUARTERLY", v: `${monthlyActive.length} / ${quarterlyActive.length}`, sub: "Monthly / Quarterly plans" },
    { l: "YEARLY", v: `${yearlyActive.length}`, sub: "Yearly plans" },
    { l: "CHURN (30D)", v: `${churnRate}%`, sub: "Cancellations in last 30 days" },
  ];

  if (error) {
    return (
      <div className="panel p-6 text-sm text-destructive">
        Failed to load subscription data: {error}
      </div>
    );
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
      <AdminCryptoPaymentsSection payments={cryptoPayments} />
    </>
  );
}
