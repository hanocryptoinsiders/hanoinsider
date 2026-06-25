"use client";

import { useScrollReveal } from "./useScrollReveal";

const lines = [
  {
    key: "line-1",
    content: <>Every sector has institutions.</>,
  },
  {
    key: "line-2",
    content: (
      <>
        Crypto still runs on <strong>noise</strong>, speculation, and signal
        groups — not on <span className="accent">clarity.</span>
      </>
    ),
  },
  {
    key: "line-3",
    content: <>The desk exists to change that.</>,
  },
];

export function EditorialStatement() {
  const { ref, visible } = useScrollReveal<HTMLQuoteElement>();

  return (
    <section className="landing-section editorial-reveal-section" data-m-reveal>
      <blockquote
        ref={ref}
        className={`editorial-reveal max-w-[48rem] ${visible ? "is-visible" : ""}`}
      >
        <span className="editorial-reveal-accent" aria-hidden="true" />
        {lines.map((line, index) => (
          <span
            key={line.key}
            className="editorial-reveal-line"
            style={{ ["--reveal-i" as string]: index }}
          >
            <span className="editorial-reveal-line-inner editorial-intro">
              {line.content}
            </span>
          </span>
        ))}
      </blockquote>
    </section>
  );
}
