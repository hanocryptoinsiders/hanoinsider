/**
 * lib/crypto/onchain.ts
 *
 * Framework-agnostic on-chain payment verification. Supports two read providers:
 *
 *   1. Alchemy (recommended for BSC) — `alchemy_getAssetTransfers`. Alchemy's
 *      free tier covers BNB Smart Chain, Ethereum, Base, Polygon, etc.
 *   2. Etherscan V2 multichain — `account/tokentx`. NOTE: Etherscan's *free*
 *      tier does NOT cover BSC (chain 56); it returns "Free API access is not
 *      supported for this chain". Use Alchemy for BSC.
 *
 * Provider selection is automatic via env (see getOnchainProvider). Depends only
 * on the global `fetch`, so it is safe in a Next.js route or a Node worker.
 */

export const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";

export type TokenTransfer = {
  hash: string;
  from: string;
  to: string;
  /** Raw value in the token's smallest unit (wei-equivalent). */
  value: bigint;
  tokenDecimals: number;
  /** Unix seconds. */
  timeStamp: number;
  confirmations: number;
  contractAddress: string;
};

export type OnchainProvider =
  | { kind: "alchemy"; url: string }
  | { kind: "etherscan"; apiKey: string };

export type AcceptedToken = { contract: string; decimals: number; symbol: string };

export type VerifyParams = {
  chainId: number;
  wallet: string;
  /** Any of these tokens count as payment (e.g. USDC and USDT on BSC). */
  tokens: AcceptedToken[];
  /** Exact amount we ask for (e.g. 1, 49, 79). */
  expectedAmount: number;
  /** Accept payments at least (expectedAmount - tolerance); overpayment always OK. */
  toleranceAmount?: number;
  /** Ignore transfers older than this (Unix seconds). */
  notBeforeUnix: number;
  /**
   * When set AND it's a valid EVM hash, only that tx is considered. A non-EVM
   * hash (e.g. a Solana signature from a bridge) is ignored — we fall back to
   * matching by amount, so bridged payments still confirm.
   */
  txHash?: string | null;
  /** Tx hashes (lowercased) already consumed by other confirmed intents. */
  usedHashes?: Set<string>;
  minConfirmations: number;
  provider: OnchainProvider;
};

export type VerifyResult =
  | {
      ok: true;
      hash: string;
      from: string;
      detectedAmount: number;
      confirmations: number;
      currency: string;
    }
  | { ok: false; reason: string; pending: boolean };

export function getExplorerApiKey(): string | null {
  return (
    process.env.ETHERSCAN_API_KEY?.trim() ||
    process.env.BSCSCAN_API_KEY?.trim() ||
    null
  );
}

function alchemyUrlForChain(chainId: number, key: string): string | null {
  const sub =
    chainId === 56
      ? "bnb-mainnet"
      : chainId === 1
        ? "eth-mainnet"
        : chainId === 8453
          ? "base-mainnet"
          : chainId === 137
            ? "polygon-mainnet"
            : chainId === 42161
              ? "arb-mainnet"
              : null;
  return sub ? `https://${sub}.g.alchemy.com/v2/${key}` : null;
}

/**
 * Chooses the read provider from env. Prefers Alchemy (free BSC support):
 *   ALCHEMY_RPC_URL   — full provider URL (any chain), OR
 *   ALCHEMY_API_KEY   — key; URL is derived from the chain
 * Falls back to an Etherscan V2 key (works for Ethereum, not free-tier BSC).
 */
export function getOnchainProvider(chainId: number): OnchainProvider | null {
  const explicitUrl = process.env.ALCHEMY_RPC_URL?.trim();
  if (explicitUrl) return { kind: "alchemy", url: explicitUrl };

  const alchemyKey = process.env.ALCHEMY_API_KEY?.trim();
  if (alchemyKey) {
    const url = alchemyUrlForChain(chainId, alchemyKey);
    if (url) return { kind: "alchemy", url };
  }

  const explorerKey = getExplorerApiKey();
  if (explorerKey) return { kind: "etherscan", apiKey: explorerKey };

  return null;
}

/** Parse a decimal amount string into the token's smallest unit as a bigint. */
export function parseUnits(amount: string, decimals: number): bigint {
  const negative = amount.trim().startsWith("-");
  const clean = negative ? amount.trim().slice(1) : amount.trim();
  const [wholeRaw, fracRaw = ""] = clean.split(".");
  const whole = wholeRaw.replace(/[^0-9]/g, "") || "0";
  const frac = (fracRaw.replace(/[^0-9]/g, "") + "0".repeat(decimals)).slice(0, decimals);
  const result = BigInt(whole + frac);
  return negative ? -result : result;
}

/** Convert a smallest-unit bigint back to a human number (safe for display amounts). */
export function formatUnits(value: bigint, decimals: number): number {
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = value / divisor;
  const frac = value % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, 6);
  return Number(`${whole.toString()}.${fracStr || "0"}`);
}

// ─── Provider: Alchemy (alchemy_getAssetTransfers) ──────────────────────────

async function rpcCall(url: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const data = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (data.error) throw new Error(data.error.message || "rpc error");
  return data.result;
}

