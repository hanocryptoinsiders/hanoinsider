#!/usr/bin/env node
/**
 * worker/crypto-poller.mjs
 *
 * Standalone Railway worker that drives automatic crypto payment verification.
 * It simply calls the app's secured endpoint on a short interval; all the
 * on-chain logic, settlement, and emails live in the Next.js app so there is a
 * single source of truth.
 *
 *   POST/GET <APP_URL>/api/cron/crypto-verify   (Authorization: Bearer CRON_SECRET)
 *
 * Required env:
 *   APP_URL            Base URL of the deployed app, e.g. https://hanoinsiders.com
 *                      (or set CRYPTO_VERIFY_URL to the full endpoint URL)
 *   CRON_SECRET        Same secret configured in the Next app
 * Optional env:
 *   POLL_INTERVAL_MS   How often to check (default 20000 = 20s)
 *
 * Run locally:  node worker/crypto-poller.mjs
 * Railway:      set the start command to `node worker/crypto-poller.mjs`
 */

const APP_URL = (process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const VERIFY_URL = process.env.CRYPTO_VERIFY_URL || (APP_URL ? `${APP_URL}/api/cron/crypto-verify` : "");
const CRON_SECRET = process.env.CRON_SECRET || "";
const INTERVAL = Number(process.env.POLL_INTERVAL_MS) > 0 ? Number(process.env.POLL_INTERVAL_MS) : 20000;

if (!VERIFY_URL) {
  console.error("[crypto-poller] Missing APP_URL (or CRYPTO_VERIFY_URL). Exiting.");
  process.exit(1);
}
if (!CRON_SECRET) {
  console.error("[crypto-poller] Missing CRON_SECRET. Exiting.");
  process.exit(1);
}

let running = true;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tick() {
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[crypto-poller] ${res.status}`, body?.error ?? body);
      return;
    }
    if (body.checked > 0 || body.confirmed > 0 || body.expired > 0) {
      console.log(
        `[crypto-poller] checked=${body.checked} confirmed=${body.confirmed} expired=${body.expired} pending=${body.stillPending}` +
          (body.errors?.length ? ` errors=${body.errors.length}` : ""),
      );
    }
  } catch (err) {
    console.error("[crypto-poller] request failed:", err?.message ?? err);
  }
}

async function main() {
  console.log(`[crypto-poller] watching ${VERIFY_URL} every ${INTERVAL}ms`);
  while (running) {
    await tick();
    await sleep(INTERVAL);
  }
}

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    console.log(`[crypto-poller] ${sig} received, shutting down.`);
    running = false;
    process.exit(0);
  });
}

main();
