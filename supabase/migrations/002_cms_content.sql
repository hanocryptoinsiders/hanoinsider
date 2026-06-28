-- Hano Insider CMS content schema.
-- Depends on 001_core_profiles.sql.

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  body text,
  thumbnail_url text,
  content_type text not null check (content_type in ('insight', 'article', 'video')),
  category text,
  tags text[] not null default '{}'::text[],
  is_premium boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  video_url text,
  author_id uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_content_items_updated_at on public.content_items;
create trigger set_content_items_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();

alter table public.content_items enable row level security;

drop policy if exists "content_items_admin_all" on public.content_items;
drop policy if exists "content_items_read_published" on public.content_items;

create policy "content_items_admin_all"
  on public.content_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "content_items_read_published"
  on public.content_items for select
  to authenticated
  using (status = 'published');

create or replace view public.published_content
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
  end as video_url
from public.content_items
where status = 'published';

create index if not exists idx_content_items_slug on public.content_items(slug);
create index if not exists idx_content_items_type_status on public.content_items(content_type, status);
create index if not exists idx_content_items_status on public.content_items(status);
create index if not exists idx_content_items_published_at on public.content_items(published_at desc);
create index if not exists idx_content_items_created_at on public.content_items(created_at desc);
create index if not exists idx_content_items_is_premium on public.content_items(is_premium);
