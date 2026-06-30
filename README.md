# 🪙 Crypto Payments by Sanway

Automatic, self-serve crypto checkout for Hano Insiders. A buyer picks a plan,
sends a stablecoin to **one wallet**, clicks **Verify**, and the server confirms
the payment **on-chain** and activates their membership — no middleman, no manual
chasing. An admin panel is included for any edge cases.

- **Network:** BNB Smart Chain (BSC, chain id `56`)
- **Tokens accepted:** **USDC and USDT** (BEP20) — either works
- **Bridges welcome:** paying via relay.link (Solana → BSC) delivers USDC and is matched automatically
- **Reader:** Alchemy (free tier covers BSC)
- **Verification:** happens when the buyer clicks **Verify** (and admins can verify/activate manually)

---

## How it works

```
Buyer → /pay/crypto → enters name + email
      → server creates a "payment intent" (exact amount + wallet + 10-min window)
      → buyer sends USDC/USDT (or bridges via relay.link) to the wallet
      → buyer clicks "I've paid — verify now"
      → POST /api/crypto/verify  →  reads the wallet on-chain via Alchemy
            • finds an incoming transfer to the wallet
            • amount ≥ expected − tolerance, enough confirmations, within window
      → intent marked CONFIRMED → paid_customers row set to "paid"
            (an already-registered account is upgraded to premium directly)
      → "Payment received" email is sent
      → buyer registers (or is already in) → dashboard unlocked
```

**No transaction hash is required.** Matching is done by **amount on the
receiving wallet**, so payments from exchanges/bridges (which may only give you a
Solana hash) still work. The tx-hash box is optional — a non-EVM hash is simply
ignored.

### Where the code lives

| Area | File |
|---|---|
| On-chain reader (Alchemy/Etherscan, matching) | `lib/crypto/onchain.ts` |
| Config (wallet, tokens, amount, window, tolerance) | `lib/crypto-payments.ts` |
| Intent lifecycle + settlement + admin actions | `lib/crypto/payment-intents.ts` |
| Buyer UI | `components/crypto/CryptoPaymentClient.tsx` → `/pay/crypto` |
| Public API | `app/api/crypto/intent`, `app/api/crypto/verify`, `app/api/crypto/settings` |
| Admin API | `app/api/admin/crypto-intents/**` |
| Admin UI panel | `app/admin/subscriptions/AdminCryptoIntentsSection.tsx` |
| Emails | `lib/email/crypto-payment-emails.ts` |
| Optional background watcher | `worker/crypto-poller.mjs` |
| DB migration | `supabase/migrations/023_crypto_payment_intents.sql` |

---

## Configuration (environment variables)

Set these in `.env.local` for local dev and in your host (Vercel) for production.

| Variable | Purpose | Example / default |
|---|---|---|
| `ALCHEMY_API_KEY` | On-chain reader (free, **required**). BNB Smart Chain app. | `CPqCNMuNy6JPGwoaJIGwW` |
| `CRYPTO_RECEIVING_WALLET` | Wallet that receives payments (EVM `0x…`) | `0x1b9b412726fb86eef215eb4ec9cef58a095fdc38` |
| `CRYPTO_PRICE_USD_OVERRIDE` | **Test mode** — flat amount for crypto. Remove for real prices. | `0.1` |
| `CRYPTO_AMOUNT_TOLERANCE_USD` | Accept up to this much under the amount (bridge/exchange fees). Overpay always OK. | `0.5` |
| `CRYPTO_PAYMENT_WINDOW_MINUTES` | How long the buyer has to pay | `10` |
| `CRYPTO_MIN_CONFIRMATIONS` | Confirmations before a transfer counts | `3` (use `1` for fast tests) |
| `CRYPTO_CURRENCY` | Display token (USDC/USDT both accepted regardless) | `USDC` |
| `CRYPTO_PAYMENTS_ENABLED` | Master on/off switch | `true` |
| `CRON_SECRET` | Auth for the background verifier / worker | any random string |
| `RESEND_API_KEY` | Sends the "Payment received" email (optional) | from resend.com |
| `SUPABASE_SERVICE_ROLE_KEY` | Server DB writes (**secret**, never commit) | `sb_secret_…` |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client | — |

