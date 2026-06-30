"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MessageSquare, Search, X } from "lucide-react";
import {
  updateSupportTicketAction,
  type AdminSupportTicket,
  type SupportTicketStatus,
} from "./actions";

const filters = ["All", "Open", "Pending", "Closed"] as const;

const STATUS_COLORS: Record<SupportTicketStatus, string> = {
  open: "text-[oklch(0.78_0.14_85)]",
  pending: "text-violet-300",
  closed: "text-success",
};

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

export function AdminSupportClient({ tickets }: { tickets: AdminSupportTicket[] }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminSupportTicket | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [status, setStatus] = useState<SupportTicketStatus>("open");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (filter !== "All" && ticket.status !== filter.toLowerCase()) return false;
      if (!q) return true;
      return (
        ticket.subject.toLowerCase().includes(q) ||
        ticket.message.toLowerCase().includes(q) ||
        (ticket.user_email?.toLowerCase().includes(q) ?? false) ||
        (ticket.user_name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [tickets, filter, search]);

  const openCount = tickets.filter((t) => t.status === "open").length;
  const pendingCount = tickets.filter((t) => t.status === "pending").length;

  const openTicket = (ticket: AdminSupportTicket) => {
    setSelected(ticket);
    setAdminResponse(ticket.admin_response ?? "");
    setStatus(ticket.status);
  };

  const closeModal = () => {
    setSelected(null);
    setAdminResponse("");
    setSaving(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);

    const result = await updateSupportTicketAction({
      ticketId: selected.id,
      status,
      adminResponse,
    });

    if (result.success) {
      toast.success("Ticket updated");
      closeModal();
      router.refresh();
    } else {
      toast.error(result.error || "Could not update ticket");
      setSaving(false);
    }
  };

  return (
    <>
      <section className="panel p-6">
        <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground">
              MEMBER SUPPORT TICKETS
              <span className="ml-2 font-medium text-foreground">{filtered.length}</span>
              {openCount > 0 && (
                <span className="ml-2 text-[oklch(0.78_0.14_85)]">({openCount} open)</span>
              )}
              {pendingCount > 0 && (
                <span className="ml-2 text-violet-300">({pendingCount} pending)</span>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Review member requests from the dashboard support page and send responses.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject, email, or message…"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-xs sm:w-72"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
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
          <div className="py-12 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No support tickets found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">MEMBER</th>
                  <th className="pb-3 pr-4">SUBJECT</th>
                  <th className="pb-3 pr-4">MESSAGE</th>
                  <th className="pb-3 pr-4">SUBMITTED</th>
                  <th className="pb-3 pr-4">STATUS</th>
                  <th className="pb-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-border/50 align-top">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{ticket.user_name || "Member"}</p>
                      <p className="text-xs text-muted-foreground">{ticket.user_email || "—"}</p>
                    </td>
                    <td className="py-3 pr-4 font-medium">{ticket.subject}</td>
                    <td className="max-w-xs py-3 pr-4">
                      <p className="line-clamp-3 text-xs text-muted-foreground">{ticket.message}</p>
                      {ticket.admin_response ? (
                        <p className="mt-2 line-clamp-2 text-xs text-violet-200/80">
                          Reply: {ticket.admin_response}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {formatDate(ticket.created_at)}
                    </td>
                    <td className={`py-3 pr-4 text-xs uppercase tracking-wider ${STATUS_COLORS[ticket.status]}`}>
                      {ticket.status}
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => openTicket(ticket)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
                      >
                        View / reply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {mounted && selected
        ? createPortal(
            <div
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4"
              onClick={closeModal}
            >
              <div
                className="panel max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6"
                onClick={(e) => e.stopPropagation()}
              >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] tracking-[0.2em] text-muted-foreground">TICKET DETAIL</p>
                <h2 className="mt-1 text-xl font-semibold">{selected.subject}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected.user_name || "Member"} · {selected.user_email || "No email"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Submitted {formatDate(selected.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg border border-border/60 bg-black/20 p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Member message</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{selected.message}</p>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SupportTicketStatus)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-violet-300"
                >
                  <option value="open">Open — needs review</option>
                  <option value="pending">Pending — waiting on member</option>
                  <option value="closed">Closed — resolved</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Admin response</label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={6}
                  placeholder="Write a reply the member will see on their support page."
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none focus:border-violet-300"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save response
              </button>
            </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
