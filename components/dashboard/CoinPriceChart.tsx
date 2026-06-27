"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useCoinHistorySeries } from "@/lib/market-hooks";
import { fmtUsd } from "@/lib/market-hooks";
import type { CoinHistoryPoint } from "@/lib/market-history";

const TIMEFRAMES = ["24H", "7D", "30D", "1Y"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

function formatAxisLabel(ms: number, timeframe: Timeframe) {
  const date = new Date(ms);
  if (timeframe === "24H") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (timeframe === "1Y") {
    return date.toLocaleDateString([], { month: "short", year: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface CoinPriceChartProps {
  symbol: string;
  defaultTimeframe?: Timeframe;
  initialSeries?: CoinHistoryPoint[];
}

export function CoinPriceChart({
  symbol,
  defaultTimeframe = "7D",
  initialSeries,
}: CoinPriceChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTimeframe);

  const { data, isLoading, isError, isFetching, refetch } = useCoinHistorySeries(
    symbol,
    timeframe,
    timeframe === defaultTimeframe ? initialSeries : undefined,
  );

  const series = data ?? [];
  const hasData = series.length > 1;

  const { isUp, color } = useMemo(() => {
    if (!hasData) return { isUp: true, color: "oklch(0.78 0.18 150)" };
    const up = series[series.length - 1].price >= series[0].price;
    return {
      isUp: up,
      color: up ? "oklch(0.78 0.18 150)" : "oklch(0.62 0.22 25)",
    };
  }, [series, hasData]);

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Price Chart
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Real {timeframe} price history · USD
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`rounded-md px-3 py-1 text-xs transition ${
                timeframe === tf
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-[260px] w-full sm:h-[320px]">
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-xs">Loading real price data…</span>
            </div>
          </div>
        ) : isError ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
              <span className="text-sm">Could not load price data right now.</span>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-xs hover:bg-white/[0.04]"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          </div>
        ) : !hasData ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
              <AlertTriangle className="h-6 w-6 text-muted-foreground/60" />
              <span className="text-sm">
                No historical price data available for {symbol} on this timeframe.
              </span>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={`coin-chart-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="time"
                tickFormatter={(v) => formatAxisLabel(Number(v), timeframe)}
                tick={{ fill: "var(--fg-3, #9ca3af)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                dataKey="price"
                domain={["auto", "auto"]}
                width={64}
                tickFormatter={(v) => fmtUsd(Number(v), { compact: true })}
                tick={{ fill: "var(--fg-3, #9ca3af)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                orientation="right"
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(9,9,11,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#a1a1aa" }}
                labelFormatter={(v) =>
                  new Date(Number(v)).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }
                formatter={(value) => [fmtUsd(Number(value)), "Price"]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                fill={`url(#coin-chart-${symbol})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Source: CoinGecko / CryptoCompare / Binance</span>
        <span className={isFetching ? "opacity-100" : "opacity-0"}>Updating…</span>
      </div>
    </div>
  );
}
