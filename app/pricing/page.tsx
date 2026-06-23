"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, CreditCard, Loader2, Mail, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-context";

const features = [
  "Dashboard, Market Overview, Insights, Articles, Affiliate, Support, and Settings",
  "Top coins list, dominance, volume, sentiment, RSI context, and top movers",
  "Educational long-form insights and short market analysis articles",
  "Personal referral link with a 10% discount path for invited friends",
  "Support at hannah@hanoanimations.com",
];

export default function Pricing() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const { user, grantPremium } = useAuth();
  const router = useRouter();

  const checkAndRecover = useCallback(async () => {
    try {
      const raw = localStorage.getItem("hano_checkout");
      if (!raw) return;
      const checkout = JSON.parse(raw);
      if (Date.now() - (checkout.timestamp || 0) > 15 * 60 * 1000) {
        localStorage.removeItem("hano_checkout");
        return;
      }
      setIsRecovering(true);
      const res = await fetch("/api/stripe/check-status");
      const data = await res.json();
      if (data.isPremium) {
        localStorage.removeItem("hano_checkout");
        grantPremium();
        toast.success("Payment verified. Welcome to Hano Insiders.");
        router.push("/dashboard");
      } else {
        setIsRecovering(false);
      }
    } catch {
      setIsRecovering(false);
    }
  }, [grantPremium, router]);

  useEffect(() => {
    checkAndRecover();
    const handleVisibility = () => document.visibilityState === "visible" && checkAndRecover();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [checkAndRecover]);

  const handleCheckout = useCallback(async () => {
    if (!user) {
      router.push("/login?next=/pricing");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "monthly", offer: "early_bird" }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Failed to create checkout session");

      localStorage.setItem("hano_checkout", JSON.stringify({ provider: "stripe", timestamp: Date.now() }));
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      localStorage.removeItem("hano_checkout");
      setIsLoading(false);
    }
  }, [user, router]);

  if (isRecovering) {
    return <div className="flex min-h-screen items-center justify-center bg-noise text-foreground"><Loader2 className="h-8 w-8 animate-spin text-violet-300" /></div>;
  }

  return (
    <div className="min-h-screen bg-noise text-foreground">
      <Header />
      <main className="mx-auto max-w-[1180px] px-4 py-14 sm:px-6 sm:py-20">
        <section className="text-center">
          <p className="text-[11px] uppercase tracking-[0.34em] text-violet-200">Membership</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Premium access, clearly priced.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Subscribe to unlock the Hano Insiders dashboard. Member content is educational market analysis only, not financial advice.
          </p>
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <div className="panel-elevated p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-violet-200">Early Bird</p>
                <h2 className="mt-3 text-3xl font-semibold">$50/month lifetime rate</h2>
                <p className="mt-2 text-sm text-muted-foreground">For the first 20 members. Regular membership is planned at $65-70/month.</p>
              </div>
              <span className="rounded-md border border-violet-300/30 bg-violet-400/10 px-3 py-1 text-xs text-violet-100">First 20 members</span>
            </div>
            <ul className="mt-7 grid gap-3">
              {features.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm text-foreground/90"><Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /> {feature}</li>
              ))}
            </ul>
            <button onClick={handleCheckout} disabled={isLoading} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg hano-gradient px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Pay by card <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-5">
            <div className="panel p-6">
              <Wallet className="h-5 w-5 text-violet-300" />
              <h3 className="mt-4 text-xl font-semibold">Manual crypto payments</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Crypto payments are handled manually for launch. Email support with your account email to receive payment instructions. An admin must approve the payment and set your access dates.</p>
              <a href="mailto:hannah@hanoanimations.com?subject=Hano%20Insiders%20manual%20crypto%20payment" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold"><Mail className="h-4 w-4" /> Email support</a>
            </div>
            <div className="panel p-6">
              <ShieldCheck className="h-5 w-5 text-violet-300" />
              <h3 className="mt-4 text-xl font-semibold">Access rule</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Logged-out visitors go to login. Logged-in unpaid or expired users return here. Active subscribers and admins can open the dashboard.</p>
            </div>
          </div>
        </section>

        <p className="mt-8 rounded-lg border border-white/10 bg-black/20 p-4 text-xs leading-relaxed text-muted-foreground">
          Hano Insiders provides educational content and market analysis only. Nothing on this platform is financial advice.
        </p>
      </main>
      <PricingFooter />
    </div>
  );
}

function PricingFooter() {
  return (
    <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
      Copyright 2026 Hano Insiders. Educational content and market analysis only.
    </footer>
  );
}
