"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Search } from "lucide-react";
import type { ManualCryptoPaymentRow } from "@/lib/crypto-payments";
import {
  approveCryptoPaymentAction,
  rejectCryptoPaymentAction,
} from "./actions";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-[oklch(0.78_0.14_85)]",
  approved: "text-success",
  rejected: "text-destructive",
};

const filters = ["All", "Pending", "Approved", "Rejected"] as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type RowWithUrl = ManualCryptoPaymentRow & { proof_screenshot_url?: string | null };

export function AdminCryptoPaymentsSection({ payments }: { payments: RowWithUrl[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Pending");
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    type: "approve" | "reject";
    payment: RowWithUrl;
  } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (filter !== "All" && p.status !== filter.toLowerCase()) return false;
      if (!q) return true;
      return (
        p.email.toLowerCase().includes(q) ||
        p.transaction_hash.toLowerCase().includes(q) ||
        p.full_name.toLowerCase().includes(q)
      );
    });
  }, [payments, filter, search]);

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  const handleAction = async () => {
    if (!modal) return;
    setLoadingId(modal.payment.id);
    const result =
      modal.type === "approve"
        ? await approveCryptoPaymentAction(modal.payment.id, adminNotes || null)
        : await rejectCryptoPaymentAction(modal.payment.id, adminNotes || null);

    if (result.success) {
      toast.success(modal.type === "approve" ? "Payment approved" : "Payment rejected");
      setModal(null);
      setAdminNotes("");
    } else {
      toast.error(result.error || "Action failed");
    }
    setLoadingId(null);
  };

  return (
    <>
      <section className="panel p-6 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground">
              MANUAL CRYPTO PAYMENTS
              <span className="ml-2 text-foreground font-medium">{filtered.length}</span>
              {pendingCount > 0 && (
                <span className="ml-2 text-[oklch(0.78_0.14_85)]">({pendingCount} pending)</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Review crypto payment proofs before granting registration access.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email or tx hash…"
              className="rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-xs w-full sm:w-64"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
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

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No crypto payment submissions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="text-left text-[10px] tracking-wider text-muted-foreground border-b border-border">
                  <th className="pb-3 pr-4">USER</th>
                  <th className="pb-3 pr-4">PLAN</th>
                  <th className="pb-3 pr-4">AMOUNT</th>
                  <th className="pb-3 pr-4">NETWORK</th>
                  <th className="pb-3 pr-4">TX HASH</th>
                  <th className="pb-3 pr-4">SENDER</th>
                  <th className="pb-3 pr-4">PROOF</th>
                  <th className="pb-3 pr-4">SUBMITTED</th>
                  <th className="pb-3 pr-4">STATUS</th>
                  <th className="pb-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 align-top">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </td>
                    <td className="py-3 pr-4 text-xs">{p.plan_name}</td>
                    <td className="py-3 pr-4 text-xs">
                      ${Number(p.amount_paid).toFixed(2)}
                      <span className="text-muted-foreground block">expected ${Number(p.expected_amount).toFixed(2)}</span>
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      {p.currency}
                      <span className="text-muted-foreground block">{p.network}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <code className="text-[10px] break-all max-w-[140px] block">{p.transaction_hash}</code>
                    </td>
                    <td className="py-3 pr-4">
                      <code className="text-[10px] break-all max-w-[120px] block">{p.sender_wallet_address}</code>
                    </td>
                    <td className="py-3 pr-4">
                      {p.proof_screenshot_url ? (
                        <a
                          href={p.proof_screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs underline"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{formatDate(p.created_at)}</td>
                    <td className={`py-3 pr-4 text-xs font-medium capitalize ${STATUS_COLORS[p.status] ?? ""}`}>
                      {p.status}
                    </td>
                    <td className="py-3">
                      {p.status === "pending" ? (
                        <div className="flex flex-col gap-1.5">
                          <button
                            disabled={loadingId === p.id}
                            onClick={() => {
                              setAdminNotes("");
                              setModal({ type: "approve", payment: p });
                            }}
                            className="rounded-md bg-foreground text-background px-3 py-1.5 text-[11px] font-medium hover:bg-foreground/90 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            disabled={loadingId === p.id}
                            onClick={() => {
                              setAdminNotes("");
                              setModal({ type: "reject", payment: p });
                            }}
                            className="rounded-md border border-destructive/50 text-destructive px-3 py-1.5 text-[11px] hover:bg-destructive/10 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          {p.admin_notes ? p.admin_notes : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="panel-elevated w-full max-w-md rounded-2xl border border-border p-6">
            <h3 className="font-display text-lg mb-1">
              {modal.type === "approve" ? "Approve payment?" : "Reject payment?"}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {modal.payment.full_name} · {modal.payment.email} · ${Number(modal.payment.amount_paid).toFixed(2)}
            </p>
            {modal.type === "approve" && (
              <p className="text-xs text-muted-foreground mb-4 rounded-lg border border-border px-3 py-2">
                This will mark the email as paid, send a registration email, and allow the user to create an account.
              </p>
            )}
            <label className="text-xs text-muted-foreground">Admin notes {modal.type === "reject" ? "(recommended)" : "(optional)"}</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
              placeholder={modal.type === "reject" ? "Reason for rejection…" : "Internal notes…"}
            />
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={loadingId === modal.payment.id}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAction}
                disabled={loadingId === modal.payment.id}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                  modal.type === "approve"
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                }`}
              >
                {loadingId === modal.payment.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : modal.type === "approve" ? (
                  "Confirm approve"
                ) : (
                  "Confirm reject"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
