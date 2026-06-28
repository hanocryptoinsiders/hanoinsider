"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, isPremium } = useAuth();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Handle auth messages from URL
  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "auth_failed") toast.error("Authentication failed. Please try again.");
    if (error === "auth_callback_failed" || error === "link_expired") {
      toast.error("Verification failed or link expired. Please try again.");
    }
    if (searchParams.get("reset") === "true") {
      toast.success("Password updated successfully. Please sign in with your new password.");
    }
    if (searchParams.get("renewed") === "1") {
      toast.success("Payment confirmed. Sign in to restore dashboard access.");
    }
  }, [searchParams]);

  // Redirect if already authenticated with active subscription
  useEffect(() => {
    if (!isLoading && user && isPremium) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, isPremium, router]);

  // Validate form
  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address";
    if (!password) errors.password = "Password is required";
    else if (password.length < 6) errors.password = "Password must be at least 6 characters";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Email/Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setFieldErrors({});

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setIsSubmitting(false);
      if (error.message.includes("Invalid login credentials") || error.message.includes("invalid_grant")) {
        setFieldErrors({ password: "Incorrect email or password" });
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Please verify your email before signing in. Check your inbox.");
      } else if (error.message.includes("Too many requests")) {
        toast.error("Too many attempts. Please wait a moment and try again.");
      } else {
        toast.error(error.message || "Sign in failed. Please try again.");
      }
      return;
    }

    const statusRes = await fetch("/api/stripe/check-status");
    const status = await statusRes.json().catch(() => ({ isPremium: false }));
    if (!status.isPremium) {
      try {
        await fetch("/api/auth/signout", { method: "POST" });
      } catch {
        /* ignore */
      }
      await supabase.auth.signOut();
      setIsSubmitting(false);
      toast.error("Your subscription has ended. Please renew your subscription to regain dashboard access.");
      router.replace("/?renew=1#pricing");
      return;
    }

    toast.success("Welcome back!");
    router.replace("/dashboard");
  };

  // Password Reset
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) { toast.error("Enter your email address"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) { toast.error("Enter a valid email address"); return; }

    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
    });
    setIsResetting(false);

    if (error) {
      toast.error(error.message || "Failed to send reset link");
      return;
    }

    setResetSent(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-noise flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-noise text-foreground flex items-center justify-center px-4 relative overflow-hidden">
      <img
        loading="eager"
        decoding="async"
        src="/assets/hanoinfrontend/hero-mascot.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/75 to-background" />

      <div className="relative w-full max-w-md">
        <div className="panel-elevated border border-border/60 rounded-2xl p-8 sm:p-10 shadow-2xl backdrop-blur-sm">
          <Link href="/" className="flex items-center gap-2 mb-8 w-fit group">
            <LogoMark size={32} />
            <span className="font-display text-xl tracking-wider group-hover:opacity-80 transition-opacity">Hano Insiders</span>
          </Link>

          {/* Sign In View */}
          {!showForgot ? (
            <>
              {!isLoading && user && !isPremium && (
                <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-200/90">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>
                    Your subscription has ended.{" "}
                    <Link href="/#pricing" className="underline font-medium">Renew your subscription</Link>{" "}
                    to regain dashboard access, then sign in.
                  </p>
                </div>
              )}

              <div className="mb-6">
                <h1 className="font-display text-3xl">Welcome back</h1>
                <p className="text-sm text-muted-foreground mt-1">Sign in to your Hano Insiders account.</p>
              </div>

              {/* Email + Password form */}
              <form onSubmit={handleLogin} noValidate className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="text-xs font-medium text-muted-foreground">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
                    autoComplete="email"
                    className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm bg-background/80 focus:outline-none focus:ring-2 transition ${
                      fieldErrors.email ? "border-destructive focus:ring-destructive/30" : "border-border/80 focus:ring-ring/40 focus:border-ring"
                    }`}
                    placeholder="you@hanoinsiders.com"
                  />
                  {fieldErrors.email && <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="text-xs font-medium text-muted-foreground">Password</label>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(true); setResetEmail(email); }}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative mt-1.5">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
                      autoComplete="current-password"
                      className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm bg-background/80 focus:outline-none focus:ring-2 transition ${
                        fieldErrors.password ? "border-destructive focus:ring-destructive/30" : "border-border/80 focus:ring-ring/40 focus:border-ring"
                      }`}
                      placeholder="........"
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
                  {fieldErrors.password && <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:bg-foreground/90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_15px_-4px_rgba(255,255,255,0.2)]"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                </button>
              </form>

              <div className="mt-5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  No account?{" "}
                  <Link href="/#pricing" className="text-foreground hover:underline font-medium">
                    Choose a plan
                  </Link>
                </p>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Secured by Supabase</span>
                </div>
              </div>
            </>
          ) : (
            /* Forgot Password View */
            <>
              <button
                onClick={() => { setShowForgot(false); setResetSent(false); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition mb-6"
              >
                Back to sign in
              </button>

              {!resetSent ? (
                <>
                  <h1 className="font-display text-3xl">Reset password</h1>
                  <p className="text-sm text-muted-foreground mt-1 mb-6">
                    Enter your email and we'll send you a secure reset link.
                  </p>
                  <form onSubmit={handleReset} noValidate className="space-y-4">
                    <div>
                      <label htmlFor="reset-email" className="text-xs font-medium text-muted-foreground">Email address</label>
                      <input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        autoComplete="email"
                        className="mt-1.5 w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition"
                        placeholder="you@hanoinsiders.com"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isResetting}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:bg-foreground/90 transition disabled:opacity-40"
                    >
                      {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="h-7 w-7 text-success" />
                  </div>
                  <h2 className="font-display text-2xl">Check your inbox</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    We sent a reset link to <strong className="text-foreground">{resetEmail}</strong>.
                    It expires in 1 hour.
                  </p>
                  <button
                    onClick={() => { setShowForgot(false); setResetSent(false); }}
                    className="mt-6 w-full rounded-xl border border-border py-2.5 text-sm hover:bg-secondary/40 transition"
                  >
                    Back to sign in
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-noise flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
