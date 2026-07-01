"use client";

import { useSectionScroll } from "./useSectionScroll";

const contentTags = [
  "Dashboard", "Market overview", "Insights", "Articles", "Referrals",
  "Coin pages", "Charts", "Weekly briefs", "Research reports",
  "Direct support", "Settings",
];

export function About() {
  const scrollToPricing = useSectionScroll("pricing");

  return (
    <section id="about" className="landing-section">
      <div className="about-layout">
        <div className="about-left" data-m-reveal>
          <div className="eyebrow">
            <span className="pulse-dot" />
            <span className="acc">About the desk</span>
          </div>
          <h2 className="about-title">
            Built for serious beginners who want clarity, not chaos.
          </h2>
          <p className="about-desc">
            Hano Insiders gives members curated market overviews, coin-level research,
            educational insights, and short analysis — written for comprehension, not clicks.
            No signals. No anonymous calls. Just structured intelligence.
          </p>
          <div className="about-cta-row">
            <button type="button" onClick={scrollToPricing} className="cta-primary">
              Start Your Edge <span className="arr">→</span>
            </button>
          </div>
        </div>

        <div className="about-right" data-m-reveal data-m-reveal-delay="1">
          <div className="about-tags">
            {contentTags.map((tag) => (
              <span key={tag} className="about-tag">{tag}</span>
            ))}
          </div>
          <div className="about-coverage">
            <div className="about-coverage-item">
              <span className="about-coverage-label">Coverage</span>
              <span className="about-coverage-val">50+ assets tracked</span>
            </div>
            <div className="about-coverage-item">
              <span className="about-coverage-label">Updates</span>
              <span className="about-coverage-val">Weekly briefs + monthly reports</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
