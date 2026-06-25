"use client";

import Link from "next/link";

type HanoWordmarkProps = {
  compact?: boolean;
  height?: number;
  /** When false, renders text only (for wrapping in an outer Link). */
  link?: boolean;
  href?: string;
};

export function HanoWordmark({
  compact = false,
  link = true,
  href = "/",
}: HanoWordmarkProps) {
  const fontSize = compact ? 11 : 13;

  const mark = (
    <>
      <span style={{ color: "var(--accent-soft)" }}>Hano</span>
      {compact ? "" : " Insiders"}
    </>
  );

  const style = {
    fontFamily: "var(--font-mono)",
    fontWeight: 600,
    fontSize,
    letterSpacing: ".18em",
    textTransform: "uppercase" as const,
    color: "#fff",
    padding: "8px 0",
    display: "inline-block",
    textDecoration: "none",
  };

  if (!link) {
    return <span style={style}>{mark}</span>;
  }

  return (
    <Link href={href} style={style}>
      {mark}
    </Link>
  );
}
