"use client";

import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";

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
  const size = compact ? 28 : 36;
  const mark = <LogoMark size={size} />;

  if (!link) {
    return mark;
  }

  return (
    <Link href={href} style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
      {mark}
    </Link>
  );
}
