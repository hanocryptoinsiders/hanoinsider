-- Hano Insider core auth/profile schema.
-- Run first. Safe to rerun in Supabase SQL Editor.

create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.user_role as enum ('guest', 'free', 'premium', 'admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  role public.user_role not null default 'free',
  is_premium boolean not null default false,
  subscription_status text not null default 'inactive'
    check (subscription_status in ('active', 'inactive', 'cancelled', 'canceled', 'expired', 'past_due', 'trialing')),
  status text not null default 'active'
    check (status in ('active', 'suspended', 'banned')),

  -- Stripe is the payment provider for Hano Insider.
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_plan text,
  subscription_current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  premium_source text check (premium_source in ('manual', 'stripe')),

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_premium_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'active'
      and (
        role = 'admin'
        or role = 'premium'
        or is_premium = true
      )
      and (
        subscription_status not in ('expired', 'cancelled', 'canceled', 'past_due', 'inactive')
        or role = 'admin'
      )
      and (
        subscription_current_period_end is null
        or subscription_current_period_end > now()
        or role = 'admin'
      )
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_role public.user_role := 'free';
  user_full_name text;
  user_avatar text;
begin
  user_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)
  );

  user_avatar := coalesce(
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(new.raw_user_meta_data->>'picture', '')
  );

  if not exists (select 1 from public.profiles limit 1) then
    default_role := 'admin';
  end if;

  insert into public.profiles (
    id, full_name, email, avatar_url, role, is_premium,
    subscription_status, status, premium_source
  )
  values (
    new.id,
    user_full_name,
    new.email,
    user_avatar,
    default_role,
    default_role = 'admin',
    case when default_role = 'admin' then 'active' else 'inactive' end,
    'active',
    case when default_role = 'admin' then 'manual' else null end
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.check_profile_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SQL editor, service role, and trusted server jobs may update restricted fields.
  if auth.uid() is null or auth.role() = 'service_role' or public.get_my_role() = 'admin' then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Unauthorized: role cannot be changed by this user';
  end if;
  if new.is_premium is distinct from old.is_premium then
    raise exception 'Unauthorized: premium status cannot be changed by this user';
  end if;
  if new.subscription_status is distinct from old.subscription_status then
    raise exception 'Unauthorized: subscription status cannot be changed by this user';
  end if;
  if new.status is distinct from old.status then
    raise exception 'Unauthorized: account status cannot be changed by this user';
  end if;
  if new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.subscription_plan is distinct from old.subscription_plan
     or new.subscription_current_period_end is distinct from old.subscription_current_period_end
     or new.cancel_at_period_end is distinct from old.cancel_at_period_end
     or new.premium_source is distinct from old.premium_source then
    raise exception 'Unauthorized: payment fields cannot be changed by this user';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_profile_update_restrictions on public.profiles;
create trigger enforce_profile_update_restrictions
  before update on public.profiles
  for each row execute function public.check_profile_updates();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_update_self_safe" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;
drop policy if exists "profiles_system_insert" on public.profiles;

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_self_safe"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "profiles_system_insert"
  on public.profiles for insert
  with check (
    auth.uid() = id
    or auth.role() = 'service_role'
    or public.is_admin()
  );

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_is_premium on public.profiles(is_premium);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_stripe_customer on public.profiles(stripe_customer_id);
create index if not exists idx_profiles_stripe_subscription on public.profiles(stripe_subscription_id);
create index if not exists idx_profiles_subscription_expiry
  on public.profiles(subscription_current_period_end)
  where is_premium = true;
