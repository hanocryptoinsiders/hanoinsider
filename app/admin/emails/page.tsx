"use client";

import { useEffect, useState, useTransition } from "react";
import { Eye, Loader2, Mail, Send, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { toast } from "sonner";
import {
  previewCommunityEmailRecipients,
  sendCommunityEmail,
} from "./actions";
import { buildCommunityUpdateEmail } from "@/lib/email/community-email";

export default function AdminEmailsPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    previewCommunityEmailRecipients()
      .then((r) => setRecipientCount(r.count))
      .catch(() => setRecipientCount(null));
  }, []);

  const preview = subject.trim() && message.trim()
    ? buildCommunityUpdateEmail(subject.trim(), message.trim())
    : null;

  const handleSend = () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required");
      return;
    }

    const confirmed = window.confirm(
      `Send this update to ${recipientCount ?? "all paid"} subscriber email(s)?\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await sendCommunityEmail(subject, message);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.skipped > 0) {
        toast.warning(`Sent to ${result.sent} recipients (${result.skipped} skipped — email not configured).`);
      } else {
        toast.success(`Community update sent to ${result.sent} subscriber(s).`);
      }
      setSubject("");
      setMessage("");
      setShowPreview(false);
    });
  };

  return (
    <>
      <PageHeader
        kicker="Email desk"
        title="Community updates"
        desc="Send platform updates to paid members and subscribers. Uses Resend on the server — API keys never touch the browser."
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
        <div className="panel p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              Recipients:{" "}
              <strong className="text-foreground">
                {recipientCount === null ? "…" : recipientCount.toLocaleString()}
              </strong>{" "}
              paid / subscribed emails
            </span>
          </div>

          <div>
            <label className="text-[10px] tracking-wider text-muted-foreground uppercase font-semibold block mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              placeholder="e.g. New market brief published"
              className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm focus:outline-none focus:border-foreground/30"
            />
          </div>

          <div>
            <label className="text-[10px] tracking-wider text-muted-foreground uppercase font-semibold block mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              maxLength={10000}
              placeholder="Write your update for the community…"
              className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm focus:outline-none focus:border-foreground/30 resize-y font-mono leading-relaxed"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{message.length}/10,000</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              disabled={!preview}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-secondary disabled:opacity-40"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? "Hide preview" : "Preview"}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending || !subject.trim() || !message.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send community update
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-4">
            Safeguards: admin-only, server-side validation, paid-recipient list only, and at least one minute between sends.
            Large lists are batched (20 per request, max 500 total). Configure{" "}
            <code className="text-[10px] bg-secondary px-1 rounded">RESEND_API_KEY</code> and a verified{" "}
            <code className="text-[10px] bg-secondary px-1 rounded">EMAIL_FROM</code> domain for delivery.
          </p>
        </div>

        <div className="panel p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Email preview</h2>
          </div>
          {!showPreview || !preview ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Add a subject and message, then click Preview.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-mono text-muted-foreground">Subject: {preview.subject}</p>
              <div
                className="rounded-lg border border-border overflow-hidden bg-[#0e0f12] max-h-[480px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
