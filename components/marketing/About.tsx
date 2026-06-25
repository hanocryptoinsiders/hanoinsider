"use client";

import { useStickyPin } from "./useStickyPin";

export function About() {
  const { leftRef, pinWrapRef } = useStickyPin();

  return (
    <section id="about" className="landing-section">
      <div className="sec-head" data-m-reveal>
        <div className="eyebrow">
          <span>The edge</span>
          <span className="bar" />
          <span>Why clarity wins in crypto</span>
        </div>
        <h2>
          AI replaced the code.{" "}
          <em>It cannot replace the context.</em>
        </h2>
        <p className="sec-stand">
          Signal groups sell hype. AI can summarize headlines. Neither can
          replace ten years of watching capital rotate through the same
          cycles. The desk delivers the context the tools cannot.
        </p>
      </div>

      <div className="argument argument--pin">
        <div ref={leftRef} className="arg-text arg-text--scroll">
          <p>
            Every bull market creates the same pattern.{" "}
            <strong>Signal groups</strong> multiply, anonymous accounts sell
            calls, and beginners chase narratives they do not understand.
            Most of them lose money — not because crypto is broken, but
            because <span className="acc">they never had context.</span>
          </p>
          <p>
            Hano Insiders was built to solve that. A{" "}
            <strong>premium intelligence desk</strong> that gives members
            curated market overviews, coin-level research, educational
            insights, and short analysis — written for comprehension, not
            clicks.
          </p>
          <p>
            No signals language. No trading-room noise. No anonymous calls.
            Just a clean dashboard with{" "}
            <strong>50+ assets tracked</strong>, weekly insight briefs,
            monthly research articles, and direct member support.{" "}
            <span className="acc">
              Clarity is the edge most beginners never get.
            </span>
          </p>
          <p>
            The information overload is real. Thousands of tokens, hundreds of
            narratives, and an endless feed of takes from people who have
            never sized a position or read a balance sheet.{" "}
            <strong>Retail traders drown in data</strong> but starve for
            structure — and structure is what separates conviction from
            panic. <span className="acc">The desk filters the noise down to what matters.</span>
          </p>
          <p>
            Institutions do not trade on Twitter threads. They trade on
            research desks, risk frameworks, and repeatable process. Hano
            Insiders brings that same discipline to serious beginners:{" "}
            <strong>curated coverage</strong>, timestamped analysis, and a
            dashboard built for reading — not reacting. When the market moves,
            you already know <span className="acc">why it moved and what to watch next.</span>
          </p>
        </div>

        <div ref={pinWrapRef} className="arg-side-pin-wrap" data-m-reveal data-m-reveal-delay="2">
          <aside className="arg-side arg-side--pin m-card-panel">
            <h3>The desk, in numbers</h3>
            <div className="ledger-row">
              <span className="lbl">Assets tracked</span>
              <span className="val acc">50+</span>
            </div>
            <div className="ledger-row">
              <span className="lbl">Insight briefs</span>
              <span className="val acc">Weekly</span>
            </div>
            <div className="ledger-row">
              <span className="lbl">Research articles</span>
              <span className="val">Monthly</span>
            </div>
            <div className="ledger-row">
              <span className="lbl">Member access</span>
              <span className="val acc">24/7</span>
            </div>
            <div className="ledger-row">
              <span className="lbl">Affiliate program</span>
              <span className="val">Active</span>
            </div>
            <div className="ledger-row">
              <span className="lbl">Direct support</span>
              <span className="val acc">Members</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
