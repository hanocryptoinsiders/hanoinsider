"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { Pricing } from "./Pricing";
import { Features } from "./Features";
import { About } from "./About";
import { Faqs } from "./Faqs";
import { BottomCTA } from "./BottomCTA";
import { useLandingMobileReveal } from "./useLandingMobileReveal";

export function HanoLanding() {
  const { user, grantPremium, isPremium } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSticky, setShowSticky] = useState(false);

  useLandingMobileReveal();

  useEffect(() => {
    const isSuccess = searchParams.get("checkout") === "success" || searchParams.get("session_id");
    const hasCheckoutKey = typeof window !== "undefined" && localStorage.getItem("hano_checkout");

    if (isSuccess || hasCheckoutKey) {
      setIsVerifying(true);
      let attempts = 0;
      const poll = setInterval(async () => {
        try {
          const res = await fetch("/api/stripe/check-status");
          const data = await res.json();
          attempts++;

          if (data.isPremium) {
            clearInterval(poll);
            if (typeof window !== "undefined") {
              localStorage.removeItem("hano_checkout");
            }
            grantPremium();
            toast.success("Payment verified! Welcome to Hano Insiders.");
            setIsVerifying(false);
            router.push("/dashboard");
          } else if (attempts >= 15) {
            clearInterval(poll);
            setIsVerifying(false);
            toast.error("Payment verification is taking longer than expected. Please refresh this page.");
          }
        } catch (err) {
          console.error("Verification poll error:", err);
        }
      }, 2000);

      return () => clearInterval(poll);
    }
  }, [searchParams, grantPremium, router]);

  useEffect(() => {
    if (searchParams.get("renew") === "1") {
      const timer = setTimeout(() => {
        const pricingSection = document.getElementById("pricing");
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    let ticking = false;
    function syncSticky() {
      const hero = document.querySelector(".hero-section");
      const door = document.querySelector(".pricing-grid");
      if (!hero) return;
      const heroBottom = hero.getBoundingClientRect().bottom;
      const doorTop = door ? door.getBoundingClientRect().top : Infinity;
      const showAfterHero = heroBottom < 80;
      const hideNearDoor = doorTop < window.innerHeight - 80;
      setShowSticky(showAfterHero && !hideNearDoor);
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(syncSticky);
        ticking = true;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    syncSticky();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const handleCheckout = async (plan: string, offer?: string) => {
    if (!user) {
      router.push(`/register?next=${encodeURIComponent("/?renew=1")}`);
      return;
    }

    setIsLoading(true);
    setActivePlan(offer === "early_bird" ? "early_bird" : "monthly");

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, offer }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Failed to create checkout session");

      if (typeof window !== "undefined") {
        localStorage.setItem("hano_checkout", JSON.stringify({ provider: "stripe", timestamp: Date.now() }));
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      if (typeof window !== "undefined") {
        localStorage.removeItem("hano_checkout");
      }
      setIsLoading(false);
      setActivePlan(null);
    }
  };

  return (
    <div className="landing-root min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      {isVerifying && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: "var(--accent-soft)" }} />
          <h2 className="mt-5" style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: "-.04em" }}>
            Verifying payment
          </h2>
          <p className="mt-2" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", letterSpacing: ".05em" }}>
            Confirming your premium credentials with Stripe.
          </p>
        </div>
      )}

      <Navbar />

      {user && !isPremium && (
        <div className="editorial-container" style={{ marginTop: 16 }}>
          <div
            style={{
              border: "1px solid var(--border)",
              padding: "14px 20px",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: ".05em",
              color: "var(--fg-3)",
            }}
          >
            <span style={{ color: "var(--accent-soft)", marginRight: 8, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", fontSize: 10 }}>
              Notice
            </span>
            Active subscription required to access the dashboard. Select a plan below to subscribe.
          </div>
        </div>
      )}

      <main className="landing-main">
        <Hero />
        <Pricing
          handleCheckout={handleCheckout}
          isLoading={isLoading}
          activePlan={activePlan}
          userEmail={user?.email || null}
        />
        <Features />
        <About />
        <Faqs />
        <BottomCTA />
      </main>

      <footer className="landing-footer">
        <div className="footer-l">
          <div className="footer-mark">
            <span className="acc">Hano</span> Insiders · Research
          </div>
          <div className="footer-legal">
            This content is for informational and educational purposes only
            and does not constitute investment, financial, or trading
            advice. Crypto involves substantial risk of loss. Past
            performance is not indicative of future results.
          </div>
        </div>
        <div className="footer-r">
          <a href="/register">Join Insiders</a>
          <a href="/login">Sign In</a>
          <a href="#about">About</a>
          <a href="#faqs">FAQ</a>
        </div>
      </footer>

      <div
        className={`sticky-cta ${showSticky ? "show" : ""}`}
        aria-hidden={!showSticky}
      >
        <div className="sc-l">
          <span className="sc-price">Hano Insiders · $50 lifetime</span>
          <span className="sc-meta">Early bird · founding rate</span>
        </div>
        <a href="/register" className="sc-cta">
          Join <span>→</span>
        </a>
      </div>
    </div>
  );
}
