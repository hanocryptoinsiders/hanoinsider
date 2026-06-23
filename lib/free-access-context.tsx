import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CATALOGS, type Section } from "./content-catalog";

type Slot = { id: string; active: boolean };

type State = {
  limits: Record<Section, number> & { homeInsights: number };
  slots: Record<Section, Slot[]> & { homeInsights: Slot[] };
  marketPreview: boolean;
  premiumFeatured: Record<Section, string[]>;
};

const STORAGE_KEY = "Hano Insiders:free-access:v1";

const defaultState: State = {
  limits: { insights: 1, articles: 1, videos: 1, homeInsights: 1 },
  slots: {
    insights: [{ id: "ins-1", active: true }],
    articles: [{ id: "art-1", active: true }],
    videos: [{ id: "vid-1", active: true }],
    homeInsights: [{ id: "ins-1", active: true }],
  },
  marketPreview: false,
  premiumFeatured: {
    insights: ["ins-1"],
    articles: ["art-1"],
    videos: ["vid-1"],
  },
};

type Ctx = {
  state: State;
  setLimit: (s: Section | "homeInsights", n: number) => void;
  addSlot: (s: Section | "homeInsights", id: string) => void;
  removeSlot: (s: Section | "homeInsights", idx: number) => void;
  replaceSlot: (s: Section | "homeInsights", idx: number, id: string) => void;
  moveSlot: (s: Section | "homeInsights", idx: number, dir: -1 | 1) => void;
  toggleActive: (s: Section | "homeInsights", idx: number) => void;
  setMarketPreview: (b: boolean) => void;
  togglePremiumFeatured: (s: Section, id: string) => void;
  isFreeUnlocked: (s: Section | "homeInsights", id: string) => boolean;
  isPremiumFeatured: (s: Section, id: string) => boolean;
  reset: () => void;
};

const FreeAccessCtx = createContext<Ctx | null>(null);

function loadInitial(): State {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed, limits: { ...defaultState.limits, ...parsed.limits }, slots: { ...defaultState.slots, ...parsed.slots }, premiumFeatured: { ...defaultState.premiumFeatured, ...parsed.premiumFeatured } };
  } catch {
    return defaultState;
  }
}

export function FreeAccessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(loadInitial);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* noop */ }
  }, [state]);

  const update = (fn: (s: State) => State) => setState((s) => fn(structuredClone(s)));

  const ctx: Ctx = {
    state,
    setLimit: (s, n) => update((d) => { d.limits[s] = Math.max(0, Math.min(20, n)); return d; }),
    addSlot: (s, id) => update((d) => { if (!d.slots[s].some((x) => x.id === id)) d.slots[s].push({ id, active: true }); return d; }),
    removeSlot: (s, idx) => update((d) => { d.slots[s].splice(idx, 1); return d; }),
    replaceSlot: (s, idx, id) => update((d) => { d.slots[s][idx] = { id, active: d.slots[s][idx]?.active ?? true }; return d; }),
    moveSlot: (s, idx, dir) => update((d) => {
      const j = idx + dir;
      if (j < 0 || j >= d.slots[s].length) return d;
      [d.slots[s][idx], d.slots[s][j]] = [d.slots[s][j], d.slots[s][idx]];
      return d;
    }),
    toggleActive: (s, idx) => update((d) => { if (d.slots[s][idx]) d.slots[s][idx].active = !d.slots[s][idx].active; return d; }),
    setMarketPreview: (b) => update((d) => { d.marketPreview = b; return d; }),
    togglePremiumFeatured: (s, id) => update((d) => {
      const arr = d.premiumFeatured[s];
      const i = arr.indexOf(id);
      if (i >= 0) arr.splice(i, 1); else arr.push(id);
      return d;
    }),
    isFreeUnlocked: (s, id) => {
      const limit = state.limits[s];
      const visible = state.slots[s].filter((x) => x.active).slice(0, limit);
      return visible.some((x) => x.id === id);
    },
    isPremiumFeatured: (s, id) => state.premiumFeatured[s]?.includes(id) ?? false,
    reset: () => setState(defaultState),
  };

  return <FreeAccessCtx.Provider value={ctx}>{children}</FreeAccessCtx.Provider>;
}

export function useFreeAccess() {
  const c = useContext(FreeAccessCtx);
  if (!c) throw new Error("useFreeAccess outside provider");
  return c;
}

export { CATALOGS };
export type { Section };
