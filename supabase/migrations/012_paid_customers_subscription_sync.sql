-- Store Stripe subscription snapshot on paid_customers when payment completes
-- before the user has registered (webhook cannot yet link subscriptions.user_id).

alter table public.paid_customers
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists subscription_current_period_end timestamptz;

create index if not exists paid_customers_stripe_subscription_idx
  on public.paid_customers (stripe_subscription_id);
