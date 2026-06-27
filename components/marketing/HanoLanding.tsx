"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { HeroVideo } from "./HeroVideo";
import { Pricing } from "./Pricing";
import { BuyModal } from "./BuyModal";
import { PLANS, type PlanId } from "@/lib/payments";
import { useLandingMobileReveal } from "./useLandingMobileReveal";

export function HanoLanding() {
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);

  useLandingMobileReveal();

  // Show a clear message if the user returned from a cancelled checkout.
  useEffect(() => {
    if (searchParams.get("checkout") === "cancelled") {
      toast.info("Checkout cancelled. You can pick a plan whenever you're ready.");
    }
  }, [searchParams]);

  // Smooth-scroll to pricing when redirected back with ?renew=1.
  useEffect(() => {
    if (searchParams.get("renew") === "1" || searchParams.get("checkout") === "cancelled") {
      const timer = setTimeout(() => {
        document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div className="landing-root min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      <Navbar />

      <main className="landing-main">
        <Hero />
        <HeroVideo />
        <Pricing onBuy={(planId) => setSelectedPlan(planId)} />
      </main>

      <BuyModal
        plan={selectedPlan ? PLANS[selectedPlan] : null}
        onClose={() => setSelectedPlan(null)}
      />
    </div>
  );
}
