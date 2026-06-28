-- Notifications and support tickets.
-- Depends on 001_core_profiles.sql.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'alert')),
  link text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_reads (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default timezone('utc', now()),
  constraint notification_reads_notification_user_key unique (notification_id, user_id)
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null check (char_length(trim(subject)) between 1 and 160),
  message text not null check (char_length(trim(message)) between 1 and 5000),
  status text not null default 'open' check (status in ('open', 'pending', 'closed')),
  admin_response text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_support_tickets_updated_at on public.support_tickets;
create trigger set_support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.support_tickets enable row level security;

drop policy if exists "notifications_read_authenticated" on public.notifications;
drop policy if exists "notifications_admin_all" on public.notifications;
create policy "notifications_read_authenticated"
  on public.notifications for select
  to authenticated
  using (true);
create policy "notifications_admin_all"
  on public.notifications for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "notification_reads_select_own" on public.notification_reads;
drop policy if exists "notification_reads_insert_own" on public.notification_reads;
drop policy if exists "notification_reads_update_own" on public.notification_reads;
drop policy if exists "notification_reads_admin_all" on public.notification_reads;
create policy "notification_reads_select_own"
  on public.notification_reads for select
  to authenticated
  using (auth.uid() = user_id);
create policy "notification_reads_insert_own"
  on public.notification_reads for insert
  to authenticated
  with check (auth.uid() = user_id);
create policy "notification_reads_update_own"
  on public.notification_reads for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "notification_reads_admin_all"
  on public.notification_reads for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "support_tickets_select_own_or_admin" on public.support_tickets;
drop policy if exists "support_tickets_insert_own" on public.support_tickets;
drop policy if exists "support_tickets_admin_update" on public.support_tickets;
create policy "support_tickets_select_own_or_admin"
  on public.support_tickets for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());
create policy "support_tickets_insert_own"
  on public.support_tickets for insert
  to authenticated
  with check (auth.uid() = user_id);
create policy "support_tickets_admin_update"
  on public.support_tickets for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notification_reads_user_id on public.notification_reads(user_id);
create index if not exists idx_notification_reads_notification_id on public.notification_reads(notification_id);
create index if not exists idx_support_tickets_user_id on public.support_tickets(user_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_support_tickets_created_at on public.support_tickets(created_at desc);
