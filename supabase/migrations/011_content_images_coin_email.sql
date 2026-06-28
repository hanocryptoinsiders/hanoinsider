-- Content image storage, optional coin linking, and email idempotency logs.
-- Depends on 002_cms_content.sql and 001_core_profiles.sql.

-- 1. Optional link from CMS content to a market coin (slug matches /dashboard/coins/[id])
alter table public.content_items
  add column if not exists related_coin_slug text;

create index if not exists idx_content_items_related_coin_slug
  on public.content_items(related_coin_slug)
  where related_coin_slug is not null;

-- 2. Recreate published_content view to include related_coin_slug
drop view if exists public.published_content;
create view public.published_content
with (security_invoker = true)
as
select
  id,
  title,
  slug,
  description,
  thumbnail_url,
  content_type,
  category,
  tags,
  is_premium,
  status,
  published_at,
  created_at,
  updated_at,
  author_id,
  case
    when is_premium = false or public.is_premium_user() then body
    else null
  end as body,
  case
    when is_premium = false or public.is_premium_user() then video_url
    else null
  end as video_url,
  related_coin_slug
from public.content_items
where status = 'published';

-- 3. Recreate public_shared_content view to include related_coin_slug
drop view if exists public.public_shared_content;
create view public.public_shared_content
with (security_invoker = true)
as
select
  id,
  title,
  slug,
  description,
  body,
  thumbnail_url,
  content_type,
  category,
  tags,
  is_premium,
  is_public,
  status,
  published_at,
  created_at,
  updated_at,
  related_coin_slug
from public.content_items
where is_public = true and status = 'published';

grant select on public.public_shared_content to anon, authenticated;

-- 4. Supabase Storage bucket for admin-uploaded content thumbnails (public read)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-images',
  'content-images',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 5. Welcome email idempotency (service-role only)
create table if not exists public.welcome_email_log (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  stripe_checkout_session_id text,
  resend_id text,
  sent_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists welcome_email_log_email_idx
  on public.welcome_email_log (email);

alter table public.welcome_email_log enable row level security;

-- 6. Community broadcast email log (service-role only, rate/abuse tracking)
create table if not exists public.community_email_log (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  sent_by uuid references auth.users(id) on delete set null,
  recipient_count integer not null default 0,
  resend_batch_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists community_email_log_created_at_idx
  on public.community_email_log (created_at desc);

alter table public.community_email_log enable row level security;

comment on table public.welcome_email_log is
  'Idempotent log for post-payment welcome emails. Service-role only.';
comment on table public.community_email_log is
  'Audit log for admin community broadcasts. Service-role only.';
