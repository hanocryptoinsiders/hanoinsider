"use client";

import { useStickyPin } from "./useStickyPin";

const feedItems = [
  {
    time: "14:32 UTC",
    category: "Macro",
    headline:
      "Bitcoin holds above key structural level as ETF flows stabilize",
  },
  {
    time: "11:08 UTC",
    category: "On-Chain",
    headline:
      "Exchange outflows suggest accumulation phase deepening",
  },
  {
    time: "09:45 UTC",
    category: "Sector",
    headline:
      "Layer-2 activity metrics show quiet consolidation before next move",
  },
  {
    time: "Yesterday",
    category: "Research",
    headline:
      "The Institutions Are Coming to Crypto — full report published",
  },
];

export function DashboardPreview() {
  const { leftRef, pinWrapRef } = useStickyPin();

  return (
    <section id="platform" className="landing-section">
      <div className="sec-head" data-m-reveal>
        <div className="eyebrow">
          <span>The platform</span>
          <span className="bar" />
          <span>A clean intelligence dashboard</span>
        </div>
        <h2>
          Your research desk,{" "}
          <em>always on.</em>
        </h2>
        <p className="sec-stand">
          A data-forward dashboard designed for reading and research — not
          for chart-staring or signal-chasing.
        </p>
      </div>

      <div className="argument argument--pin">
        <div ref={leftRef} className="arg-text arg-text--scroll">
          <p>
            The dashboard surfaces what matters.{" "}
            <strong>Market snapshots</strong> with real-time data,
            sector rotation context, and the metrics that actually move
            prices — curated daily by the desk.
          </p>
          <p>
            Every article, insight brief, and coin profile is written for{" "}
            <strong>comprehension</strong>. No jargon walls. No
            assumption that you already know what a funding rate is.{" "}
            <span className="acc">
              The desk meets you where you are.
            </span>
          </p>
          <p>
            New members get immediate access to the full archive —
            every published insight, article, and market note from day
            one. <strong>No drip-feed.</strong> No gated tiers.
            Everything, from the moment you join.
          </p>
          <p>
            Most dashboards are built for traders who already know what
            they are looking at. Ours is built for{" "}
            <strong>readers who want to learn</strong> — clean layouts,
            monospace data labels, and editorial hierarchy that guides
            your eye to what changed and why.{" "}
            <span className="acc">No clutter. No chart overload.</span>
          </p>
          <p>
            Coin pages go deeper than price. Each profile covers
            fundamentals, sector context, and the narrative around the
            asset — so when you open a position or form a view, you are
            working from <strong>structured research</strong>, not a
            screenshot someone posted in a Telegram group.{" "}
            <span className="acc">
              That is what a real desk looks like.
            </span>
          </p>
        </div>

        <div ref={pinWrapRef} className="arg-side-pin-wrap" data-m-reveal data-m-reveal-delay="2">
          <aside className="arg-side arg-side--pin m-card-panel">
            <h3>Research feed</h3>
            {feedItems.map((item) => (
              <article key={item.headline} className="feed-item">
                <div className="feed-item-meta">
                  <span className="feed-item-time">{item.time}</span>
                  <span className="feed-item-cat">{item.category}</span>
                </div>
                <p className="feed-item-headline">{item.headline}</p>
              </article>
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
}
