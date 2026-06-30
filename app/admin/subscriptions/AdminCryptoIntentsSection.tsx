"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, XCircle, Loader2, Search, Bitcoin } from "lucide-react";
import type { CryptoIntentRow, IntentStatus } from "@/lib/crypto/payment-intents";

const FILTERS: Array<{ key: "all" | IntentStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "expired", label: "Expired" },
  { key: "failed", label: "Failed" },
];

const STATUS_STYLE: Record<IntentStatus, string> = {
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  confirmed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  expired: "bg-secondary text-muted-foreground border border-border",
  failed: "bg-red-500/15 text-red-400 border border-red-500/20",
};

function truncate(value: string | null, head = 8, tail = 6) {
  if (!value) return "—";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function AdminCryptoIntentsSection() {
  const [intents, setIntents] = useState<CryptoIntentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | IntentStatus>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/crypto-intents?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setIntents(data.intents ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load crypto payments");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    // Data fetch on mount / when filter/search change. The state updates happen
    // inside the async loader, not as a cascading synchronous render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const recheck = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/crypto-intents/${id}/recheck`, { method: "POST" });
      const data = await res.json();
      if (data.status === "confirmed") toast.success("Confirmed on-chain — customer activated");
      else toast.info(`Still ${data.status}${data.reason ? ` (${data.reason})` : ""}`);
      load();
    } catch {
      toast.error("Re-check failed");
    } finally {
      setBusyId(null);
    }
  };

  const approve = async (row: CryptoIntentRow) => {
    const note = window.prompt(
      `Manually activate access for ${row.email}?\n\nOnly do this once you've confirmed the payment yourself (e.g. on the block explorer). Optional note:`,
      "",
    );
    if (note === null) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/crypto-intents/${row.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Activation failed");
      toast.success(`${row.email} activated — confirmation email sent`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (row: CryptoIntentRow) => {
    const note = window.prompt(`Reject ${row.email}'s payment? Optional reason:`, "");
    if (note === null) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/crypto-intents/${row.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Reject failed");
      }
      toast.success("Marked as failed");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="panel mt-6 p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Bitcoin className="h-4 w-4 text-[oklch(0.78_0.14_85)]" />
          <h2 className="text-sm font-semibold tracking-tight">Crypto payments (on-chain)</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="email / tx hash"
              className="rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-xs focus:outline-none"
            />
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap border-b border-border px-5 py-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1 text-xs transition ${
              filter === f.key ? "bg-foreground text-background" : "panel hover:bg-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : intents.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">No crypto payments for this filter.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[920px]">
            <thead>
              <tr className="text-left text-[10px] tracking-wider text-muted-foreground border-b border-border bg-secondary/5">
                <th className="px-5 py-3">EMAIL</th>
                <th className="px-5 py-3">PLAN</th>
                <th className="px-5 py-3">AMOUNT</th>
                <th className="px-5 py-3">STATUS</th>
                <th className="px-5 py-3">TX HASH</th>
                <th className="px-5 py-3">CREATED</th>
                <th className="px-5 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {intents.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-secondary/5">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-foreground">{row.email}</div>
                    {row.full_name && <div className="text-[11px] text-muted-foreground">{row.full_name}</div>}
                    {row.last_error && (
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">{row.last_error}</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">{row.plan_name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs">
                    {row.detected_amount != null ? `${row.detected_amount}` : `${row.expected_amount}`}
                    <span className="text-muted-foreground"> {row.currency}</span>
                    {row.detected_amount == null && (
                      <div className="text-[10px] text-muted-foreground">exp. {row.expected_amount}</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] font-mono tracking-wider rounded px-2 py-0.5 ${STATUS_STYLE[row.status]}`}>
                      {row.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {row.transaction_hash ? (
                      <span className="font-mono text-[11px] text-muted-foreground" title={row.transaction_hash}>
                        {truncate(row.transaction_hash)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {row.status !== "confirmed" && (
                        <>
                          <button
                            onClick={() => recheck(row.id)}
                            disabled={busyId === row.id}
                            title="Re-check on-chain"
                            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
                          >
                            {busyId === row.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => approve(row)}
                            disabled={busyId === row.id}
                            title="Manually activate"
                            className="rounded p-1.5 text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-40"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => reject(row)}
                            disabled={busyId === row.id}
                            title="Mark as failed"
                            className="rounded p-1.5 text-red-500 hover:bg-red-500/10 disabled:opacity-40"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                      {row.status === "confirmed" && (
                        <span className="text-[10px] text-muted-foreground">activated</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