async function fetchTransfersAlchemy(
  url: string,
  wallet: string,
  contracts: string[],
): Promise<TokenTransfer[]> {
  const latest = parseInt((await rpcCall(url, "eth_blockNumber", [])) as string, 16) || 0;
  const result = (await rpcCall(url, "alchemy_getAssetTransfers", [
    {
      fromBlock: "0x0",
      toBlock: "latest",
      toAddress: wallet,
      contractAddresses: contracts,
      category: ["erc20"],
      order: "desc",
      maxCount: "0x3e8",
      withMetadata: true,
      excludeZeroValue: true,
    },
  ])) as { transfers?: unknown[] };

  const transfers = (result?.transfers ?? []) as Array<{
    hash?: string;
    from?: string;
    to?: string;
    blockNum?: string;
    rawContract?: { value?: string; address?: string; decimal?: string };
    metadata?: { blockTimestamp?: string };
  }>;

  return transfers.map((t) => {
    const block = t.blockNum ? parseInt(t.blockNum, 16) : 0;
    const ts = t.metadata?.blockTimestamp ? Math.floor(Date.parse(t.metadata.blockTimestamp) / 1000) : 0;
    return {
      hash: (t.hash ?? "").toLowerCase(),
      from: (t.from ?? "").toLowerCase(),
      to: (t.to ?? "").toLowerCase(),
      value: BigInt(t.rawContract?.value ?? "0x0"),
      tokenDecimals: t.rawContract?.decimal ? parseInt(t.rawContract.decimal, 16) : 0,
      timeStamp: ts,
      confirmations: latest && block ? latest - block : 0,
      contractAddress: (t.rawContract?.address ?? "").toLowerCase(),
    };
  });
}

// ─── Provider: Etherscan V2 (account/tokentx) ───────────────────────────────

type RawTransfer = {
  hash?: string;
  from?: string;
  to?: string;
  value?: string;
  tokenDecimal?: string;
  timeStamp?: string;
  confirmations?: string;
  contractAddress?: string;
};

async function fetchTransfersEtherscan(
  chainId: number,
  wallet: string,
  contract: string,
  apiKey: string,
): Promise<TokenTransfer[]> {
  const url = new URL(ETHERSCAN_V2_BASE);
  url.searchParams.set("chainid", String(chainId));
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "tokentx");
  url.searchParams.set("contractaddress", contract);
  url.searchParams.set("address", wallet);
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", "100");
  url.searchParams.set("sort", "desc");
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Explorer HTTP ${res.status}`);
  const data = (await res.json()) as { message?: string; result?: RawTransfer[] | string };

  if (Array.isArray(data.result)) {
    return data.result.map((t) => ({
      hash: (t.hash ?? "").toLowerCase(),
      from: (t.from ?? "").toLowerCase(),
      to: (t.to ?? "").toLowerCase(),
      value: BigInt(t.value ?? "0"),
      tokenDecimals: Number(t.tokenDecimal ?? "0") || 0,
      timeStamp: Number(t.timeStamp ?? "0") || 0,
      confirmations: Number(t.confirmations ?? "0") || 0,
      contractAddress: (t.contractAddress ?? "").toLowerCase(),
    }));
  }

  const message = typeof data.result === "string" ? data.result : data.message ?? "";
  if (/no transactions found/i.test(message)) return [];
  throw new Error(`Explorer error: ${message || "unknown"}`);
}

async function fetchTokenTransfers(
  provider: OnchainProvider,
  chainId: number,
  wallet: string,
  contracts: string[],
): Promise<TokenTransfer[]> {
  if (provider.kind === "alchemy") {
    return fetchTransfersAlchemy(provider.url, wallet, contracts);
  }
  // Etherscan tokentx filters by a single contract — query each, then merge.
  const all = await Promise.all(
    contracts.map((c) => fetchTransfersEtherscan(chainId, wallet, c, provider.apiKey)),
  );
  return all.flat();
}

// ─── Verification ───────────────────────────────────────────────────────────

export async function verifyOnchainPayment(params: VerifyParams): Promise<VerifyResult> {
  const wallet = params.wallet.toLowerCase();
  const tokensByContract = new Map(
    params.tokens.map((t) => [t.contract.toLowerCase(), t]),
  );
  const contracts = [...tokensByContract.keys()];
  const wantHash = params.txHash?.trim().toLowerCase() || null;
  const used = params.usedHashes ?? new Set<string>();
  // An EVM tx hash is 0x + 64 hex chars. A non-EVM hash (e.g. a Solana
  // signature from a bridge like relay.link) can never match here, so don't
  // filter the scan to it — fall back to matching by amount.
  const evmHash = wantHash && /^0x[0-9a-f]{64}$/.test(wantHash) ? wantHash : null;

  let transfers: TokenTransfer[];
  try {
    transfers = await fetchTokenTransfers(params.provider, params.chainId, wallet, contracts);
  } catch (err) {
    return {
      ok: false,
      pending: true,
      reason: err instanceof Error ? err.message : "explorer_unreachable",
    };
  }

  // Newest first so a fresh payment is matched ahead of any older transfer.
  transfers.sort((a, b) => b.timeStamp - a.timeStamp);

  const minAmount = Math.max(0, params.expectedAmount - (params.toleranceAmount ?? 0));
  let sawCandidateButUnconfirmed = false;

  for (const t of transfers) {
    if (t.to !== wallet) continue;
    const token = tokensByContract.get(t.contractAddress);
    if (!token) continue; // not one of the accepted stablecoins
    if (evmHash && t.hash !== evmHash) continue;
    if (t.timeStamp && t.timeStamp < params.notBeforeUnix) continue;
    if (used.has(t.hash)) continue;

    const decimals = t.tokenDecimals || token.decimals;
    const minUnits = parseUnits(minAmount.toFixed(8), decimals);
    if (t.value < minUnits) continue; // underpaid beyond tolerance

    if (t.confirmations < params.minConfirmations) {
      sawCandidateButUnconfirmed = true;
      continue;
    }

    return {
      ok: true,
      hash: t.hash,
      from: t.from,
      detectedAmount: formatUnits(t.value, decimals),
      confirmations: t.confirmations,
      currency: token.symbol,
    };
  }

  return {
    ok: false,
    pending: true,
    reason: sawCandidateButUnconfirmed ? "awaiting_confirmations" : "no_matching_transfer",
  };
}
