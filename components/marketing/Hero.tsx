"use client";

import Link from "next/link";
import { BadgePercent, CircleCheck, LineChart, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { useSectionScroll } from "./useSectionScroll";

const trustSignals: { label: string; icon: LucideIcon }[] = [
  { label: "Actionable Content", icon: CircleCheck },
  { label: "Market Analysis", icon: LineChart },
  { label: "Member Savings", icon: BadgePercent },
];

const HERO_BG_DESKTOP = "/assets/hanoinfrontend/heroBgMain.png";
const HERO_BG_MOBILE = "/assets/hanoinfrontend/heroBgMainM.png";

export function Hero() {
  const scrollToPricing = useSectionScroll("pricing");

  return (
    <section className="hero-section">
      <div className="hero-bg-video" aria-hidden="true">
        <picture>
          <source media="(max-width: 767px)" srcSet={HERO_BG_MOBILE} />
          <img
            src={HERO_BG_DESKTOP}
            alt=""
            width={1920}
            height={1080}
            className="hero-bg-video-el"
            fetchPriority="high"
          />
        </picture>
        <div className="hero-bg-video-overlay" />
      </div>

      <div className="hero-wide">
        <Link href="/" className="hero-logo-link" aria-label="Hano Insiders home">
          <LogoMark size={56} priority className="hero-logo-mark" />
        </Link>

        <div className="eyebrow">
          <span className="pulse-dot" />
          <span className="acc">Welcome to Hano Insiders</span>
        </div>

        <h1 className="hero-headline">
          Insights that <span className="hero-headline-mark">move the market.</span>
        </h1>

        <p className="hero-stand">
          Clean, built-from-scratch intelligence, market analysis, and editorial research built for serious beginners who want{" "}
          <span className="hero-stand-u">clarity without the chaos</span>.
          Not AI-generated. <span className="acc">Hand-curated by the desk</span>.
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
          <button type="button" onClick={scrollToPricing} className="cta-primary cta-gradient hero-cta-primary">
            Join The Club <span className="arr">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
