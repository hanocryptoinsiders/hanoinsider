"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// objectPosition is hand-tuned per photo so the mask/face stays framed
// when the image is cropped into the small portrait panel.
export const MASCOT_OPTIONS = [
  { id: "tie", label: "Tie - adjusting", src: "/assets/hanoinfrontend/hero-mascot.jpg", objectPosition: "42% 14%" },
  { id: "stand", label: "Stand - full body", src: "/assets/hanoinfrontend/bird-mascot.jpg", objectPosition: "38% 16%" },
  { id: "portrait", label: "Portrait - standing", src: "/assets/hanoinfrontend/article-cover.jpg", objectPosition: "38% 18%" },
  { id: "hero", label: "Hero - library wide", src: "/assets/hanoinfrontend/hero-mascot.jpg", objectPosition: "50% 20%" },
  { id: "bust", label: "Bust - close-up", src: "/assets/hanoinfrontend/bird-mascot.jpg", objectPosition: "45% 18%" },
  { id: "silhouette", label: "Silhouette - backlit", src: "/assets/hanoinfrontend/hero-mascot.jpg", objectPosition: "45% 15%" },
  { id: "throne", label: "Throne - seated", src: "/assets/hanoinfrontend/article-cover.jpg", objectPosition: "48% 28%" },
  { id: "lounge", label: "Lounge - smoking, NYC", src: "/assets/hanoinfrontend/bird-mascot.jpg", objectPosition: "62% 36%" },
  { id: "smoke", label: "Smoke - armchair", src: "/assets/hanoinfrontend/hero-mascot.jpg", objectPosition: "26% 42%" },
  { id: "coat", label: "Coat - side profile", src: "/assets/hanoinfrontend/article-cover.jpg", objectPosition: "45% 12%" },
] as const;

export type MascotId = (typeof MASCOT_OPTIONS)[number]["id"];

type QuoteState = {
  text: string;
  author: string;
  mascotId: MascotId;
};

const DEFAULT_STATE: QuoteState = {
  text: "The market always telegraphs its next move before most people are paying attention.",
  author: "The Hano Insiders",
  mascotId: "tie",
};

const STORAGE_KEY = "Hano Insiders.quote.v1";

type QuoteContextValue = QuoteState & {
  mascotSrc: string;
  mascotObjectPosition: string;
  setQuote: (q: Partial<QuoteState>) => void;
  reset: () => void;
};

const QuoteContext = createContext<QuoteContextValue | null>(null);

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuoteState>(DEFAULT_STATE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<QuoteState>;
        setState({ ...DEFAULT_STATE, ...parsed });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: QuoteState) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const opt = MASCOT_OPTIONS.find((m) => m.id === state.mascotId);
  const mascotSrc = opt?.src ?? "/assets/hanoinfrontend/hero-mascot.jpg";
  const mascotObjectPosition = opt?.objectPosition ?? "50% 20%";

  return (
    <QuoteContext.Provider
      value={{
        ...state,
        mascotSrc,
        mascotObjectPosition,
        setQuote: (q) => persist({ ...state, ...q }),
        reset: () => persist(DEFAULT_STATE),
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
}

export function useQuote() {
  const ctx = useContext(QuoteContext);
  if (!ctx) throw new Error("useQuote must be used within QuoteProvider");
  return ctx;
}

