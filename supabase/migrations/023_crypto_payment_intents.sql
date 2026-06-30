-- 023_crypto_payment_intents.sql
-- Automatic on-chain crypto payments.
--
-- Replaces the manual "submit proof → admin approves" flow with a self-serve
-- flow: the buyer is shown ONE receiving wallet + an exact amount and a short
-- payment window. A background watcher (Railway worker / cron) confirms the
-- transfer on-chain via the block explorer API, then marks the customer paid
-- and emails them. The manual_crypto_payments table from migration 021 is left
-- in place for historical/admin reference but is no longer written by the
-- public flow.
--
-- All writes happen via the Supabase service role (server API + watcher), which
-- bypasses RLS. Admins may read for support. A confirmed transaction hash can
-- only ever settle ONE intent (unique partial index below).

create table if not exists public.crypto_payment_intents (
  id uuid primary key default gen_random_uuid(),

  -- Buyer identity (captured before payment, used to gate registration).
  full_name text,
  email text not null,

  -- Plan + the exact amount we expect to receive (USD == stablecoin units).
  plan_id text not null,
  plan_name text not null,
  expected_amount numeric(18, 6) not null,

  -- On-chain target. One option for the public flow: USDT (BEP20) on BSC.
  currency text not null default 'USDT',
  network text not null default 'BSC',
  chain_id integer not null default 56,
  receiving_wallet_address text not null,
  token_contract_address text not null,
  token_decimals integer not null default 18,

  -- Lifecycle.
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'expired', 'failed')),
  expires_at timestamptz not null,

  -- Filled in once the buyer submits / the watcher detects the transfer.
  transaction_hash text,
  sender_wallet_address text,
  detected_amount numeric(18, 6),
  confirmed_at timestamptz,

  -- Link to the resulting paid_customers row (gates registration).
  paid_customer_id uuid references public.paid_customers(id) on delete set null,

  -- How many times the watcher has checked this intent (diagnostics).
  attempts integer not null default 0,
  last_error text,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- A given on-chain transaction may only ever confirm a single intent.
create unique index if not exists crypto_payment_intents_confirmed_tx_unique
  on public.crypto_payment_intents (lower(trim(transaction_hash)))
  where status = 'confirmed' and transaction_hash is not null;

create index if not exists crypto_payment_intents_status_idx
  on public.crypto_payment_intents (status);

create index if not exists crypto_payment_intents_email_idx
  on public.crypto_payment_intents (lower(email));

create index if not exists crypto_payment_intents_pending_idx
  on public.crypto_payment_intents (status, expires_at)
  where status = 'pending';

create index if not exists crypto_payment_intents_created_at_idx
  on public.crypto_payment_intents (created_at desc);

drop trigger if exists set_crypto_payment_intents_updated_at on public.crypto_payment_intents;
create trigger set_crypto_payment_intents_updated_at
  before update on public.crypto_payment_intents
  for each row execute function public.set_updated_at();

alter table public.crypto_payment_intents enable row level security;

-- Public access is server-only (service role bypasses RLS). Admins may read.
drop policy if exists crypto_payment_intents_admin_select on public.crypto_payment_intents;
create policy crypto_payment_intents_admin_select
  on public.crypto_payment_intents
  for select
  to authenticated
  using (public.is_admin());

-- Allow the 'crypto' provider value on paid_customers (migration 021 added
-- 'manual_crypto'; on-chain settlements reuse the same downstream treatment but
-- get their own label for clarity).
alter table public.paid_customers
  drop constraint if exists paid_customers_payment_provider_check;

alter table public.paid_customers
  add constraint paid_customers_payment_provider_check
    check (payment_provider in ('stripe', 'manual_crypto', 'crypto'));

alter table public.paid_customers
  add column if not exists crypto_payment_intent_id uuid
    references public.crypto_payment_intents(id) on delete set null;
