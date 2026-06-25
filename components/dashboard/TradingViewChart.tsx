"use client";

import { useEffect, useRef } from "react";

interface TradingViewChartProps {
  symbol: string;
  theme?: "light" | "dark";
}

export function TradingViewChart({ symbol, theme = "dark" }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = ""; // clean up previous chart
    const containerId = `tradingview_${symbol.toLowerCase()}`;
    const div = document.createElement("div");
    div.id = containerId;
    div.className = "w-full h-full";
    containerRef.current.appendChild(div);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => {
      if (typeof window !== "undefined" && (window as any).TradingView) {
        widgetRef.current = new (window as any).TradingView.widget({
          width: "100%",
          height: "100%",
          symbol: `BINANCE:${symbol.toUpperCase()}USDT`,
          interval: "D",
          timezone: "Etc/UTC",
          theme: theme,
          style: "1",
          locale: "en",
          toolbar_bg: "#09090b",
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: containerId,
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [symbol, theme]);

  return (
    <div className="w-full h-[350px] sm:h-[400px] rounded-xl overflow-hidden border border-border/80 bg-zinc-950">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
