-- Manual crypto payment submissions (pay first, admin verifies, then register).

create table if not exists public.manual_crypto_payments (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  plan_id text not null,
  plan_name text not null,
  expected_amount numeric(12, 2) not null,
  amount_paid numeric(12, 2) not null,
  currency text not null,
  network text not null,
  receiving_wallet_address text not null,
  sender_wallet_address text not null,
  transaction_hash text not null,
  proof_screenshot_path text,
  user_notes text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  paid_customer_id uuid references public.paid_customers(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists manual_crypto_payments_tx_hash_unique
  on public.manual_crypto_payments (lower(trim(transaction_hash)));

create index if not exists manual_crypto_payments_email_idx
  on public.manual_crypto_payments (lower(email));

create index if not exists manual_crypto_payments_status_idx
  on public.manual_crypto_payments (status);

create index if not exists manual_crypto_payments_created_at_idx
  on public.manual_crypto_payments (created_at desc);

drop trigger if exists set_manual_crypto_payments_updated_at on public.manual_crypto_payments;
create trigger set_manual_crypto_payments_updated_at
  before update on public.manual_crypto_payments
  for each row execute function public.set_updated_at();

alter table public.manual_crypto_payments enable row level security;

-- All public access goes through server-side API (service role). Admins may read/update via RLS.
drop policy if exists manual_crypto_payments_admin_select on public.manual_crypto_payments;
create policy manual_crypto_payments_admin_select
  on public.manual_crypto_payments
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists manual_crypto_payments_admin_update on public.manual_crypto_payments;
create policy manual_crypto_payments_admin_update
  on public.manual_crypto_payments
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Link manual crypto approvals to paid_customers.
alter table public.paid_customers
  add column if not exists payment_provider text not null default 'stripe'
    check (payment_provider in ('stripe', 'manual_crypto'));

alter table public.paid_customers
  add column if not exists manual_crypto_payment_id uuid
    references public.manual_crypto_payments(id) on delete set null;

create index if not exists paid_customers_payment_provider_idx
  on public.paid_customers (payment_provider);

create index if not exists paid_customers_manual_crypto_payment_idx
  on public.paid_customers (manual_crypto_payment_id);

-- Private storage bucket for payment proof screenshots.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crypto-payment-proofs',
  'crypto-payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/pjpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Admins can read proof files; uploads happen via service role API only.
drop policy if exists crypto_payment_proofs_admin_select on storage.objects;
create policy crypto_payment_proofs_admin_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'crypto-payment-proofs'
    and public.is_admin()
  );
