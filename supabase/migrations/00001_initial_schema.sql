-- Migration 00001: Initial Schema
-- Creates all tables for the Jewish Holiday Reminder App MVP.
-- Run: `supabase db push` or paste into Supabase SQL Editor.

-- ============================================================
-- PROFILES
-- Extends Supabase Auth users with app-specific settings.
-- ============================================================
create table if not exists profiles (
  id          uuid references auth.users primary key,
  location    text not null default 'New York',
  timezone    text not null default 'America/New_York',
  created_at  timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- HOLIDAY PREFERENCES
-- Per-user toggle for each holiday.
-- ============================================================
create table if not exists holiday_preferences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  holiday_id  text not null,
  enabled     boolean not null default true,
  unique(user_id, holiday_id)
);

alter table holiday_preferences enable row level security;

create policy "Users can view own holiday preferences"
  on holiday_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own holiday preferences"
  on holiday_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own holiday preferences"
  on holiday_preferences for update
  using (auth.uid() = user_id);

create policy "Users can delete own holiday preferences"
  on holiday_preferences for delete
  using (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATION TIMINGS
-- Per-user, per-holiday reminder schedule.
-- ============================================================
create table if not exists notification_timings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  holiday_id  text not null,
  timing      text not null check (timing in ('1_week', '1_day', '1_hour', 'candle_lighting')),
  unique(user_id, holiday_id, timing)
);

alter table notification_timings enable row level security;

create policy "Users can view own notification timings"
  on notification_timings for select
  using (auth.uid() = user_id);

create policy "Users can insert own notification timings"
  on notification_timings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notification timings"
  on notification_timings for update
  using (auth.uid() = user_id);

create policy "Users can delete own notification timings"
  on notification_timings for delete
  using (auth.uid() = user_id);

-- ============================================================
-- PUSH SUBSCRIPTIONS
-- Stores VAPID push endpoints per user/browser.
-- ============================================================
create table if not exists push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  endpoint        text not null,
  p256dh_key      text not null,
  auth_key        text not null,
  created_at      timestamp with time zone default now(),
  unique(user_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "Users can view own push subscriptions"
  on push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own push subscriptions"
  on push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own push subscriptions"
  on push_subscriptions for delete
  using (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATION QUEUE
-- Precomputed notifications pending delivery.
-- ============================================================
create table if not exists notification_queue (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  holiday_id      text not null,
  title           text not null,
  body            text not null,
  send_at         timestamp with time zone not null,
  sent            boolean not null default false,
  sent_at         timestamp with time zone,
  failed_attempts integer not null default 0,
  created_at      timestamp with time zone default now()
);

alter table notification_queue enable row level security;

create policy "Service role can manage notification queue"
  on notification_queue for all
  using (true)
  with check (true);

-- Index for efficient polling by the delivery worker
create index if not exists idx_notification_queue_pending
  on notification_queue (send_at, sent)
  where sent = false;