"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

type PageState = "loading" | "ready" | "success" | "error";

export default function ResetPassword() {
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [loadingMessage, setLoadingMessage] = useState("Verifying reset link…");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fail = (message: string) => {
      if (cancelled) return;
      setErrorMessage(message);
      setPageState("error");
    };

    const succeed = () => {
      if (cancelled) return;
      // Clean the URL of any token params so they cannot be replayed
      window.history.replaceState(null, "", "/reset-password");
      setPageState("ready");
    };

    const establishSession = async () => {
      const supabase = createClient();
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const type = params.get("type");
      const hasHashTokens =
        typeof window !== "undefined" && window.location.hash.includes("access_token");

      // ── Branch 1: token_hash (PKCE email link) ────────────────────────────
      // Arrives when the user is sent DIRECTLY here (not via /auth/callback).
      // Verify the OTP once, consuming the token permanently.
      if (tokenHash && type === "recovery") {
        setLoadingMessage("Verifying your reset link…");
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (cancelled) return;
        if (error) {
          fail("This reset link is invalid or has already been used. Please request a new one.");
          return;
        }
        succeed();
        return;
      }

      // ── Branch 2: PKCE authorization code ─────────────────────────────────
      if (code) {
        setLoadingMessage("Completing verification…");
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          fail("This reset link is invalid or has already been used. Please request a new one.");
          return;
        }
        succeed();
        return;
      }

      // ── Branch 3: Implicit / hash-based tokens ────────────────────────────
      // Old-style Supabase links put tokens in the URL hash (#access_token=…).
      if (hasHashTokens) {
        setLoadingMessage("Establishing secure session…");

        const hasSession = await new Promise<boolean>((resolve) => {
          let settled = false;
          let unsub: (() => void) | undefined;

          // First, set up the auth state listener
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
              if (
                !settled &&
                session &&
                (event === "INITIAL_SESSION" ||
                  event === "SIGNED_IN" ||
                  event === "PASSWORD_RECOVERY")
              ) {
                settled = true;
                clearTimeout(timer);
                subscription.unsubscribe();
                resolve(true);
              }
            }
          );
          unsub = () => subscription.unsubscribe();

          // Timeout with a final getUser() check (bumped 4s → 6s for slow connections)
          const timer = window.setTimeout(() => {
            if (!settled) {
              settled = true;
              unsub?.();
              supabase.auth.getUser().then(({ data: { user } }) => {
                resolve(!!user);
              });
            }
          }, 6000);

          // Also check immediately — the token might already be parsed
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (!settled && user) {
              settled = true;
              clearTimeout(timer);
              unsub?.();
              resolve(true);
            }
          });
        });

        if (cancelled) return;
        if (hasSession) {
          succeed();
          return;
        }
        fail("This reset link is invalid or has expired. Please request a new password reset.");
        return;
      }

      // ── Branch 4: No token params — session already established by /auth/callback ──
      // The most common flow: /auth/callback consumed the token, set the session
      // cookie, and redirected here with a clean URL. Simply trust getUser().
      setLoadingMessage("Loading your session…");
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (user) {
        succeed();
        return;
      }

      fail(
        "Your reset session could not be found. The link may have expired or already been used. Please request a new password reset."
      );
    };

    void establishSession();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    else if (passwordStrength < 2)
      errors.password = "Password is too weak. Add numbers or symbols.";
    if (!confirmPassword) errors.confirm = "Please confirm your new password";
    else if (password !== confirmPassword) errors.confirm = "Passwords do not match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit new password ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setFieldErrors({});

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setIsSubmitting(false);
      if (error.message.toLowerCase().includes("same password")) {
        setFieldErrors({
          password: "New password must be different from your current password.",
        });
      } else if (error.message.toLowerCase().includes("weak")) {
        setFieldErrors({ password: error.message });
      } else {
        setErrorMessage(error.message || "Failed to update password. Please try again.");
        setPageState("error");
      }
      return;
    }

    // Show success UI FIRST — then sign out fire-and-forget to avoid racing
    setPageState("success");
    supabase.auth.signOut().catch(() => {/* ignore */});
    setTimeout(() => router.replace("/login?reset=true"), 2500);
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
          <p className="text-sm text-muted-foreground">{loadingMessage}</p>
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
                  href="/login"
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
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:bg-foreground/90 transition"
                >
                  Back to sign in
                </Link>
                <p className="text-xs text-muted-foreground mt-1">
                  Click &ldquo;Forgot password?&rdquo; on the sign-in page to request a fresh link.
                </p>
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
