import { useQuery } from "@tanstack/react-query";
import { getMarketSnapshot, type MarketSnapshot } from "@/lib/market.functions";

export function useMarketSnapshot(initialData?: MarketSnapshot) {
  return useQuery<MarketSnapshot>({
    queryKey: ["market-snapshot"],
    queryFn: () => getMarketSnapshot(),
    refetchInterval: 60_000,
    staleTime: 30_000,
    initialData,
  });
}

async function fetchCoinHistory(symbol: string, timeframe: string): Promise<number[]> {
  const s = symbol.toUpperCase();
  const endpoint = `/api/market/history?symbol=${s}&timeframe=${timeframe}`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error("Failed to fetch historical data");
    const json = await res.json();
    if (json.Response === "Error") {
      throw new Error(json.Message || "Failed to fetch historical data");
    }
    const dataList = json.Data?.Data ?? [];
    return dataList.map((item: any) => item.close as number);
  } catch (err) {
    console.error("fetchCoinHistory error:", err);
    // Return dummy points if the API fails so the UI has a safe fallback
    return [10, 12, 11, 15, 14, 18, 16, 20, 19, 23, 21, 25];
  }
}

export function useCoinHistory(symbol: string, timeframe: string, initialData?: number[]) {
  return useQuery<number[]>({
    queryKey: ["coin-history", symbol, timeframe],
    queryFn: () => fetchCoinHistory(symbol, timeframe),
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled: !!symbol,
    initialData,
  });
}

export function fmtUsd(n: number, opts: { compact?: boolean; digits?: number } = {}) {
  if (!Number.isFinite(n)) return "â€”";
  const { compact, digits } = opts;
  if (compact) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(n);
  }
  const d = digits ?? (n >= 1000 ? 2 : n >= 1 ? 2 : 4);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(n);
}

export function fmtPct(n: number, digits = 2) {
  if (!Number.isFinite(n)) return "â€”";
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(digits)}%`;
}
