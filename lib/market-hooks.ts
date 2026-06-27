import { useQuery } from "@tanstack/react-query";
import { getCoinHistory, getCoinHistorySeries, getMarketSnapshot, type MarketSnapshot } from "@/lib/market.functions";
import type { CoinHistoryPoint } from "@/lib/market-history";

export function useMarketSnapshot(initialData?: MarketSnapshot) {
  return useQuery<MarketSnapshot>({
    queryKey: ["market-snapshot"],
    queryFn: () => getMarketSnapshot(),
    refetchInterval: 60_000,
    staleTime: 30_000,
    initialData,
  });
}

/** Same cache as useMarketSnapshot — gentler refresh for dashboard home. */
export function useHomeMarketSnapshot(initialData?: MarketSnapshot) {
  return useQuery<MarketSnapshot>({
    queryKey: ["market-snapshot"],
    queryFn: () => getMarketSnapshot(),
    refetchInterval: 180_000,
    staleTime: 120_000,
    initialData,
  });
}

export function useCoinHistory(symbol: string, timeframe: string, initialData?: number[]) {
  return useQuery<number[]>({
    queryKey: ["coin-history", symbol, timeframe],
    queryFn: () => getCoinHistory(symbol, timeframe),
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled: !!symbol,
    initialData,
  });
}

/** Real timestamped price series for the coin detail chart. */
export function useCoinHistorySeries(
  symbol: string,
  timeframe: string,
  initialData?: CoinHistoryPoint[],
) {
  return useQuery<CoinHistoryPoint[]>({
    queryKey: ["coin-history-series", symbol, timeframe],
    queryFn: () => getCoinHistorySeries(symbol, timeframe),
    staleTime: 60_000,
    refetchInterval: 120_000,
    enabled: !!symbol,
    initialData,
  });
}

export function fmtUsd(n: number, opts: { compact?: boolean; digits?: number } = {}) {
  if (!Number.isFinite(n)) return "—";
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
  if (!Number.isFinite(n)) return "—";
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(digits)}%`;
}
