import { NextResponse } from "next/server";
import { getEarlyBirdAvailability } from "@/lib/early-bird";
import { getServiceSupabase } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const availability = await getEarlyBirdAvailability(supabase);
    return NextResponse.json(availability);
  } catch (error) {
    console.error("[pricing/early-bird-availability]", error);
    return NextResponse.json({ error: "Failed to load early bird availability." }, { status: 500 });
  }
}
