"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { SubscriptionRow } from "./actions";
import { grantPremiumAction, revokePremiumAction, grantCryptoMembershipAction } from "./actions";

const STATUS_COLORS: Record<string, string> = {
  active: "text-success",
  paid: "text-success",
  authenticated: "text-[oklch(0.78_0.14_85)]",
  created: "text-muted-foreground",
  pending: "text-[oklch(0.78_0.14_85)]",
  incomplete: "text-muted-foreground",
  incomplete_expired: "text-destructive",
  cancelled: "text-destructive",
  canceled: "text-destructive",
  completed: "text-muted-foreground",
  expired: "text-destructive",
  past_due: "text-[oklch(0.78_0.14_85)]",
  paused: "text-muted-foreground",
  inactive: "text-destructive",
};

const filters = [
  "All",
  "Active",
  "Paid",
  "Pending",
  "Past Due",
  "Cancelled",
  "Expired",
  "Monthly",
  "Quarterly",
  "Yearly",
  "Manual",
  "Stripe",
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminSubscriptionsClient({ rows }: { rows: SubscriptionRow[] }) {
  const [filter, setFilter] = useState("All");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const filtered = rows.filter((r) => {
    if (filter === "All") return true;
    if (filter === "Monthly") return r.plan_type === "monthly";
    if (filter === "Quarterly") return r.plan_type === "quarterly";
    if (filter === "Yearly") return r.plan_type === "yearly";
    if (filter === "Manual") return r.premium_source === "manual";
    if (filter === "Past Due") return r.status === "past_due";
    if (filter === "Stripe") return r.provider === "stripe";
    if (filter === "Paid") return r.status === "paid";
    if (filter === "Pending") return r.status === "pending" || r.status === "incomplete";
    return r.status.toLowerCase() === filter.toLowerCase();
  });

  const handleGrantPremium = async (userId: string) => {
    setLoadingAction(userId + "-grant");
    const result = await grantPremiumAction(userId);
    if (result.success) {
      toast.success("Premium access granted");
    } else {
      toast.error(result.error || "Failed to grant premium");
    }
    setLoadingAction(null);
  };

  const handleGrantCrypto = async (userId: string) => {
    setLoadingAction(userId + "-crypto");
    const result = await grantCryptoMembershipAction(userId, 30);
    if (result.success) {
      toast.success("Crypto membership set (+30 days)");
    } else {
      toast.error(result.error || "Failed to set crypto membership");
    }
    setLoadingAction(null);
  };

  const handleRevokePremium = async (userId: string) => {
    setLoadingAction(userId + "-revoke");
    const result = await revokePremiumAction(userId);
    if (result.success) {
      toast.success("Premium access revoked");
    } else {
      toast.error(result.error || "Failed to revoke premium");
    }
    setLoadingAction(null);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-xs transition ${
              filter === f ? "bg-foreground text-background" : "panel hover:bg-accent"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <section className="panel p-6 overflow-x-auto">
        <p className="text-[11px] tracking-[0.2em] text-muted-foreground">
          SUBSCRIPTIONS
          <span className="ml-2 text-foreground font-medium">{filtered.length}</span>
        </p>

        {filtered.length === 0 ? (
          <div className="mt-8 text-center text-sm text-muted-foreground py-12">
            No subscription records found
            {filter !== "All" && (
              <button
                onClick={() => setFilter("All")}
                className="ml-2 text-foreground underline underline-offset-2"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm mt-4 min-w-[980px]">
            <thead>
              <tr className="text-left text-[10px] tracking-wider text-muted-foreground border-b border-border">
                <th className="pb-3">USER</th>
                <th className="pb-3">PROVIDER</th>
                <th className="pb-3">PLAN</th>
                <th className="pb-3">STATUS</th>
                <th className="pb-3">ACCESS</th>
                <th className="pb-3">SOURCE</th>
                <th className="pb-3">STRIPE SUB</th>
                <th className="pb-3">PERIOD END</th>
                <th className="pb-3">STARTED</th>
                <th className="pb-3">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={`${s.record_source}-${s.id}`} className="border-b border-border last:border-0 hover:bg-secondary/10 transition-colors">
                  <td className="py-3">
                    <p className="font-mono text-xs">{s.user_email ?? "—"}</p>
                    {s.user_name && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.user_name}</p>
                    )}
                  </td>
                  <td className="py-3 capitalize text-xs">{s.provider}</td>
                  <td className="py-3 capitalize text-xs">{s.plan_type || "—"}</td>
                  <td className="py-3">
                    <span className={`text-xs font-medium capitalize ${STATUS_COLORS[s.status] ?? "text-muted-foreground"}`}>
                      {s.status.replace("_", " ")}
                      {s.cancel_at_period_end && s.status === "active" && (
                        <span className="ml-1 text-[10px] text-muted-foreground">(cancels soon)</span>
                      )}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`text-xs font-medium ${s.is_premium ? "text-success" : "text-muted-foreground"}`}>
                      {s.is_premium ? "Active" : "Expired / pending"}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-muted-foreground capitalize">
                    {s.premium_source || s.record_source.replace("_", " ")}
                  </td>
                  <td className="py-3 font-mono text-[10px] text-muted-foreground max-w-[120px] truncate" title={s.provider_subscription_id ?? undefined}>
                    {s.provider_subscription_id ? s.provider_subscription_id.slice(0, 14) + "…" : "—"}
                  </td>
                  <td className="py-3 text-muted-foreground text-xs">
                    {s.cancel_at_period_end ? `Ends ${formatDate(s.current_period_end)}` : formatDate(s.current_period_end)}
                  </td>
                  <td className="py-3 text-muted-foreground text-xs">{formatDate(s.created_at)}</td>
                  <td className="py-3">
                    {s.user_id ? (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => handleGrantCrypto(s.user_id!)}
                          disabled={loadingAction === s.user_id + "-crypto"}
                          className="rounded px-2 py-1 text-[10px] font-medium bg-[oklch(0.78_0.14_85)]/10 text-[oklch(0.78_0.14_85)] hover:bg-[oklch(0.78_0.14_85)]/20 transition disabled:opacity-50"
                          title="Set/renew a crypto membership with a 30-day expiry"
                        >
                          {s.is_premium ? "Renew 30d" : "Crypto 30d"}
                        </button>
                        {!s.is_premium ? (
                          <button
                            onClick={() => handleGrantPremium(s.user_id!)}
                            disabled={loadingAction === s.user_id + "-grant"}
                            className="rounded px-2 py-1 text-[10px] font-medium bg-success/10 text-success hover:bg-success/20 transition disabled:opacity-50"
                            title="Comp access with no expiry"
                          >
                            Grant (no expiry)
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRevokePremium(s.user_id!)}
                            disabled={loadingAction === s.user_id + "-revoke"}
                            className="rounded px-2 py-1 text-[10px] font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Awaiting registration</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
