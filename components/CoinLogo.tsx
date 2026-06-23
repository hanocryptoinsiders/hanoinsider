"use client";

import { useState } from "react";

type Props = {
  id: number;
  symbol: string;
  size?: number;
  className?: string;
};

/**
 * CoinMarketCap-hosted coin logos. Falls back to symbol initials on error.
 */
export function CoinLogo({ id, symbol, size = 28, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const px = `${size}px`;
  if (failed) {
    return (
      <div
        className={`rounded-full bg-secondary flex items-center justify-center text-[9px] font-medium ${className}`}
        style={{ width: px, height: px }}
      >
        {symbol.slice(0, 3)}
      </div>
    );
  }
  return (
    <img
      src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`}
      alt={symbol}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`rounded-full bg-secondary ${className}`}
      style={{ width: px, height: px }}
    />
  );
}
