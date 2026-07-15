-- Migration 00003: Fix RLS Policies for Profiles
-- Ensures the UPDATE policy has an explicit WITH CHECK clause.
-- Also re-creates all profile policies to be explicit and correct.
--
-- NOTE: If you encounter "permission denied for table profiles", ensure
-- all tables are exposed in the Supabase dashboard under
-- Settings → API → Exposed tables.

-- ============================================================
-- Drop existing policies (safe — IF EXISTS handles missing ones)
-- ============================================================
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can insert own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Users can delete own profile" on profiles;

-- ============================================================
-- Re-create policies with explicit USING and WITH CHECK
-- ============================================================

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete own profile"
  on profiles for delete
  using (auth.uid() = id);

-- ============================================================
-- Verify RLS is enabled
-- ============================================================
alter table profiles enable row level security;