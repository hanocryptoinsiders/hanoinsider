"use client";

import Image from "next/image";
import { BadgePercent, CircleCheck, LineChart, type LucideIcon } from "lucide-react";
import { useSectionScroll } from "./useSectionScroll";

const trustSignals: { label: string; icon: LucideIcon }[] = [
  { label: "Actionable Content", icon: CircleCheck },
  { label: "Market Analysis", icon: LineChart },
  { label: "Member Savings", icon: BadgePercent },
];

const memberAvatars = [
  {
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&h=96&q=80",
    alt: "Hano Insiders member",
  },
  {
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&h=96&q=80",
    alt: "Hano Insiders member",
  },
  {
    src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=96&h=96&q=80",
    alt: "Hano Insiders member",
  },
  {
    src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=96&h=96&q=80",
    alt: "Hano Insiders member",
  },
];

const HERO_CHART_SRC = "/assets/hanoinfrontend/heroRight.png";

export function Hero() {
  const scrollToPricing = useSectionScroll("pricing");

  return (
    <section className="hero-section">
      <div className="hero-wide">
        <div className="eyebrow">
          <span className="pulse-dot" />
          <span className="acc">Welcome to Hano Insiders</span>
        </div>

        <h1 className="hero-headline">
          Insights that{" "}
          <em>move</em> the market.
        </h1>

        <div className="hero-chart-mobile" aria-hidden="true">
          <Image
            src={HERO_CHART_SRC}
            alt=""
            width={1200}
            height={600}
            priority
            className="hero-chart-img"
          />
        </div>

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

      <div className="hero-chart" aria-hidden="true">
        <Image
          src={HERO_CHART_SRC}
          alt=""
          width={1200}
          height={600}
          priority
          className="hero-chart-img"
        />
      </div>
    </section>
  );
}
