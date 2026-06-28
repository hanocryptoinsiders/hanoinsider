"use client";

import { useAuth } from "@/lib/auth-context";
import { ShieldAlert, LogOut, Mail } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { getSupportEmail } from "@/lib/support-email";

export default function AccountSuspendedPage() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-noise text-foreground flex items-center justify-center p-4">
      <div className="panel-elevated w-full max-w-md p-8 text-center space-y-6">
        <div className="flex justify-center">
          <Link href="/">
            <LogoMark size={48} />
          </Link>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-destructive/10 text-destructive border border-destructive/20 mb-2">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl tracking-wide uppercase">Access Restricted</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your Hano Insiders account has been suspended or banned due to a violation of our terms of service or subscription issues.
          </p>
        </div>

        {user?.email && (
          <div className="bg-secondary/40 border border-border rounded-lg p-3 text-xs font-mono text-muted-foreground break-all">
            Logged in as: {user.email}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4 border-t border-border">
          <a
            href={`mailto:${getSupportEmail()}`}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-foreground text-background font-semibold py-2.5 text-sm hover:bg-foreground/90 transition"
          >
            <Mail className="h-4 w-4" /> Contact Support
          </a>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 rounded-md border border-border bg-secondary/40 hover:bg-secondary py-2.5 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
