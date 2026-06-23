"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, FileEdit, Users, CreditCard, Gift, Settings as SettingsIcon, ArrowLeft, Menu, MessageSquare, Bell } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { FreeAccessProvider } from "@/lib/free-access-context";
import { QuoteProvider } from "@/lib/quote-context";
import { RouteProgress } from "@/components/navigation/route-progress";
import { useEffect } from "react";

const nav = [
  { to: "/admin", icon: LayoutGrid, label: "Admin Overview", exact: true },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/content", icon: FileEdit, label: "Content" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { to: "/admin/comments", icon: MessageSquare, label: "Comments" },
  { to: "/admin/notifications", icon: Bell, label: "Notifications" },
  { to: "/admin/affiliates", icon: Gift, label: "Affiliates" },
  { to: "/admin/settings", icon: SettingsIcon, label: "Settings" },
];

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [pendingTo, setPendingTo] = useState<string | null>(null);

  useEffect(() => {
    setPendingTo(null);
  }, [pathname]);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2 px-2 py-2">
        <LogoMark size={36} />
        <div>
          <span className="font-display text-2xl tracking-wider block">Hano Insiders</span>
          <span className="text-[10px] tracking-[0.3em] text-muted-foreground">ADMIN</span>
        </div>
      </Link>
      <nav className="panel space-y-2 p-3">
        {nav.map((it) => {
          const Icon = it.icon;
          const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
          return (
            <Link 
              key={it.to} 
              href={it.to} 
              onClick={() => {
                if (pathname !== it.to) {
                  setPendingTo(it.to);
                }
                if (onNavigate) onNavigate();
              }} 
              className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition ${active ? "bg-accent text-foreground ring-1 ring-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              <span className="flex-1 text-left">{it.label}</span>
              {pendingTo === it.to && (
                <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.78_0.14_85)] animate-pulse shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>
      <Link href="/dashboard" onClick={onNavigate} className="panel p-3 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back to dashboard
      </Link>
    </div>
  );
}

/** Client-side admin panel shell - receives children from the Server Component layout. */
export function AdminPanelUI({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <FreeAccessProvider>
      <QuoteProvider>
        <div className="min-h-screen bg-noise text-foreground">
          <RouteProgress />
          <div className="mx-auto flex max-w-[1500px] gap-5 p-3 sm:p-5">
            <aside className="hidden lg:block w-[220px] shrink-0 sticky top-5 h-[calc(100vh-40px)] self-start overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <SidebarBody />
            </aside>
            <main className="flex-1 min-w-0 space-y-4 sm:space-y-5">
              <div className="sticky top-3 z-30 flex items-center gap-2 lg:hidden bg-background/80 backdrop-blur-md p-2 rounded-xl border border-border/80">
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                    <button aria-label="Open menu" className="panel p-2.5">
                      <Menu className="h-5 w-5" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[280px] overflow-y-auto bg-background p-4">
                    <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
                    <SidebarBody onNavigate={() => setOpen(false)} />
                  </SheetContent>
                </Sheet>
                <Link href="/admin" className="flex items-center gap-2 flex-1 min-w-0">
                  <LogoMark size={28} />
                  <span className="font-display text-lg tracking-wider truncate">Hano Insiders <span className="text-[10px] text-muted-foreground tracking-[0.2em]">ADMIN</span></span>
                </Link>
              </div>
              {children}
            </main>
          </div>
        </div>
      </QuoteProvider>
    </FreeAccessProvider>
  );
}
