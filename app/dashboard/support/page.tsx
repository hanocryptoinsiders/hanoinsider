"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/lib/auth-context";

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  admin_response: string | null;
};

export default function SupportPage() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("Subscription & Billing");
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const supportEmail = "hannah@hanoanimations.com";

  async function loadTickets() {
    try {
      setLoading(true);
      const res = await fetch("/api/support/tickets");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load tickets");
      setTickets(data.tickets || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Support tickets are not configured yet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTickets(); }, []);

  async function submitTicket(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create ticket");
      setTickets((prev) => [data.ticket, ...prev]);
      setMessage("");
      toast.success("Support ticket created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Support ticket storage needs database setup.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyEmail() {
    await navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <PageHeader kicker="SUPPORT" title="Member support." desc="Create a support ticket, review previous messages, or contact Hannah directly for billing and account help." />

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <section className="panel p-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-violet-300" />
            <h2 className="text-xl font-semibold">Create a ticket</h2>
          </div>
          <form onSubmit={submitTicket} className="mt-5 grid gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background/50 px-3 py-3 text-sm outline-none focus:border-violet-300">
                <option>Subscription & Billing</option>
                <option>Technical Issue</option>
                <option>Affiliate / Referral</option>
                <option>Account Access</option>
                <option>General Question</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={7} required placeholder="Tell us what happened and include any relevant payment or account details." className="mt-2 w-full rounded-lg border border-border bg-background/50 px-3 py-3 text-sm outline-none focus:border-violet-300" />
            </div>
            <button disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-lg hano-gradient px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Submit ticket
            </button>
          </form>
        </section>

        <aside className="grid gap-5">
          <div className="panel p-6">
            <Mail className="h-5 w-5 text-violet-300" />
            <h2 className="mt-4 text-xl font-semibold">Direct email</h2>
            <p className="mt-2 text-sm text-muted-foreground">Use this for urgent payment or account access questions.</p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
              <code className="truncate text-sm">{supportEmail}</code>
              <button onClick={copyEmail} className="rounded-md border border-white/10 bg-white/5 p-2">{copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}</button>
            </div>
            <a href={`mailto:${supportEmail}?subject=Hano%20Insiders%20support&body=Registered%20email:%20${encodeURIComponent(user?.email || "")}%0A%0A`} className="mt-4 inline-flex rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold">Open mail client</a>
          </div>
        </aside>
      </div>

      <section className="panel p-6">
        <h2 className="text-xl font-semibold">Previous tickets</h2>
        <div className="mt-4 grid gap-3">
          {loading && <p className="text-sm text-muted-foreground">Loading tickets...</p>}
          {!loading && tickets.length === 0 && <p className="text-sm text-muted-foreground">No tickets yet.</p>}
          {tickets.map((ticket) => (
            <article key={ticket.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">{ticket.subject}</h3>
                <span className="rounded-md border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-violet-100">{ticket.status}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{ticket.message}</p>
              {ticket.admin_response && <p className="mt-3 rounded-lg bg-white/5 p-3 text-sm">Admin response: {ticket.admin_response}</p>}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
