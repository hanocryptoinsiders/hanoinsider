import Link from "next/link";

export function Hero() {
  return (
    <section className="hero-section">
      <div className="eyebrow">
        <span className="pulse-dot" />
        <span>The Research Desk</span>
        <span className="bar" />
        <span className="acc">Crypto Intelligence</span>
      </div>

      <h1 className="hero-headline">
        Where <em>crypto markets</em> are heading, and who is{" "}
        <br className="hero-headline-break" aria-hidden="true" />
        prepared to read them clearly.
      </h1>

      <p className="hero-stand">
        Every cycle runs on <b>noise</b>, speculation, and signal groups.
        Hano Insiders delivers curated market context, educational research,
        and concise analysis for serious beginners who want{" "}
        <span className="acc">clarity without the chaos</span>.
      </p>

      <div className="cta-row">
        <Link href="/register" className="cta-primary">
          Join Insiders <span className="arr">→</span>
        </Link>
        <a href="#desk" className="cta-secondary">
          Not ready? Read about our coverage <span className="arr">→</span>
        </a>
      </div>

      <div className="cta-meta">
        $50 lifetime access{" "}
        <span className="badge">Early bird · locked for life</span>
      </div>

      <p className="hero-disclaimer">
        Educational research, not investment advice. We do not recommend specific buys or sells.
      </p>
    </section>
  );
}
