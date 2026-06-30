/**
 * app/admin/subscriptions/page.tsx
 *
 * Server Component — loads subscription data with the admin session (RLS).
 * Paid customers fall back to the service role only when admin read policy is missing.
 */

import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import AdminSubscriptionsClient from "./AdminSubscriptionsClient";
import { AdminCryptoPaymentsSection } from "./AdminCryptoPaymentsSection";
import { AdminCryptoIntentsSection } from "./AdminCryptoIntentsSection";
import { AdminOverviewSkeleton } from "@/components/loading/skeletons";
import {
  loadAdminSubscriptionsData,
  loadAdminCryptoPaymentsData,
  type SubscriptionRow,
} from "@/lib/admin/subscription-data";

export type { SubscriptionRow };

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  try {
    const [{ rows, error }, cryptoResult] = await Promise.all([
      loadAdminSubscriptionsData(),
      loadAdminCryptoPaymentsData(),
    ]);

    const cryptoPayments = cryptoResult.payments;
    const cryptoError = cryptoResult.error;

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
      {
        l: "MONTHLY / QUARTERLY",
        v: `${monthlyActive.length} / ${quarterlyActive.length}`,
        sub: "Monthly / Quarterly plans",
      },
      { l: "YEARLY", v: `${yearlyActive.length}`, sub: "Yearly plans" },
      { l: "CHURN (30D)", v: `${churnRate}%`, sub: "Cancellations in last 30 days" },
    ];

    if (error && rows.length === 0) {
      return (
        <div className="panel p-6 text-sm text-destructive">
          Failed to load subscription data: {error}
        </div>
      );
    }

    return (
      <>
        {error ? (
          <div className="panel mb-5 p-4 text-sm text-amber-200/90 border border-amber-500/30 bg-amber-500/10">
            Partial data loaded: {error}
          </div>
        ) : null}
        {cryptoError ? (
          <div className="panel mb-5 p-4 text-sm text-amber-200/90 border border-amber-500/30 bg-amber-500/10">
            Crypto payments section unavailable: {cryptoError}
          </div>
        ) : null}
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
        <AdminCryptoIntentsSection />
        <AdminCryptoPaymentsSection payments={cryptoPayments} />
      </>
    );
  } catch (error) {
    console.error("[admin/subscriptions] page render error:", error);
    return (
      <div className="panel p-6 text-sm text-destructive">
        Failed to load subscriptions: {error instanceof Error ? error.message : "Unknown server error"}
      </div>
    );
  }
}
