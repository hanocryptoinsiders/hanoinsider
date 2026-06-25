"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ShieldCheck, Check } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";

export default function Register() {
  const router = useRouter();
  const { signInWithGoogle, user, isLoading } = useAuth();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});
  const [verificationSent, setVerificationSent] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleResendEmail = async () => {
    if (resendCountdown > 0) return;
    setIsResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      },
    });
    setIsResending(false);
    if (error) {
      toast.error(error.message || "Failed to resend verification email");
    } else {
      toast.success("Verification email resent!");
      setResendCountdown(60);
    }
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [user, isLoading, router]);

  // Password strength
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

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][passwordStrength] || "";
  const strengthColor = ["", "bg-destructive", "bg-orange-400", "bg-yellow-400", "bg-emerald-500", "bg-emerald-400"][passwordStrength] || "bg-border";

  const validate = (): boolean => {
    const errors: { fullName?: string; email?: string; password?: string } = {};
    if (!fullName.trim()) errors.fullName = "Name is required";
    else if (fullName.trim().length < 2) errors.fullName = "Name must be at least 2 characters";
    if (!email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address";
    if (!password) errors.password = "Password is required";
    else if (password.length < 6) errors.password = "Password must be at least 6 characters";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setFieldErrors({});

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${getSiteUrl()}/auth/callback`,
      },
    });

    setIsSubmitting(false);

    if (error) {
      if (error.message.includes("already registered") || error.message.includes("User already registered")) {
        setFieldErrors({ email: "An account with this email already exists" });
      } else if (error.message.includes("Password should be")) {
        setFieldErrors({ password: error.message });
      } else if (error.message.includes("Too many requests")) {
        toast.error("Too many attempts. Please wait a moment.");
      } else {
        toast.error(error.message || "Registration failed. Please try again.");
      }
      return;
    }

    // If no error and an immediate session auto-confirmed, go straight to dashboard
    if (data.session) {
      toast.success("Account created! Welcome to Hano Insiders.");
      router.replace("/dashboard");
      return;
    }

    // No error and no session email confirmation required.
    // Supabase can return data.user = null in some cases (rate-limit, unwhitelisted redirect URL)
    // but the email was still sent. Always show the verification state.
    const isAlreadyRegistered =
      data.user?.identities != null && data.user.identities.length === 0;
    if (isAlreadyRegistered) {
      toast.info(
        "This email is already registered. Check your inbox or sign in.",
        { duration: 6000 }
      );
    }
    setVerificationSent(true);
  };

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    await signInWithGoogle();
    setTimeout(() => setIsGoogleLoading(false), 5000);
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
        src="/assets/hanoinfrontend/bird-mascot.jpg"
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

          {!verificationSent ? (
            <>
              <div className="mb-6">
                <h1 className="font-display text-3xl">Create account</h1>
                <p className="text-sm text-muted-foreground mt-1">Join the Hano Insiders inner circle.</p>
              </div>

              {/* Google */}
              <button
                onClick={handleGoogle}
                disabled={isGoogleLoading || isSubmitting}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-border/80 bg-secondary/30 py-3 text-sm hover:bg-secondary/60 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.7 1.1 7.8 3l5.7-5.7C33.6 7 29 5 24 5 16.3 5 9.7 9.4 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 43c5 0 9.5-1.9 12.9-5l-6-4.9c-2 1.4-4.5 2.4-6.9 2.4-5.2 0-9.6-3.5-11.2-8.4l-6.5 5C9.7 38.6 16.3 43 24 43z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6 4.9c-.4.4 6.4-4.7 6.4-14.4 0-1.2-.1-2.3-.4-3.5z"/>
                  </svg>
                )}
                <span className="font-medium">Continue with Google</span>
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[11px] text-muted-foreground tracking-widest">OR</span>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              <form onSubmit={handleRegister} noValidate className="space-y-4">
                <div>
                  <label htmlFor="reg-name" className="text-xs font-medium text-muted-foreground">Full name</label>
                  <input
                    id="reg-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setFieldErrors((p) => ({ ...p, fullName: undefined })); }}
                    autoComplete="name"
                    className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm bg-background/80 focus:outline-none focus:ring-2 transition ${
                      fieldErrors.fullName ? "border-destructive focus:ring-destructive/30" : "border-border/80 focus:ring-ring/40 focus:border-ring"
                    }`}
                    placeholder="Alex Johnson"
                  />
                  {fieldErrors.fullName && <p className="mt-1 text-xs text-destructive">{fieldErrors.fullName}</p>}
                </div>

                <div>
                  <label htmlFor="reg-email" className="text-xs font-medium text-muted-foreground">Email address</label>
                  <input
                    id="reg-email"
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
                  <label htmlFor="reg-password" className="text-xs font-medium text-muted-foreground">Password</label>
                  <div className="relative mt-1.5">
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
                      autoComplete="new-password"
                      className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm bg-background/80 focus:outline-none focus:ring-2 transition ${
                        fieldErrors.password ? "border-destructive focus:ring-destructive/30" : "border-border/80 focus:ring-ring/40 focus:border-ring"
                      }`}
                      placeholder="Min. 6 characters"
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
                  {/* Password strength bar */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1 h-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength ? strengthColor : "bg-border/40"}`}
                          />
                        ))}
                      </div>
                      {strengthLabel && (
                        <p className="text-[11px] text-muted-foreground">{strengthLabel}</p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isGoogleLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:bg-foreground/90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_15px_-4px_rgba(255,255,255,0.2)]"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                </button>

                <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                  By creating an account, you agree to our{" "}
                  <Link href="/" className="underline hover:text-foreground">Terms of Service</Link>{" "}
                  and{" "}
                  <Link href="/" className="underline hover:text-foreground">Privacy Policy</Link>.
                </p>
              </form>

              <div className="mt-5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Have an account?{" "}
                  <Link href="/login" className="text-foreground hover:underline font-medium">Sign in</Link>
                </p>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Secured by Supabase</span>
                </div>
              </div>
            </>
          ) : (
            /* Email Verification Sent */
            <div className="text-center py-4">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="font-display text-3xl">Verify your email</h1>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-xs mx-auto">
                We sent a verification link to{" "}
                <span className="font-semibold text-foreground">{email}</span>.
                Click the link to activate your account.
              </p>
              <p className="text-xs text-muted-foreground mt-2">Don't see it? Check your spam folder.</p>
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={isResending || resendCountdown > 0}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 py-3 text-xs font-semibold hover:bg-secondary/60 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isResending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {resendCountdown > 0 ? `Resend email (${resendCountdown}s)` : "Resend verification email"}
                </button>
              </div>
              <Link
                href="/login"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:bg-foreground/90 transition"
              >
                Go to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
