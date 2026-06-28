-- Revert public content sharing (migration 009 / 013).

drop view if exists public.public_shared_content;

drop policy if exists "content_items_read_public_anon" on public.content_items;

drop index if exists public.idx_content_items_is_public;

drop view if exists public.published_content;

alter table public.content_items
  drop column if exists is_public;

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