-- 010_subscription_email_log.sql
--
-- Idempotency log for subscription lifecycle emails (expiry reminders, expiry-day
-- notice, expired notice). One row per (user, email_type, period_end) guarantees
-- each email is sent at most once per billing period, even if the cron runs
-- multiple times a day.
--
-- Service-role only: RLS is enabled with NO policies, so the table is only
-- reachable through the service role (which bypasses RLS) from trusted server code.

create table if not exists public.subscription_email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  email_type text not null,
  period_end timestamptz,
  resend_id text,
  sent_at timestamptz not null default now()
);

create unique index if not exists subscription_email_log_unique_idx
  on public.subscription_email_log (user_id, email_type, period_end);

create index if not exists subscription_email_log_user_idx
  on public.subscription_email_log (user_id);

alter table public.subscription_email_log enable row level security;

comment on table public.subscription_email_log is
  'Tracks expiry reminder/expiry/expired emails sent per user per billing period to guarantee idempotent (once-only) delivery. Service-role only; RLS enabled with no policies.';
