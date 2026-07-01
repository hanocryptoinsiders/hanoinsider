"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "./Navbar";
import { Pricing } from "./Pricing";
import { BuyModal } from "./BuyModal";
import { PLANS, type PlanId } from "@/lib/payments";
import { useLandingMobileReveal } from "./useLandingMobileReveal";
import { Gift } from "lucide-react";

export function HanoPricing() {
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [referralActive, setReferralActive] = useState(false);

  useLandingMobileReveal();

  useEffect(() => {
    if (searchParams.get("checkout") === "cancelled") {
      toast.info("Checkout cancelled. You can pick a plan whenever you're ready.");
    }
  }, [searchParams]);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) {
      setReferralActive(false);
      return;
    }

    fetch(`/api/referrals/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referralCode: ref,
        landingPage: window.location.href,
        referrerUrl: document.referrer || null,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setReferralActive(Boolean(data.success && data.valid));
      })
      .catch(() => setReferralActive(false));
  }, [searchParams]);

  return (
    <div className="landing-root min-h-screen" style={{ background: "var(--bg)", color: "var(--fg)" }}>
      <Navbar />

      <main className="landing-main pt-24 sm:pt-28">
        {referralActive && (
          <div className="mx-auto max-w-3xl px-4 mb-8" data-m-reveal>
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5 text-sm text-emerald-100/90">
              <Gift className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <p>
                You are joining through a referral. After payment and registration, your 20% referral
                reward will appear in your referral profile.
              </p>
            </div>
          </div>
        )}

        <Pricing onBuy={(planId) => setSelectedPlan(planId)} />
      </main>

      <BuyModal
        plan={selectedPlan ? PLANS[selectedPlan] : null}
        onClose={() => setSelectedPlan(null)}
      />
    </div>
  );
}
