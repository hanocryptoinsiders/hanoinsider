import type { CmcCoin, MarketSnapshot } from "@/lib/market.functions";

export type CoinProfile = {
  id: string;
  cmcId: number;
  name: string;
  symbol: string;
  summary: string;
  advantages: string[];
  risks: string[];
  tags: string[];
};

export const coinProfiles: CoinProfile[] = [
  {
    id: "bitcoin",
    cmcId: 1,
    name: "Bitcoin",
    symbol: "BTC",
    summary: "Bitcoin is the first decentralized cryptocurrency, designed as scarce digital money secured by a global proof-of-work network.",
    advantages: ["Deep liquidity and broad recognition", "Predictable issuance schedule", "Strong security budget and long operating history"],
    risks: ["High volatility", "Regulatory uncertainty across jurisdictions", "Scaling and fee pressure during high demand"],
    tags: ["bitcoin", "btc", "store-of-value"],
  },
  {
    id: "ethereum",
    cmcId: 1027,
    name: "Ethereum",
    symbol: "ETH",
    summary: "Ethereum is a smart-contract network used for decentralized apps, stablecoins, tokenization, and settlement across many crypto markets.",
    advantages: ["Large developer ecosystem", "Broad DeFi and stablecoin activity", "Flexible smart contract platform"],
    risks: ["Execution complexity", "Competition from other layer-1 and layer-2 networks", "Fee spikes during congestion"],
    tags: ["ethereum", "eth", "smart-contracts"],
  },
  {
    id: "solana",
    cmcId: 5426,
    name: "Solana",
    symbol: "SOL",
    summary: "Solana is a high-throughput smart-contract network focused on fast settlement, low fees, consumer crypto apps, and active on-chain trading.",
    advantages: ["Fast and inexpensive transactions", "Growing consumer and trading ecosystem", "Strong retail mindshare"],
    risks: ["Network reliability history", "Validator hardware demands", "Highly competitive layer-1 market"],
    tags: ["solana", "sol", "layer-1"],
  },
];

export function findCoinProfile(idOrSymbol: string) {
  const needle = idOrSymbol.toLowerCase();
  return coinProfiles.find((coin) => coin.id === needle || coin.symbol.toLowerCase() === needle || coin.name.toLowerCase() === needle);
}

const mockCoins: CmcCoin[] = [
  { id: 1, name: "Bitcoin", symbol: "BTC", price: 67892.21, percentChange1h: 0.12, percentChange24h: 1.23, percentChange7d: 4.7, marketCap: 1340000000000, volume24h: 31200000000 },
  { id: 1027, name: "Ethereum", symbol: "ETH", price: 3456.78, percentChange1h: -0.08, percentChange24h: 2.01, percentChange7d: 3.2, marketCap: 415000000000, volume24h: 16600000000 },
  { id: 5426, name: "Solana", symbol: "SOL", price: 155.32, percentChange1h: 0.4, percentChange24h: 3.65, percentChange7d: 9.4, marketCap: 72000000000, volume24h: 3900000000 },
  { id: 1839, name: "BNB", symbol: "BNB", price: 598.11, percentChange1h: 0.03, percentChange24h: 1.18, percentChange7d: 2.6, marketCap: 88000000000, volume24h: 1700000000 },
  { id: 52, name: "XRP", symbol: "XRP", price: 0.62, percentChange1h: -0.15, percentChange24h: -1.04, percentChange7d: 1.1, marketCap: 35000000000, volume24h: 1200000000 },
  { id: 2010, name: "Cardano", symbol: "ADA", price: 0.48, percentChange1h: 0.05, percentChange24h: -2.28, percentChange7d: -3.1, marketCap: 17000000000, volume24h: 520000000 },
];

export function getMockMarketSnapshot(reason = "Market data API key is not configured. Showing development mock data."): MarketSnapshot {
  return {
    global: {
      totalMarketCap: 2490000000000,
      totalVolume24h: 92400000000,
      btcDominance: 53.8,
      ethDominance: 16.7,
      marketCapChange24h: 2.35,
      activeCryptocurrencies: 100,
    },
    top: mockCoins,
    fetchedAt: new Date().toISOString(),
    error: reason,
  };
}