"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Send, Trash2, Info, CheckCircle2, AlertTriangle, AlertCircle, Loader2, Pencil, X } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { toast } from "sonner";

type NotificationType = "info" | "success" | "warning" | "alert";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  created_at: string;
};

const TYPE_OPTIONS: { value: NotificationType; label: string; icon: typeof Info; color: string }[] = [
  { value: "info", label: "Info", icon: Info, color: "text-blue-400" },
  { value: "success", label: "Success", icon: CheckCircle2, color: "text-emerald-400" },
  { value: "warning", label: "Warning", icon: AlertTriangle, color: "text-amber-400" },
  { value: "alert", label: "Alert", icon: AlertCircle, color: "text-red-400" },
];

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("info");
  const [link, setLink] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    setIsSending(true);
    try {
      const isEditing = !!editingId;
      const endpoint = "/api/notifications";
      const method = isEditing ? "PATCH" : "POST";
      const body = {
        title: title.trim(),
        message: message.trim(),
        type,
        link: link.trim() || undefined,
        ...(isEditing ? { id: editingId } : {}),
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${isEditing ? "update" : "send"} notification`);
      }

      toast.success(isEditing ? "Notification updated successfully!" : "Notification sent to all users!");
      setTitle("");
      setMessage("");
      setType("info");
      setLink("");
      setEditingId(null);
      fetchNotifications();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setIsSending(false);
    }
  };

  const startEdit = (n: NotificationItem) => {
    setEditingId(n.id);
    setTitle(n.title);
    setMessage(n.message);
    setType(n.type);
    setLink(n.link || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setMessage("");
    setType("info");
    setLink("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete notification");
      }

      toast.success("Notification deleted successfully");
      if (editingId === id) {
        handleCancelEdit();
      }
      fetchNotifications();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <PageHeader
        kicker="Broadcast"
        title="Notifications"
        desc="Send, edit, and manage broadcast notifications. They appear in the bell icon on member dashboards."
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-5">
        {/* Create Notification Form */}
        <div className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {editingId ? (
                <Pencil className="h-4 w-4 text-amber-500" />
              ) : (
                <Send className="h-4 w-4 text-muted-foreground" />
              )}
              <h2 className="text-sm font-semibold tracking-wide">
                {editingId ? "Edit Notification" : "Send New Notification"}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <X className="h-3 w-3" />
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSend} className="space-y-5">
            {/* Type selector */}
            <div>
              <label className="text-[10px] tracking-wider text-muted-foreground uppercase font-semibold block mb-2">
                Type
              </label>
              <div className="flex gap-2">
                {TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
                        type === opt.value
                          ? "bg-secondary border-foreground/20 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/10"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${opt.color}`} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-[10px] tracking-wider text-muted-foreground uppercase font-semibold block mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New Feature: Advanced Charts"
                maxLength={100}
                className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/30 transition"
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-[10px] tracking-wider text-muted-foreground uppercase font-semibold block mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your notification message..."
                rows={3}
                maxLength={500}
                className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/30 transition resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">{message.length}/500</p>
            </div>

            {/* Link (optional) */}
            <div>
              <label className="text-[10px] tracking-wider text-muted-foreground uppercase font-semibold block mb-2">
                Link (Optional)
              </label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="e.g. /dashboard/market or https://..."
                className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/30 transition"
              />
            </div>

            {/* Submit / Action buttons */}
            <div className="flex gap-3">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border text-foreground py-3 text-sm font-semibold hover:bg-secondary active:scale-[0.99] transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSending || !title.trim() || !message.trim()}
                className={`${
                  editingId ? "flex-1" : "w-full"
                } flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {editingId ? "Saving…" : "Sending…"}
                  </>
                ) : (
                  <>
                    {editingId ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {editingId ? "Save Changes" : "Send to All Users"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Recent Notifications */}
        <div className="panel p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-wide">Recent Notifications</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/20 mb-3" />
              <p className="text-xs text-muted-foreground">No notifications sent yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {notifications.map((n) => {
                const config = TYPE_OPTIONS.find((o) => o.value === n.type) ?? TYPE_OPTIONS[0];
                const Icon = config.icon;
                const isDeleting = deletingId === n.id;
                const isEditingThis = editingId === n.id;
                return (
                  <div
                    key={n.id}
                    className={`border rounded-lg p-3 hover:border-foreground/10 transition-colors ${
                      isEditingThis ? "border-amber-500 bg-amber-500/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-2 justify-between">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${config.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                          {n.link && (
                            <p className="text-[9px] text-primary truncate mt-1">
                              Link: {n.link}
                            </p>
                          )}
                          <p className="text-[9px] text-muted-foreground/60 mt-1">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <button
                          onClick={() => startEdit(n)}
                          disabled={isDeleting}
                          title="Edit notification"
                          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors hover:bg-secondary disabled:opacity-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(n.id)}
                          disabled={isDeleting}
                          title="Delete notification"
                          className="p-1 text-muted-foreground hover:text-red-500 rounded transition-colors hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
