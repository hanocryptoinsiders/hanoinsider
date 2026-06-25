"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Users,
  DollarSign,
  MousePointerClick,
  TrendingUp,
  Trophy,
  Copy,
  Check,
  Edit,
  Plus,
  X,
  Play,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import type {
  AffiliateRow,
  ClickRow,
  ReferralRow,
  CommissionRow,
  PayoutRow,
  ProfileOption,
} from "./page";
import {
  createAffiliateAction,
  updateAffiliateAction,
  toggleAffiliateStatusAction,
  approveCommissionAction,
  cancelCommissionAction,
  markCommissionPaidAction,
} from "./actions";

interface AdminAffiliatesClientProps {
  initialAffiliates: AffiliateRow[];
  initialClicks: ClickRow[];
  initialReferrals: ReferralRow[];
  initialCommissions: CommissionRow[];
  initialPayouts: PayoutRow[];
  profiles: ProfileOption[];
}

export default function AdminAffiliatesClient({
  initialAffiliates,
  initialClicks,
  initialReferrals,
  initialCommissions,
  initialPayouts,
  profiles,
}: AdminAffiliatesClientProps) {
  // Lists state
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>(initialAffiliates);
  const [clicks] = useState<ClickRow[]>(initialClicks);
  const [referrals] = useState<ReferralRow[]>(initialReferrals);
  const [commissions, setCommissions] = useState<CommissionRow[]>(initialCommissions);
  const [payouts, setPayouts] = useState<PayoutRow[]>(initialPayouts);

  // Tabs: 'affiliates' | 'commissions' | 'payouts'
  const [activeTab, setActiveTab] = useState<"affiliates" | "commissions" | "payouts">("affiliates");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [affiliateStatusFilter, setAffiliateStatusFilter] = useState("all");
  const [commissionStatusFilter, setCommissionStatusFilter] = useState("all");

  // Modal / Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<AffiliateRow | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formRate, setFormRate] = useState(0.5);
  const [formStatus, setFormStatus] = useState<"active" | "disabled">("active");
  const [formPayoutMethod, setFormPayoutMethod] = useState("");
  const [formPayoutDetails, setFormPayoutDetails] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formUserId, setFormUserId] = useState<string>("");

  // Detailed view of an affiliate
  const [viewingAffiliate, setViewingAffiliate] = useState<AffiliateRow | null>(null);

  // Payout Modal States
  const [payoutCommission, setPayoutCommission] = useState<CommissionRow | null>(null);
  const [payoutMethod, setPayoutMethod] = useState("Bank Transfer");
  const [payoutReference, setPayoutReference] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");

  // Cancel Modal States
  const [cancelCommissionId, setCancelCommissionId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Utility Copy State
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyLink = (code: string) => {
    const link = `https://hanoinsiders.com?ref=${code}`;
    navigator.clipboard?.writeText(link);
    setCopiedCode(code);
    toast.success("Referral link copied!");
    setTimeout(() => setCopiedCode(null), 1500);
  };

  // Aggregated affiliate stats lookup
  const getAffStats = (affId: string) => {
    const affClicks = clicks.filter((c) => c.affiliate_id === affId);
    const affReferrals = referrals.filter((r) => r.affiliate_id === affId);
    const affConversions = affReferrals.filter((r) => r.status === "converted");
    const affCommissions = commissions.filter((c) => c.affiliate_id === affId);

    const clicksCount = affClicks.length;
    const signupsCount = affReferrals.length;
    const conversionsCount = affConversions.length;

    const clickToSignupRate = clicksCount > 0 ? (signupsCount / clicksCount) * 100 : 0;
    const signupToPaidRate = signupsCount > 0 ? (conversionsCount / signupsCount) * 100 : 0;

    let totalRevenue = 0;
    let totalCommission = 0;
    let pendingCommission = 0;
    let approvedCommission = 0;
    let paidCommission = 0;
    let cancelledCommission = 0;

    affCommissions.forEach((c) => {
      if (c.status !== "cancelled") {
        totalRevenue += c.payment_amount;
        totalCommission += c.commission_amount;
      }
      if (c.status === "pending") pendingCommission += c.commission_amount;
      else if (c.status === "approved") approvedCommission += c.commission_amount;
      else if (c.status === "paid") paidCommission += c.commission_amount;
      else if (c.status === "cancelled") cancelledCommission += c.commission_amount;
    });

    return {
      clicks: clicksCount,
      signups: signupsCount,
      conversions: conversionsCount,
      clickToSignup: clickToSignupRate.toFixed(1) + "%",
      signupToPaid: signupToPaidRate.toFixed(1) + "%",
      revenue: totalRevenue,
      totalCommission,
      pending: pendingCommission,
      approved: approvedCommission,
      paid: paidCommission,
      cancelled: cancelledCommission,
      unpaid: pendingCommission + approvedCommission,
    };
  };

  // Global Program stats
  const programStats = (() => {
    const totalClicks = clicks.length;
    const totalSignups = referrals.length;
    const totalConversions = referrals.filter((r) => r.status === "converted").length;

    let unpaidCommissionsSum = 0;
    let paidCommissionsSum = 0;

    commissions.forEach((c) => {
      if (c.status === "pending" || c.status === "approved") {
        unpaidCommissionsSum += c.commission_amount;
      } else if (c.status === "paid") {
        paidCommissionsSum += c.commission_amount;
      }
    });

    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      clicks: totalClicks.toLocaleString(),
      signups: totalSignups.toLocaleString(),
      conversions: totalConversions.toLocaleString(),
      rate: conversionRate.toFixed(1) + "%",
      unpaid: `$${unpaidCommissionsSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      paid: `$${paidCommissionsSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    };
  })();

  // Open creation form
  const handleNewAffiliate = () => {
    setEditingAffiliate(null);
    setFormName("");
    setFormEmail("");
    setFormCode("");
    setFormRate(0.5);
    setFormStatus("active");
    setFormPayoutMethod("USDC");
    setFormPayoutDetails("");
    setFormNotes("");
    setFormUserId("");
    setIsFormOpen(true);
  };

  // Open edit form
  const handleEditAffiliate = (a: AffiliateRow) => {
    setEditingAffiliate(a);
    setFormName(a.name);
    setFormEmail(a.email || "");
    setFormCode(a.referral_code);
    setFormRate(a.commission_rate);
    setFormStatus(a.status);
    setFormPayoutMethod(a.payout_method || "");
    setFormPayoutDetails(a.payout_details || "");
    setFormNotes(a.notes || "");
    setFormUserId(a.user_id || "");
    setIsFormOpen(true);
  };

  // Submit creation/edit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      toast.error("Name and referral code are required");
      return;
    }

    const payload = {
      name: formName.trim(),
      email: formEmail.trim() || undefined,
      referral_code: formCode.trim().toLowerCase(),
      commission_rate: Number(formRate),
      status: formStatus,
      payout_method: formPayoutMethod.trim() || undefined,
      payout_details: formPayoutDetails.trim() || undefined,
      notes: formNotes.trim() || undefined,
      user_id: formUserId || null,
    };

    try {
      if (editingAffiliate) {
        await updateAffiliateAction(editingAffiliate.id, payload);
        toast.success("Affiliate account updated!");
        // Refresh local state
        setAffiliates((prev) =>
          prev.map((a) =>
            a.id === editingAffiliate.id
              ? {
                  ...a,
                  ...payload,
                  email: payload.email ?? null,
                  payout_method: payload.payout_method ?? null,
                  payout_details: payload.payout_details ?? null,
                  notes: payload.notes ?? null,
                  user_name: profiles.find((p) => p.id === formUserId)?.full_name || null,
                }
              : a
          )
        );
      } else {
        await createAffiliateAction(payload);
        toast.success("Affiliate account created!");
        // In real app page reload or client refresh fetches new state. Let's refresh location.
        window.location.reload();
      }
      setIsFormOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save affiliate");
    }
  };

  const handleToggleStatus = async (a: AffiliateRow) => {
    const nextStatus = a.status === "active" ? "disabled" : "active";
    if (
      !confirm(
        `Are you sure you want to ${nextStatus === "active" ? "enable" : "disable"} affiliate: ${a.name}?`
      )
    )
      return;

    try {
      await toggleAffiliateStatusAction(a.id, nextStatus);
      toast.success(`Affiliate status updated to ${nextStatus}`);
      setAffiliates((prev) =>
        prev.map((item) => (item.id === a.id ? { ...item, status: nextStatus } : item))
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleApproveCommission = async (id: string) => {
    if (!confirm("Approve this commission?")) return;
    try {
      await approveCommissionAction(id);
      toast.success("Commission approved");
      setCommissions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "approved" } : c))
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to approve commission");
    }
  };

  const handleCancelCommission = async () => {
    if (!cancelCommissionId) return;
    try {
      await cancelCommissionAction(cancelCommissionId, cancelReason);
      toast.success("Commission cancelled");
      setCommissions((prev) =>
        prev.map((c) =>
          c.id === cancelCommissionId ? { ...c, status: "cancelled", notes: cancelReason } : c
        )
      );
      setCancelCommissionId(null);
      setCancelReason("");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel commission");
    }
  };

  const handleMarkPaid = async () => {
    if (!payoutCommission) return;
    if (!payoutReference.trim()) {
      toast.error("Payout reference is required");
      return;
    }

    try {
      await markCommissionPaidAction(payoutCommission.id, {
        method: payoutMethod,
        reference: payoutReference,
        notes: payoutNotes,
      });
      toast.success("Commission marked as Paid and payout logged!");

      // Refresh page to sync all state (commissions + payouts tables)
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to pay commission");
    }
  };

  // Filtering Logic
  const filteredAffiliates = affiliates.filter((a) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (a.name || "").toLowerCase().includes(q) ||
      (a.referral_code || "").toLowerCase().includes(q) ||
      (a.email || "").toLowerCase().includes(q);
    const matchesStatus =
      affiliateStatusFilter === "all" || a.status === affiliateStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredCommissions = commissions.filter((c) => {
    const aff = affiliates.find((a) => a.id === c.affiliate_id);
    const matchesSearch =
      (aff?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (aff?.referral_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.referred_email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      commissionStatusFilter === "all" || c.status === commissionStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPayouts = payouts.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.affiliate_name || "").toLowerCase().includes(q) ||
      (p.affiliate_code || "").toLowerCase().includes(q) ||
      (p.payout_reference || "").toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "���";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <PageHeader
        kicker="AFFILIATE MANAGEMENT"
        title="Administer promoters, tracking & payouts."
      />

      {/* Program Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { icon: Users, l: "AFFILIATES", v: affiliates.length },
          { icon: MousePointerClick, l: "CLICKS", v: programStats.clicks },
          { icon: Users, l: "SIGNUPS", v: programStats.signups },
          { icon: TrendingUp, l: "CONV. RATE", v: programStats.rate },
          { icon: DollarSign, l: "UNPAID COMM.", v: programStats.unpaid, highlight: true },
          { icon: DollarSign, l: "PAID COMM.", v: programStats.paid, success: true },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="panel p-4 flex flex-col justify-between">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div className="mt-3">
                <p className="text-[9px] tracking-wider text-muted-foreground uppercase">{s.l}</p>
                <p
                  className={`font-semibold tracking-tight mt-1 text-xl ${
                    s.highlight ? "text-[oklch(0.78_0.14_85)]" : s.success ? "text-success" : ""
                  }`}
                >
                  {s.v}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation and Search bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mt-6">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-secondary/20 border border-border rounded-xl">
          {[
            { id: "affiliates", label: "Affiliates List" },
            { id: "commissions", label: "Commissions Review" },
            { id: "payouts", label: "Payouts Log" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                setSearchQuery("");
              }}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                activeTab === t.id
                  ? "bg-foreground text-background shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search / Action */}
        <div className="flex w-full md:w-auto gap-2">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="panel px-3 py-2 text-xs w-full md:w-64 focus:outline-none focus:ring-1 focus:ring-border"
          />

          {activeTab === "affiliates" && (
            <button
              onClick={handleNewAffiliate}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-foreground text-background rounded-lg text-xs font-semibold hover:bg-foreground/90 active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5" /> Create Affiliate
            </button>
          )}
        </div>
      </div>

      {/* Active Tab rendering */}
      {activeTab === "affiliates" && (
        <section className="panel p-6 overflow-x-auto mt-4">
          <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5" /> PROMOTERS & CODES
            </p>
            <select
              value={affiliateStatusFilter}
              onChange={(e) => setAffiliateStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-muted-foreground focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="disabled">Disabled Only</option>
            </select>
          </div>

          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="text-left text-[10px] tracking-wider text-muted-foreground border-b border-border pb-3 uppercase">
                <th className="pb-3">Promoter Name</th>
                <th className="pb-3">Ref Code</th>
                <th className="pb-3">Linked Profile</th>
                <th className="pb-3">Clicks</th>
                <th className="pb-3">Signups</th>
                <th className="pb-3">Convs</th>
                <th className="pb-3">Revenue</th>
                <th className="pb-3">Earned</th>
                <th className="pb-3">Unpaid / Paid</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAffiliates.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-xs text-muted-foreground">
                    No affiliates found matching selection.
                  </td>
                </tr>
              ) : (
                filteredAffiliates.map((a) => {
                  const stats = getAffStats(a.id);
                  return (
                    <tr key={a.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/10">
                      <td className="py-3.5">
                        <div className="font-semibold">{a.name}</div>
                        {a.email && <div className="text-[10px] text-muted-foreground">{a.email}</div>}
                      </td>
                      <td className="py-3.5">
                        <span className="font-mono text-xs px-2 py-0.5 bg-secondary/30 rounded border border-border/60">
                          {a.referral_code}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs text-muted-foreground font-mono">
                        {a.user_name ? (
                          <span title={a.user_email || ""}>{a.user_name}</span>
                        ) : (
                          <span className="text-muted-foreground/40">���</span>
                        )}
                      </td>
                      <td className="py-3.5">{stats.clicks.toLocaleString()}</td>
                      <td className="py-3.5">{stats.signups}</td>
                      <td className="py-3.5 text-success font-medium">{stats.conversions}</td>
                      <td className="py-3.5">${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3.5 font-medium">${stats.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3.5 text-xs">
                        <span className="text-[oklch(0.78_0.14_85)]">${stats.unpaid.toFixed(2)}</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-success">${stats.paid.toFixed(2)}</span>
                      </td>
                      <td className="py-3.5 text-xs">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            a.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setViewingAffiliate(a)}
                            title="View Metrics & Log Detail"
                            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopyLink(a.referral_code)}
                            title="Copy Referral Link"
                            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                          >
                            {copiedCode === a.referral_code ? (
                              <Check className="h-3.5 w-3.5 text-success" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditAffiliate(a)}
                            title="Edit Profile"
                            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(a)}
                            title={a.status === "active" ? "Disable Promoter" : "Enable Promoter"}
                            className={`p-1 rounded text-xs transition ${
                              a.status === "active"
                                ? "text-destructive hover:bg-destructive/10"
                                : "text-success hover:bg-success/10"
                            }`}
                          >
                            {a.status === "active" ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      )}

      {activeTab === "commissions" && (
        <section className="panel p-6 overflow-x-auto mt-4">
          <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground">
              COMMISSION WORKFLOWS
            </p>
            <select
              value={commissionStatusFilter}
              onChange={(e) => setCommissionStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-muted-foreground focus:outline-none"
            >
              <option value="all">All Commissions</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="text-left text-[10px] tracking-wider text-muted-foreground border-b border-border pb-3 uppercase">
                <th className="pb-3">Affiliate Promoter</th>
                <th className="pb-3">Purchasing User</th>
                <th className="pb-3">Payment details</th>
                <th className="pb-3">Commission Details</th>
                <th className="pb-3">Created</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Release Window</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                    No commission events found.
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((c) => {
                  const aff = affiliates.find((a) => a.id === c.affiliate_id);
                  const isPayable = c.payable_at ? new Date(c.payable_at) <= new Date() : false;
                  return (
                    <tr key={c.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/10">
                      <td className="py-3.5">
                        <div className="font-semibold">{aff?.name || "Deleted"}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">code: {aff?.referral_code}</div>
                      </td>
                      <td className="py-3.5">
                        <div className="max-w-[150px] truncate" title={c.referred_email || ""}>
                          {c.referred_name || "Hano Insiders User"}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">{c.referred_email}</div>
                      </td>
                      <td className="py-3.5">
                        <div className="font-semibold">
                          ${c.payment_amount.toFixed(2)} {c.payment_currency}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground truncate max-w-[160px]" title={c.provider_payment_id || ""}>
                          ID: {c.provider_payment_id}
                        </div>
                      </td>
                      <td className="py-3.5">
                        <div className="font-semibold text-[oklch(0.78_0.14_85)]">
                          ${c.commission_amount.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">rate: {(c.commission_rate * 100).toFixed(0)}%</div>
                      </td>
                      <td className="py-3.5 text-xs text-muted-foreground">{formatDate(c.created_at)}</td>
                      <td className="py-3.5 text-xs">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            c.status === "paid"
                              ? "bg-success/10 text-success"
                              : c.status === "approved"
                              ? "bg-sky-500/10 text-sky-400"
                              : c.status === "cancelled"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-[oklch(0.78_0.14_85)]/10 text-[oklch(0.78_0.14_85)]"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs text-muted-foreground">
                        {c.status === "pending" ? (
                          <div className="flex flex-col">
                            <span>{formatDate(c.payable_at)}</span>
                            {isPayable ? (
                              <span className="text-sky-400 font-semibold text-[9px]">READY FOR APPROVAL</span>
                            ) : (
                              <span className="text-muted-foreground/45 text-[9px]">LOCK PERIOD</span>
                            )}
                          </div>
                        ) : c.status === "paid" ? (
                          <div className="text-success text-[10px] font-semibold">
                            Paid {formatDate(c.paid_at)}
                            {c.payout_reference && <div className="font-mono text-[9px] text-muted-foreground">Ref: {c.payout_reference}</div>}
                          </div>
                        ) : c.status === "cancelled" ? (
                          <div className="text-destructive text-[10px] truncate max-w-[140px]" title={c.notes || ""}>
                            Reason: {c.notes || "Refunded"}
                          </div>
                        ) : (
                          <span className="text-sky-400 font-semibold text-[10px]">APPROVED (UNPAID)</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          {c.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleApproveCommission(c.id)}
                                className="px-2 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded text-[10px] font-semibold flex items-center gap-1 active:scale-95 transition-all"
                              >
                                <CheckCircle2 className="h-3 w-3" /> Approve
                              </button>
                              <button
                                onClick={() => {
                                  setCancelCommissionId(c.id);
                                  setCancelReason("");
                                }}
                                className="px-2 py-1 bg-destructive/20 hover:bg-destructive text-destructive hover:text-white rounded text-[10px] font-semibold active:scale-95 transition-all"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {c.status === "approved" && (
                            <>
                              <button
                                onClick={() => {
                                  setPayoutCommission(c);
                                  setPayoutReference("");
                                  setPayoutNotes("");
                                }}
                                className="px-2 py-1 bg-success hover:bg-success-dark text-white rounded text-[10px] font-semibold flex items-center gap-1 active:scale-95 transition-all"
                              >
                                <Play className="h-3 w-3" /> Pay Promoter
                              </button>
                              <button
                                onClick={() => {
                                  setCancelCommissionId(c.id);
                                  setCancelReason("");
                                }}
                                className="px-2 py-1 bg-destructive/20 hover:bg-destructive text-destructive hover:text-white rounded text-[10px] font-semibold active:scale-95 transition-all"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {(c.status === "paid" || c.status === "cancelled") && c.notes && (
                            <button
                              onClick={() => alert(`Admin Notes:\n${c.notes}`)}
                              className="px-2 py-1 border border-border/80 hover:bg-secondary/40 rounded text-[10px] text-muted-foreground"
                            >
                              Notes
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      )}

      {activeTab === "payouts" && (
        <section className="panel p-6 overflow-x-auto mt-4">
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground mb-4 border-b border-border pb-3">
            PAID SETTLEMENTS & TRANSFERS
          </p>

          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[10px] tracking-wider text-muted-foreground border-b border-border pb-3 uppercase">
                <th className="pb-3">Payout Date</th>
                <th className="pb-3">Affiliate Promoter</th>
                <th className="pb-3">Ref Code</th>
                <th className="pb-3">Settlement Amount</th>
                <th className="pb-3">Transfer Method</th>
                <th className="pb-3">Payout Reference</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                    No payouts logged in database.
                  </td>
                </tr>
              ) : (
                filteredPayouts.map((p) => (
                  <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/10">
                    <td className="py-3.5 text-xs text-muted-foreground">{formatDate(p.paid_at)}</td>
                    <td className="py-3.5 font-semibold">{p.affiliate_name}</td>
                    <td className="py-3.5">
                      <span className="font-mono text-xs px-2 py-0.5 bg-secondary/30 rounded border border-border/60">
                        {p.affiliate_code}
                      </span>
                    </td>
                    <td className="py-3.5 font-semibold text-success">
                      ${p.amount.toFixed(2)} {p.currency}
                    </td>
                    <td className="py-3.5 text-xs text-muted-foreground">{p.method}</td>
                    <td className="py-3.5 font-mono text-xs text-sky-400">{p.payout_reference}</td>
                    <td className="py-3.5 text-xs">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-success/10 text-success">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-xs text-muted-foreground text-right max-w-[200px] truncate" title={p.notes || ""}>
                      {p.notes || "���"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* CREATE & EDIT AFFILIATE MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="panel border border-border/80 w-full max-w-lg rounded-2xl p-6 bg-background shadow-2xl relative">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-xl mb-4">
              {editingAffiliate ? "Edit Affiliate Promoter" : "Register Affiliate Promoter"}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground block mb-1.5 uppercase">
                    Promoter Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-lg border border-border/80 px-3 py-2 text-xs bg-secondary/20 focus:outline-none focus:ring-1 focus:ring-border"
                    placeholder="E.g. Crypto Analyst"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground block mb-1.5 uppercase">
                    Promoter Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded-lg border border-border/80 px-3 py-2 text-xs bg-secondary/20 focus:outline-none focus:ring-1 focus:ring-border"
                    placeholder="promoter@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground block mb-1.5 uppercase">
                    Referral Code (URL Safe)
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
                    className="w-full rounded-lg border border-border/80 px-3 py-2 text-xs bg-secondary/20 focus:outline-none focus:ring-1 focus:ring-border font-mono"
                    placeholder="cryptoalpha"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground block mb-1.5 uppercase">
                    Commission Rate (0.0 - 1.0)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    required
                    value={formRate}
                    onChange={(e) => setFormRate(parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-border/80 px-3 py-2 text-xs bg-secondary/20 focus:outline-none focus:ring-1 focus:ring-border"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] tracking-wider text-muted-foreground block mb-1.5 uppercase">
                  Link Existing User Profile (Optional)
                </label>
                <select
                  value={formUserId}
                  onChange={(e) => setFormUserId(e.target.value)}
                  className="w-full rounded-lg border border-border/80 px-3 py-2 text-xs bg-secondary/20 focus:outline-none focus:ring-1 focus:ring-border"
                >
                  <option value="">-- No User Account Linked --</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.email} ({p.full_name || "No Name"})
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-muted-foreground mt-1">
                  Required if the affiliate wants to access their stats inside `/dashboard/affiliate`.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground block mb-1.5 uppercase">
                    Payout Method
                  </label>
                  <input
                    type="text"
                    value={formPayoutMethod}
                    onChange={(e) => setFormPayoutMethod(e.target.value)}
                    className="w-full rounded-lg border border-border/80 px-3 py-2 text-xs bg-secondary/20 focus:outline-none focus:ring-1 focus:ring-border"
                    placeholder="Bank, UPI, USDC"
                  />
                </div>
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground block mb-1.5 uppercase">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-border/80 px-3 py-2 text-xs bg-secondary/20 focus:outline-none focus:ring-1 focus:ring-border"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] tracking-wider text-muted-foreground block mb-1.5 uppercase">
                  Payout Details / Wallet Address
                </label>
                <textarea
                  value={formPayoutDetails}
                  onChange={(e) => setFormPayoutDetails(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border/80 px-3 py-2 text-xs bg-secondary/20 focus:outline-none focus:ring-1 focus:ring-border"
                  placeholder="E.g. Bank Account details or Crypto Wallet address"
                />
              </div>

              <div>
                <label className="text-[10px] tracking-wider text-muted-foreground block mb-1.5 uppercase">
                  Admin Internal Notes
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border/80 px-3 py-2 text-xs bg-secondary/20 focus:outline-none focus:ring-1 focus:ring-border"
                  placeholder="Promo details or agreement terms..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-xs hover:bg-secondary/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-foreground text-background font-semibold rounded-lg text-xs"
                >
                  Save Affiliate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED VIEW DRAWER / MODAL FOR SINGLE AFFILIATE */}
      {viewingAffiliate && (() => {
        const stats = getAffStats(viewingAffiliate.id);
        const affClicks = clicks.filter((c) => c.affiliate_id === viewingAffiliate.id);
        const affReferrals = referrals.filter((r) => r.affiliate_id === viewingAffiliate.id);
        const affCommissions = commissions.filter((c) => c.affiliate_id === viewingAffiliate.id);
        const affPayouts = payouts.filter((p) => p.affiliate_id === viewingAffiliate.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm">
            <div className="h-full w-full max-w-2xl bg-background border-l border-border/80 p-6 overflow-y-auto flex flex-col justify-between relative shadow-2xl">
              <button
                onClick={() => setViewingAffiliate(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              <div>
                <h3 className="font-display text-2xl mb-1">{viewingAffiliate.name}</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Referral code: <span className="text-sky-400 font-bold">{viewingAffiliate.referral_code}</span> | Commission Rate: {(viewingAffiliate.commission_rate * 100).toFixed(0)}%
                </p>

                {/* Micro Stats */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <div className="panel p-3">
                    <span className="text-[8px] text-muted-foreground uppercase block">Clicks</span>
                    <span className="text-md font-semibold">{stats.clicks}</span>
                  </div>
                  <div className="panel p-3">
                    <span className="text-[8px] text-muted-foreground uppercase block">Signups</span>
                    <span className="text-md font-semibold">{stats.signups}</span>
                  </div>
                  <div className="panel p-3">
                    <span className="text-[8px] text-muted-foreground uppercase block">Conversions</span>
                    <span className="text-md font-semibold text-success">{stats.conversions}</span>
                  </div>
                  <div className="panel p-3">
                    <span className="text-[8px] text-muted-foreground uppercase block">Total Earned</span>
                    <span className="text-md font-semibold text-[oklch(0.78_0.14_85)]">
                      ${stats.totalCommission.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  {/* Payout Details */}
                  <div className="panel p-4 bg-secondary/10">
                    <h4 className="text-[10px] tracking-widest text-muted-foreground uppercase font-bold mb-2">Payout Config</h4>
                    <p className="text-xs">
                      <strong>Method:</strong> {viewingAffiliate.payout_method || "Not Set"}
                    </p>
                    <p className="text-xs mt-1">
                      <strong>Details:</strong>
                    </p>
                    <pre className="text-[10px] font-mono whitespace-pre-wrap bg-black/40 p-2 rounded border border-border/40 mt-1 max-h-[80px] overflow-y-auto text-muted-foreground">
                      {viewingAffiliate.payout_details || "No details provided"}
                    </pre>
                  </div>

                  {/* Referred Users List */}
                  <div>
                    <h4 className="text-[10px] tracking-widest text-muted-foreground uppercase font-bold mb-2">Referred Users ({affReferrals.length})</h4>
                    <div className="border border-border/60 rounded-lg overflow-hidden max-h-[140px] overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-secondary/40 text-[9px] uppercase text-muted-foreground">
                          <tr>
                            <th className="p-2">Name / Email</th>
                            <th className="p-2">Signup Date</th>
                            <th className="p-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {affReferrals.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-3 text-center text-muted-foreground">No signups yet</td>
                            </tr>
                          ) : (
                            affReferrals.map((r) => (
                              <tr key={r.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/10">
                                <td className="p-2">
                                  <div>{r.referred_name || "Member"}</div>
                                  <div className="text-[9px] text-muted-foreground font-mono">{r.referred_email}</div>
                                </td>
                                <td className="p-2 text-muted-foreground">{formatDate(r.signed_up_at)}</td>
                                <td className="p-2 text-right">
                                  <span className={`text-[9px] px-1 py-0.5 rounded ${r.status === "converted" ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"}`}>
                                    {r.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Commissions History */}
                  <div>
                    <h4 className="text-[10px] tracking-widest text-muted-foreground uppercase font-bold mb-2">Commissions ({affCommissions.length})</h4>
                    <div className="border border-border/60 rounded-lg overflow-hidden max-h-[150px] overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-secondary/40 text-[9px] uppercase text-muted-foreground">
                          <tr>
                            <th className="p-2">Payment / Comm</th>
                            <th className="p-2">Created</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {affCommissions.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-3 text-center text-muted-foreground">No commissions yet</td>
                            </tr>
                          ) : (
                            affCommissions.map((c) => (
                              <tr key={c.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/10">
                                <td className="p-2">
                                  <div>Payment: <strong>${c.payment_amount.toFixed(2)}</strong></div>
                                  <div className="text-[10px] text-[oklch(0.78_0.14_85)]">Comm: <strong>${c.commission_amount.toFixed(2)}</strong></div>
                                </td>
                                <td className="p-2 text-muted-foreground">{formatDate(c.created_at)}</td>
                                <td className="p-2">
                                  <span className={`text-[9px] px-1 py-0.5 rounded uppercase font-semibold ${c.status === "paid" ? "bg-success/10 text-success" : c.status === "approved" ? "bg-sky-500/10 text-sky-400" : c.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-[oklch(0.78_0.14_85)]/10 text-[oklch(0.78_0.14_85)]"}`}>
                                    {c.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payout History */}
                  <div>
                    <h4 className="text-[10px] tracking-widest text-muted-foreground uppercase font-bold mb-2">Payout Settlements ({affPayouts.length})</h4>
                    <div className="border border-border/60 rounded-lg overflow-hidden max-h-[120px] overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-secondary/40 text-[9px] uppercase text-muted-foreground">
                          <tr>
                            <th className="p-2">Date / Amount</th>
                            <th className="p-2">Method / Ref</th>
                          </tr>
                        </thead>
                        <tbody>
                          {affPayouts.length === 0 ? (
                            <tr>
                              <td colSpan={2} className="p-3 text-center text-muted-foreground">No payouts logged</td>
                            </tr>
                          ) : (
                            affPayouts.map((p) => (
                              <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/10">
                                <td className="p-2">
                                  <div>{formatDate(p.paid_at)}</div>
                                  <div className="font-semibold text-success">${p.amount.toFixed(2)} {p.currency}</div>
                                </td>
                                <td className="p-2 text-muted-foreground">
                                  <div>Method: {p.method}</div>
                                  <div className="font-mono text-[9px] text-sky-400">Ref: {p.payout_reference}</div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <button
                  onClick={() => setViewingAffiliate(null)}
                  className="px-4 py-2 bg-foreground text-background rounded-lg text-xs font-semibold hover:bg-foreground/90 transition-all"
                >
                  Close Detail
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MARK PAID MANUAL PAYOUT MODAL */}
      {payoutCommission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="panel border border-border/80 w-full max-w-md rounded-2xl p-6 bg-background shadow-2xl relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setPayoutCommission(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-xl mb-2">Record Manual Payout</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Log manual payout made to affiliate outside Hano Insiders. This commission status transitions to paid.
            </p>

            <div className="panel p-3 mb-4 bg-secondary/10 flex justify-between items-center text-xs">
              <div>
                <span className="text-[9px] uppercase text-muted-foreground block">Settlement Amount</span>
                <span className="font-semibold text-success text-sm">
                  ${payoutCommission.commission_amount.toFixed(2)} {payoutCommission.payment_currency}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase text-muted-foreground block">Ref Code</span>
                <span className="font-mono text-xs px-2 py-0.5 bg-secondary/30 rounded border border-border/60">
                  {affiliates.find((a) => a.id === payoutCommission.affiliate_id)?.referral_code}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] tracking-wider text-muted-foreground block mb-1.5 uppercase">
                  Payout Method
                </label>
                <input
                  type="text"
                  required
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full rounded-lg border border-border/80 px-3 py-2 text-xs bg-secondary/20 focus:outline-none"
                  placeholder="USDC, UPI, Paypal, Bank Wire..."
                />
              </div>

              <div>
                <label className="text-[10px] tracking-wider text-muted-foreground block mb-1.5 uppercase">
                  Payout Reference / TxID
                </label>
                <input
                  type="text"
                  required
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  className="w-full rounded-lg border border-border/80 px-3 py-2 text-xs bg-secondary/20 focus:outline-none font-mono"
                  placeholder="Transaction hash, receipt ID, etc."
                />
              </div>

              <div>
                <label className="text-[10px] tracking-wider text-muted-foreground block mb-1.5 uppercase">
                  Payout Note / Internal Comment (Optional)
                </label>
                <textarea
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border/80 px-3 py-2 text-xs bg-secondary/20 focus:outline-none"
                  placeholder="Add any specific details regarding payment..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border/60">
                <button
                  onClick={() => setPayoutCommission(null)}
                  className="px-4 py-2 border border-border rounded-lg text-xs hover:bg-secondary/40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkPaid}
                  className="px-4 py-2 bg-success text-white font-semibold rounded-lg text-xs hover:bg-success-dark transition-all"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL COMMISSION MODAL */}
      {cancelCommissionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="panel border border-border/80 w-full max-w-md rounded-2xl p-6 bg-background shadow-2xl relative">
            <button
              onClick={() => setCancelCommissionId(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-display text-xl mb-2">Cancel Commission</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Mark this commission as cancelled (e.g., due to user refund, chargeback, or payment failure).
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] tracking-wider text-muted-foreground block mb-1.5 uppercase">
                  Cancellation Reason
                </label>
                <textarea
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border/80 px-3 py-2 text-xs bg-secondary/20 focus:outline-none"
                  placeholder="E.g., User subscription refunded within 7 days..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setCancelCommissionId(null)}
                  className="px-4 py-2 border border-border rounded-lg text-xs hover:bg-secondary/40"
                >
                  Close
                </button>
                <button
                  onClick={handleCancelCommission}
                  disabled={!cancelReason.trim()}
                  className="px-4 py-2 bg-destructive text-white font-semibold rounded-lg text-xs hover:bg-destructive/90 transition-all disabled:opacity-40"
                >
                  Cancel Commission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
