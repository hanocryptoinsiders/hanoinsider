"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Loader2,
  X,
  CreditCard,
  Bitcoin,
  ShieldCheck,
  ArrowLeft,
  Lock,
} from "lucide-react";
import type { PlanConfig } from "@/lib/payments";
import { isValidEmail } from "@/lib/payments";

type Step = "details" | "method";

export function BuyModal({
  plan,
  onClose,
}: {
  plan: PlanConfig | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; email?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => setMounted(true), []);

  // Reset state whenever a new plan is opened.
  useEffect(() => {
    if (plan) {
      setStep("details");
      setErrors({});
      setIsSubmitting(false);
    }
  }, [plan]);

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!plan) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [plan, isSubmitting, onClose]);

  if (!mounted || !plan) return null;

  const validateDetails = () => {
    const next: typeof errors = {};
    if (!firstName.trim()) next.firstName = "Required";
    if (!lastName.trim()) next.lastName = "Required";
    if (!email.trim()) next.email = "Required";
    else if (!isValidEmail(email.trim())) next.email = "Enter a valid email";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateDetails()) setStep("method");
  };

  const handleNormalPayment = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          planId: plan.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Failed to start checkout");
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  };

  const inputBase =
    "mt-1.5 w-full rounded-lg border bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 transition";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => !isSubmitting && onClose()}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d10] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
        {/* Accent header */}
        <div className="relative border-b border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent px-6 py-5">
          <button
            onClick={() => !isSubmitting && onClose()}
            className="absolute right-4 top-4 text-white/40 transition hover:text-white disabled:opacity-30"
            disabled={isSubmitting}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            {step === "details" ? "Step 1 of 2 · Your details" : "Step 2 of 2 · Payment"}
          </p>
          <h2 className="mt-1 font-display text-2xl text-white">{plan.name}</h2>
          <p className="mt-0.5 text-sm text-white/50">{plan.priceLabel}</p>
        </div>

        <div className="px-6 py-6">
          {step === "details" ? (
            <form onSubmit={handleContinue} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-white/60">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setErrors((p) => ({ ...p, firstName: undefined })); }}
                    autoComplete="given-name"
                    className={`${inputBase} ${errors.firstName ? "border-red-500/70 focus:ring-red-500/30" : "border-white/10 focus:ring-white/20"}`}
                    placeholder="Alex"
                  />
                  {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-white/60">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); setErrors((p) => ({ ...p, lastName: undefined })); }}
                    autoComplete="family-name"
                    className={`${inputBase} ${errors.lastName ? "border-red-500/70 focus:ring-red-500/30" : "border-white/10 focus:ring-white/20"}`}
                    placeholder="Johnson"
                  />
                  {errors.lastName && <p className="mt-1 text-xs text-red-400">{errors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-white/60">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                  autoComplete="email"
                  className={`${inputBase} ${errors.email ? "border-red-500/70 focus:ring-red-500/30" : "border-white/10 focus:ring-white/20"}`}
                  placeholder="you@example.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-white/40">
                  <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                  Use this email at checkout and when you create your account — they must match.
                </p>
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-white py-3 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.99]"
              >
                Continue to payment
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setStep("details")}
                disabled={isSubmitting}
                className="mb-1 flex items-center gap-1 text-xs text-white/50 transition hover:text-white disabled:opacity-40"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Edit details
              </button>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white/50">
                Paying as <span className="text-white/80">{firstName} {lastName}</span> ·{" "}
                <span className="text-white/80">{email}</span>
              </div>

              {/* Normal payment */}
              <button
                onClick={handleNormalPayment}
                disabled={isSubmitting}
                className="group flex w-full items-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-4 text-left transition hover:border-white/30 hover:bg-white/[0.07] disabled:opacity-60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-white">Card / Normal payment</span>
                  <span className="block text-xs text-white/45">Secure checkout via Stripe — cards & more</span>
                </span>
                <span className="text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/60">→</span>
              </button>

              {/* Crypto payment — shown but not yet available */}
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 text-left opacity-70"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white/50">
                  <Bitcoin className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-white/70">Crypto payment</span>
                  <span className="block text-xs text-white/35">USDT / USDC and more</span>
                </span>
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
                  Soon
                </span>
              </button>

              <p className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-white/35">
                <ShieldCheck className="h-3 w-3" /> Payments are processed securely by Stripe.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
