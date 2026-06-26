"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  Search,
  Home,
  TrendingUp,
  Zap,
  FileText,
  UserPlus,
  Settings,
  Menu,
  Shield,
  Headphones,
  LogOut,
} from "lucide-react";
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

const deskNav: NavItem[] = [
  { to: "/dashboard", icon: Home, label: "Dashboard", exact: true },
  { to: "/dashboard/market", icon: TrendingUp, label: "Market" },
  { to: "/dashboard/insights", icon: Zap, label: "Insights", badge: "New" },
  { to: "/dashboard/articles", icon: FileText, label: "Articles" },
];

const memberNav: NavItem[] = [
  { to: "/dashboard/affiliate", icon: UserPlus, label: "Affiliate" },
  { to: "/dashboard/support", icon: Headphones, label: "Support" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings" },
];

const PAGE_META: Record<string, { title: string; sub?: string }> = {
  "/dashboard": { title: "Dashboard", sub: "Your intelligence desk, at a glance." },
  "/dashboard/market": { title: "Market Overview", sub: "Live context across the category." },
  "/dashboard/insights": { title: "Insights", sub: "Educational briefs from the desk." },
  "/dashboard/articles": { title: "Articles", sub: "Short-form market analysis." },
  "/dashboard/affiliate": { title: "Affiliate", sub: "Referrals and commission tracking." },
  "/dashboard/support": { title: "Support", sub: "Member help and billing." },
  "/dashboard/settings": { title: "Settings", sub: "Account and preferences." },
};

const mascotAvatar = "/assets/hanoinfrontend/hero-mascot.jpg";

function getDisplayName(fullName?: string | null, email?: string | null) {
  return fullName || email?.split("@")[0] || "Hano Insider";
}

function getAccessLabel(role?: string | null, isPremium?: boolean) {
  if (role === "admin") return "Admin";
  return isPremium ? "Premium" : "Member";
}

function getPageMeta(pathname: string) {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  if (pathname.startsWith("/dashboard/coins/")) {
    return { title: "Coin Profile", sub: "Asset context and market data." };
  }
  if (pathname.startsWith("/dashboard/insights/")) {
    return { title: "Insight", sub: "Reading from the desk archive." };
  }
  if (pathname.startsWith("/dashboard/articles/")) {
    return { title: "Article", sub: "Reading from the desk archive." };
  }
  return { title: "Dashboard", sub: "Your intelligence desk." };
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
      className={`overflow-hidden rounded-full border bg-[var(--surface)] ${
        aura ? "avatar-premium-glow border-[rgba(155,130,220,0.4)]" : "border-[var(--border-2)]"
      } ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} referrerPolicy="no-referrer" alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  onNavigate,
  compact,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <div className="dash-nav-group">
      {!compact ? <p className="dash-nav-group-label">{label}</p> : null}
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            href={item.to}
            onClick={() => onNavigate?.()}
            className={`dash-nav-link ${active ? "dash-nav-link--active" : ""}`}
          >
            <span className="flex items-center gap-3">
              <Icon className="dash-nav-icon" strokeWidth={1.5} />
              {!compact ? item.label : null}
            </span>
            {!compact && item.badge ? <span className="dash-nav-badge">{item.badge}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

function SidebarContent({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const pathname = usePathname();
  const { role, isPremium, profile, user } = useAuth();
  const hasMemberAura = role === "admin" || isPremium;
  const accessLabel = getAccessLabel(role, isPremium);
  const displayName = getDisplayName(profile?.full_name, user?.email);

  const adminNav: NavItem[] =
    role === "admin" ? [{ to: "/admin", icon: Shield, label: "Admin Panel" }] : [];

  return (
    <div className="dash-sidebar flex h-full flex-col">
      <div className="dash-sidebar-brand">
        <HanoWordmark href="/dashboard" compact={compact} />
      </div>

      <nav className="dash-sidebar-nav scrollbar-hide flex-1 overflow-y-auto py-5">
        <NavGroup label="Desk" items={deskNav} pathname={pathname} onNavigate={onNavigate} compact={compact} />
        <NavGroup label="Member" items={[...memberNav, ...adminNav]} pathname={pathname} onNavigate={onNavigate} compact={compact} />
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        <div className={`dash-member-card ${hasMemberAura ? "dash-member-card--premium" : ""}`}>
          <div className="flex items-center gap-3">
            <ProfileAvatar
              src={profile?.avatar_url || mascotAvatar}
              alt={displayName}
              className="h-10 w-10 shrink-0"
              aura={hasMemberAura}
            />
            {!compact ? (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[var(--fg)]">{displayName}</div>
                <div className="font-mono-label text-[var(--accent-soft)]" style={{ marginTop: 4 }}>
                  {accessLabel} access
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, role, signOut, user, isPremium } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const displayName = getDisplayName(profile?.full_name, user?.email);
  const accessLabel = getAccessLabel(role, isPremium);
  const hasMemberAura = role === "admin" || isPremium;
  const pageMeta = getPageMeta(pathname);

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
    <div className="dash-shell">
      <RouteProgress />
      <div className="dash-frame flex min-h-screen">
        <aside className="dash-sidebar sticky top-0 hidden h-screen w-[236px] shrink-0 md:block">
          <SidebarContent />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="dash-header sticky top-0 z-20 px-5 py-4 md:px-8">
            <div className="mx-auto flex w-full max-w-[1240px] items-center gap-4">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <button
                    aria-label="Open menu"
                    className="rounded border border-[var(--border-2)] p-2 text-[var(--fg-3)] transition-colors hover:border-[var(--accent-soft)] hover:text-[var(--fg)] md:hidden"
                  >
                    <Menu className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[260px] border-r border-[var(--border)] bg-black p-0">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <SidebarContent onNavigate={() => setOpen(false)} />
                </SheetContent>
              </Sheet>

              <div className="min-w-0 flex-1">
                <h1 className="dash-header-title">{pageMeta.title}</h1>
                {pageMeta.sub ? <p className="dash-header-sub hidden sm:block">{pageMeta.sub}</p> : null}
              </div>

              <div className="relative hidden max-w-sm flex-1 lg:block">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--fg-3)]" strokeWidth={1.5} />
                <input placeholder="Search desk…" className="dash-search" />
              </div>

              <NotificationBell />

              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((current) => !current)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border p-0.5 transition-colors ${
                    hasMemberAura
                      ? "avatar-premium-glow border-[rgba(155,130,220,0.4)]"
                      : "border-[var(--border-2)] hover:border-[var(--accent-soft)]"
                  }`}
                >
                  <span className="sr-only">Open account menu</span>
                  <ProfileAvatar
                    src={profile?.avatar_url || mascotAvatar}
                    alt={displayName}
                    className="h-full w-full"
                  />
                </button>

                {profileOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.65rem)] z-30 w-[18rem] rounded-md border border-[var(--border)] bg-[var(--bg-2)] p-3 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.9)]">
                    <div className="dash-member-card dash-member-card--premium">
                      <div className="flex items-center gap-3">
                        <ProfileAvatar
                          src={profile?.avatar_url || mascotAvatar}
                          alt={displayName}
                          className="h-10 w-10 shrink-0"
                          aura={hasMemberAura}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{displayName}</p>
                          <p className="font-mono-label text-[var(--accent-soft)]" style={{ marginTop: 4 }}>
                            {accessLabel} access
                          </p>
                          {user?.email ? (
                            <p className="mt-1 truncate font-mono text-[10px] text-[var(--fg-3)]">
                              {user.email}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 space-y-0.5">
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 rounded px-3 py-2.5 text-sm text-[var(--fg-2)] transition-colors hover:bg-white/[0.03] hover:text-[var(--fg)]"
                      >
                        <Settings className="h-4 w-4" strokeWidth={1.5} />
                        Account settings
                      </Link>
                      {role === "admin" ? (
                        <Link
                          href="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 rounded px-3 py-2.5 text-sm text-[var(--fg-2)] transition-colors hover:bg-white/[0.03] hover:text-[var(--fg)]"
                        >
                          <Shield className="h-4 w-4" strokeWidth={1.5} />
                          Admin panel
                        </Link>
                      ) : null}
                      <button
                        onClick={() => void signOut()}
                        className="flex w-full items-center gap-2 rounded px-3 py-2.5 text-sm text-[var(--fg-2)] transition-colors hover:bg-white/[0.03] hover:text-[var(--fg)]"
                      >
                        <LogOut className="h-4 w-4" strokeWidth={1.5} />
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="dash-main">
            <div className="dash-main-content">{children}</div>
            <footer className="dash-footer-bar">
              <p className="dash-footer-brand">
                <span className="acc">Hano</span> Insiders · Research desk
              </p>
              <p className="dash-footer-legal">
                Educational analysis only · Not financial advice
              </p>
            </footer>
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
    <div className="dash-page-header">
      <p className="dash-card-kicker">
        <span className="acc">{kicker}</span>
      </p>
      <h1>{title}</h1>
      {desc ? <p className="dash-page-desc">{desc}</p> : null}
    </div>
  );
}
