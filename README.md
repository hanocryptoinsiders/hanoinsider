# 🪙 Crypto Payments by Sanway — ✅ LIVE & WORKING

Members can pay for Hano Insiders with **crypto (USDC or USDT)** and get access
**automatically**. They send the coins to one wallet, click **Verify**, and the
server checks the blockchain and turns on their membership — no manual work.

> **Status: this is deployed and working in production right now.** A real
> payment has been confirmed end-to-end (send → verify → membership active).

- **Coins accepted:** **USDC and USDT** (either one)
- **Network:** BNB Smart Chain (BSC / BEP20)
- **Prices:** Regular **$79**, Early Bird **$49** (real plan prices)
- **Bridges work too:** paying via **relay.link** (Solana → BSC) is auto-detected
- **Card payments (Stripe) still work** alongside crypto

---

## ✅ What we built (in simple terms)

1. A **crypto checkout page** (`/pay/crypto`) that shows one wallet, the exact
   amount, a QR code, and a 10-minute timer.
2. A **backend that reads the blockchain** (via Alchemy) to see if the money
   actually arrived in the wallet.
3. **Automatic membership activation** + a **"Payment received" email** once the
   payment is confirmed.
4. An **admin panel** (Admin → Subscriptions → "Crypto payments") to manually
   check / activate / reject any payment if needed.
5. A **background watcher** (runs on Railway) that keeps checking for payments
   even if the buyer closes the page.

**No transaction hash needed.** We match the payment by the **amount** that lands
in the wallet — so exchange/bridge payments (which sometimes only give a Solana
hash) still work. The tx-hash box on the page is optional.

---

## How a payment flows

```
Buyer → /pay/crypto → types name + email
      → server creates a "payment intent" (exact amount + wallet + 10-min timer)
      → buyer sends USDC/USDT to the wallet (or bridges via relay.link)
      → buyer clicks "I've paid — verify now"
      → server reads the wallet on-chain (Alchemy)
            • finds the incoming transfer
            • amount is right (small shortfall allowed for fees), enough confirmations
      → membership activated → "Payment received" email sent
      → buyer registers (or is already in) → dashboard unlocked
```

### Where the code lives
| Area | File |
|---|---|
| Blockchain reader + matching | `lib/crypto/onchain.ts` |
| Config: wallet, coins, amount, timer, tolerance | `lib/crypto-payments.ts` |
| Payment lifecycle + activation + admin actions | `lib/crypto/payment-intents.ts` |
| Buyer page | `components/crypto/CryptoPaymentClient.tsx` (`/pay/crypto`) |
| Public APIs | `app/api/crypto/intent`, `.../verify`, `.../settings` |
| Admin APIs | `app/api/admin/crypto-intents/**` |
| Admin panel | `app/admin/subscriptions/AdminCryptoIntentsSection.tsx` |
| Emails | `lib/email/crypto-payment-emails.ts` |
| Background watcher | `worker/crypto-poller.mjs` |
| Database migration | `supabase/migrations/023_crypto_payment_intents.sql` |

---

## 🔧 How to change common things (easy)

### Change the WALLET ADDRESS (where money is received)
This is the wallet that receives all crypto payments. To change it:

1. Go to **Vercel → your project → Settings → Environment Variables**.
2. Edit **`CRYPTO_RECEIVING_WALLET`** and paste your new **BSC (EVM `0x…`) wallet
   address**. Example:
   ```
   CRYPTO_RECEIVING_WALLET=0xYourNewWalletAddressHere
   ```
3. **Redeploy** (Vercel → Deployments → ⋮ → Redeploy).
4. Also update it in your local `.env.local` if you test locally.

⚠️ It **must be a BSC (BNB Smart Chain) wallet** you control. Double-check it —
money sent to the wrong address is gone forever.

### Change the PRICE
- Real prices live in `lib/payments.ts`:
  ```ts
  PLAN_AMOUNTS_USD = { regular: 79, early_bird: 49 }
  ```
  Change those numbers, commit, push → new prices go live.
- For a cheap **test**, set `CRYPTO_PRICE_USD_OVERRIDE=0.1` (everyone pays $0.10).
  **Remove it for production** so real prices apply.

### Change how much "short" is allowed (fees)
`CRYPTO_AMOUNT_TOLERANCE_USD` = how much LESS than the price we still accept
(covers bridge/exchange fees). Example `1` = a $79 payment is accepted down to
$78. Overpayment is always accepted.

### Change the payment timer
`CRYPTO_PAYMENT_WINDOW_MINUTES` = minutes the buyer has to pay (default `10`).

---

## 🚀 GOING LIVE / LAUNCH — what to set (READ THIS)

