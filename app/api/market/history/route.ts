import { NextResponse } from "next/server";
import { getCoinHistoryPrices } from "@/lib/market-history";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BTC";
  const timeframe = searchParams.get("timeframe") || "24H";

  try {
    const closes = await getCoinHistoryPrices(symbol, timeframe);
    const data = closes.map((close, index) => ({
      time: index,
      close,
    }));

    return NextResponse.json({
      Response: "Success",
      Data: { Data: data },
    });
  } catch (error) {
    console.error("Market history route failed:", error);
    return NextResponse.json(
      { Response: "Error", error: "Failed to fetch historical data" },
      { status: 502 },
    );
  }
}
