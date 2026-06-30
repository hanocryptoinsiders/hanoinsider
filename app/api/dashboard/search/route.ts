import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  matchesPublishedRow,
  mergeSearchResults,
  publishedRowToResult,
  sanitizeSearchQuery,
  searchCoins,
  searchDeskPages,
  type DeskSearchResult,
} from "@/lib/dashboard-search";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = sanitizeSearchQuery(new URL(request.url).searchParams.get("q") ?? "");
    if (query.length < 2) {
      return NextResponse.json({ results: [] satisfies DeskSearchResult[] });
    }

    const { data, error } = await supabase
      .from("published_content")
      .select("id, title, slug, description, content_type, category, tags")
      .order("published_at", { ascending: false })
      .limit(80);

    if (error) {
      console.error("[dashboard/search] query error:", error.message);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    const contentResults = (data ?? [])
      .filter((row) => matchesPublishedRow(row, query))
      .map(publishedRowToResult)
      .filter((row): row is DeskSearchResult => row !== null)
      .slice(0, 12);

    const pageResults = searchDeskPages(query);
    const coinResults = searchCoins(query);
    const results = mergeSearchResults(pageResults, coinResults, contentResults);

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[dashboard/search] error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