You have **THREE** places to configure: **Supabase** (database), **Vercel** (the
website), and **Railway** (the background watcher). **All three are required.**

### 1) Supabase (database) — one time
Open **Supabase → SQL Editor** and run the file:
`supabase/migrations/023_crypto_payment_intents.sql`
(This creates the table that stores payments. Already done for the current DB.)

### 2) Vercel (the website) — set these Environment Variables
Vercel → your project → **Settings → Environment Variables**:

| Variable | What to put |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | your Supabase **secret** key (`sb_secret_…`) — **required** |
| `ALCHEMY_API_KEY` | your Alchemy key (BNB Smart Chain app) — **required** |
| `CRON_SECRET` | a random password — **must be identical in Railway** |
| `CRYPTO_RECEIVING_WALLET` | your live BSC wallet `0x…` |
| `CRYPTO_AMOUNT_TOLERANCE_USD` | `1` (allow small fee shortfalls) |
| `CRYPTO_MIN_CONFIRMATIONS` | `3` (safer for real money) |
| `RESEND_API_KEY` + `EMAIL_FROM` | to send the "Payment received" email |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase client keys |

**Do NOT set `CRYPTO_PRICE_USD_OVERRIDE`** in production (that's only for cheap
testing). Without it, real prices ($79 / $49) apply.

**After changing any variable on Vercel, you MUST click Redeploy** — env changes
don't apply to the old build.

### 3) Railway (background watcher) — REQUIRED, not optional
The watcher makes payments confirm **automatically** even if the buyer closes the
tab. **Set it up** (deploy from this repo — it uses `railway.json` automatically),
then add these **3** variables in Railway → your service → **Variables**:

| Variable | Value |
|---|---|
| `APP_URL` | **use the `www` domain**, e.g. `https://www.hanoinsiders.com` |
| `CRON_SECRET` | **the same value** you set on Vercel |
| `POLL_INTERVAL_MS` | `20000` |

> ⚠️ **VERY IMPORTANT — use the `www.` URL.** If your site redirects
> `hanoinsiders.com` → `www.hanoinsiders.com`, you **must** put the final `www.`
> address in `APP_URL`. On a redirect the security header is dropped and the
> watcher gets rejected (`401`). Using the direct `www.` URL avoids this. This is
> the exact issue we hit and fixed.

**Railway needs ONLY those 3 variables — do NOT put the Alchemy or Supabase keys
in Railway.** Those live in the Vercel app; the watcher only calls the app.

Check **Railway → Deployments → Deploy Logs**. Working looks like:
```
[crypto-poller] watching https://www.hanoinsiders.com/api/cron/crypto-verify every 20000ms
[crypto-poller] checked=0 confirmed=0 expired=0 pending=0
```

### ✅ Launch checklist
- [ ] Migration `023` run in Supabase
- [ ] Vercel has `SUPABASE_SERVICE_ROLE_KEY` + `ALCHEMY_API_KEY` + `CRON_SECRET`
- [ ] `CRYPTO_PRICE_USD_OVERRIDE` **removed** on Vercel (real prices)
- [ ] `CRYPTO_RECEIVING_WALLET` = your real wallet
- [ ] Redeployed Vercel after setting variables
- [ ] Railway watcher deployed with `APP_URL` = **`https://www.<yourdomain>`**
- [ ] `CRON_SECRET` is the **same** in Vercel and Railway
- [ ] Railway logs show `checked=… ` (not `401` / `500`)

---

## Admin: handling a payment manually
**Admin → Subscriptions → "Crypto payments (on-chain)"** shows every payment.
For any row you can:
- **Re-check** — scan the blockchain again (ignores the timer)
- **Manually activate** — force-grant access + send the email (use if someone
  paid but the auto-check couldn't see it)
- **Reject** — mark it failed

Use this when a member emails "I paid but don't have access."

---

## Email ("Payment received")
On confirmation the buyer gets a **"Payment received — your access is active"**
email. It needs `RESEND_API_KEY` (from resend.com) and a verified `EMAIL_FROM`
domain. Without the key, payments still work — the email is just skipped.

---

## Test it locally
```bash
cp .env.example .env.local      # fill in your values
pnpm dev                        # http://localhost:3000
```
Go to `/#pricing → Buy Now → Pay with USDC/USDT`, send the coins on BSC, click
**Verify**. For cheap testing set `CRYPTO_PRICE_USD_OVERRIDE=0.1` first.

> 🔒 **Security:** never commit secret keys (`SUPABASE_SERVICE_ROLE_KEY`,
> `ALCHEMY_API_KEY`). If a key was ever shared or committed, **rotate it**
> (Supabase and Alchemy both let you generate a fresh one), then update it in
> Vercel + `.env.local`.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
