-- Re-enable admin-controlled public content sharing.
-- Admins mark published items as public; anonymous visitors read them at /share/[slug].
-- Depends on 001_core_profiles.sql, 002_cms_content.sql, 011_content_images_coin_email.sql.

-- 1. Visibility flag (defaults false — nothing becomes public implicitly).
alter table public.content_items
  add column if not exists is_public boolean not null default false;

create index if not exists idx_content_items_is_public
  on public.content_items(is_public)
  where is_public = true;

-- 2. RLS: anonymous users may ONLY read explicitly public AND published content.
drop policy if exists "content_items_read_public_anon" on public.content_items;
create policy "content_items_read_public_anon"
  on public.content_items for select
  to anon
  using (is_public = true and status = 'published');

-- 3. Public read view (security_invoker = true so it respects the anon policy).
--    Full body/video are exposed because the admin intentionally made the item public.
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
  video_url,
  published_at,
  created_at,
  updated_at,
  related_coin_slug
from public.content_items
where is_public = true and status = 'published';

grant select on public.public_shared_content to anon, authenticated;
