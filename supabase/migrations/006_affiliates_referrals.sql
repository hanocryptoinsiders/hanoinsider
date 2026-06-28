-- Affiliate and referral tracking.
-- Depends on 001_core_profiles.sql.

create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text,
  email text,
  referral_code text not null unique,
  commission_rate numeric(6, 4) not null default 0 check (commission_rate >= 0 and commission_rate <= 1),
  status text not null default 'active' check (status in ('active', 'disabled')),
  payout_method text,
  payout_details text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_affiliates_updated_at on public.affiliates;
create trigger set_affiliates_updated_at
  before update on public.affiliates
  for each row execute function public.set_updated_at();

create table if not exists public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referral_code text,
  visitor_id text not null,
  ip_hash text,
  user_agent text,
  landing_page text,
  referrer_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade unique,
  referral_code text,
  status text not null default 'signed_up' check (status in ('signed_up', 'converted', 'cancelled')),
  first_click_at timestamptz,
  signed_up_at timestamptz not null default timezone('utc', now()),
  converted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_referrals_updated_at on public.referrals;
create trigger set_referrals_updated_at
  before update on public.referrals
  for each row execute function public.set_updated_at();

create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  referral_id uuid references public.referrals(id) on delete set null,
  provider text not null default 'stripe',
  provider_payment_id text unique,
  provider_subscription_id text,
  payment_amount numeric(12, 2) not null default 0,
  payment_currency text not null default 'USD',
  commission_rate numeric(6, 4) not null default 0,
  commission_amount numeric(12, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'cancelled')),
  payable_at timestamptz,
  paid_at timestamptz,
  payout_reference text,
  notes text,
  raw_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_affiliate_commissions_updated_at on public.affiliate_commissions;
create trigger set_affiliate_commissions_updated_at
  before update on public.affiliate_commissions
  for each row execute function public.set_updated_at();

create table if not exists public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  method text,
  payout_reference text,
  status text not null default 'paid',
  notes text,
  paid_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.affiliates enable row level security;
alter table public.referral_clicks enable row level security;
alter table public.referrals enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.affiliate_payouts enable row level security;

drop policy if exists "affiliates_admin_all" on public.affiliates;
drop policy if exists "affiliates_select_own" on public.affiliates;
drop policy if exists "affiliates_insert_own" on public.affiliates;
create policy "affiliates_admin_all"
  on public.affiliates for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy "affiliates_select_own"
  on public.affiliates for select
  to authenticated
  using (auth.uid() = user_id);
create policy "affiliates_insert_own"
  on public.affiliates for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'active'
    and commission_rate = 0
  );

drop policy if exists "referral_clicks_admin_select" on public.referral_clicks;
create policy "referral_clicks_admin_select"
  on public.referral_clicks for select
  to authenticated
  using (public.is_admin());

drop policy if exists "referrals_admin_all" on public.referrals;
drop policy if exists "referrals_affiliate_select" on public.referrals;
drop policy if exists "referrals_referred_user_select" on public.referrals;
create policy "referrals_admin_all"
  on public.referrals for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy "referrals_affiliate_select"
  on public.referrals for select
  to authenticated
  using (exists (
    select 1 from public.affiliates a
    where a.id = referrals.affiliate_id and a.user_id = auth.uid()
  ));
create policy "referrals_referred_user_select"
  on public.referrals for select
  to authenticated
  using (auth.uid() = referred_user_id);

drop policy if exists "affiliate_commissions_admin_all" on public.affiliate_commissions;
drop policy if exists "affiliate_commissions_affiliate_select" on public.affiliate_commissions;
create policy "affiliate_commissions_admin_all"
  on public.affiliate_commissions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy "affiliate_commissions_affiliate_select"
  on public.affiliate_commissions for select
  to authenticated
  using (exists (
    select 1 from public.affiliates a
    where a.id = affiliate_commissions.affiliate_id and a.user_id = auth.uid()
  ));

drop policy if exists "affiliate_payouts_admin_all" on public.affiliate_payouts;
drop policy if exists "affiliate_payouts_affiliate_select" on public.affiliate_payouts;
create policy "affiliate_payouts_admin_all"
  on public.affiliate_payouts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy "affiliate_payouts_affiliate_select"
  on public.affiliate_payouts for select
  to authenticated
  using (exists (
    select 1 from public.affiliates a
    where a.id = affiliate_payouts.affiliate_id and a.user_id = auth.uid()
  ));

create index if not exists idx_affiliates_user_id on public.affiliates(user_id);
create index if not exists idx_affiliates_referral_code on public.affiliates(referral_code);
create index if not exists idx_affiliates_status on public.affiliates(status);
create index if not exists idx_referral_clicks_affiliate on public.referral_clicks(affiliate_id);
create index if not exists idx_referral_clicks_visitor on public.referral_clicks(visitor_id);
create index if not exists idx_referral_clicks_created_at on public.referral_clicks(created_at desc);
create index if not exists idx_referrals_affiliate on public.referrals(affiliate_id);
create index if not exists idx_referrals_referred_user on public.referrals(referred_user_id);
create index if not exists idx_commissions_affiliate on public.affiliate_commissions(affiliate_id);
create index if not exists idx_commissions_referred_user on public.affiliate_commissions(referred_user_id);
create index if not exists idx_commissions_status on public.affiliate_commissions(status);
create index if not exists idx_commissions_provider_payment on public.affiliate_commissions(provider_payment_id);
create index if not exists idx_payouts_affiliate on public.affiliate_payouts(affiliate_id);
