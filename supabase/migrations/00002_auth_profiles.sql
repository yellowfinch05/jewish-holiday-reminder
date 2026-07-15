-- Migration 00002: Auth & Profiles Phase 2
-- Adds onboarding_complete flag to profiles.
-- Renames candle_lighting notification timing to at_sunset.

-- ============================================================
-- PROFILES: Add onboarding tracking
-- ============================================================
alter table profiles
  add column if not exists onboarding_complete boolean not null default false;

-- ============================================================
-- NOTIFICATION TIMINGS: Rename candle_lighting to at_sunset
-- ============================================================

-- Step 1: Update existing records
update notification_timings
  set timing = 'at_sunset'
  where timing = 'candle_lighting';

-- Step 2: Drop old constraint
alter table notification_timings
  drop constraint if exists notification_timings_timing_check;

-- Step 3: Add new constraint
alter table notification_timings
  add constraint notification_timings_timing_check
  check (timing in ('1_week', '1_day', '1_hour', 'at_sunset'));