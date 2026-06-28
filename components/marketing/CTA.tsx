"use client";

import { useSectionScroll } from "./useSectionScroll";
import { useEarlyBirdAvailability } from "./useEarlyBirdAvailability";
import { EARLY_BIRD_MONTHLY_PRICE } from "@/lib/early-bird";

export function CTA() {
  const scrollToPricing = useSectionScroll("pricing");
  const availability = useEarlyBirdAvailability();
  const spotsLabel = availability
    ? availability.soldOut
      ? "Sold out"
      : String(availability.remaining)
    : "20";

  return (
    <section id="desk" className="landing-section">
      <div className="sec-head" data-m-reveal>
        <div className="eyebrow">
          <span>The desk</span>
          <span className="bar" />
          <span className="acc">Why members subscribe</span>
        </div>
        <h2>
          Stop guessing. Subscribe to{" "}
          <em>clarity.</em>
        </h2>
        <p className="sec-stand">
          Join the first wave of members and lock in ${EARLY_BIRD_MONTHLY_PRICE}/month for life
          at the founding rate. Your price holds until you cancel — just the desk,
          on your terms.
        </p>
      </div>

      <div className="record-totals m-stat-cards" style={{ marginBottom: 40 }} data-m-reveal data-m-reveal-delay="1">
        <div className="cell">
          <div className="lbl">Founding spots left</div>
          <div className="val acc">{spotsLabel}</div>
          <div className="sub">
            {availability?.soldOut
              ? "All founding memberships have been claimed."
              : "Limited founding memberships at the early bird rate."}
          </div>
        </div>
        <div className="cell">
          <div className="lbl">Updates</div>
          <div className="val acc">Weekly</div>
          <div className="sub">Insight briefs published every week, articles monthly.</div>
        </div>
        <div className="cell">
          <div className="lbl">Founding rate</div>
          <div className="val acc">${EARLY_BIRD_MONTHLY_PRICE}/mo</div>
          <div className="sub">Locked monthly rate for life. Cancel anytime.</div>
        </div>
      </div>

      <div className="cta-row" data-m-reveal data-m-reveal-delay="2">
        <button type="button" onClick={scrollToPricing} className="cta-primary">
          Join Insiders <span className="arr">→</span>
        </button>
        <button type="button" onClick={scrollToPricing} className="cta-secondary">
          View pricing details <span className="arr">→</span>
        </button>
      </div>
    </section>
  );
}
