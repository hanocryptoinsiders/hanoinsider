"use client";

import { useState } from "react";

const items = [
  {
    q: "Who is Hano Insiders for?",
    a: "It is built for serious beginners who want curated crypto intelligence, educational explainers, and premium member-only market context. If you are tired of signal groups and anonymous calls, the desk is built for you.",
  },
  {
    q: "Is this a signals group?",
    a: "No. Hano Insiders does not provide buy or sell signals. The product is focused on education and market analysis — context that helps you understand what is happening and why.",
  },
  {
    q: "What do members get?",
    a: "Members get full dashboard access including market overview, 50+ coin pages, weekly insight briefs, monthly research articles, direct support, and affiliate referral tools.",
  },
  {
    q: "Is this financial advice?",
    a: "No. All content is educational and analytical in nature. Nothing on this platform constitutes financial advice. Crypto involves substantial risk of loss.",
  },
  {
    q: "How does the early bird offer work?",
    a: "The first 20 founding members lock in lifetime access for a one-time payment of $50. No monthly renewals, no price increases. Once spots fill, pricing moves to the regular monthly rate.",
  },
];

export function Faqs() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faqs" className="landing-section">
      <div className="faq-layout">
        <div className="faq-intro" data-m-reveal>
          <div className="eyebrow">
            <span>FAQ</span>
            <span className="bar" />
            <span>Common questions</span>
          </div>
          <h2>
            Questions, answered{" "}
            <em>clearly.</em>
          </h2>
          <p className="sec-stand">
            Hano Insiders provides educational content and market analysis only.
            Nothing on this platform is financial advice.
          </p>
        </div>

        <div className="faq-list" data-m-reveal data-m-reveal-delay="1">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.q} className="faq-item">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="faq-btn"
                >
                  <span className="faq-q">{item.q}</span>
                  <span className={`faq-icon ${isOpen ? "open" : ""}`}>+</span>
                </button>
                {isOpen && <p className="faq-answer">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
