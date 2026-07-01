-- 024_referral_rewards_system.sql
-- Aligns paid_customers with the pay-first referral flow.
-- Uses existing tables: affiliates (member codes), referral_rewards, referral_wallets.

alter table public.paid_customers
  add column if not exists referrer_user_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_paid_customers_referrer on public.paid_customers(referrer_user_id);

-- Allow members to count their own referral link clicks
drop policy if exists "referral_clicks_referrer_select" on public.referral_clicks;
create policy "referral_clicks_referrer_select"
  on public.referral_clicks for select
  to authenticated
  using (
    exists (
      select 1 from public.affiliates a
      where a.id = referral_clicks.affiliate_id
        and a.user_id = auth.uid()
    )
  );
