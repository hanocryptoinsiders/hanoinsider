"use client";

import Link from "next/link";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ShieldCheck, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { normalizeEmail } from "@/lib/payments";

type Eligibility = "unknown" | "checking" | "confirming_payment" | "eligible" | "not_paid" | "pending_crypto_review" | "already_registered";

async function confirmCheckoutSession(sessionId: string, email?: string) {
  const res = await fetch("/api/checkout/confirm-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, email: email || undefined }),
  });
  return parseApiJson<{
    success?: boolean;
    email?: string;
    registrationStatus?: "eligible" | "already_registered" | "not_paid";
    error?: string;
    code?: string;
  }>(res);
}

async function parseApiJson<T extends Record<string, unknown>>(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {
      _httpStatus: res.status,
      _parseError: true as const,
      error: res.status >= 500
        ? "Server error — registration API is down. Please try again in a minute or contact support."
        : "Unexpected server response. Please try again.",
    };
  }
  try {
    const payload = (await res.json()) as T;
    return { ...payload, _httpStatus: res.status, _parseError: false as const };
  } catch {
    return {
      _httpStatus: res.status,
      _parseError: true as const,
      error: "Registration failed. Please try again.",
    };
  }
}

async function fetchEligibility(trimmed: string): Promise<Eligibility> {
  const res = await fetch("/api/auth/check-eligibility", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: trimmed }),
  });
  const data = await res.json();
  if (data.status === "eligible") return "eligible";
  if (data.status === "already_registered") return "already_registered";
  if (data.status === "pending_crypto_review") return "pending_crypto_review";
  if (data.status === "not_paid") return "not_paid";
  return "unknown";
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, loadProfile } = useAuth();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState<Eligibility>("unknown");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const confirmingSessionRef = useRef(false);

  const sessionId = searchParams.get("session_id");

  // Prefill email from the Stripe success redirect (?email=...).
  useEffect(() => {
    const e = searchParams.get("email");
    if (e) setEmail(e);
  }, [searchParams]);

  // Confirm Stripe checkout immediately so registration does not wait on the webhook.
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    confirmingSessionRef.current = true;
    setEligibility("confirming_payment");

    (async () => {
      const emailParam = searchParams.get("email") || "";
      let confirmedEmail = emailParam;

      for (let attempt = 0; attempt < 8 && !cancelled; attempt++) {
        try {
          const data = await confirmCheckoutSession(sessionId, confirmedEmail || undefined);
          if (!data._parseError && data.email) {
            confirmedEmail = data.email;
            setEmail(data.email);
          }
          if (!data._parseError && data.registrationStatus === "eligible") {
            setEligibility("eligible");
            confirmingSessionRef.current = false;
            return;
          }
          if (!data._parseError && data.registrationStatus === "already_registered") {
            setEligibility("already_registered");
            confirmingSessionRef.current = false;
            return;
          }
        } catch {
          /* retry below */
        }

        if (confirmedEmail) {
          const status = await fetchEligibility(normalizeEmail(confirmedEmail));
          if (status === "eligible" || status === "already_registered") {
            if (!cancelled) setEligibility(status);
            confirmingSessionRef.current = false;
            return;
          }
        }

        if (attempt < 7) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      if (!cancelled && confirmedEmail) {
        const status = await fetchEligibility(normalizeEmail(confirmedEmail));
        setEligibility(status === "unknown" ? "not_paid" : status);
      } else if (!cancelled) {
        setEligibility("not_paid");
      }
      confirmingSessionRef.current = false;
    })();

    return () => {
      cancelled = true;
      confirmingSessionRef.current = false;
    };
  }, [sessionId, searchParams]);

  // Redirect if already authenticated.
  useEffect(() => {
    if (!isLoading && user) router.replace("/dashboard");
  }, [user, isLoading, router]);

  // Check paid-email eligibility (debounced) for inline feedback.
  useEffect(() => {
    if (sessionId && confirmingSessionRef.current) return;

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEligibility("unknown");
      return;
    }
    setEligibility("checking");
    const t = setTimeout(async () => {
      try {
        setEligibility(await fetchEligibility(trimmed));
      } catch {
        setEligibility("unknown");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [email, sessionId]);

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
    const errors: typeof fieldErrors = {};
    if (!email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address";
    if (!password) errors.password = "Password is required";
    else if (password.length < 6) errors.password = "Password must be at least 6 characters";
    if (!confirmPassword) errors.confirmPassword = "Please confirm your password";
    else if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    const normalizedEmail = normalizeEmail(email);
    setIsSubmitting(true);
    try {
      if (sessionId && eligibility === "not_paid") {
        await confirmCheckoutSession(sessionId, normalizedEmail);
        const refreshed = await fetchEligibility(normalizedEmail);
        if (refreshed === "eligible") setEligibility("eligible");
        else if (refreshed === "already_registered") {
          setEligibility("already_registered");
          setFormError("This paid email already has an account. Please log in instead.");
          setIsSubmitting(false);
          return;
        } else if (refreshed === "pending_crypto_review") {
          setEligibility("pending_crypto_review");
          setFormError("Your payment has not been verified yet. Please wait for admin approval or contact support.");
          setIsSubmitting(false);
          return;
        } else if (refreshed === "not_paid") {
          setFormError("Still confirming your payment — please wait a moment and try again.");
          setIsSubmitting(false);
          return;
        }
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          ...(sessionId ? { sessionId } : {}),
        }),
      });

      let data = await parseApiJson<{
        error?: string;
        code?: string;
        success?: boolean;
        sessionEstablished?: boolean;
      }>(res);

      if (data._parseError) {
        setFormError(data.error || "Registration failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        if (data.code === "not_paid" && sessionId) {
          await confirmCheckoutSession(sessionId, normalizedEmail);
          const retry = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalizedEmail, password, sessionId }),
          });
          const retryData = await parseApiJson<typeof data>(retry);
          if (retryData._parseError) {
            setFormError(retryData.error || "Registration failed. Please try again.");
            setIsSubmitting(false);
            return;
          }
          if (retry.ok) {
            if (!retryData.sessionEstablished) {
              const { error: signInError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
              });
              if (signInError) {
                toast.success("Account created! Please sign in with your new password.");
                router.replace("/login");
                return;
              }
            }
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) await loadProfile(authUser);
            router.refresh();
            toast.success("Welcome to Hano Insiders!");
            router.replace("/dashboard");
            return;
          }
          data = retryData;
        }

        if (data.code === "not_paid") {
          setEligibility("not_paid");
          setFormError("Please use the same email address you used during payment.");
        } else if (data.code === "pending_crypto_review") {
          setEligibility("pending_crypto_review");
          setFormError("Your payment has not been verified yet. Please wait for admin approval or contact support.");
        } else if (data.code === "already_registered") {
          setEligibility("already_registered");
          setFormError("This paid email already has an account. Please log in instead.");
        } else if (data.code === "server_config") {
          setFormError("Registration is temporarily unavailable. Please contact support.");
        } else {
          setFormError(data.error || "Registration failed. Please try again.");
        }
        setIsSubmitting(false);
        return;
      }

      if (!data.sessionEstablished) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) {
          toast.success("Account created! Please sign in with your new password.");
          router.replace("/login");
          return;
        }
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) await loadProfile(authUser);
      router.refresh();

      toast.success("Welcome to Hano Insiders!");
      router.replace("/dashboard");
    } catch (error) {
      console.error("[register] unexpected error:", error);
      setFormError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
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

          <div className="mb-5">
            <h1 className="font-display text-3xl">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">Final step — set up your login to access the dashboard.</p>
          </div>

          {/* Same-email notice */}
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-200/90">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              You must register with the <strong>same email address</strong> you used during payment.
            </p>
          </div>

          {eligibility === "already_registered" && (
            <div className="mb-5 flex items-start gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-3 text-xs text-blue-200/90">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                This paid email already has an account.{" "}
                <Link href="/login" className="underline font-medium">Log in instead</Link>.
              </p>
            </div>
          )}

          <form onSubmit={handleRegister} noValidate className="space-y-4">
            <div>
              <label htmlFor="reg-email" className="text-xs font-medium text-muted-foreground">Email address</label>
              <div className="relative">
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); setFormError(null); }}
                  autoComplete="email"
                  className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 pr-10 text-sm bg-background/80 focus:outline-none focus:ring-2 transition ${
                    fieldErrors.email || eligibility === "not_paid" ? "border-destructive focus:ring-destructive/30" : "border-border/80 focus:ring-ring/40 focus:border-ring"
                  }`}
                  placeholder="you@example.com"
                />
                {eligibility === "checking" || eligibility === "confirming_payment" ? (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : null}
                {eligibility === "eligible" && <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />}
              </div>
              {fieldErrors.email && <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>}
              {!fieldErrors.email && eligibility === "not_paid" && (
                <p className="mt-1 text-xs text-destructive">Please use the same email address you used during payment.</p>
              )}
              {!fieldErrors.email && eligibility === "pending_crypto_review" && (
                <p className="mt-1 text-xs text-amber-400">Your payment has not been verified yet. Please wait for admin approval or contact support.</p>
              )}
              {!fieldErrors.email && eligibility === "confirming_payment" && (
                <p className="mt-1 text-xs text-muted-foreground">Confirming your payment…</p>
              )}
              {!fieldErrors.email && eligibility === "eligible" && (
                <p className="mt-1 text-xs text-emerald-400">Payment verified — you&apos;re good to go.</p>
              )}
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
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength ? strengthColor : "bg-border/40"}`} />
                    ))}
                  </div>
                  {strengthLabel && <p className="text-[11px] text-muted-foreground">{strengthLabel}</p>}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="reg-confirm" className="text-xs font-medium text-muted-foreground">Confirm password</label>
              <input
                id="reg-confirm"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((p) => ({ ...p, confirmPassword: undefined })); }}
                autoComplete="new-password"
                className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm bg-background/80 focus:outline-none focus:ring-2 transition ${
                  fieldErrors.confirmPassword ? "border-destructive focus:ring-destructive/30" : "border-border/80 focus:ring-ring/40 focus:border-ring"
                }`}
                placeholder="Re-enter your password"
              />
              {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || eligibility === "already_registered" || eligibility === "pending_crypto_review" || eligibility === "confirming_payment"}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-3 text-sm font-semibold hover:bg-foreground/90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_15px_-4px_rgba(255,255,255,0.2)]"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account & enter dashboard"}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Already registered?{" "}
              <Link href="/login" className="text-foreground hover:underline font-medium">Sign in</Link>
            </p>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" />
              <span>Secured by Supabase</span>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Haven&apos;t paid yet?{" "}
            <Link href="/#pricing" className="underline hover:text-foreground">Choose a plan</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-noise flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
