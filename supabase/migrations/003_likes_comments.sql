-- Likes and comments for CMS content.
-- Depends on 001_core_profiles.sql and 002_cms_content.sql.

create table if not exists public.content_likes (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint content_likes_content_user_key unique (content_id, user_id)
);

create table if not exists public.content_comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(trim(text)) between 1 and 1000),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.content_likes enable row level security;
alter table public.content_comments enable row level security;

drop policy if exists "content_likes_read" on public.content_likes;
drop policy if exists "content_likes_insert_own" on public.content_likes;
drop policy if exists "content_likes_delete_own" on public.content_likes;

create policy "content_likes_read"
  on public.content_likes for select
  to authenticated
  using (true);

create policy "content_likes_insert_own"
  on public.content_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "content_likes_delete_own"
  on public.content_likes for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "content_comments_read" on public.content_comments;
drop policy if exists "content_comments_insert_own" on public.content_comments;
drop policy if exists "content_comments_delete_own_or_admin" on public.content_comments;

create policy "content_comments_read"
  on public.content_comments for select
  to authenticated
  using (true);

create policy "content_comments_insert_own"
  on public.content_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "content_comments_delete_own_or_admin"
  on public.content_comments for delete
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

create index if not exists idx_content_likes_content_id on public.content_likes(content_id);
create index if not exists idx_content_likes_user_id on public.content_likes(user_id);
create index if not exists idx_content_comments_content_id on public.content_comments(content_id);
create index if not exists idx_content_comments_user_id on public.content_comments(user_id);
create index if not exists idx_content_comments_created_at on public.content_comments(created_at desc);
