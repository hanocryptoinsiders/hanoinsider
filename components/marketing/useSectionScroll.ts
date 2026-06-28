"use client";

import { useRouter, usePathname } from "next/navigation";
import type { MouseEvent } from "react";

/** Smooth-scroll to a landing-page section by id. */
export function scrollToSection(sectionId: string, block: ScrollLogicalPosition = "start") {
  const el = document.getElementById(sectionId);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block });
  return true;
}

/**
 * Returns a click handler for in-page anchor links that smooth-scrolls without
 * breaking Next.js routing when navigating from other routes.
 */
export function useSectionScroll(sectionId: string) {
  const router = useRouter();
  const pathname = usePathname();

  return (e?: MouseEvent) => {
    e?.preventDefault();
    const onLanding = pathname === "/";
    if (onLanding) {
      scrollToSection(sectionId);
      window.history.replaceState(null, "", `#${sectionId}`);
      return;
    }
    router.push(`/#${sectionId}`);
  };
}
