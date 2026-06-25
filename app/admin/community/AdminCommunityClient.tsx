"use client";

import { useState, useTransition } from "react";
import {
  MessageSquare, EyeOff, Trash2, VolumeX, Volume2, Ban, ShieldCheck,
  ChevronRight, AlertTriangle, Clock, Hash, Check, X, Users, Activity,
  RefreshCcw, Eye
} from "lucide-react";
import { toast } from "sonner";

// ������ Types ����������������������������������������������������������������������������������������������������������������������������������������
type ChatProfile = { full_name: string | null; email: string | null; role?: string; avatar_url?: string | null };
type ChatRoom = { name: string; slug: string };

type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  room_id: string;
  user_id: string;
  is_hidden: boolean;
  profile: ChatProfile | null;
  room: ChatRoom | null;
};

type RestrictedUser = {
  user_id: string;
  status: "muted" | "banned";
  until: string | null;
  reason: string | null;
  updated_at: string;
  profile: ChatProfile | null;
};

type ModerationEntry = {
  id: string;
  action: string;
  reason: string | null;
  created_at: string;
  admin: { full_name: string | null; email: string | null } | null;
  target: { full_name: string | null; email: string | null } | null;
};

type Room = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  admin_only: boolean;
  position: number;
};

interface Props {
  hiddenMessages: ChatMessage[];
  recentMessages: ChatMessage[];
  restrictedUsers: RestrictedUser[];
  moderationLog: ModerationEntry[];
  rooms: Room[];
}

// ������ Helpers ������������������������������������������������������������������������������������������������������������������������������������
function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getInitial(name: string | null | undefined) {
  return (name || "?").charAt(0).toUpperCase();
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  hide_message:   { label: "Hide Message",  color: "text-yellow-500" },
  delete_message: { label: "Delete Message", color: "text-destructive" },
  mute_user:      { label: "Mute User",     color: "text-yellow-500" },
  ban_user:       { label: "Ban User",      color: "text-destructive" },
  unmute_user:    { label: "Unmute User",   color: "text-success" },
  unban_user:     { label: "Unban User",    color: "text-success" },
};

// ������ Tab enum ��������������������������������������������������������������������������������������������������������������������������������
type Tab = "messages" | "hidden" | "restricted" | "log";

