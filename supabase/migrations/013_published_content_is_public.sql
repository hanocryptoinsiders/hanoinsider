-- Expose is_public on published_content so dashboard readers can share public links.

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
  is_public,
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