> **Our Alchemy API key:** `CPqCNMuNy6JPGwoaJIGwW`
> (BNB Smart Chain Mainnet app — created at https://dashboard.alchemy.com).
> To get a new one: Alchemy → Create App → network **BNB Smart Chain → Mainnet** → copy the API Key.

### How to change the **wallet address**

Set `CRYPTO_RECEIVING_WALLET` to any EVM `0x…` address you control on BSC:

```bash
CRYPTO_RECEIVING_WALLET=0xYourNewWalletAddressHere
```

If unset, it falls back to the default in `lib/crypto-payments.ts`
(`DEFAULT_RECEIVING_WALLET`). After changing it, redeploy / restart.

### How to change the **amount**

- **For testing**, charge a flat amount regardless of plan:
  ```bash
  CRYPTO_PRICE_USD_OVERRIDE=0.1     # everyone pays 0.1
  ```
- **For production**, **remove** `CRYPTO_PRICE_USD_OVERRIDE`. The real plan prices
  then apply, defined in `lib/payments.ts`:
  ```ts
  PLAN_AMOUNTS_USD = { regular: 79, early_bird: 49 }
  ```
  Change those numbers to change real prices.
- `CRYPTO_AMOUNT_TOLERANCE_USD` controls how much under the amount is still
  accepted (set this to cover bridge fees, e.g. `1`–`2` for larger plans).

### Accepting a different token / chain
Both USDC and USDT on BSC are accepted by default (see `getAcceptedTokens()` in
`lib/crypto-payments.ts`). To add or change a token, set `CRYPTO_TOKEN_CONTRACT`,
`CRYPTO_TOKEN_DECIMALS`, `CRYPTO_CURRENCY` (and `CRYPTO_CHAIN_ID` for another chain
— make sure your Alchemy app covers it).

---

## Email ("Payment received")

When a payment is confirmed, the buyer gets a **"Payment received — your access is
active"** email (`buildCryptoPaymentReceivedEmail` in
`lib/email/crypto-payment-emails.ts`), telling them to register (or that they're
already active). To enable real sending, set:

```bash
RESEND_API_KEY=...                       # from https://resend.com
EMAIL_FROM="Hano Insiders <hi@hanoinsiders.com>"   # must be a verified domain
```

Without `RESEND_API_KEY` the flow still works — the email is just skipped/logged.

---

## Verification behavior

- **Buyer-triggered:** verification runs when the buyer clicks **"I've paid —
  verify now"**. Nothing is checked automatically on the page.
- **Admin panel:** **Admin → Subscriptions → "Crypto payments (on-chain)"** lists
  every payment. Per row you can **Re-check** (re-scan the chain, ignoring the
  window), **Manually activate** (force access + send the email — use when someone
  paid but auto-match couldn't see it), or **Reject**.
- **Optional background watcher** (`worker/crypto-poller.mjs`): if you run it, it
  auto-verifies pending payments even after the buyer closes the tab. **It's
  optional** — leave it off for strictly click-to-verify; run it for hands-off
  confirmation. (A Vercel cron in `vercel.json` does the same as a backup.)

---

## Hosting online (production)

### 1. Database (Supabase)
Run the migration once in **Supabase → SQL Editor**:
`supabase/migrations/023_crypto_payment_intents.sql`

### 2. App (Vercel)
Deploy the repo to Vercel and set the env vars (Project → Settings → Environment
Variables):
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
ALCHEMY_API_KEY, CRON_SECRET, RESEND_API_KEY, EMAIL_FROM
CRYPTO_RECEIVING_WALLET            # your live wallet
# (remove CRYPTO_PRICE_USD_OVERRIDE so real prices apply)
CRYPTO_MIN_CONFIRMATIONS=3
CRYPTO_AMOUNT_TOLERANCE_USD=1
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### 3. Background watcher (Railway) — optional
For hands-off confirmation, deploy the watcher to Railway:
1. New service from this repo.
2. Start command: `node worker/crypto-poller.mjs` (or `npm run worker`).
3. Env: `APP_URL=https://your-domain.com`, `CRON_SECRET=<same as the app>`,
   optional `POLL_INTERVAL_MS=20000`.

The worker needs only `APP_URL` + `CRON_SECRET` — all secrets stay in the app
(Supabase, Alchemy, Resend keys all live in the Next.js app). Run it locally with:

```bash
APP_URL=http://localhost:3000 CRON_SECRET=<your-secret> node worker/crypto-poller.mjs
```

### 4. Go-live checklist
- [ ] Migration `023` run on the prod database
- [ ] `ALCHEMY_API_KEY` set (BNB Smart Chain)
- [ ] `CRYPTO_RECEIVING_WALLET` = your real wallet
- [ ] `CRYPTO_PRICE_USD_OVERRIDE` **removed** (real prices)
- [ ] `CRYPTO_MIN_CONFIRMATIONS=3`, sensible `CRYPTO_AMOUNT_TOLERANCE_USD`
- [ ] `RESEND_API_KEY` + verified `EMAIL_FROM` for the receipt email
- [ ] `CRON_SECRET` set on both app and (if used) Railway worker

---

## Test it locally
```bash
cp .env.example .env.local      # fill in the values above
pnpm dev                        # http://localhost:3000
```
Go to `/#pricing → Buy Now → Crypto payment`, send **USDC or USDT on BSC** to the
wallet, click **Verify**. Confirmed → "Payment received" → `/register`.

> 🔒 **Security:** never commit `SUPABASE_SERVICE_ROLE_KEY` or secret keys. If a
> secret was shared anywhere, rotate it (Supabase/Alchemy both let you roll keys).

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
