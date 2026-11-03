-- Pace Challenge database schema
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to re-run: it drops and recreates policies/functions/triggers.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create table if not exists public.outcome_goals (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  unit text not null default '',
  start_value numeric not null,
  target_value numeric not null,
  sort int not null default 0,
  check (start_value <> target_value)
);

create table if not exists public.habit_goals (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target_per_week int not null default 7 check (target_per_week between 1 and 7),
  sort int not null default 0
);

create table if not exists public.outcome_logs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.outcome_goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  value numeric not null,
  unique (goal_id, date)
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habit_goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  unique (habit_id, date)
);

create table if not exists public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  note text not null default '',
  energy int check (energy between 1 and 5),
  unique (user_id, date)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create index if not exists challenges_user_idx on public.challenges (user_id);
create index if not exists outcome_logs_user_idx on public.outcome_logs (user_id, date);
create index if not exists habit_logs_user_idx on public.habit_logs (user_id, date);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- True when the signed-in user and `other` have an accepted friendship.
create or replace function public.is_friend(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = other)
        or (f.addressee_id = auth.uid() and f.requester_id = other))
  );
$$;

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8))),
    coalesce(new.raw_user_meta_data ->> 'display_name', 'New member')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security: you can edit your own data; accepted friends can read it.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.outcome_goals enable row level security;
alter table public.habit_goals enable row level security;
alter table public.outcome_logs enable row level security;
alter table public.habit_logs enable row level security;
alter table public.daily_notes enable row level security;
alter table public.friendships enable row level security;

-- Profiles: any signed-in user can look up profiles (needed to add friends by username).
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
  for select to authenticated using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Owner-or-friend read, owner-only write, for every per-user table.
do $$
declare t text;
begin
  foreach t in array array['challenges','outcome_goals','habit_goals','outcome_logs','habit_logs','daily_notes']
  loop
    execute format('drop policy if exists "%1$s read" on public.%1$I', t);
    execute format(
      'create policy "%1$s read" on public.%1$I for select to authenticated
         using (user_id = auth.uid() or public.is_friend(user_id))', t);
    execute format('drop policy if exists "%1$s write" on public.%1$I', t);
    execute format(
      'create policy "%1$s write" on public.%1$I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Friendships: both people can see the row; only the requester creates it (as pending);
-- only the addressee accepts it; either person can remove it.
drop policy if exists "friendships read" on public.friendships;
create policy "friendships read" on public.friendships
  for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));

drop policy if exists "friendships request" on public.friendships;
create policy "friendships request" on public.friendships
  for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

drop policy if exists "friendships accept" on public.friendships;
create policy "friendships accept" on public.friendships
  for update to authenticated
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid() and status = 'accepted');

drop policy if exists "friendships remove" on public.friendships;
create policy "friendships remove" on public.friendships
  for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));
