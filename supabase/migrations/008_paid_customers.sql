-- 008_paid_customers.sql
-- Stores customers who completed payment BEFORE registering an account.
-- This table is the server-side source of truth for "has paid", and gates
-- both registration eligibility and dashboard access.
--
-- All writes happen via the Supabase service role (Stripe webhook + register API),
-- which bypasses RLS. Authenticated users may only read their own linked record.

create table if not exists public.paid_customers (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  email text not null,
  selected_plan text,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  payment_status text not null default 'pending',
  paid_at timestamptz,
  has_registered boolean not null default false,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Email is normalized (trimmed + lowercased) by the application before insert.
-- The unique index on lower(email) enforces one paid record per email.
create unique index if not exists paid_customers_email_unique on public.paid_customers (lower(email));
create index if not exists paid_customers_stripe_session_idx on public.paid_customers (stripe_checkout_session_id);
create index if not exists paid_customers_stripe_customer_idx on public.paid_customers (stripe_customer_id);
create index if not exists paid_customers_user_id_idx on public.paid_customers (user_id);

drop trigger if exists set_paid_customers_updated_at on public.paid_customers;
create trigger set_paid_customers_updated_at
  before update on public.paid_customers
  for each row execute function public.set_updated_at();

alter table public.paid_customers enable row level security;

-- Authenticated users can read only their own (already linked) paid record.
-- Inserts/updates are performed exclusively by the service role (bypasses RLS).
drop policy if exists paid_customers_select_own on public.paid_customers;
create policy paid_customers_select_own
  on public.paid_customers
  for select
  to authenticated
  using (user_id = auth.uid());
