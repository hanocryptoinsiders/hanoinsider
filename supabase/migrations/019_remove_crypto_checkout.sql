-- Remove the former crypto checkout schema. Safe to run even when those
-- objects were never created.

drop table if exists public.payment_webhook_events;
drop table if exists public.crypto_payments;

drop index if exists public.paid_customers_payment_provider_idx;
drop index if exists public.paid_customers_crypto_order_idx;
drop index if exists public.paid_customers_crypto_payment_idx;

alter table public.paid_customers
  drop column if exists payment_provider,
  drop column if exists crypto_order_id,
  drop column if exists crypto_payment_id;

update public.profiles
set premium_source = 'manual'
where premium_source = 'crypto';

alter table public.profiles
  drop constraint if exists profiles_premium_source_check;

alter table public.profiles
  add constraint profiles_premium_source_check
  check (premium_source in ('manual', 'stripe'));
