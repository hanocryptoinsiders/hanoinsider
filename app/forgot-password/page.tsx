"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoMark } from "@/components/LogoMark";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowLeft, ShieldCheck, Mail } from "lucide-react";

/**
 * /forgot-password
 *
 * Sends a Supabase password-reset email. The `redirectTo` points to
 * `/auth/callback?next=/reset-password` so the callback route can
 * exchange the PKCE code for a session before forwarding the user.
 *
 * A generic success message is always shown to prevent user-enumeration.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    const supabase = createClient();

    // IMPORTANT: redirectTo must point to /auth/callback so the server-side
    // route handler can call exchangeCodeForSession() and set the session
    // cookie before forwarding the user to /reset-password.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });

    if (error) {
      // Log the real error for debugging; never expose it to the user
      // to prevent leaking whether the email exists.
      console.error("[forgot-password] Supabase error:", error.message);
    }

    setIsSubmitting(false);
    // Always show success regardless of error to prevent user-enumeration
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-noise text-foreground flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/75 to-background" />

      <div className="relative w-full max-w-md">
        <div className="panel-elevated border border-border/60 rounded-2xl p-8 sm:p-10 shadow-2xl backdrop-blur-sm">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-8 w-fit group">
            <LogoMark size={32} />
            <span className="font-display text-xl tracking-wider group-hover:opacity-80 transition-opacity">
              Hano Insiders
            </span>
          </Link>

          {!submitted ? (
            <>
              <div className="mb-6">
                <h1 className="font-display text-3xl">Reset password</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your email and we&rsquo;ll send you a secure reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                    autoComplete="email"
                    autoFocus
                    className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm bg-background/80 focus:outline-none focus:ring-2 transition ${
                      emailError
                        ? "border-destructive focus:ring-destructive/30"
                        : "border-border/80 focus:ring-ring/40 focus:border-ring"
                    }`}
                    placeholder="you@hanoinsiders.com"
                  />
                  {emailError && (
                    <p className="mt-1 text-xs text-destructive">{emailError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:bg-foreground/90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_15px_-4px_rgba(255,255,255,0.2)]"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>

              <div className="mt-5 flex items-center justify-between">
                <Link
                  href="/login"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to sign in
                </Link>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Secured by Supabase</span>
                </div>
              </div>
            </>
          ) : (
            /* ── Success State ───────────────────────────────────────── */
            <div className="text-center py-4">
              <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Mail className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="font-display text-2xl">Check your inbox</h2>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-xs mx-auto">
                If an account exists with this email, a reset link has been sent.
                The link expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-border py-2.5 text-sm hover:bg-secondary/40 transition"
              >
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
