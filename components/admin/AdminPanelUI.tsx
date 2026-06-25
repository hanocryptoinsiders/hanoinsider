"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  LayoutGrid,
  FileEdit,
  Users,
  CreditCard,
  Gift,
  Settings as SettingsIcon,
  ArrowLeft,
  Menu,
  MessageSquare,
  Bell,
  Quote,
  KeyRound,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { FreeAccessProvider } from "@/lib/free-access-context";
import { QuoteProvider } from "@/lib/quote-context";
import { RouteProgress } from "@/components/navigation/route-progress";
import { HanoWordmark } from "@/components/brand/HanoWordmark";

type NavItem = {
  to: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number | string }>;
  label: string;
  exact?: boolean;
};

const operationsNav: NavItem[] = [
  { to: "/admin", icon: LayoutGrid, label: "Overview", exact: true },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/content", icon: FileEdit, label: "Content" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { to: "/admin/comments", icon: MessageSquare, label: "Comments" },
];

const platformNav: NavItem[] = [
  { to: "/admin/notifications", icon: Bell, label: "Notifications" },
  { to: "/admin/affiliates", icon: Gift, label: "Affiliates" },
  { to: "/admin/settings", icon: SettingsIcon, label: "Settings" },
];

const deskNav: NavItem[] = [
  { to: "/admin/free-access", icon: KeyRound, label: "Free access" },
  { to: "/admin/quote", icon: Quote, label: "Desk quote" },
];

const PAGE_META: Record<string, { title: string; sub?: string }> = {
  "/admin": { title: "Overview", sub: "Platform health, at a glance." },
  "/admin/users": { title: "Users", sub: "Member accounts and roles." },
  "/admin/content": { title: "Content", sub: "Insights, articles, and media." },
  "/admin/subscriptions": { title: "Subscriptions", sub: "Billing and plan status." },
  "/admin/comments": { title: "Comments", sub: "Community moderation queue." },
  "/admin/notifications": { title: "Notifications", sub: "Broadcast alerts to members." },
  "/admin/affiliates": { title: "Affiliates", sub: "Referral partners and payouts." },
  "/admin/settings": { title: "Settings", sub: "Platform configuration." },
  "/admin/free-access": { title: "Free access", sub: "Complimentary member access." },
  "/admin/quote": { title: "Desk quote", sub: "Dashboard hero voice and mascot." },
};

function getPageMeta(pathname: string) {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  return { title: "Admin", sub: "Hano Insiders control desk." };
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
          </Link>
        );
      })}
    </div>
  );
}

function SidebarContent({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="dash-sidebar flex h-full flex-col">
      <div className="flex items-center border-b border-[var(--border)] px-4 py-4">
        <HanoWordmark href="/admin" compact={compact} />
      </div>

      <nav className="dash-sidebar-nav scrollbar-hide flex-1 overflow-y-auto py-5">
        <NavGroup label="Operations" items={operationsNav} pathname={pathname} onNavigate={onNavigate} compact={compact} />
        <NavGroup label="Platform" items={platformNav} pathname={pathname} onNavigate={onNavigate} compact={compact} />
        <NavGroup label="Desk" items={deskNav} pathname={pathname} onNavigate={onNavigate} compact={compact} />
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        <Link
          href="/dashboard"
          onClick={() => onNavigate?.()}
          className="dash-admin-exit"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          {!compact ? <span>Back to dashboard</span> : null}
        </Link>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pageMeta = getPageMeta(pathname);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="dash-shell dash-shell--admin">
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
                  <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                  <SidebarContent onNavigate={() => setOpen(false)} />
                </SheetContent>
              </Sheet>

              <div className="min-w-0 flex-1">
                <p className="dash-card-kicker">
                  <span className="acc">Hano Insiders</span>
                  <span className="bar" />
                  <span>Admin</span>
                </p>
                <h1 className="dash-header-title">{pageMeta.title}</h1>
                {pageMeta.sub ? <p className="dash-header-sub hidden sm:block">{pageMeta.sub}</p> : null}
              </div>
            </div>
          </header>

          <main className="dash-main">
            <div className="dash-main-content dash-admin-content">{children}</div>
            <footer className="dash-footer-bar">
              <p className="dash-footer-brand">
                <span className="acc">Hano</span> Insiders · Admin desk
              </p>
              <p className="dash-footer-legal">
                Internal use only · Authorized operators
              </p>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

/** Client-side admin panel shell — receives children from the Server Component layout. */
export function AdminPanelUI({ children }: { children: React.ReactNode }) {
  return (
    <FreeAccessProvider>
      <QuoteProvider>
        <Shell>{children}</Shell>
      </QuoteProvider>
    </FreeAccessProvider>
  );
}
