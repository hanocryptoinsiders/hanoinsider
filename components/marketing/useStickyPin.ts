"use client";

import { useEffect, useRef } from "react";

const PIN_BREAKPOINT = 820;

export function useStickyPin() {
  const leftRef = useRef<HTMLDivElement>(null);
  const pinWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const left = leftRef.current;
    const pinWrap = pinWrapRef.current;
    if (!left || !pinWrap) return;

    const syncPinHeight = () => {
      if (window.innerWidth <= PIN_BREAKPOINT) {
        pinWrap.style.minHeight = "";
        return;
      }
      pinWrap.style.minHeight = `${left.offsetHeight}px`;
    };

    syncPinHeight();

    const ro = new ResizeObserver(syncPinHeight);
    ro.observe(left);

    window.addEventListener("resize", syncPinHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncPinHeight);
    };
  }, []);

  return { leftRef, pinWrapRef };
}
