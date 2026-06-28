-- Public content sharing for Hano Insider CMS.
-- Lets admins flip selected articles/pages to publicly shareable content that
-- anonymous (logged-out) visitors can read at /share/[slug].
-- Depends on 001_core_profiles.sql and 002_cms_content.sql.

-- 1. Visibility flag. Defaults to false so nothing becomes public implicitly.
alter table public.content_items
  add column if not exists is_public boolean not null default false;

create index if not exists idx_content_items_is_public
  on public.content_items(is_public)
  where is_public = true;

-- 2. RLS: anonymous users may ONLY read content that is explicitly public AND
--    published. Drafts, archived, private, and premium-gated dashboard data stay
--    invisible to anon. Authenticated read rules from 002 are unchanged.
drop policy if exists "content_items_read_public_anon" on public.content_items;
create policy "content_items_read_public_anon"
  on public.content_items for select
  to anon
  using (is_public = true and status = 'published');

-- 3. Public read view (security_invoker = true so it respects the anon policy).
--    Exposes the full body for shared content because the admin intentionally
--    made it public; premium masking does not apply to explicitly shared pages.
create or replace view public.public_shared_content
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
  updated_at
from public.content_items
where is_public = true and status = 'published';

grant select on public.public_shared_content to anon, authenticated;
