"use client";

import { useState, useEffect, useCallback } from "react";
import { Crown, Monitor, Shield, Loader2, ExternalLink, ArrowRight, KeyRound, Laptop, User } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardLayout";
import { useTier } from "@/lib/tier-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

// Client-side User Agent parser
function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = "Web Browser";
  let os = "Operating System";

  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("SamsungBrowser")) browser = "Samsung Browser";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  else if (ua.includes("Trident")) browser = "Internet Explorer";
  else if (ua.includes("Edge") || ua.includes("Edg")) browser = "Microsoft Edge";
  else if (ua.includes("Chrome")) browser = "Google Chrome";
  else if (ua.includes("Safari")) browser = "Apple Safari";

  if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
  else if (ua.includes("Windows NT 6.2")) os = "Windows 8";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Linux")) os = "Linux";

  return { browser, os };
}

function formatDate(isoString?: string) {
  if (!isoString) return "N/A";
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(isoString?: string | null) {
  if (!isoString) return "-";
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type TabType = "general" | "subscription" | "security" | "community";

export default function Settings() {
  const { upgrade } = useTier();
  const { profile, updateProfile, isPremium, role, user, refreshProfile } = useAuth();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabType>("general");

  // Profile Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Billing States
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Security Form States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Client Session States
  const [userAgentInfo, setUserAgentInfo] = useState({ browser: "Chrome", os: "Windows" });

  // Handle successful checkout redirects (legacy support)
  useEffect(() => {
    const checkoutParam = searchParams.get("checkout");
    if (checkoutParam === "success") {
      toast.success("Welcome to Premium! Your subscription is active.", { duration: 5000 });
      setActiveTab("subscription");
      refreshProfile();
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, [searchParams, refreshProfile]);

  // Sync profile details and user agent info
  useEffect(() => {
    if (profile) {
      setName(profile.full_name || "");
      setEmail(profile.email || "");
    } else if (user) {
      setName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
      setEmail(user.email || "");
    }

    if (typeof window !== "undefined") {
      setUserAgentInfo(parseUserAgent(window.navigator.userAgent));
    }
  }, [profile, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateProfile({
        full_name: name,
        email: email,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpgradeCheckout = useCallback(async () => {
    setIsCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "monthly" }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to start checkout");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setIsCheckoutLoading(false);
    }
  }, []);

  const handleManageBilling = useCallback(async () => {
    setIsCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/billing-portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not open billing portal");
      setIsCheckoutLoading(false);
    }
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      toast.success("Security password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const isFree = !isPremium;
  const premiumSource = profile?.premium_source;

  const tabs = [
    { id: "general", label: "General", icon: User },
    { id: "subscription", label: "Subscription", icon: Crown },
    { id: "security", label: "Security & Devices", icon: KeyRound },
  ] as const;

  return (
    <>
      <PageHeader kicker="SETTINGS" title="Account & preferences." />

      <div className="flex flex-col lg:flex-row gap-8 items-start mt-6">
        {/* Settings Navigation Sidebar */}
        <aside className="w-full lg:w-[240px] shrink-0">
          <nav className="panel p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition whitespace-nowrap lg:w-full text-left ${
                    active
                      ? "bg-foreground text-background shadow"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.5 : 1.8} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Settings Content Panels */}
        <main className="flex-1 w-full min-w-0">
          {/* TAB 1: GENERAL PROFILE */}
          {activeTab === "general" && (
            <div className="panel p-8 border border-border/80 bg-surface/20 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
              <div className="flex items-center gap-3 border-b border-border/60 pb-5">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Profile Details</h2>
                  <p className="text-xs text-muted-foreground">Manage your identity and display preferences.</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="mt-6 space-y-6">
                <div className="flex items-center gap-5 flex-wrap md:flex-nowrap p-4 bg-secondary/10 rounded-lg border border-border/40">
                  <div className="h-16 w-16 overflow-hidden rounded-full border border-border/80 bg-neutral-800 flex items-center justify-center shrink-0 shadow-inner">
                    {profile?.avatar_url ? (
                      <img loading="lazy" decoding="async" src={profile.avatar_url} referrerPolicy="no-referrer" alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground uppercase">
                        {(name || email || "?").charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Avatar Picture</h3>
                    <p className="text-xs text-muted-foreground mt-1">Avatars are currently linked and updated automatically via connected Google accounts.</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-medium">Display name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your display name"
                      className="w-full rounded-lg border border-border bg-background/50 px-3.5 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-foreground transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-medium">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@hanoinsiders.com"
                      className="w-full rounded-lg border border-border bg-background/50 px-3.5 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-foreground transition-all"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 rounded-lg bg-foreground text-background px-5 py-3 text-xs font-bold hover:bg-foreground/90 transition disabled:opacity-50 active:scale-[0.99] shadow-[0_4px_15px_-4px_rgba(255,255,255,0.15)]"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: SUBSCRIPTION */}
          {activeTab === "subscription" && (
            <div className="panel p-8 border border-border/80 bg-surface/20 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
              <div className="flex items-center gap-3 border-b border-border/60 pb-5">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
                  <Crown className="h-5 w-5 text-[oklch(0.78_0.14_85)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Membership Access</h2>
                  <p className="text-xs text-muted-foreground">Manage your tier privileges and subscription details.</p>
                </div>
              </div>

              <div className="mt-6 grid md:grid-cols-[1.5fr_1fr] gap-6">
                {/* Details Column */}
                <div className="space-y-5">
                  <div className="p-5 rounded-lg border border-border/50 bg-secondary/15 relative overflow-hidden">
                    <div className="absolute right-4 top-4 h-16 w-16 opacity-5 pointer-events-none">
                      <Crown className="h-full w-full" />
                    </div>
                    <p className="text-[10px] tracking-[0.25em] text-muted-foreground uppercase font-bold">CURRENT TIER</p>
                    <div className="flex items-center gap-2.5 mt-2">
                      <Crown className={`h-5 w-5 ${isPremium ? "text-[oklch(0.78_0.14_85)]" : "text-muted-foreground"}`} />
                      <h3 className="font-display text-2xl font-bold capitalize leading-none">{role} Account</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      {isPremium
                        ? premiumSource === "manual"
                          ? "Your premium credentials were manually activated by the administrator. Full Member access is permanent."
                          : "Your premium account is currently active. Billing is managed through Stripe."
                        : "You are currently on the Subscription Required tier. Limited dashboard analytics and macro insights. Upgrade to access premium alpha."}
                    </p>
                  </div>

                  {/* Subscription details for Stripe subscribers */}
                  {isPremium && premiumSource === "stripe" && (
                    <div className="panel p-4 bg-background/30 border-border/50 space-y-2.5 text-xs">
                      {profile?.subscription_plan && (
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-muted-foreground">Plan</span>
                          <span className="font-medium capitalize text-foreground">{profile.subscription_plan}</span>
                        </div>
                      )}
                      {profile?.subscription_current_period_end && (
                        <div className="flex justify-between items-center gap-2 border-t border-border/40 pt-2">
                          <span className="text-muted-foreground">
                            {profile.cancel_at_period_end ? "Access until" : "Renews on"}
                          </span>
                          <span className="font-medium text-foreground">
                            {formatShortDate(profile.subscription_current_period_end)}
                          </span>
                        </div>
                      )}
                      {profile?.cancel_at_period_end && (
                        <div className="flex justify-between items-center gap-2 border-t border-border/40 pt-2">
                          <span className="text-muted-foreground">Status</span>
                          <span className="font-medium text-[oklch(0.78_0.14_85)]">Cancels at period end</span>
                        </div>
                      )}
                      {profile?.stripe_subscription_id && (
                        <div className="flex justify-between items-center gap-2 border-t border-border/40 pt-2">
                          <span className="text-muted-foreground">Subscription ID</span>
                          <code className="font-mono text-foreground font-medium truncate max-w-[200px]" title={profile.stripe_subscription_id || ""}>
                            {profile.stripe_subscription_id}
                          </code>
                        </div>
                      )}
                      <div className="flex justify-between items-center gap-2 border-t border-border/40 pt-2">
                        <span className="text-muted-foreground">Provider</span>
                        <span className="font-medium text-foreground">Stripe</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Column */}
                <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-border/60 pt-5 md:pt-0 md:pl-6">
                  {isFree ? (
                    <div className="space-y-3">
                      <button
                        onClick={upgrade}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3 text-xs font-bold hover:bg-foreground/90 transition shadow-lg active:scale-[0.99]"
                      >
                        View Plans & Pricing
                      </button>
                      <button
                        onClick={handleUpgradeCheckout}
                        disabled={isCheckoutLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[oklch(0.78_0.14_85)] to-[oklch(0.72_0.15_75)] text-background py-3 text-xs font-bold hover:brightness-110 transition disabled:opacity-60 active:scale-[0.99] shadow-[0_6px_20px_-8px_rgba(232,192,122,0.3)]"
                      >
                        {isCheckoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Upgrade Instantly <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {premiumSource === "stripe" ? (
                        <div className="rounded-xl border border-border bg-secondary/10 p-4 text-center text-xs text-muted-foreground space-y-2">
                          <p className="font-medium text-foreground">Subscription Active</p>
                          <p>Manage invoices, payment methods, and cancellation from the secure Stripe customer portal.</p>
                          <button
                            onClick={handleManageBilling}
                            disabled={isCheckoutLoading}
                            className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-3 py-2 text-[11px] font-semibold text-background transition hover:bg-foreground/90 disabled:opacity-60"
                          >
                            {isCheckoutLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                            Open billing portal
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-border bg-secondary/10 p-4 text-center text-xs text-muted-foreground">
                          Permanent Admin Access active.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & DEVICES */}
          {activeTab === "security" && (
            <div className="panel p-8 border border-border/80 bg-surface/20 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] space-y-8">
              {/* Part A: Password Change */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-border/60 pb-5">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Update Password</h2>
                    <p className="text-xs text-muted-foreground">Modify your account access passphrase credentials.</p>
                  </div>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground font-medium">New password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full rounded-lg border border-border bg-background/50 px-3.5 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-foreground transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground font-medium">Confirm password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full rounded-lg border border-border bg-background/50 px-3.5 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring focus:border-foreground transition-all"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 hover:bg-secondary px-5 py-3 text-xs font-bold transition disabled:opacity-50 active:scale-[0.99]"
                  >
                    {isUpdatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                  </button>
                </form>
              </div>

              {/* Part B: Session Details */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-3 border-b border-border/60 pb-5">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
                    <Laptop className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Active Connection</h2>
                    <p className="text-xs text-muted-foreground">Information about your current session and device connection.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3.5 border border-border rounded-xl p-4 bg-secondary/15">
                    <Monitor className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {userAgentInfo.browser} on {userAgentInfo.os}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Last signed in: {user?.last_sign_in_at ? formatDate(user.last_sign_in_at) : "Just now"}
                      </p>
                    </div>
                    <span className="text-[9px] tracking-wider text-success font-bold border border-success/30 bg-success/5 rounded px-2.5 py-1">
                      CURRENT DEVICE
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 text-xs pt-1">
                    <div className="panel p-4 bg-secondary/5 border-border/50 space-y-1">
                      <p className="text-muted-foreground text-[10px] tracking-wider uppercase font-bold">ACCOUNT ID</p>
                      <p className="font-mono text-foreground font-medium text-[11px] truncate" title={user?.id || ""}>{user?.id}</p>
                    </div>
                    <div className="panel p-4 bg-secondary/5 border-border/50 space-y-1">
                      <p className="text-muted-foreground text-[10px] tracking-wider uppercase font-bold">JOINED DATE</p>
                      <p className="text-foreground font-medium text-[11px]">
                        {user?.created_at ? formatDate(user.created_at) : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
