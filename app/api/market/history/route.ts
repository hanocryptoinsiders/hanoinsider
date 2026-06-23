import { NextResponse } from "next/server";

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
    // CoinGecko Demo historical data is limited to 365 days.
    days: "365",
    ccType: "histoday",
    ccLimit: 2000,
    binanceInterval: "1w",
    binanceLimit: 1000,
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "BTC").toUpperCase();
  const timeframe = (searchParams.get("timeframe") || "24H").toUpperCase();
  const config = configs[timeframe] || configs["24H"];

  // 1. CoinGecko
  try {
    const coinId = coinIds[symbol] || symbol.toLowerCase();
    const apiKey = process.env.COINGECKO_API_KEY;

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (apiKey) {
      headers["x-cg-demo-api-key"] = apiKey;
    }

    const endpoint =
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart` +
      `?vs_currency=usd&days=${config.days}`;

    const response = await fetch(endpoint, {
      headers,
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(
        `CoinGecko ${response.status}: ${await response.text()}`
      );
    }

    const json = await response.json();

    let data = (json.prices || []).map(
      ([timestamp, price]: [number, number]) => ({
        time: Math.floor(timestamp / 1000),
        close: price,
      })
    );

    if (timeframe === "1H") {
      data = data.slice(-12);
    }

    if (data.length > 0) {
      return NextResponse.json({
        Response: "Success",
        provider: "CoinGecko",
        Data: { Data: data },
      });
    }
  } catch (error) {
    console.warn("CoinGecko failed:", error);
  }

  // 2. CryptoCompare
  try {
    const params = new URLSearchParams({
      fsym: symbol,
      tsym: "USD",
      limit: String(config.ccLimit),
    });

    if (config.ccAggregate) {
      params.set("aggregate", String(config.ccAggregate));
    }

    const apiKey = process.env.CRYPTOCOMPARE_API_KEY;

    if (apiKey) {
      params.set("api_key", apiKey);
    }

    const endpoint =
      `https://min-api.cryptocompare.com/data/v2/${config.ccType}` +
      `?${params.toString()}`;

    const response = await fetch(endpoint, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`CryptoCompare returned ${response.status}`);
    }

    const json = await response.json();
    const history = json?.Data?.Data || [];

    const data = history
      .filter((item: { close: number }) => item.close > 0)
      .map((item: { time: number; close: number }) => ({
        time: item.time,
        close: item.close,
      }));

    if (data.length > 0) {
      return NextResponse.json({
        Response: "Success",
        provider: "CryptoCompare",
        Data: { Data: data },
      });
    }
  } catch (error) {
    console.warn("CryptoCompare failed:", error);
  }

  // 3. Binance
  try {
    const pair = `${symbol}USDT`;
    const endpoint =
      `https://api.binance.com/api/v3/klines` +
      `?symbol=${pair}` +
      `&interval=${config.binanceInterval}` +
      `&limit=${config.binanceLimit}`;

    const response = await fetch(endpoint, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(
        `Binance ${response.status}: ${await response.text()}`
      );
    }

    const json: unknown[][] = await response.json();

    const data = json.map((candle) => ({
      time: Math.floor(Number(candle[0]) / 1000),
      close: Number(candle[4]),
    }));

    if (data.length > 0) {
      return NextResponse.json({
        Response: "Success",
        provider: "Binance",
        Data: { Data: data },
      });
    }
  } catch (error) {
    console.warn("Binance failed:", error);
  }

  return NextResponse.json(
    {
      Response: "Error",
      error: "All market-data providers failed",
    },
    { status: 502 }
  );
}