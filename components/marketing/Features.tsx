export function Features() {
  return (
    <section id="intelligence" className="landing-section">
      <div className="sec-head" data-m-reveal>
        <div className="eyebrow">
          <span className="acc">Coverage</span>
          <span className="bar" />
          <span>What members get inside the desk</span>
        </div>
        <h2>
          The full intelligence desk.{" "}
          <em>Built for clarity.</em>
        </h2>
        <p className="sec-stand">
          Every tool a serious beginner needs to understand crypto markets —
          curated, contextualized, and updated by the desk.
        </p>
      </div>

      <ul className="feature-grid m-feature-stack">
        <li data-m-reveal data-m-reveal-delay="1">
          <span className="num">01</span>
          <span className="feature-lbl">
            Market Overview — real-time market cap, sector rotation, and
            key metrics curated for context
          </span>
        </li>
        <li data-m-reveal data-m-reveal-delay="2">
          <span className="num">02</span>
          <span className="feature-lbl">
            Research Articles — in-depth reports on macro trends, on-chain
            signals, and institutional flows
          </span>
        </li>
        <li data-m-reveal data-m-reveal-delay="3">
          <span className="num">03</span>
          <span className="feature-lbl">
            Insight Briefs — weekly concise analysis on what moved and why
            it matters
          </span>
        </li>
        <li data-m-reveal data-m-reveal-delay="4">
          <span className="num">04</span>
          <span className="feature-lbl">
            Coin Pages — 50+ asset profiles with context, not just price
            charts
          </span>
        </li>
        <li data-m-reveal data-m-reveal-delay="5">
          <span className="num">05</span>
          <span className="feature-lbl">
            Direct Support — member-only access to the desk for questions
            and context
          </span>
        </li>
        <li data-m-reveal data-m-reveal-delay="6">
          <span className="num">06</span>
          <span className="feature-lbl">
            Affiliate Tools — share the desk, earn referral credit on every
            signup
          </span>
        </li>
      </ul>
    </section>
  );
}
