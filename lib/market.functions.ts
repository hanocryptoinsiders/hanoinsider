"use server";

import { getMockMarketSnapshot } from "@/lib/coin-profiles";
import { getCoinHistoryPrices, getCoinHistorySeriesPoints, type CoinHistoryPoint } from "@/lib/market-history";

const CMC_BASE = "https://pro-api.coinmarketcap.com";

export type CmcCoin = {
  id: number;
  rank: number;
  name: string;
  symbol: string;
  price: number;
  percentChange1h: number;
  percentChange24h: number;
  percentChange7d: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number | null;
};

export type MarketSnapshot = {
  global: {
    totalMarketCap: number;
    totalVolume24h: number;
    btcDominance: number;
    ethDominance: number;
    marketCapChange24h: number;
    activeCryptocurrencies: number;
  } | null;
  top: CmcCoin[];
  fetchedAt: string;
  error: string | null;
};

async function cmcFetch(path: string, key: string) {
  const res = await fetch(`${CMC_BASE}${path}`, {
    headers: {
      "X-CMC_PRO_API_KEY": key,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CoinMarketCap ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<any>;
}

/**
 * Fetches top coins + global market metrics from CoinMarketCap.
 * Returns a graceful fallback shape on failure so the UI never crashes.
 */
export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const key = process.env.COINMARKETCAP_API_KEY;
  if (!key) {
    return getMockMarketSnapshot();
  }

  try {
    const [listings, metrics] = await Promise.all([
      cmcFetch(
        "/v1/cryptocurrency/listings/latest?limit=100&convert=USD",
        key,
      ),
      cmcFetch("/v1/global-metrics/quotes/latest?convert=USD", key),
    ]);

    const top: CmcCoin[] = (listings.data ?? []).map((c: any, index: number) => {
      const q = c.quote?.USD ?? {};
      return {
        id: c.id,
        rank: c.cmc_rank ?? index + 1,
        name: c.name,
        symbol: c.symbol,
        price: q.price ?? 0,
        percentChange1h: q.percent_change_1h ?? 0,
        percentChange24h: q.percent_change_24h ?? 0,
        percentChange7d: q.percent_change_7d ?? 0,
        marketCap: q.market_cap ?? 0,
        volume24h: q.volume_24h ?? 0,
        circulatingSupply: c.circulating_supply ?? 0,
        totalSupply: c.total_supply ?? 0,
        maxSupply: c.max_supply ?? null,
      };
    });

    const g = metrics.data ?? {};
    const gq = g.quote?.USD ?? {};

    return {
      global: {
        totalMarketCap: gq.total_market_cap ?? 0,
        totalVolume24h: gq.total_volume_24h ?? 0,
        btcDominance: g.btc_dominance ?? 0,
        ethDominance: g.eth_dominance ?? 0,
        marketCapChange24h: gq.total_market_cap_yesterday_percentage_change ?? 0,
        activeCryptocurrencies: g.active_cryptocurrencies ?? 0,
      },
      top,
      fetchedAt: new Date().toISOString(),
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("getMarketSnapshot failed:", message);
    return getMockMarketSnapshot(message);
  }
}

/** Historical close prices for sparklines/charts (CoinGecko → CryptoCompare → Binance). */
export async function getCoinHistory(symbol: string, timeframe: string) {
  return getCoinHistoryPrices(symbol, timeframe);
}

/**
 * Historical close prices WITH timestamps for full price charts.
 * Real market data only (CoinGecko → CryptoCompare → Binance). Returns [] on failure
 * so the chart can render a graceful empty/error state instead of fake data.
 */
export async function getCoinHistorySeries(
  symbol: string,
  timeframe: string,
): Promise<CoinHistoryPoint[]> {
  return getCoinHistorySeriesPoints(symbol, timeframe);
}
