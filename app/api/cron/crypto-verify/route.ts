import { NextResponse } from "next/server";
import { pollPendingIntents } from "@/lib/crypto/payment-intents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Batch verifier for pending on-chain crypto payments. Hit on a short interval
 * by the Railway watcher (and as a Vercel cron backup). Confirms transfers,
 * activates customers, sends "payment received" emails, and expires stale
 * intents.
 *
 * Auth (same convention as /api/cron/subscriptions):
 *   - Authorization: Bearer <CRON_SECRET>
 *   - x-cron-secret: <CRON_SECRET>
 *   - ?secret=<CRON_SECRET>
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth && auth === `Bearer ${secret}`) return true;
  if (request.headers.get("x-cron-secret") === secret) return true;
  if (new URL(request.url).searchParams.get("secret") === secret) return true;
  return false;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await pollPendingIntents();
  return NextResponse.json(summary);
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
