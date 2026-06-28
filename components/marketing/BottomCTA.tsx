"use client";

import Image from "next/image";
import { useSectionScroll } from "./useSectionScroll";

export function BottomCTA() {
  const scrollToPricing = useSectionScroll("pricing");

  return (
    <section className="bottom-cta-section" data-m-reveal>
      <div className="bottom-cta-inner">
        <div className="bottom-cta-content">
          <div className="bottom-cta-mascot bottom-cta-mascot--plain">
            <Image
              src="/assets/hanoinfrontend/mascot2.png"
              alt="Hano mascot"
              width={56}
              height={56}
              className="bottom-cta-mascot-img"
            />
          </div>
          <div className="bottom-cta-text">
            <h3 className="bottom-cta-headline">
              Be early. Be informed. Be unstoppable.
            </h3>
            <p className="bottom-cta-sub">
              Lock in the $50 lifetime rate and join the first wave of Hano Insiders members.
            </p>
          </div>
        </div>
        <button type="button" onClick={scrollToPricing} className="bottom-cta-btn cta-gradient">
          Join Now <span className="arr">→</span>
        </button>
      </div>
    </section>
  );
}
