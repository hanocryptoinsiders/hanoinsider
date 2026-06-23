"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

type Tier = "free" | "paid";
type TierCtx = { tier: Tier; isFree: boolean; setTier: (t: Tier) => void; upgrade: () => void };

const Ctx = createContext<TierCtx | null>(null);

export function TierProvider({ children }: { children: ReactNode }) {
  const { isPremium } = useAuth();
  const router = useRouter();

  const tier: Tier = isPremium ? "paid" : "free";
  const isFree = !isPremium;

  const setTier = (t: Tier) => {
    if (t === "paid") {
      router.push("/pricing");
    }
  };

  const upgrade = () => {
    router.push("/pricing");
  };

  return (
    <Ctx.Provider value={{ tier, isFree, setTier, upgrade }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTier() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTier outside provider");
  return c;
}
