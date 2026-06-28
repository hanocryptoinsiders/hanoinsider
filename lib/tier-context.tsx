"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Paid-only platform: all dashboard members have full content access. */
type TierCtx = { tier: "paid"; isFree: false; setTier: () => void; upgrade: () => void };

const Ctx = createContext<TierCtx | null>(null);

const paidOnly: TierCtx = {
  tier: "paid",
  isFree: false,
  setTier: () => {},
  upgrade: () => {},
};

export function TierProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={paidOnly}>{children}</Ctx.Provider>;
}

export function useTier() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTier outside provider");
  return c;
}
