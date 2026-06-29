"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { LogoMark } from "@/components/LogoMark";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Lock,
} from "lucide-react";

const LOGIN_AFTER_RESET_PATH = "/login?password_updated=true";
const SIGNOUT_REDIRECT_PATH = `/api/auth/signout?next=${encodeURIComponent(LOGIN_AFTER_RESET_PATH)}`;

/**
 * /reset-password
 *
 * This page is reached AFTER /auth/callback has already exchanged the
 * PKCE code and established a valid Supabase session.
 *
 * The only job of this page is:
 *   1. Verify a session exists (via getUser)
 *   2. Let the user set a new password
 *   3. Call updateUser({ password })
 *   4. Sign out and redirect to /login?password_updated=true
 */

type PageState = "loading" | "ready" | "success" | "error";
const AUTH_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  let timeoutId!: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function clearPasswordRecoveryMarker() {
  document.cookie = "hano_password_recovery=; path=/; max-age=0; SameSite=Lax";
}

export default function ResetPassword() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [errorMessage, setErrorMessage] = useState("");

  // ── Session check on mount ──────────────────────────────────────────────
  // The session was already established by /auth/callback.
  // We simply verify that it exists.
  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await withTimeout(
          supabase.auth.getUser(),
          "Session verification timed out. Please request a new password reset link."
        );

        if (cancelled) return;

        if (error || !user) {
          clearPasswordRecoveryMarker();
          setErrorMessage(
            "Your reset session could not be found. The link may have expired or already been used. Please request a new password reset."
          );
          setPageState("error");
          return;
        }

        setPageState("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("[reset-password] Session verification failed:", err);
        clearPasswordRecoveryMarker();
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "We could not verify your reset session. Please request a new password reset link."
        );
        setPageState("error");
      }
    };

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Password strength meter ───────────────────────────────────────────────
  const passwordStrength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel =
    ["", "Weak", "Fair", "Good", "Strong", "Very strong"][passwordStrength] || "";
  const strengthColor = [
    "",
    "bg-red-500",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-emerald-500",
    "bg-emerald-400",
  ][passwordStrength] || "bg-border";

  // ── Form validation ───────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: { password?: string; confirm?: string } = {};
    if (!password) errors.password = "Password is required";
    else if (password.length < 8) errors.password = "Password must be at least 8 characters";
    if (!confirmPassword) errors.confirm = "Please confirm your new password";
    else if (password !== confirmPassword) errors.confirm = "Passwords do not match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit new password ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || pageState !== "ready") return;
    if (!validate()) return;

    setIsSubmitting(true);
    setFieldErrors({});

    try {
      const supabase = createClient();
      const { error } = await withTimeout(
        supabase.auth.updateUser({ password }),
        "Password update timed out. Please check your connection and try again."
      );

      if (error) {
        if (error.message.toLowerCase().includes("same password")) {
          setFieldErrors({
            password: "New password must be different from your current password.",
          });
        } else if (error.message.toLowerCase().includes("weak")) {
          setFieldErrors({ password: error.message });
        } else {
          console.error("[reset-password] updateUser failed:", error.message);
          setErrorMessage(error.message || "Failed to update password. Please try again.");
          setPageState("error");
        }
        return;
      }

      setPageState("success");
      clearPasswordRecoveryMarker();

      supabase.auth.signOut().catch(() => {
        /* server redirect below is the source of truth */
      });
      window.setTimeout(() => {
        window.location.replace(SIGNOUT_REDIRECT_PATH);
      }, 800);
    } catch (err) {
      console.error("[reset-password] Unexpected error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setPageState("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-noise flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-full bg-foreground/5 border border-border/60 flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground absolute -bottom-1 -right-1" />
          </div>
          <p className="text-sm text-muted-foreground">Verifying your session…</p>
        </div>
      </div>
    );
  }

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

          {/* ── Success State ─────────────────────────────────────────── */}
          {pageState === "success" && (
            <div className="text-center py-4">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="font-display text-3xl">Password updated</h1>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-xs mx-auto">
                Your password has been changed successfully. Redirecting you to sign in…
              </p>
              <div className="mt-6">
                <Link
                  href={SIGNOUT_REDIRECT_PATH}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:bg-foreground/90 transition"
                >
                  Go to sign in
                </Link>
              </div>
            </div>
          )}

          {/* ── Error State ───────────────────────────────────────────── */}
          {pageState === "error" && (
            <div className="text-center py-4">
              <div className="h-16 w-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="font-display text-2xl">Link expired</h1>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-xs mx-auto">
                {errorMessage || "This reset link is no longer valid. Please request a new one."}
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Link
                  href="/forgot-password"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:bg-foreground/90 transition"
                >
                  Request a new reset link
                </Link>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-border py-2.5 text-sm hover:bg-secondary/40 transition"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          )}

          {/* ── Reset Form ────────────────────────────────────────────── */}
          {pageState === "ready" && (
            <>
              <div className="mb-6">
                <h1 className="font-display text-3xl">Set new password</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a strong password for your Hano Insiders account.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* New password */}
                <div>
                  <label
                    htmlFor="rp-password"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    New password
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="rp-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldErrors((p) => ({ ...p, password: undefined }));
                      }}
                      autoComplete="new-password"
                      autoFocus
                      className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm bg-background/80 focus:outline-none focus:ring-2 transition ${
                        fieldErrors.password
                          ? "border-destructive focus:ring-destructive/30"
                          : "border-border/80 focus:ring-ring/40 focus:border-ring"
                      }`}
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>
                  )}
                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1 h-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-all duration-300 ${
                              i <= passwordStrength ? strengthColor : "bg-border/40"
                            }`}
                          />
                        ))}
                      </div>
                      {strengthLabel && (
                        <p className="text-[11px] text-muted-foreground">{strengthLabel}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    htmlFor="rp-confirm"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Confirm new password
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="rp-confirm"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setFieldErrors((p) => ({ ...p, confirm: undefined }));
                      }}
                      autoComplete="new-password"
                      className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm bg-background/80 focus:outline-none focus:ring-2 transition ${
                        fieldErrors.confirm
                          ? "border-destructive focus:ring-destructive/30"
                          : "border-border/80 focus:ring-ring/40 focus:border-ring"
                      }`}
                      placeholder="Repeat your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.confirm && (
                    <p className="mt-1 text-xs text-destructive">{fieldErrors.confirm}</p>
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
                    "Update password"
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
          )}
        </div>
      </div>
    </div>
  );
}
