-- Premium community chat schema.
-- Depends on 001_core_profiles.sql.

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  admin_only boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.chat_rooms (slug, name, description, icon, admin_only, position)
values
  ('announcements', 'Announcements', 'Official updates from The Hano Insider team.', 'megaphone', true, 0),
  ('general', 'General', 'Premium member discussion.', 'message-circle', false, 1),
  ('signals', 'Signals', 'Market signals and trade ideas.', 'radio', false, 2),
  ('macro', 'Macro', 'Macro analysis, rates, liquidity, and markets.', 'globe', false, 3),
  ('on-chain', 'On-Chain', 'On-chain data, flows, and analytics.', 'link', false, 4)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    admin_only = excluded.admin_only,
    position = excluded.position;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  is_hidden boolean not null default false,
  reply_to_id uuid references public.chat_messages(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_user_status (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'muted', 'banned')),
  until timestamptz,
  reason text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_chat_user_status_updated_at on public.chat_user_status;
create trigger set_chat_user_status_updated_at
  before update on public.chat_user_status
  for each row execute function public.set_updated_at();

create table if not exists public.chat_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  target_user uuid references public.profiles(id) on delete set null,
  message_id uuid references public.chat_messages(id) on delete set null,
  action text not null check (action in (
    'hide_message',
    'unhide_message',
    'delete_message',
    'mute_user',
    'ban_user',
    'unban_user',
    'unmute_user'
  )),
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_user_status enable row level security;
alter table public.chat_moderation_actions enable row level security;

drop policy if exists "chat_rooms_read_authenticated" on public.chat_rooms;
drop policy if exists "chat_rooms_admin_all" on public.chat_rooms;
create policy "chat_rooms_read_authenticated"
  on public.chat_rooms for select
  to authenticated
  using (true);
create policy "chat_rooms_admin_all"
  on public.chat_rooms for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "chat_messages_read_premium" on public.chat_messages;
drop policy if exists "chat_messages_insert_premium" on public.chat_messages;
drop policy if exists "chat_messages_update_admin" on public.chat_messages;
drop policy if exists "chat_messages_delete_own_or_admin" on public.chat_messages;

create policy "chat_messages_read_premium"
  on public.chat_messages for select
  to authenticated
  using ((is_hidden = false and public.is_premium_user()) or public.is_admin());

create policy "chat_messages_insert_premium"
  on public.chat_messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_premium_user()
    and not exists (
      select 1 from public.chat_user_status s
      where s.user_id = auth.uid()
        and s.status in ('muted', 'banned')
        and (s.until is null or s.until > now())
    )
    and (
      not exists (
        select 1 from public.chat_rooms r
        where r.id = room_id and r.admin_only = true
      )
      or public.is_admin()
    )
  );

create policy "chat_messages_update_admin"
  on public.chat_messages for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "chat_messages_delete_own_or_admin"
  on public.chat_messages for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "chat_status_select_own_or_admin" on public.chat_user_status;
drop policy if exists "chat_status_admin_all" on public.chat_user_status;
create policy "chat_status_select_own_or_admin"
  on public.chat_user_status for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "chat_status_admin_all"
  on public.chat_user_status for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "chat_moderation_admin_all" on public.chat_moderation_actions;
create policy "chat_moderation_admin_all"
  on public.chat_moderation_actions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_chat_rooms_position on public.chat_rooms(position);
create index if not exists idx_chat_messages_room_created on public.chat_messages(room_id, created_at desc);
create index if not exists idx_chat_messages_user on public.chat_messages(user_id);
create index if not exists idx_chat_messages_reply on public.chat_messages(reply_to_id);
