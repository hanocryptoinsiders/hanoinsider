"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Search, ChevronDown, Home, TrendingUp, Zap, FileText, UserPlus, Settings, Menu, Shield, Headphones, Crown, LogOut } from "lucide-react";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { TierProvider } from "@/lib/tier-context";
import { useAuth } from "@/lib/auth-context";
import { FreeAccessProvider } from "@/lib/free-access-context";
import { QuoteProvider } from "@/lib/quote-context";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { RouteProgress } from "@/components/navigation/route-progress";
import { HanoWordmark } from "@/components/brand/HanoWordmark";

type NavItem = {
  to: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number | string }>;
  label: string;
  exact?: boolean;
  badge?: string;
};

const nav: NavItem[] = [
  { to: "/dashboard", icon: Home, label: "Dashboard", exact: true },
  { to: "/dashboard/market", icon: TrendingUp, label: "Market Overview" },
  { to: "/dashboard/insights", icon: Zap, label: "Insights", badge: "New" },
  { to: "/dashboard/articles", icon: FileText, label: "Articles" },
  { to: "/dashboard/affiliate", icon: UserPlus, label: "Affiliate" },
  { to: "/dashboard/support", icon: Headphones, label: "Support" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings" },
];

const mascotAvatar = "/assets/hanoinfrontend/hero-mascot.jpg";

function getDisplayName(fullName?: string | null, email?: string | null) {
  return fullName || email?.split("@")[0] || "Hano Insider";
}

function getAccessLabel(role?: string | null, isPremium?: boolean) {
  if (role === "admin") {
    return "Admin Access";
  }

  return isPremium ? "Premium Member" : "Member Access";
}

function ProfileAvatar({
  src,
  alt,
  className,
  aura = false,
}: {
  src: string;
  alt: string;
  className: string;
  aura?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-full border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_52%),linear-gradient(145deg,rgba(148,66,255,0.22),rgba(8,8,16,0.92))] ${aura ? "avatar-premium-glow" : "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} referrerPolicy="no-referrer" alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}

function SidebarContent({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const pathname = usePathname();
  const { role, isPremium } = useAuth();
  const hasMemberAura = role === "admin" || isPremium;
  const accessLabel = getAccessLabel(role, isPremium);

  const navItems = [...nav];
  if (role === "admin") {
    navItems.push({ to: "/admin", icon: Shield, label: "Admin Panel" });
  }

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,_rgba(152,77,255,0.1),_transparent_32%),linear-gradient(180deg,rgba(5,5,10,0.72),rgba(10,10,18,0.96))]">
      <div className="flex items-center justify-between p-5">
        <Link href="/dashboard" onClick={onNavigate} className="block">
          <HanoWordmark compact={compact} />
        </Link>
      </div>

      <nav className="flex-1 space-y-2 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              href={item.to}
              onClick={() => {
                if (onNavigate) {
                  onNavigate();
                }
              }}
              className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 ${active ? "bg-[linear-gradient(135deg,rgba(124,58,237,0.92),rgba(91,33,182,0.82))] text-foreground shadow-[0_18px_40px_-24px_rgba(168,85,247,0.9)] ring-1 ring-violet-300/25" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"}`}
            >
              <span className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${active ? "text-white" : ""}`} strokeWidth={1.6} />
                {!compact ? item.label : null}
              </span>
              {!compact && "badge" in item && item.badge ? (
                <span className="rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">{item.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>



      <div className="mt-auto border-t border-white/6 p-4">
        <div className={`flex items-center gap-3 rounded-[1.15rem] border px-3 py-3 ${hasMemberAura ? "border-primary/25 bg-primary/[0.08] shadow-[0_24px_60px_-34px_rgba(168,85,247,0.82)]" : "border-white/8 bg-white/[0.03]"}`}>
          <ProfileAvatar src={mascotAvatar} alt="" className="h-10 w-10 shrink-0" aura={hasMemberAura} />
          {!compact ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">Hano Insider</div>
              <div className="text-[10px] text-muted-foreground">{accessLabel}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { profile, role, signOut, user, isPremium } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const displayName = getDisplayName(profile?.full_name, user?.email);
  const accessLabel = getAccessLabel(role, isPremium);
  const hasMemberAura = role === "admin" || isPremium;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    if (profileOpen) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [profileOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground bg-noise">
      <RouteProgress />
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[16%] top-[-8rem] h-72 w-72 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute bottom-[-9rem] right-[10%] h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>
      <div className="relative flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 border-r border-white/6 bg-black/20 backdrop-blur-2xl md:block">
          <SidebarContent />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/6 bg-background/72 px-5 py-4 backdrop-blur-2xl md:px-8">
            <div className="mx-auto flex w-full max-w-[1500px] items-center gap-4">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <button aria-label="Open menu" className="rounded-xl border border-white/8 bg-white/[0.03] p-2 hover:bg-white/[0.06] md:hidden">
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] overflow-y-auto border-r border-white/8 bg-card p-0">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <SidebarContent onNavigate={() => setOpen(false)} />
                </SheetContent>
              </Sheet>

              <div className="min-w-0 flex-1">
                <h1 className="font-display text-2xl font-extrabold leading-tight md:text-3xl">Dashboard</h1>
                <p className="text-xs text-muted-foreground">
                  Welcome back, {displayName}
                </p>
              </div>

              <div className="relative hidden max-w-xl flex-1 md:block">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="Search insights, articles, coins..."
                  className="w-full rounded-2xl border border-white/8 bg-black/20 py-3 pl-11 pr-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-muted-foreground focus:border-primary/60 focus:bg-black/30 focus:outline-none"
                />
              </div>

              <NotificationBell />

              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((current) => !current)}
                  className={`group relative flex h-11 w-11 items-center justify-center rounded-full border bg-card/70 p-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-card/90 ${hasMemberAura ? "avatar-premium-glow" : "border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-white/20"}`}
                >
                  <span className="sr-only">Open account menu</span>
                  <ProfileAvatar src={profile?.avatar_url || mascotAvatar} alt={displayName} className="h-full w-full" />
                  <span className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-black/80 text-muted-foreground transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}>
                    <ChevronDown className="h-2.5 w-2.5" />
                  </span>
                </button>

                {profileOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.8rem)] z-30 w-[19rem] rounded-[1.35rem] border border-white/10 bg-card/95 p-3 shadow-[0_28px_80px_-32px_rgba(0,0,0,0.92)] backdrop-blur-2xl">
                    <div className="rounded-[1rem] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-3.5">
                      <div className="flex items-center gap-3">
                        <ProfileAvatar src={profile?.avatar_url || mascotAvatar} alt={displayName} className="h-11 w-11 shrink-0" aura={hasMemberAura} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">{accessLabel}</p>
                          {user?.email ? <p className="truncate pt-1 text-[11px] text-muted-foreground/85">{user.email}</p> : null}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold capitalize text-primary">
                          {role || "member"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
                      >
                        <Settings className="h-4 w-4" />
                        Account settings
                      </Link>
                      {role === "admin" ? (
                        <Link
                          href="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
                        >
                          <Shield className="h-4 w-4" />
                          Open admin panel
                        </Link>
                      ) : null}
                      <button
                        onClick={() => void signOut()}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1500px] space-y-6 p-5 md:p-8">
            {children}
            <div className="card-surface flex flex-wrap items-center justify-between gap-4 border-white/8 bg-[linear-gradient(135deg,rgba(116,42,230,0.12),rgba(12,12,20,0.96))] px-5 py-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                Hano Insiders member dashboard
              </div>
              <div>Educational analysis only. Not financial advice.</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <TierProvider>
      <FreeAccessProvider>
        <QuoteProvider>
          <Shell>{children}</Shell>
        </QuoteProvider>
      </FreeAccessProvider>
    </TierProvider>
  );
}

export function PageHeader({ kicker, title, desc }: { kicker: string; title: string; desc?: string }) {
  return (
    <div className="card-surface p-5 sm:p-8">
      <p className="text-[11px] tracking-[0.3em] text-muted-foreground">{kicker}</p>
      <h1 className="mt-3 font-display text-3xl leading-tight sm:text-5xl">{title}</h1>
      {desc ? <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{desc}</p> : null}
    </div>
  );
}
