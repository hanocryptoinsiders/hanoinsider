-- Stripe subscription schema for Hano Insider.
-- Depends on 001_core_profiles.sql.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'stripe' check (provider in ('stripe', 'manual')),
  provider_customer_id text,
  provider_subscription_id text unique,
  provider_plan_id text,
  provider_price_id text,
  plan_type text check (plan_type in ('monthly', 'quarterly', 'yearly', 'early_bird', 'manual')),
  status text not null default 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_start timestamptz,
  trial_end timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own_or_admin" on public.subscriptions;
drop policy if exists "subscriptions_admin_all" on public.subscriptions;

create policy "subscriptions_select_own_or_admin"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "subscriptions_admin_all"
  on public.subscriptions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_provider on public.subscriptions(provider);
create index if not exists idx_subscriptions_provider_customer on public.subscriptions(provider_customer_id);
create index if not exists idx_subscriptions_provider_subscription on public.subscriptions(provider_subscription_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_subscriptions_current_period_end on public.subscriptions(current_period_end);
