"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";

const features = [
  "Full access to all insights and articles",
  "Market overview, coin pages, and charts",
  "Weekly insight briefs and monthly research",
  "Direct member support and affiliate tools",
];

export function Pricing({
  handleCheckout,
  isLoading,
  activePlan,
  userEmail,
}: {
  handleCheckout: (plan: string, offer?: string) => Promise<void>;
  isLoading: boolean;
  activePlan: string | null;
  userEmail: string | null;
}) {
  return (
    <section id="pricing" className="landing-section">
      <div className="sec-head" data-m-reveal>
        <div className="eyebrow">
          <span className="acc">Where the work lives</span>
        </div>
        <h2>
          When the free content <em>is not enough</em>, there is the desk.
        </h2>
        <p className="sec-stand">
          Choose the plan that fits. Early bird members lock in lifetime access
          before spots run out.
        </p>
      </div>

      <div className="pricing-grid m-pricing-stack" data-m-reveal data-m-reveal-delay="1">
        <article className="plan-card">
          <p className="plan-label">Regular</p>
          <div className="plan-price-row">
            <span className="plan-amount">$65–70</span>
            <span className="plan-unit">/ month</span>
          </div>
          <p className="plan-desc">
            Full desk access on a flexible monthly subscription. Cancel anytime.
          </p>
          <ul className="plan-features">
            {features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => handleCheckout("monthly")}
            disabled={isLoading}
            className="plan-cta plan-cta--ghost"
          >
            {isLoading && activePlan === "monthly" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Subscribe monthly <span className="arr">→</span>
          </button>
        </article>

        <article className="plan-card plan-card--featured">
          <div className="plan-card-bg" aria-hidden="true">
            <Image
              src="/assets/hanoinfrontend/earlyBird.png"
              alt=""
              width={380}
              height={380}
              className="plan-card-bg-img"
            />
          </div>
          <div className="plan-card-inner">
            <div className="plan-card-top">
              <p className="plan-label plan-label--accent">Early bird lifetime</p>
              <span className="plan-badge">Only 20 spots</span>
            </div>
            <div className="plan-price-row">
              <span className="plan-amount">$50</span>
              <span className="plan-unit">/ lifetime</span>
              <span className="plan-strike">$65–70/mo</span>
            </div>
            <p className="plan-desc">
              One payment, permanent access. Founding rate locked for life.
            </p>
            <ul className="plan-features">
              {features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => handleCheckout("monthly", "early_bird")}
              disabled={isLoading}
              className="plan-cta"
            >
              {isLoading && activePlan === "early_bird" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Join Insiders <span className="arr">→</span>
            </button>
          </div>
        </article>
      </div>

      <p className="pricing-disclaimer" data-m-reveal data-m-reveal-delay="2">
        Subscriptions are for educational research only. We do not provide
        personalized investment advice or recommendations to buy or sell any
        specific security or token.
      </p>

      <div className="pricing-aside" data-m-reveal data-m-reveal-delay="3">
        <div className="pricing-aside-copy">
          <span className="pricing-aside-tag">Prefer crypto payment?</span>
          <p className="pricing-aside-line">
            Manual crypto payments available.{" "}
            <em>Email the desk to arrange.</em>
          </p>
        </div>
        <a
          href={`mailto:hannah@hanoanimations.com?subject=Hano%20Insiders%20crypto%20payment&body=I%20would%20like%20to%20subscribe%20using%20crypto.%20Registered%20email:%20${encodeURIComponent(userEmail || "")}`}
          className="pricing-aside-link"
        >
          Email support <span className="arr">→</span>
        </a>
      </div>
    </section>
  );
}
