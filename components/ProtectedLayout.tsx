"use client";

import { useAuth, type UserRole } from "@/lib/auth-context";
import Link from "next/link";
import { Lock, Crown } from "lucide-react";
import type { ReactNode } from "react";

type ProtectedLayoutProps = {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallbackType?: "blur" | "message" | "redirect";
  fallbackMessage?: string;
  redirectTo?: string;
};

export function ProtectedLayout({
  children,
  allowedRoles,
  fallbackType = "message",
  fallbackMessage = "This content is reserved for premium members.",
  redirectTo = "/pricing",
}: ProtectedLayoutProps) {
  const { role, isPremium, isLoading, setMockRole } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const hasAccess = allowedRoles.includes(role) || (allowedRoles.includes("premium") && isPremium);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallbackType === "blur") {
    return (
      <div className="relative overflow-hidden rounded-lg border border-border bg-background">
        <div className="filter blur-md select-none pointer-events-none opacity-40">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-background/80 backdrop-blur-sm z-10">
          <Lock className="h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="font-display text-xl sm:text-2xl">Members Only</h3>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-sm">
            {fallbackMessage}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link
              href={redirectTo}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-xs sm:text-sm font-medium hover:bg-foreground/90 transition"
            >
              <Crown className="h-4 w-4" /> Upgrade to Premium
            </Link>
            {process.env.NODE_ENV === "development" && (
              <button
                onClick={() => setMockRole("premium")}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-5 py-2.5 text-xs sm:text-sm hover:bg-secondary transition"
              >
                Simulate Member Access
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-elevated p-8 text-center max-w-md mx-auto my-12 border-2 border-border/80">
      <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <h3 className="font-display text-2xl">Access Restricted</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
        {fallbackMessage}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Link
          href={redirectTo}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-foreground text-background py-2.5 text-sm font-medium hover:bg-foreground/90 transition"
        >
          <Crown className="h-4 w-4" /> Upgrade Now
        </Link>
        {process.env.NODE_ENV === "development" && (
          <button
            onClick={() => setMockRole("premium")}
            className="w-full flex items-center justify-center gap-2 rounded-md border border-border bg-secondary/40 py-2.5 text-sm hover:bg-secondary transition"
          >
            Simulate Member Access
          </button>
        )}
      </div>
    </div>
  );
}
