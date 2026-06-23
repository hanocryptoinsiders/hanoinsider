"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { LogoMark } from "@/components/LogoMark";

export function Header() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const homeHref = user ? "/dashboard" : "/";

  return (
    <header className="sticky top-3 sm:top-5 z-40 px-3 sm:px-6">
      <div className="relative mx-auto max-w-[1180px]">
        {/* glow halo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-10 -top-6 -bottom-6 opacity-60 blur-2xl"
          style={{
            background:
              "radial-gradient(60% 80% at 50% 0%, oklch(0.96 0 0 / 0.08), transparent 70%)",
          }}
        />
        <div
          className="relative flex items-center justify-between gap-3 rounded-xl pl-4 pr-2 sm:pl-6 sm:pr-3 py-2 sm:py-2.5 backdrop-blur-2xl backdrop-saturate-150 border border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.18 0 0 / 0.55), oklch(0.10 0 0 / 0.45))",
          }}
        >
          {/* top sheen */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
            }}
          />
          <Link href={homeHref} className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <LogoMark size={32} className="border border-white/15 bg-white/5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]" />
            <span className="text-sm sm:text-lg font-semibold tracking-[0.18em] sm:tracking-[0.22em]">HANO</span>
            <span className="hidden sm:inline text-[10px] tracking-[0.34em] text-violet-300">INSIDERS</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            {[
              { to: "/", label: "Landing" },
              { to: "/pricing", label: "Pricing" },
              { to: "/dashboard", label: "Dashboard" },
            ].map((l) => {
              const active = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  href={l.to}
                  className={`rounded-lg px-4 py-1.5 transition-all ${active ? "text-foreground bg-white/10 border border-white/10" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href="/pricing"
              className="md:hidden rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5"
            >
              Pricing
            </Link>
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link href="/dashboard" className="hidden sm:inline-flex rounded-lg px-4 py-1.5 text-sm text-foreground bg-white/10 border border-white/10 hover:bg-white/15 transition-colors font-medium">
                  Open Dashboard
                </Link>
                <button
                  onClick={() => signOut()}
                  className="group relative inline-flex items-center gap-1.5 rounded-lg px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-background bg-foreground shadow-[0_6px_20px_-6px_rgba(255,255,255,0.35),inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[0_10px_30px_-6px_rgba(255,255,255,0.5),inset_0_1px_0_rgba(255,255,255,0.7)] transition-shadow"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex rounded-lg px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="group relative inline-flex items-center gap-1.5 rounded-lg px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-background bg-foreground shadow-[0_6px_20px_-6px_rgba(255,255,255,0.35),inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[0_10px_30px_-6px_rgba(255,255,255,0.5),inset_0_1px_0_rgba(255,255,255,0.7)] transition-shadow"
                >
                  Join Insiders
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
