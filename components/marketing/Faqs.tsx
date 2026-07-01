"use client";

import { useState } from "react";

const items = [
  {
    q: "What is Hano Insiders?",
    a: "Hano Insiders is a premium crypto intelligence desk built for serious beginners. Members get curated market overviews, in-depth research articles, weekly insight briefs, 50+ asset profiles, direct support, and referral rewards.",
  },
  {
    q: "Is this a signals group?",
    a: "No. Hano Insiders does not provide buy or sell signals. The product is focused on education and market analysis — context that helps you understand what is happening and why.",
  },
  {
    q: "What do members get?",
    a: "Members get full dashboard access including market overview, 50+ coin pages, weekly insight briefs, monthly research articles, direct support, and a referral program with USDC rewards on Base.",
  },
  {
    q: "Is this financial advice?",
    a: "No. All content is educational and analytical in nature. Nothing on this platform constitutes financial advice. Crypto involves substantial risk of loss.",
  },
  {
    q: "How does the early bird offer work?",
    a: "The first 20 founding members lock in $49/month for life — your rate holds until you cancel. Once all founding spots are claimed, new members join at the regular $79/month rate.",
  },
  {
    q: "What do I need to get started?",
    a: "Create an account, choose your plan, and gain immediate access to the full intelligence desk. No drip-feed, no gated tiers — everything from day one.",
  },
];

export function Faqs() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faqs" className="landing-section">
      <div className="faqs-head" data-m-reveal>
        <h2 className="faqs-title">
          Common questions, answered clearly.
        </h2>
      </div>

      <div className="faqs-grid" data-m-reveal data-m-reveal-delay="1">
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
    </section>
  );
}
