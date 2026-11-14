-- OPTIONAL. Only if your Supabase project still has tables from the first Pace
-- prototype (challenges, outcome goals, habit logs, daily notes).
-- This permanently deletes those tables and everything in them.
-- Run it after the v1 migration if you no longer need that old data.
drop table if exists public.outcome_logs cascade;
drop table if exists public.habit_logs cascade;
drop table if exists public.daily_notes cascade;
drop table if exists public.outcome_goals cascade;
drop table if exists public.habit_goals cascade;
drop table if exists public.challenges cascade;
drop function if exists public.is_friend(uuid);
drop function if exists public.handle_new_user();
