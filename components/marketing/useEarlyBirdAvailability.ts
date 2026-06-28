"use client";

import { useEffect, useState } from "react";
import type { EarlyBirdAvailability } from "@/lib/early-bird";

export function useEarlyBirdAvailability() {
  const [availability, setAvailability] = useState<EarlyBirdAvailability | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/pricing/early-bird-availability")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: EarlyBirdAvailability | null) => {
        if (!cancelled && data) {
          setAvailability(data);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return availability;
}
