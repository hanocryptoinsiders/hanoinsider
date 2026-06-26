const coinIds: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDT: "tether",
  BNB: "binancecoin",
  XRP: "ripple",
  USDC: "usd-coin",
  DOGE: "dogecoin",
  ADA: "cardano",
  AVAX: "avalanche-2",
  TRX: "tron",
  DOT: "polkadot",
  SHIB: "shiba-inu",
  LINK: "chainlink",
  MATIC: "matic-network",
  LTC: "litecoin",
};

const timeframeAliases: Record<string, string> = {
  "1M": "30D",
  "1m": "30D",
};

const configs: Record<
  string,
  {
    days: string;
    ccType: "histominute" | "histohour" | "histoday";
    ccLimit: number;
    ccAggregate?: number;
    binanceInterval: string;
    binanceLimit: number;
  }
> = {
  "1H": {
    days: "1",
    ccType: "histominute",
    ccLimit: 60,
    binanceInterval: "1m",
    binanceLimit: 60,
  },
  "24H": {
    days: "1",
    ccType: "histohour",
    ccLimit: 24,
    binanceInterval: "1h",
    binanceLimit: 24,
  },
  "7D": {
    days: "7",
    ccType: "histohour",
    ccLimit: 42,
    ccAggregate: 4,
    binanceInterval: "4h",
    binanceLimit: 42,
  },
  "30D": {
    days: "30",
    ccType: "histoday",
    ccLimit: 30,
    binanceInterval: "1d",
    binanceLimit: 30,
  },
  "1Y": {
    days: "365",
    ccType: "histoday",
    ccLimit: 365,
    binanceInterval: "1d",
    binanceLimit: 365,
  },
  ALL: {
    days: "365",
    ccType: "histoday",
    ccLimit: 2000,
    binanceInterval: "1w",
    binanceLimit: 1000,
  },
};

export const COIN_HISTORY_FALLBACK = [
  10, 12, 11, 15, 14, 18, 16, 20, 19, 23, 21, 25,
];

function normalizeTimeframe(timeframe: string) {
  const upper = timeframe.toUpperCase();
  return timeframeAliases[timeframe] ?? timeframeAliases[upper] ?? upper;
}

type HistoryPoint = { time: number; close: number };

async function fetchFromCoinGecko(
  symbol: string,
  timeframe: string,
  config: (typeof configs)[string],
): Promise<HistoryPoint[]> {
  const coinId = coinIds[symbol] || symbol.toLowerCase();
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey;

  const endpoint =
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart` +
    `?vs_currency=usd&days=${config.days}`;

  const response = await fetch(endpoint, {
    headers,
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko ${response.status}: ${await response.text()}`);
  }

  const json = await response.json();
  let data = (json.prices || []).map(([timestamp, price]: [number, number]) => ({
    time: Math.floor(timestamp / 1000),
    close: price,
  }));

  if (timeframe === "1H") {
    data = data.slice(-12);
  }

  return data;
}

async function fetchFromCryptoCompare(
  symbol: string,
  config: (typeof configs)[string],
): Promise<HistoryPoint[]> {
  const params = new URLSearchParams({
    fsym: symbol,
    tsym: "USD",
    limit: String(config.ccLimit),
  });

  if (config.ccAggregate) {
    params.set("aggregate", String(config.ccAggregate));
  }

  const apiKey = process.env.CRYPTOCOMPARE_API_KEY;
  if (apiKey) params.set("api_key", apiKey);

  const endpoint =
    `https://min-api.cryptocompare.com/data/v2/${config.ccType}` +
    `?${params.toString()}`;

  const response = await fetch(endpoint, { next: { revalidate: 60 } });
  if (!response.ok) {
    throw new Error(`CryptoCompare returned ${response.status}`);
  }

  const json = await response.json();
  const history = json?.Data?.Data || [];

  return history
    .filter((item: { close: number }) => item.close > 0)
    .map((item: { time: number; close: number }) => ({
      time: item.time,
      close: item.close,
    }));
}

async function fetchFromBinance(
  symbol: string,
  config: (typeof configs)[string],
): Promise<HistoryPoint[]> {
  const pair = `${symbol}USDT`;
  const endpoint =
    `https://api.binance.com/api/v3/klines` +
    `?symbol=${pair}` +
    `&interval=${config.binanceInterval}` +
    `&limit=${config.binanceLimit}`;

  const response = await fetch(endpoint, { next: { revalidate: 60 } });
  if (!response.ok) {
    throw new Error(`Binance ${response.status}: ${await response.text()}`);
  }

  const json: unknown[][] = await response.json();
  return json.map((candle) => ({
    time: Math.floor(Number(candle[0]) / 1000),
    close: Number(candle[4]),
  }));
}

export async function getCoinHistoryPrices(
  symbol: string,
  timeframe: string,
): Promise<number[]> {
  const normalizedSymbol = symbol.toUpperCase();
  const normalizedTimeframe = normalizeTimeframe(timeframe);
  const config = configs[normalizedTimeframe] || configs["24H"];

  const providers = [
    () => fetchFromCoinGecko(normalizedSymbol, normalizedTimeframe, config),
    () => fetchFromCryptoCompare(normalizedSymbol, config),
    () => fetchFromBinance(normalizedSymbol, config),
  ];

  for (const provider of providers) {
    try {
      const data = await provider();
      if (data.length > 0) {
        return data.map((point) => point.close);
      }
    } catch (error) {
      console.warn("Coin history provider failed:", error);
    }
  }

  return COIN_HISTORY_FALLBACK;
}
