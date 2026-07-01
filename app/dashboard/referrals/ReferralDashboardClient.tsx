"use client";

import { useState } from "react";
import {
  Copy,
  Users,
  DollarSign,
  Link as LinkIcon,
  MousePointerClick,
  Check,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { toast } from "sonner";
import { getReferralLink } from "@/lib/referrals";

export type ClientReferralConversion = {
  id: string;
  referred_name: string | null;
  referred_email: string | null;
  selected_plan: string | null;
  package_amount_paid: number;
  registered_at: string | null;
  created_at: string;
};

export type ClientReferralReward = {
  id: string;
  reward_type: "referrer" | "referred";
  amount: number;
  currency: string;
  network: string;
  status: string;
  transaction_hash: string | null;
  completed_at: string | null;
  created_at: string;
};

interface ReferralDashboardClientProps {
  referralCode: string;
  walletAddress: string | null;
  clicksCount: number;
  conversions: ClientReferralConversion[];
  rewards: ClientReferralReward[];
}

export default function ReferralDashboardClient({
  referralCode,
  walletAddress: initialWallet,
  clicksCount,
  conversions,
  rewards,
}: ReferralDashboardClientProps) {
  const [copied, setCopied] = useState(false);
  const [walletAddress, setWalletAddress] = useState(initialWallet ?? "");
  const [savingWallet, setSavingWallet] = useState(false);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://hanoinsiders.com").replace(/\/$/, "");
  const link = getReferralLink(siteUrl, referralCode);

  const handleCopy = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const pendingRewards = rewards.filter((r) => r.status === "pending");
  const completedRewards = rewards.filter((r) => r.status === "completed");
  const pendingTotal = pendingRewards.reduce((sum, r) => sum + r.amount, 0);
  const paidTotal = completedRewards.reduce((sum, r) => sum + r.amount, 0);

  const handleSaveWallet = async () => {
    setSavingWallet(true);
    try {
      const res = await fetch("/api/referrals/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: walletAddress.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save wallet");
      toast.success("Wallet address saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save wallet");
    } finally {
      setSavingWallet(false);
    }
  };

  const stats = [
    { icon: MousePointerClick, label: "LINK CLICKS", value: clicksCount.toLocaleString() },
    { icon: Users, label: "SUCCESSFUL REFERRALS", value: conversions.length.toLocaleString() },
    {
      icon: DollarSign,
      label: "PENDING REWARDS",
      value: `$${pendingTotal.toFixed(2)} USDC`,
      highlight: true,
    },
    {
      icon: DollarSign,
      label: "PAID REWARDS",
      value: `$${paidTotal.toFixed(2)} USDC`,
      success: true,
    },
  ];

  return (
    <>
      <PageHeader
        kicker="REFERRALS"
        title="Share Hano Insiders."
        desc="Share your link. Friends pay full price first, then register. You earn $15 USDC on Base per referral; they earn 20% back."
      />

      <section className="panel p-6">
        <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          Your referral link
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="panel flex items-center gap-2 px-3 py-2.5 flex-1 select-all bg-secondary/10">
            <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono text-muted-foreground truncate">{link}</span>
          </div>
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-xs font-semibold hover:bg-foreground/90 transition-all"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-success" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy link
              </>
            )}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Link sends friends to pricing first. No checkout discount — rewards are paid after payment and registration.
        </p>
      </section>

      <section className="panel p-6 mt-6">
        <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5" /> USDC payout wallet (Base network)
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
            className="flex-1 rounded-lg border border-border bg-secondary/20 px-3 py-2.5 text-xs font-mono"
          />
          <button
            onClick={handleSaveWallet}
            disabled={savingWallet}
            className="rounded-lg bg-foreground text-background px-5 py-2.5 text-xs font-semibold hover:bg-foreground/90 disabled:opacity-60"
          >
            {savingWallet ? "Saving…" : "Save wallet"}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="panel p-5">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="text-[9px] tracking-wider text-muted-foreground mt-3 uppercase">{s.label}</p>
              <p
                className={`font-display mt-2 text-2xl ${
                  s.highlight ? "text-[oklch(0.78_0.14_85)]" : s.success ? "text-success" : ""
                }`}
              >
                {s.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <section className="panel p-6 overflow-x-auto">
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase border-b border-border pb-3 mb-4">
            Referrals ({conversions.length})
          </p>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-muted-foreground uppercase tracking-wider text-[9px] border-b border-border">
                <th className="pb-2">Member</th>
                <th className="pb-2">Plan</th>
                <th className="pb-2 text-right">Paid</th>
              </tr>
            </thead>
            <tbody>
              {conversions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground">
                    No successful referrals yet.
                  </td>
                </tr>
              ) : (
                conversions.map((c) => (
                  <tr key={c.id} className="border-b border-border/40 last:border-0">
                    <td className="py-3">
                      <span className="font-semibold">{c.referred_name || "Member"}</span>
                    </td>
                    <td className="py-3 text-muted-foreground">{c.selected_plan || "—"}</td>
                    <td className="py-3 text-right">${c.package_amount_paid.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="panel p-6 overflow-x-auto">
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase border-b border-border pb-3 mb-4">
            Your rewards ({rewards.length})
          </p>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-muted-foreground uppercase tracking-wider text-[9px] border-b border-border">
                <th className="pb-2">Type</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {rewards.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground">
                    Rewards appear here after referred members pay and register.
                  </td>
                </tr>
              ) : (
                rewards.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 last:border-0">
                    <td className="py-3 capitalize">{r.reward_type}</td>
                    <td className="py-3 font-semibold">
                      ${r.amount.toFixed(2)} {r.currency}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`text-[9px] uppercase font-semibold px-2 py-0.5 rounded ${
                          r.status === "completed"
                            ? "bg-success/10 text-success"
                            : r.status === "cancelled"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
