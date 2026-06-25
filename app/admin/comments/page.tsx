"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { MessageSquare, AlertTriangle, EyeOff, CheckCircle2, Trash2 } from "lucide-react";

const initialComments = [
  { id: 1, user: "john_btc@***.com", target: "Insight: Bitcoin Liquidity Sweep", text: "This is a solid analysis. Do you think the sweep goes lower to $62k?", status: "recent", date: "10m ago", flags: 0 },
  { id: 2, user: "scam_bot_99@***.com", target: "Article: The rate cycle and crypto", text: "Earn 500% daily returns! Click my profile link now to join my WhatsApp market context group!", status: "reported", date: "1h ago", flags: 4 },
  { id: 3, user: "macro_trader@***.com", target: "Video: May 2026 market structure", text: "CPI print next week will be the real trigger. Excellent structure review.", status: "recent", date: "2h ago", flags: 0 },
  { id: 4, user: "toxic_user@***.com", target: "Insight: ETH/BTC structure shift", text: "Your predictions are completely useless. Absolute trash tier research.", status: "reported", date: "4h ago", flags: 2 },
  { id: 5, user: "spammer@***.com", target: "Article: Order flow basics", text: "Buy cheap crypto course on my site! Cheap price!", status: "hidden", date: "1d ago", flags: 5 },
  { id: 6, user: "deleted_user@***.com", target: "Insight: Bitcoin Liquidity Sweep", text: "This comment was deleted by admin.", status: "deleted", date: "2d ago", flags: 0 },
];

export default function AdminCommentsPage() {
  const [comments, setComments] = useState(initialComments);
  const [filter, setFilter] = useState("all");

  const filteredComments = comments.filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  const handleApprove = (id: number) => {
    setComments(comments.map(c => c.id === id ? { ...c, status: "approved", flags: 0 } : c));
  };

  const handleHide = (id: number) => {
    setComments(comments.map(c => c.id === id ? { ...c, status: "hidden" } : c));
  };

  const handleDelete = (id: number) => {
    setComments(comments.map(c => c.id === id ? { ...c, status: "deleted" } : c));
  };

  return (
    <>
      <PageHeader kicker="MODERATION" title="Manage community discussion." />

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "All Comments" },
          { key: "recent", label: "Recent" },
          { key: "reported", label: "Reported" },
          { key: "hidden", label: "Hidden" },
          { key: "deleted", label: "Deleted" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-lg px-4 py-2 text-xs transition ${
              filter === t.key ? "bg-foreground text-background" : "panel hover:bg-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="panel p-6 overflow-x-auto">
        <p className="text-[11px] tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5" /> COMMENT LIST ({filteredComments.length})
        </p>

        <div className="mt-4 space-y-4 min-w-[700px]">
          {filteredComments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No comments found in this category.</p>
          ) : (
            filteredComments.map((c) => (
              <div
                key={c.id}
                className="border border-border bg-background/30 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-muted transition"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-muted-foreground">{c.user}</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="text-muted-foreground">{c.target}</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="text-muted-foreground/60">{c.date}</span>
                    {c.flags > 0 && (
                      <span className="flex items-center gap-1 rounded bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 text-[10px] text-destructive">
                        <AlertTriangle className="h-3 w-3" /> {c.flags} Flags
                      </span>
                    )}
                    <span className={`text-[10px] tracking-wider uppercase rounded px-1.5 py-0.2 border ${
                      c.status === "reported"
                        ? "border-destructive/30 text-destructive bg-destructive/5"
                        : c.status === "hidden"
                        ? "border-yellow-600/30 text-yellow-600 bg-yellow-600/5"
                        : c.status === "deleted"
                        ? "border-muted-foreground/30 text-muted-foreground bg-secondary"
                        : "border-success/30 text-success bg-success/5"
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground mt-2">{c.text}</p>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  {c.status !== "approved" && (
                    <button
                      onClick={() => handleApprove(c.id)}
                      title="Approve comment"
                      className="rounded-lg p-2 hover:bg-accent text-success transition"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  {c.status !== "hidden" && (
                    <button
                      onClick={() => handleHide(c.id)}
                      title="Hide comment"
                      className="rounded-lg p-2 hover:bg-accent text-yellow-600 transition"
                    >
                      <EyeOff className="h-4 w-4" />
                    </button>
                  )}
                  {c.status !== "deleted" && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      title="Delete comment"
                      className="rounded-lg p-2 hover:bg-accent text-destructive transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
