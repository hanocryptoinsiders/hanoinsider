"use client";

import { useEffect, useRef } from "react";
import { BadgePercent, CircleCheck, LineChart, type LucideIcon } from "lucide-react";
import { useSectionScroll } from "./useSectionScroll";

const trustSignals: { label: string; icon: LucideIcon }[] = [
  { label: "Actionable Content", icon: CircleCheck },
  { label: "Market Analysis", icon: LineChart },
  { label: "Member Savings", icon: BadgePercent },
];

const HERO_CHART_VIDEO_SRC = "/assets/hanoinfrontend/Chart.mp4";

export function Hero() {
  const scrollToPricing = useSectionScroll("pricing");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.muted = true;
      void video.play().catch(() => undefined);
    };

    tryPlay();
    video.addEventListener("canplay", tryPlay);
    return () => video.removeEventListener("canplay", tryPlay);
  }, []);

  return (
    <section className="hero-section">
      <div className="hero-bg-video" aria-hidden="true">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          src={HERO_CHART_VIDEO_SRC}
          width={1920}
          height={1080}
          className="hero-bg-video-el"
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