// ������ Confirm Modal ����������������������������������������������������������������������������������������������������������������������
function ConfirmModal({
  title, body, confirmLabel, confirmClass, onConfirm, onClose,
}: {
  title: string; body: string; confirmLabel: string; confirmClass: string;
  onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="panel-elevated w-full max-w-sm p-6 rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-base">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-xs hover:bg-secondary transition">
            Cancel
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ������ Main Component ����������������������������������������������������������������������������������������������������������������������
export function AdminCommunityClient({
  hiddenMessages: initialHidden,
  recentMessages: initialRecent,
  restrictedUsers: initialRestricted,
  moderationLog: initialLog,
  rooms,
}: Props) {
  const [tab, setTab] = useState<Tab>("messages");
  const [hidden, setHidden] = useState(initialHidden);
  const [recent, setRecent] = useState(initialRecent);
  const [restricted, setRestricted] = useState(initialRestricted);
  const [log, setLog] = useState(initialLog);
  const [isPending, startTransition] = useTransition();

  // Confirm modal state
  const [confirm, setConfirm] = useState<{
    title: string; body: string; confirmLabel: string; confirmClass: string; onConfirm: () => void;
  } | null>(null);

  // ������ Call moderation API ������������������������������������������������������������������������������
  const callModerate = async (payload: Record<string, string | undefined>) => {
    const res = await fetch("/api/chat/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Action failed");
      return false;
    }
    return true;
  };

  // ������ Message actions ��������������������������������������������������������������������������������������
  const handleUnhide = (msgId: string) => {
    setConfirm({
      title: "Restore message",
      body: "This will make the message visible again in the chat.",
      confirmLabel: "Restore",
      confirmClass: "bg-success text-black hover:bg-success/90",
      onConfirm: async () => {
        const ok = await callModerate({ action: "unhide_message", message_id: msgId });
        if (ok) {
          setHidden((prev) => prev.filter((m) => m.id !== msgId));
          toast.success("Message restored");
        }
      },
    });
  };

  const handleDeleteMsg = (msgId: string, content: string) => {
    setConfirm({
      title: "Delete message permanently",
      body: `Delete: "${content.slice(0, 80)}..."? This cannot be undone.`,
      confirmLabel: "Delete",
      confirmClass: "bg-destructive text-white hover:bg-destructive/90",
      onConfirm: async () => {
        const ok = await callModerate({ action: "delete_message", message_id: msgId });
        if (ok) {
          setHidden((prev) => prev.filter((m) => m.id !== msgId));
          setRecent((prev) => prev.filter((m) => m.id !== msgId));
          toast.success("Message deleted");
        }
      },
    });
  };

  const handleHideMsg = (msgId: string) => {
    setConfirm({
      title: "Hide message",
      body: "This message will be hidden from all users. You can restore it later.",
      confirmLabel: "Hide",
      confirmClass: "bg-yellow-600 text-white hover:bg-yellow-700",
      onConfirm: async () => {
        const ok = await callModerate({ action: "hide_message", message_id: msgId });
        if (ok) {
          const msg = recent.find((m) => m.id === msgId);
          if (msg) setHidden((prev) => [{ ...msg, is_hidden: true }, ...prev]);
          setRecent((prev) => prev.filter((m) => m.id !== msgId));
          toast.success("Message hidden");
        }
      },
    });
  };

  // ������ User restriction actions ��������������������������������������������������������������������
  const handleMuteUser = (userId: string, name: string) => {
    setConfirm({
      title: `Mute ${name}`,
      body: "This user will be muted from posting in the community chat for 24 hours.",
      confirmLabel: "Mute for 24h",
      confirmClass: "bg-yellow-600 text-white hover:bg-yellow-700",
      onConfirm: async () => {
        const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const ok = await callModerate({
          action: "mute_user",
          target_user_id: userId,
          reason: "Admin mute",
          until,
        });
        if (ok) {
          setRestricted((prev) => {
            const existing = prev.find((u) => u.user_id === userId);
            if (existing) {
              return prev.map((u) => u.user_id === userId ? { ...u, status: "muted", until } : u);
            }
            return [{ user_id: userId, status: "muted", until, reason: "Admin mute", updated_at: new Date().toISOString(), profile: { full_name: name, email: null } }, ...prev];
          });
          toast.success(`${name} muted for 24 hours`);
        }
      },
    });
  };

  const handleBanUser = (userId: string, name: string) => {
    setConfirm({
      title: `Ban ${name}`,
      body: "This user will be permanently banned from the community chat.",
      confirmLabel: "Ban permanently",
      confirmClass: "bg-destructive text-white hover:bg-destructive/90",
      onConfirm: async () => {
        const ok = await callModerate({
          action: "ban_user",
          target_user_id: userId,
          reason: "Admin ban",
        });
        if (ok) {
          setRestricted((prev) => {
            const existing = prev.find((u) => u.user_id === userId);
            if (existing) {
              return prev.map((u) => u.user_id === userId ? { ...u, status: "banned", until: null } : u);
            }
            return [{ user_id: userId, status: "banned", until: null, reason: "Admin ban", updated_at: new Date().toISOString(), profile: { full_name: name, email: null } }, ...prev];
          });
          toast.success(`${name} banned from chat`);
        }
      },
    });
  };

  const handleUnmuteUser = (userId: string, name: string) => {
    setConfirm({
      title: `Unmute ${name}`,
      body: "This user will be able to post in the chat again.",
      confirmLabel: "Unmute",
      confirmClass: "bg-success text-black hover:bg-success/90",
      onConfirm: async () => {
        const ok = await callModerate({ action: "unmute_user", target_user_id: userId });
        if (ok) {
          setRestricted((prev) => prev.filter((u) => u.user_id !== userId));
          toast.success(`${name} unmuted`);
        }
      },
    });
  };

  const handleUnbanUser = (userId: string, name: string) => {
    setConfirm({
      title: `Unban ${name}`,
      body: "This user will regain access to the community chat.",
      confirmLabel: "Unban",
      confirmClass: "bg-success text-black hover:bg-success/90",
      onConfirm: async () => {
        const ok = await callModerate({ action: "unban_user", target_user_id: userId });
        if (ok) {
          setRestricted((prev) => prev.filter((u) => u.user_id !== userId));
          toast.success(`${name} unbanned`);
        }
      },
    });
  };

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "messages", label: "Live Messages", count: recent.length },
    { id: "hidden",   label: "Hidden",        count: hidden.length },
    { id: "restricted", label: "Restricted Users", count: restricted.length },
    { id: "log",      label: "Audit Log",     count: log.length },
  ];

  return (
    <>
      {confirm && (
        <ConfirmModal
          {...confirm}
          onClose={() => setConfirm(null)}
          onConfirm={confirm.onConfirm}
        />
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Rooms", value: rooms.length, icon: Hash },
          { label: "Recent Messages", value: recent.length, icon: MessageSquare },
          { label: "Hidden Messages", value: hidden.length, icon: EyeOff },
          { label: "Restricted Users", value: restricted.length, icon: Ban },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="panel p-5">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <p className="text-[10px] tracking-wider text-muted-foreground mt-3 uppercase">{label}</p>
            <p className="font-display text-3xl mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="panel flex items-center gap-1 p-1.5 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
              tab === t.id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                tab === t.id ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ������ Live Messages �������������������������������������������������������������������������������� */}
      {tab === "messages" && (
        <section className="panel p-6">
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground mb-4">
            RECENT CHAT MESSAGES ({recent.length})
          </p>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent messages.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((msg) => {
                const name = msg.profile?.full_name || "Unknown";
                return (
                  <div key={msg.id} className="group flex gap-3 border border-border rounded-xl p-4 hover:bg-accent/20 transition">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                      {getInitial(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{name}</span>
                        <span className="text-[10px] text-muted-foreground">in #{msg.room?.name || "?"}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(msg.created_at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 break-words">{msg.content}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleHideMsg(msg.id)}
                        title="Hide message"
                        className="p-1.5 rounded-lg hover:bg-yellow-500/10 text-yellow-500 transition"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMsg(msg.id, msg.content)}
                        title="Delete message"
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleMuteUser(msg.user_id, name)}
                        title="Mute user"
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-yellow-500 transition"
                      >
                        <VolumeX className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleBanUser(msg.user_id, name)}
                        title="Ban user"
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ������ Hidden Messages ���������������������������������������������������������������������������� */}
      {tab === "hidden" && (
        <section className="panel p-6">
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground mb-4">
            HIDDEN MESSAGES ({hidden.length})
          </p>
          {hidden.length === 0 ? (
            <div className="text-center py-12">
              <Check className="h-8 w-8 text-success mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No hidden messages. All clear.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hidden.map((msg) => {
                const name = msg.profile?.full_name || "Unknown";
                return (
                  <div key={msg.id} className="group flex gap-3 border border-border rounded-xl p-4 opacity-75 hover:opacity-100 transition">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                      {getInitial(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{name}</span>
                        <span className="text-[10px] text-muted-foreground">in #{msg.room?.name || "?"}</span>
                        <span className="rounded bg-yellow-500/10 text-yellow-500 text-[9px] px-1.5 py-0.5">HIDDEN</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(msg.created_at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 break-words">{msg.content}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleUnhide(msg.id)}
                        title="Restore message"
                        className="p-1.5 rounded-lg hover:bg-success/10 text-success transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMsg(msg.id, msg.content)}
                        title="Delete permanently"
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ������ Restricted Users �������������������������������������������������������������������������� */}
      {tab === "restricted" && (
        <section className="panel p-6">
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground mb-4">
            MUTED & BANNED MEMBERS ({restricted.length})
          </p>
          {restricted.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheck className="h-8 w-8 text-success mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No restricted members.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {restricted.map((u) => {
                const name = u.profile?.full_name || "Unknown";
                const isBanned = u.status === "banned";
                const isMuteExpired = u.status === "muted" && u.until && new Date(u.until) < new Date();
                return (
                  <div key={u.user_id} className="flex items-center gap-4 border border-border rounded-xl p-4">
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0 text-sm font-bold">
                      {getInitial(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{name}</span>
                        {u.profile?.email && (
                          <span className="text-[10px] text-muted-foreground font-mono">{u.profile.email}</span>
                        )}
                        <span className={`rounded px-2 py-0.5 text-[9px] font-bold tracking-wider ${
                          isBanned ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-500"
                        }`}>
                          {isBanned ? "BANNED" : isMuteExpired ? "MUTE EXPIRED" : "MUTED"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-[10px] text-muted-foreground">
                        {u.reason && <span>Reason: {u.reason}</span>}
                        {u.until && !isBanned && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Until: {formatDate(u.until)}
                          </span>
                        )}
                        <span>Since: {formatDate(u.updated_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isBanned ? (
                        <button
                          onClick={() => handleUnbanUser(u.user_id, name)}
                          className="flex items-center gap-1.5 rounded-lg border border-success text-success px-3 py-1.5 text-xs hover:bg-success/10 transition"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Unban
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleUnmuteUser(u.user_id, name)}
                            className="flex items-center gap-1.5 rounded-lg border border-success text-success px-3 py-1.5 text-xs hover:bg-success/10 transition"
                          >
                            <Volume2 className="h-3.5 w-3.5" /> Unmute
                          </button>
                          <button
                            onClick={() => handleBanUser(u.user_id, name)}
                            className="flex items-center gap-1.5 rounded-lg border border-destructive text-destructive px-3 py-1.5 text-xs hover:bg-destructive/10 transition"
                          >
                            <Ban className="h-3.5 w-3.5" /> Ban
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ������ Audit Log ���������������������������������������������������������������������������������������� */}
      {tab === "log" && (
        <section className="panel p-6">
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground mb-4">
            MODERATION AUDIT LOG ({log.length})
          </p>
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No moderation actions recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {log.map((entry) => {
                const meta = ACTION_LABELS[entry.action] || { label: entry.action, color: "text-muted-foreground" };
                return (
                  <div key={entry.id} className="flex items-center gap-3 border border-border rounded-lg px-4 py-3">
                    <div className="shrink-0">
                      <span className={`text-[10px] font-bold tracking-wider ${meta.color}`}>
                        {meta.label.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 text-xs text-muted-foreground">
                      <span>by </span>
                      <span className="text-foreground font-medium">{entry.admin?.full_name || entry.admin?.email || "Admin"}</span>
                      {entry.target && (
                        <>
                          <span> � </span>
                          <span className="text-foreground">{entry.target.full_name || entry.target.email || "User"}</span>
                        </>
                      )}
                      {entry.reason && <span className="ml-2 text-muted-foreground/70">� {entry.reason}</span>}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(entry.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </>
  );
}
