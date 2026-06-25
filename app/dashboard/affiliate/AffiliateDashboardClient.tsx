"use client";

import { useState } from "react";
import {
  Copy,
  Users,
  DollarSign,
  TrendingUp,
  Link as LinkIcon,
  MousePointerClick,
  Download,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import type { ClientReferral, ClientCommission } from "./page";

interface PayoutRow {
  id: string;
  amount: number;
  currency: string;
  method: string | null;
  payout_reference: string | null;
  status: string;
  notes: string | null;
  paid_at: string;
}

interface AffiliateDashboardClientProps {
  affiliate: {
    id: string;
    name: string;
    referral_code: string;
    commission_rate: number;
    payout_method: string | null;
    payout_details: string | null;
  };
  clicksCount: number;
  referrals: ClientReferral[];
  commissions: ClientCommission[];
  payouts: PayoutRow[];
}

export default function AffiliateDashboardClient({
  affiliate,
  clicksCount,
  referrals,
  commissions,
  payouts,
}: AffiliateDashboardClientProps) {
  const [copied, setCopied] = useState(false);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://hanoinsiders.com").replace(/\/$/, "");
  const link = `${siteUrl}?ref=${affiliate.referral_code}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Mask email details for privacy: e.g. "alexander@gmail.com" -> "ale***@gm***.com"
  const maskEmail = (email: string | null): string => {
    if (!email) return "���a�����";
    const parts = email.split("@");
    if (parts.length !== 2) return "***";
    const [local, domain] = parts;

    // Mask local part
    let maskedLocal = "";
    if (local.length <= 3) {
      maskedLocal = local.slice(0, 1) + "***";
    } else {
      maskedLocal = local.slice(0, 3) + "***";
    }

    // Mask domain part
    const domainParts = domain.split(".");
    if (domainParts.length < 2) return `${maskedLocal}@***`;
    const [domainName, ext] = domainParts;
    let maskedDomainName = "";
    if (domainName.length <= 2) {
      maskedDomainName = "***";
    } else {
      maskedDomainName = domainName.slice(0, 2) + "***";
    }

    return `${maskedLocal}@${maskedDomainName}.${ext}`;
  };

  // Calculations for stats
  const conversionsCount = referrals.filter((r) => r.status === "converted").length;

  let totalRevenueGenerated = 0;
  let totalCommissionsEarned = 0;
  let pendingPayoutSum = 0;
  let approvedPayoutSum = 0;
  let paidPayoutSum = 0;

  commissions.forEach((c) => {
    if (c.status !== "cancelled") {
      totalRevenueGenerated += c.payment_amount;
      totalCommissionsEarned += c.commission_amount;
    }
    if (c.status === "pending") {
      pendingPayoutSum += c.commission_amount;
    } else if (c.status === "approved") {
      approvedPayoutSum += c.commission_amount;
    } else if (c.status === "paid") {
      paidPayoutSum += c.commission_amount;
    }
  });

  const conversionRate = clicksCount > 0 ? (conversionsCount / clicksCount) * 100 : 0;

  const stats = [
    { icon: MousePointerClick, l: "TOTAL CLICKS", v: clicksCount.toLocaleString() },
    { icon: Users, l: "TOTAL SIGNUPS", v: referrals.length.toLocaleString() },
    { icon: TrendingUp, l: "CONVERSIONS", v: conversionsCount.toLocaleString() },
    { icon: TrendingUp, l: "CONV. RATE", v: conversionRate.toFixed(1) + "%" },
    {
      icon: DollarSign,
      l: "REVENUE GENERATED",
      v: `$${totalRevenueGenerated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      icon: DollarSign,
      l: "TRACKED VALUE",
      v: `$${totalCommissionsEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      icon: DollarSign,
      l: "PENDING REFERRALS",
      v: `$${(pendingPayoutSum + approvedPayoutSum).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      highlight: true,
    },
    {
      icon: DollarSign,
      l: "PAID REFERRALS",
      v: `$${paidPayoutSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      success: true,
    },
  ];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <PageHeader
        kicker="AFFILIATE"
        title="Share Hano Insiders."
        desc="Give friends 10% off through your personal link and track signups plus paid referrals."
      />

      {/* Referral Link Section */}
      <section className="panel p-6">
        <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          Your unique referral link
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="panel flex items-center gap-2 px-3 py-2.5 flex-1 select-all bg-secondary/10">
            <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono text-muted-foreground truncate select-all">
              {link}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-xs font-semibold hover:bg-foreground/90 active:scale-[0.98] transition-all"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-success" /> Copied link
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy link
              </>
            )}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Share this link with friends. They receive 10% off when production Stripe or checkout coupon IDs are connected.
        </p>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="panel p-5">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="text-[9px] tracking-wider text-muted-foreground mt-3 uppercase">{s.l}</p>
              <p
                className={`font-display mt-2 text-2xl ${
                  s.highlight ? "text-[oklch(0.78_0.14_85)]" : s.success ? "text-success" : ""
                }`}
              >
                {s.v}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* Referrals table */}
        <section className="panel p-6 overflow-x-auto">
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase border-b border-border pb-3 mb-4">
            Recent Referrals ({referrals.length})
          </p>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-muted-foreground uppercase tracking-wider text-[9px] border-b border-border pb-2">
                <th className="pb-2">Referred User</th>
                <th className="pb-2">Signup Date</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground">
                    No signups through your link yet.
                  </td>
                </tr>
              ) : (
                referrals.map((r, i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0">
                    <td className="py-3 font-semibold">
                      {r.referred_name || "Hano Insiders Member"}
                      <div className="text-[9px] text-muted-foreground font-mono font-normal">
                        {maskEmail(r.referred_email)}
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{formatDate(r.signed_up_at)}</td>
                    <td className="py-3 text-right">
                      <span
                        className={`text-[9px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded ${
                          r.status === "converted"
                            ? "bg-success/10 text-success"
                            : r.status === "cancelled"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {r.status === "converted" ? "premium" : r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Payout history & Commissions */}
        <section className="panel p-6 overflow-x-auto">
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase border-b border-border pb-3 mb-4">
            Settlement Statement & Payouts ({payouts.length})
          </p>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-muted-foreground uppercase tracking-wider text-[9px] border-b border-border pb-2">
                <th className="pb-2">Settled Date</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Method</th>
                <th className="pb-2 text-right">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No payouts made yet. Once admin settles, details appear here.
                  </td>
                </tr>
              ) : (
                payouts.map((p, i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0">
                    <td className="py-3 text-muted-foreground">{formatDate(p.paid_at)}</td>
                    <td className="py-3 font-semibold text-success">
                      ${p.amount.toFixed(2)} {p.currency}
                    </td>
                    <td className="py-3 text-muted-foreground">{p.method}</td>
                    <td className="py-3 text-right font-mono text-[10px] text-sky-400">
                      {p.payout_reference || "Selled"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>

      {/* Affiliate resources */}
      <section className="panel p-6 mt-6">
        <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase border-b border-border pb-3 mb-4">
          Brand Assets & Promotional Materials
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: ImageIcon, label: "Marketing Banners", desc: "Premium banners for standard web displays." },
            { icon: ImageIcon, label: "Logos & Monograms", desc: "Transparent vectors and dark/light palettes." },
            { icon: Download, label: "Promotional Copy", desc: "Sample tweets, posts, and marketing outlines." },
          ].map((r, idx) => {
            const Icon = r.icon;
            return (
              <div key={idx} className="border border-border/60 rounded-xl p-5 hover:bg-secondary/10 transition-all flex flex-col justify-between">
                <div>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <p className="font-display mt-3 text-md font-semibold">{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.desc}</p>
                </div>
                <button className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/30 hover:bg-secondary px-3 py-2 text-xs font-medium w-full active:scale-95 transition-all">
                  <Download className="h-3.5 w-3.5" /> Download Pack
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
