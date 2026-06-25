import Link from "next/link";

export function CTA() {
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
          Join the first wave of members and lock in lifetime access at the
          early bird rate. No renewals, no price increases — just the desk,
          for life.
        </p>
      </div>

      <div className="record-totals m-stat-cards" style={{ marginBottom: 40 }} data-m-reveal data-m-reveal-delay="1">
        <div className="cell">
          <div className="lbl">Early spots</div>
          <div className="val acc">20</div>
          <div className="sub">Limited founding memberships at the early bird rate.</div>
        </div>
        <div className="cell">
          <div className="lbl">Updates</div>
          <div className="val acc">Weekly</div>
          <div className="sub">Insight briefs published every week, articles monthly.</div>
        </div>
        <div className="cell">
          <div className="lbl">Lifetime price</div>
          <div className="val acc">$50</div>
          <div className="sub">One payment. Permanent access. No renewals.</div>
        </div>
      </div>

      <div className="cta-row" data-m-reveal data-m-reveal-delay="2">
        <Link href="/register" className="cta-primary">
          Join Insiders <span className="arr">→</span>
        </Link>
        <a href="#pricing" className="cta-secondary">
          View pricing details <span className="arr">→</span>
        </a>
      </div>
    </section>
  );
}
