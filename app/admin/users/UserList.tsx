"use client";

import { useState } from "react";
import { Search, X, Check, ArrowLeft, Mail, ShieldAlert, Award, Calendar, VolumeX, Volume2, Ban, ShieldCheck } from "lucide-react";
import { updateUserAction } from "./actions";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: "free" | "premium" | "admin";
  is_premium: boolean;
  subscription_status: string;
  created_at: string;
  status?: string;
}

interface UserListProps {
  initialUsers: UserProfile[];
  currentAdminId: string;
}

export function UserList({ initialUsers, currentAdminId }: UserListProps) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [selectedPremiumFilter, setSelectedPremiumFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // Edit Form states
  const [editRole, setEditRole] = useState<"free" | "premium" | "admin">("free");
  const [editIsPremium, setEditIsPremium] = useState(false);
  const [editSubStatus, setEditSubStatus] = useState<"active" | "inactive" | "cancelled" | "expired">("active");
  const [editStatus, setEditStatus] = useState<"active" | "suspended" | "banned">("active");
  
  // Demotion warning states
  const [requiresSelfDemotionConfirm, setRequiresSelfDemotionConfirm] = useState(false);
  const [confirmSelfDemotion, setConfirmSelfDemotion] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Chat restriction state
  const [chatStatus, setChatStatus] = useState<{ status: string; until: string | null; reason: string | null } | null>(null);
  const [chatActionLoading, setChatActionLoading] = useState(false);

  // Filter and search logic
  const filteredUsers = initialUsers.filter((u) => {
    const matchesSearch =
      (u.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (u.email?.toLowerCase() || "").includes(search.toLowerCase());

    const matchesRole =
      selectedRoleFilter === "all" || u.role === selectedRoleFilter;

    const matchesPremium =
      selectedPremiumFilter === "all" ||
      (selectedPremiumFilter === "premium" && u.is_premium) ||
      (selectedPremiumFilter === "free" && !u.is_premium);

    const matchesStatus =
      selectedStatusFilter === "all" ||
      (u.status || "active") === selectedStatusFilter;

    return matchesSearch && matchesRole && matchesPremium && matchesStatus;
  });

  const handleSelectUser = async (u: UserProfile) => {
    setSelectedUser(u);
    setEditRole(u.role);
    setEditIsPremium(u.is_premium);
    setEditSubStatus((u.subscription_status || "active") as any);
    setEditStatus((u.status || "active") as any);
    setRequiresSelfDemotionConfirm(false);
    setConfirmSelfDemotion(false);
    setChatStatus(null);

    // Fetch the user's current chat restriction status
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("chat_user_status")
        .select("status, until, reason")
        .eq("user_id", u.id)
        .maybeSingle();
      setChatStatus(data || null);
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setIsSaving(true);

    try {
      const res = await updateUserAction(
        selectedUser.id,
        {
          role: editRole,
          is_premium: editIsPremium,
          subscription_status: editSubStatus,
          status: editStatus,
        },
        confirmSelfDemotion
      );

      if (res.success) {
        toast.success("User updated successfully");
        setSelectedUser(null);
      } else if (res.requiresConfirmation) {
        setRequiresSelfDemotionConfirm(true);
        toast.warning(res.error);
      } else {
        toast.error(res.error || "Failed to update user");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const callChatModerate = async (action: string, opts: Record<string, string | undefined> = {}) => {
    if (!selectedUser) return;
    setChatActionLoading(true);
    try {
      const res = await fetch("/api/chat/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target_user_id: selectedUser.id, ...opts }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      // Refresh chat status
      const supabase = createClient();
      const { data: fresh } = await supabase
        .from("chat_user_status")
        .select("status, until, reason")
        .eq("user_id", selectedUser.id)
        .maybeSingle();
      setChatStatus(fresh || null);
      toast.success("Chat status updated");
    } catch {
      toast.error("Network error");
    } finally {
      setChatActionLoading(false);
    }
  };

  const handleChatMute = () => {
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    callChatModerate("mute_user", { reason: "Admin mute", until });
  };
  const handleChatBan = () => callChatModerate("ban_user", { reason: "Admin ban" });
  const handleChatUnmute = () => callChatModerate("unmute_user");
  const handleChatUnban = () => callChatModerate("unban_user");

  return (
    <>
      {/* Search and filter bar */}
      <div className="panel flex flex-col md:flex-row gap-4 p-4 items-stretch md:items-center bg-background/50">
        <div className="flex flex-1 items-center gap-3 px-3 py-2 border border-border bg-background rounded-lg">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            placeholder="Search by name or email..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">Role:</span>
            <select
              className="bg-background border border-border rounded-lg text-xs p-2 text-foreground focus:outline-none"
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">Premium:</span>
            <select
              className="bg-background border border-border rounded-lg text-xs p-2 text-foreground focus:outline-none"
              value={selectedPremiumFilter}
              onChange={(e) => setSelectedPremiumFilter(e.target.value)}
            >
              <option value="all">All Tiers</option>
              <option value="premium">Premium Status</option>
              <option value="free">Free Status</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">Status:</span>
            <select
              className="bg-background border border-border rounded-lg text-xs p-2 text-foreground focus:outline-none"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <section className="panel p-6 overflow-x-auto">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <p className="text-[11px] tracking-[0.2em] text-muted-foreground">USER REGISTRY ({filteredUsers.length})</p>
        </div>

        <table className="w-full text-sm min-w-[850px]">
          <thead>
            <tr className="text-left text-[10px] tracking-wider text-muted-foreground border-b border-border">
              <th className="pb-3 pl-2">USER</th>
              <th className="pb-3">EMAIL</th>
              <th className="pb-3">ROLE</th>
              <th className="pb-3">PREMIUM STATUS</th>
              <th className="pb-3">SUB STATUS</th>
              <th className="pb-3">STATUS</th>
              <th className="pb-3">JOINED</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const userStatus = u.status || "active";
              return (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-0 cursor-pointer hover:bg-accent/40 transition"
                  onClick={() => handleSelectUser(u)}
                >
                  <td className="py-3 pl-2 font-medium flex items-center gap-3">
                    <div className="h-8 w-8 overflow-hidden rounded-full border border-border bg-secondary flex items-center justify-center shrink-0">
                      {u.avatar_url ? (
                        <img
                          loading="lazy"
                          decoding="async"
                          src={u.avatar_url}
                          referrerPolicy="no-referrer"
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                          {(u.full_name || u.email || "?").charAt(0)}
                        </span>
                      )}
                    </div>
                    <span>{u.full_name || "Hano Insiders Member"}</span>
                  </td>
                  <td className="py-3 font-mono text-xs text-muted-foreground">{u.email}</td>
                  <td className="py-3">
                    <span className={`text-[10px] tracking-wider uppercase rounded px-2 py-0.5 font-mono ${
                      u.role === "admin"
                        ? "bg-destructive/10 text-destructive border border-destructive/20"
                        : u.role === "premium"
                        ? "bg-[oklch(0.78_0.14_85)]/10 text-[oklch(0.78_0.14_85)] border border-[oklch(0.78_0.14_85)]/20"
                        : "bg-secondary text-muted-foreground"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3">
                    {u.is_premium ? (
                      <span className="text-xs text-success flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Premium
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">���</span>
                    )}
                  </td>
                  <td className="py-3">
                    <span className={`text-xs ${
                      u.subscription_status === "active"
                        ? "text-success"
                        : u.subscription_status === "cancelled"
                        ? "text-yellow-600"
                        : "text-muted-foreground"
                    }`}>
                      {u.subscription_status}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      userStatus === "active"
                        ? "text-success bg-success/10"
                        : userStatus === "suspended"
                        ? "text-yellow-600 bg-yellow-600/10"
                        : "text-destructive bg-destructive/10"
                    }`}>
                      {userStatus}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Details/Edit Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="panel-elevated w-full max-w-xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-border pb-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 overflow-hidden rounded-full border border-border bg-secondary flex items-center justify-center shrink-0">
                  {selectedUser.avatar_url ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={selectedUser.avatar_url}
                      referrerPolicy="no-referrer"
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-muted-foreground uppercase">
                      {(selectedUser.full_name || selectedUser.email || "?").charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[9px] tracking-[0.3em] text-muted-foreground uppercase">MEMBER DETAILS</p>
                  <h3 className="font-display mt-1 text-2xl">{selectedUser.full_name || "Hano Insiders Member"}</h3>
                  <p className="text-xs text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3" /> {selectedUser.email}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="rounded-md p-2 hover:bg-accent text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Role Settings */}
              <div>
                <label className="text-[10px] tracking-wider text-muted-foreground block mb-2 uppercase">Platform Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["free", "premium", "admin"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditRole(r)}
                      className={`py-2 px-3 rounded-lg border text-xs font-mono capitalize transition ${
                        editRole === r
                          ? "border-[oklch(0.78_0.14_85)] bg-[oklch(0.78_0.14_85)]/10 text-[oklch(0.78_0.14_85)]"
                          : "border-border hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Settings */}
              <div>
                <label className="text-[10px] tracking-wider text-muted-foreground block mb-2 uppercase">Account Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["active", "suspended", "banned"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditStatus(s)}
                      className={`py-2 px-3 rounded-lg border text-xs capitalize transition ${
                        editStatus === s
                          ? s === "active"
                            ? "border-success bg-success/10 text-success"
                            : s === "suspended"
                            ? "border-yellow-600 bg-yellow-600/10 text-yellow-600"
                            : "border-destructive bg-destructive/10 text-destructive"
                          : "border-border hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subscription & Premium Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground block mb-2 uppercase">Premium Flag</label>
                  <button
                    type="button"
                    onClick={() => setEditIsPremium(!editIsPremium)}
                    className={`w-full py-2 px-3 rounded-lg border text-xs capitalize transition text-center ${
                      editIsPremium
                        ? "border-success bg-success/10 text-success font-medium"
                        : "border-border hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    {editIsPremium ? "Enabled" : "Disabled"}
                  </button>
                </div>

                <div>
                  <label className="text-[10px] tracking-wider text-muted-foreground block mb-2 uppercase">Subscription Status</label>
                  <select
                    className="w-full bg-background border border-border rounded-lg text-xs p-2 text-foreground focus:outline-none h-9"
                    value={editSubStatus}
                    onChange={(e) => setEditSubStatus(e.target.value as any)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              {/* Joined Date Display */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 font-mono">
                <Calendar className="h-4 w-4" /> Joined: {new Date(selectedUser.created_at).toLocaleString()}
              </div>

              {/* Chat Restrictions */}
              <div className="border border-border rounded-xl p-4">
                <p className="text-[10px] tracking-wider text-muted-foreground uppercase mb-3">Account Status</p>
                {chatStatus && chatStatus.status !== "active" ? (
                  <div className="flex flex-col gap-3">
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                      chatStatus.status === "banned"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-yellow-500/10 text-yellow-500"
                    }`}>
                      {chatStatus.status === "banned" ? <Ban className="h-3.5 w-3.5 shrink-0" /> : <VolumeX className="h-3.5 w-3.5 shrink-0" />}
                      <span className="font-semibold uppercase tracking-wider text-[10px]">
                        {chatStatus.status === "banned" ? "Banned" : "Muted"}
                      </span>
                      {chatStatus.until && (
                        <span className="ml-auto text-[10px] opacity-80">
                          Until {new Date(chatStatus.until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    {chatStatus.reason && (
                      <p className="text-xs text-muted-foreground">Reason: {chatStatus.reason}</p>
                    )}
                    <div className="flex gap-2">
                      {chatStatus.status === "banned" ? (
                        <button
                          onClick={handleChatUnban}
                          disabled={chatActionLoading}
                          className="flex items-center gap-1.5 rounded-lg border border-success text-success px-3 py-1.5 text-xs hover:bg-success/10 transition disabled:opacity-50"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Unban
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleChatUnmute}
                            disabled={chatActionLoading}
                            className="flex items-center gap-1.5 rounded-lg border border-success text-success px-3 py-1.5 text-xs hover:bg-success/10 transition disabled:opacity-50"
                          >
                            <Volume2 className="h-3.5 w-3.5" /> Unmute
                          </button>
                          <button
                            onClick={handleChatBan}
                            disabled={chatActionLoading}
                            className="flex items-center gap-1.5 rounded-lg border border-destructive text-destructive px-3 py-1.5 text-xs hover:bg-destructive/10 transition disabled:opacity-50"
                          >
                            <Ban className="h-3.5 w-3.5" /> Upgrade to Ban
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-success">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Active ��� no restrictions</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleChatMute}
                        disabled={chatActionLoading}
                        className="flex items-center gap-1.5 rounded-lg border border-yellow-500/50 text-yellow-500 px-2.5 py-1.5 text-xs hover:bg-yellow-500/10 transition disabled:opacity-50"
                      >
                        <VolumeX className="h-3.5 w-3.5" /> Mute 24h
                      </button>
                      <button
                        onClick={handleChatBan}
                        disabled={chatActionLoading}
                        className="flex items-center gap-1.5 rounded-lg border border-destructive/50 text-destructive px-2.5 py-1.5 text-xs hover:bg-destructive/10 transition disabled:opacity-50"
                      >
                        <Ban className="h-3.5 w-3.5" /> Ban
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Self demotion Warning Section */}
              {requiresSelfDemotionConfirm && (
                <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                    <ShieldAlert className="h-5 w-5 shrink-0" /> Accidental Self-Lockout Protection
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You are currently modifying your own role. Removing your admin status will cause you to immediately lose access to this admin panel.
                  </p>
                  <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={confirmSelfDemotion}
                      onChange={(e) => setConfirmSelfDemotion(e.target.checked)}
                      className="rounded border-border text-destructive focus:ring-destructive"
                    />
                    I confirm that I want to remove my own admin privileges.
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="rounded-md border border-border bg-secondary/40 hover:bg-secondary px-4 py-2 text-xs font-mono"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-md bg-foreground text-background hover:bg-foreground/90 px-5 py-2 text-xs font-mono font-semibold transition flex items-center gap-2"
                  disabled={isSaving || (requiresSelfDemotionConfirm && !confirmSelfDemotion)}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
