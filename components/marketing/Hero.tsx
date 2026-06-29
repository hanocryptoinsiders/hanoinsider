"use client";

import { BadgePercent, CircleCheck, LineChart, type LucideIcon } from "lucide-react";
import { useSectionScroll } from "./useSectionScroll";

const trustSignals: { label: string; icon: LucideIcon }[] = [
  { label: "Actionable Content", icon: CircleCheck },
  { label: "Market Analysis", icon: LineChart },
  { label: "Member Savings", icon: BadgePercent },
];

const HERO_BG_SRC = "/assets/hanoinfrontend/heroBgMain.png";

export function Hero() {
  const scrollToPricing = useSectionScroll("pricing");

  return (
    <section className="hero-section">
      <div className="hero-bg-video" aria-hidden="true">
        <img
          src={HERO_BG_SRC}
          alt=""
          width={1920}
          height={1080}
          className="hero-bg-video-el"
          fetchPriority="high"
        />
        <div className="hero-bg-video-overlay" />
      </div>

      <div className="hero-wide">
        <div className="eyebrow">
          <span className="pulse-dot" />
          <span className="acc">Welcome to Hano Insiders</span>
        </div>

        <h1 className="hero-headline">
          Insights that{" "}
          <em>move</em> the market.
        </h1>

        <p className="hero-stand">
          Clean, built-from-scratch intelligence, market analysis, and editorial research built for serious beginners who want{" "}
          <span className="acc">clarity without the chaos</span>.
          Not AI-generated. Hand-curated by the desk.
        </p>

        <div className="hero-trust-row">
          {trustSignals.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="hero-trust-item">
                <span className="hero-trust-icon">
                  <Icon size={14} strokeWidth={2} aria-hidden />
                </span>
                <span className="hero-trust-label">{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="cta-row">
          <button type="button" onClick={scrollToPricing} className="cta-primary cta-gradient">
            Start Your Edge <span className="arr">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
