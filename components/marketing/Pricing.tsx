"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { PaymentMethodsTicker } from "./PaymentMethodsTicker";
import { useEarlyBirdAvailability } from "./useEarlyBirdAvailability";
import {
  EARLY_BIRD_LIMIT,
  EARLY_BIRD_MONTHLY_PRICE,
  REGULAR_MONTHLY_PRICE,
  formatEarlyBirdSpotLabel,
} from "@/lib/early-bird";
import type { PlanId } from "@/lib/payments";

const features = [
  "Full access to all insights and articles",
  "Market overview, coin pages, and charts",
  "Weekly insight briefs and monthly research",
  "Direct member support and affiliate tools",
];

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date();
    target.setDate(target.getDate() + 19);
    target.setHours(23, 59, 59, 999);

    function calc() {
      const now = new Date().getTime();
      const diff = target.getTime() - now;
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    }

    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, []);

  return timeLeft;
}

export function Pricing({
  onBuy,
}: {
  onBuy: (planId: PlanId) => void;
}) {
  const countdown = useCountdown();
  const availability = useEarlyBirdAvailability();
  const soldOut = availability?.soldOut ?? false;
  const spotLabel = availability
    ? formatEarlyBirdSpotLabel(availability)
    : `${EARLY_BIRD_LIMIT} founding spots`;

  return (
    <section id="pricing" className="landing-section">
      <div className="pricing-header" data-m-reveal>
        <div className="eyebrow">
          <span className="pulse-dot" />
          <span className="acc">
            {soldOut ? "Founding rate closed" : "Early bird offer"}
          </span>
        </div>
        <h2 className="pricing-title">
          {soldOut ? "Founding Rate Sold Out" : "Early Bird Founding Rate"}
        </h2>
        <p className="pricing-subtitle">
          {soldOut ? (
            <>
              All {EARLY_BIRD_LIMIT} founding memberships have been claimed.
              Join on the regular plan at ${REGULAR_MONTHLY_PRICE}/month.
            </>
          ) : (
            <>
              The first {EARLY_BIRD_LIMIT} members lock in ${EARLY_BIRD_MONTHLY_PRICE}/month for life.
              Your rate holds until you cancel — then it&apos;s gone for good.
            </>
          )}
        </p>
      </div>

      <div className="pricing-countdown" data-m-reveal data-m-reveal-delay="1">
        {[
          { val: countdown.days, label: "Days" },
          { val: countdown.hours, label: "Hours" },
          { val: countdown.minutes, label: "Min" },
          { val: countdown.seconds, label: "Sec" },
        ].map((item) => (
          <div key={item.label} className="countdown-cell">
            <span className="countdown-val">{String(item.val).padStart(2, "0")}</span>
            <span className="countdown-label">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="pricing-grid m-pricing-stack" data-m-reveal data-m-reveal-delay="2">
        <article className="plan-card">
          <p className="plan-label">Regular Plan</p>
          <div className="plan-price-row">
            <span className="plan-amount">${REGULAR_MONTHLY_PRICE}</span>
            <span className="plan-unit">/ month</span>
          </div>
          <ul className="plan-features">
            {features.map((f) => (
              <li key={f}>{f}</li>
            ))}
            <li>Cancel anytime</li>
          </ul>
          <button
            type="button"
            onClick={() => onBuy("regular")}
            className="plan-cta plan-cta--ghost"
          >
            Buy Now <span className="arr">→</span>
          </button>
        </article>

        <article className={`plan-card plan-card--featured plan-card--glow${soldOut ? " plan-card--sold-out" : ""}`}>
          <div className="plan-card-badge-float">
            <span className={`plan-badge plan-badge--pill${soldOut ? " plan-badge--sold-out" : ""}`}>
              {spotLabel}
            </span>
          </div>
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
            <p className="plan-label plan-label--accent">Early Bird Founding</p>
            <div className="plan-price-row">
              <span className="plan-amount">${EARLY_BIRD_MONTHLY_PRICE}</span>
              <span className="plan-unit">/ month for life</span>
              <span className="plan-strike">${REGULAR_MONTHLY_PRICE}/mo</span>
            </div>
            <ul className="plan-features">
              {features.map((f) => (
                <li key={f}>{f}</li>
              ))}
              <li>Price locked at ${EARLY_BIRD_MONTHLY_PRICE}/mo until you cancel</li>
            </ul>
            <button
              type="button"
              onClick={() => onBuy("early_bird")}
              className="plan-cta cta-gradient"
              disabled={soldOut}
            >
              {soldOut ? "Founding Rate Sold Out" : "Claim Founding Rate"} <span className="arr">→</span>
            </button>
          </div>
        </article>
      </div>

      <PaymentMethodsTicker />
    </section>
  );
}
