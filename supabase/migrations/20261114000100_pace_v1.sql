-- =============================================================================
-- Pace v1 schema: profiles, goals, logs, friends, groups, cheers, comments.
--
-- How to run (hosted Supabase): Dashboard -> SQL Editor -> New query ->
-- paste this whole file -> Run. It is safe to run again.
--
-- Privacy model (enforced here, not in the app):
--   * Everything you create is readable and writable only by you.
--   * Accepted friends and fellow group members can see ONLY percentages and
--     streaks for goals you mark "friends", through the functions at the
--     bottom of this file. They can never read your logs, values, notes or
--     times. Raw tables have owner-only row-level security.
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated; -- RLS helpers live here

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- One row per account, created automatically on sign-up (trigger below).
-- Uses "if not exists" + "add column" so it also upgrades the first prototype.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
alter table public.profiles
  add column if not exists avatar_emoji text not null default '🌻',
  add column if not exists avatar_bg text not null default '#FBF0D9',
  add column if not exists accent text not null default 'golden',
  add column if not exists onboarded boolean not null default false;
alter table public.profiles alter column display_name set default '';

alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$');
alter table public.profiles drop constraint if exists profiles_display_name_len;
alter table public.profiles add constraint profiles_display_name_len check (char_length(display_name) <= 40);
alter table public.profiles drop constraint if exists profiles_accent_check;
alter table public.profiles add constraint profiles_accent_check
  check (accent in ('golden', 'peach', 'berry', 'lagoon', 'sky', 'matcha'));
alter table public.profiles drop constraint if exists profiles_avatar_bg_check;
alter table public.profiles add constraint profiles_avatar_bg_check
  check (avatar_bg in ('#FBF0D9', '#FBE3EC', '#E6E3F7', '#DDEFF7', '#E3F1E8', '#FBE1DF', '#F2ECF0', '#FFFFFF'));
alter table public.profiles drop constraint if exists profiles_avatar_emoji_len;
alter table public.profiles add constraint profiles_avatar_emoji_len check (char_length(avatar_emoji) between 1 and 8);

-- A habit or workout goal.
--   cadence daily  -> "target" units every day (e.g. 10 min journal, 1 = just do it)
--   cadence weekly -> "target" units across Sun–Sat (e.g. run 3 times)
--   timed          -> habit is done with the in-app timer (unit is minutes)
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 60),
  type text not null default 'habit' check (type in ('habit', 'workout')),
  icon text not null default 'star' check (char_length(icon) <= 24),
  target numeric not null default 1 check (target > 0 and target <= 100000),
  unit text not null default 'times' check (char_length(unit) <= 24),
  cadence text not null default 'daily' check (cadence in ('daily', 'weekly')),
  visibility text not null default 'friends' check (visibility in ('private', 'friends')),
  timed boolean not null default false,
  start_date date not null default current_date,
  archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists goals_owner_idx on public.goals (owner_id) where not archived;

-- A check-in. "value" counts toward the goal's target (1 for a tap, minutes
-- for timed habits, sessions or minutes or miles for workouts).
create table if not exists public.progress_logs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date date not null,
  value numeric not null default 1 check (value >= 0 and value <= 100000),
  note text check (char_length(note) <= 500),
  duration_min numeric check (duration_min >= 0 and duration_min <= 1440),
  distance numeric check (distance >= 0 and distance <= 1000),
  effort smallint check (effort between 1 and 5),
  activity text check (char_length(activity) <= 24),
  created_at timestamptz not null default now()
);
create index if not exists progress_logs_user_date_idx on public.progress_logs (user_id, date);
create index if not exists progress_logs_goal_date_idx on public.progress_logs (goal_id, date);

-- Friend requests and friendships. One row per pair, whichever direction.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  emoji text not null default '🌅' check (char_length(emoji) between 1 and 8),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'joined')),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members (user_id);

-- Emoji reaction on a friend's log (one per person per log).
create table if not exists public.cheers (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.progress_logs (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('🔥', '👏', '💪', '❤️')),
  created_at timestamptz not null default now(),
  unique (log_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.progress_logs (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists comments_log_idx on public.comments (log_id);

-- -----------------------------------------------------------------------------
-- Access helpers (security definer so policies don't recurse)
-- -----------------------------------------------------------------------------

create or replace function private.is_friend(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = other)
        or (f.addressee_id = auth.uid() and f.requester_id = other))
  );
$$;

-- Friend, or both have joined the same group.
create or replace function private.can_view_user(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select other = auth.uid()
    or private.is_friend(other)
    or exists (
      select 1
      from public.group_members a
      join public.group_members b on b.group_id = a.group_id
      where a.user_id = auth.uid() and a.status = 'joined'
        and b.user_id = other and b.status = 'joined'
    );
$$;

-- Who may see your name and avatar: you, anyone with a request or friendship
-- with you (either direction), and people in a group with you (incl. invites).
create or replace function private.can_see_profile(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select other = auth.uid()
    or exists (
      select 1 from public.friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = other)
         or (f.addressee_id = auth.uid() and f.requester_id = other)
    )
    or exists (
      select 1
      from public.group_members a
      join public.group_members b on b.group_id = a.group_id
      where a.user_id = auth.uid() and b.user_id = other
    );
$$;

create or replace function private.is_group_member(gid uuid, joined_only boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = gid and m.user_id = auth.uid()
      and (not joined_only or m.status = 'joined')
  );
$$;

create or replace function private.is_group_owner(gid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.groups g where g.id = gid and g.owner_id = auth.uid());
$$;

-- Cheers and comments are allowed on a log when it's yours, or it's on a goal
-- shared with friends and you can view its owner.
create or replace function private.can_social_log(p_log uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.progress_logs l
    join public.goals g on g.id = l.goal_id
    where l.id = p_log
      and (l.user_id = auth.uid()
        or (g.visibility = 'friends' and not g.archived and private.can_view_user(l.user_id)))
  );
$$;

revoke all on all functions in schema private from public;
grant execute on function
  private.is_friend(uuid),
  private.can_view_user(uuid),
  private.can_see_profile(uuid),
  private.is_group_member(uuid, boolean),
  private.is_group_owner(uuid),
  private.can_social_log(uuid)
to authenticated;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

-- Create a profile on sign-up with a unique username from the email.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'pacer'), '[^a-zA-Z0-9_]', '', 'g'));
  base := left(base, 18);
  if char_length(base) < 3 then base := base || 'pacer'; end if;
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;
  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, coalesce(left(new.raw_user_meta_data ->> 'display_name', 40), ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Whoever creates a group joins it.
create or replace function private.handle_new_group()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.group_members (group_id, user_id, status, invited_by)
  values (new.id, new.owner_id, 'joined', new.owner_id)
  on conflict (group_id, user_id) do update set status = 'joined';
  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function private.handle_new_group();

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.progress_logs enable row level security;
alter table public.friendships enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.cheers enable row level security;
alter table public.comments enable row level security;

-- Start clean (also removes policies left by the first prototype).
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'goals', 'progress_logs', 'friendships', 'groups', 'group_members', 'cheers', 'comments')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Nobody signed out can read or write anything.
revoke all on public.profiles, public.goals, public.progress_logs, public.friendships,
  public.groups, public.group_members, public.cheers, public.comments from anon;

-- profiles: see yourself + people connected to you; change only your own.
create policy profiles_select on public.profiles for select to authenticated
  using (private.can_see_profile(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from authenticated;
grant update (username, display_name, avatar_emoji, avatar_bg, accent, onboarded) on public.profiles to authenticated;

-- goals and logs: owner only, for everything.
create policy goals_owner on public.goals for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy logs_owner on public.progress_logs for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.goals g where g.id = goal_id and g.owner_id = auth.uid())
  );

-- friendships: both people see the row; you send requests as yourself; only
-- the addressee can accept; either can remove (decline / unfriend).
create policy friendships_select on public.friendships for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));
create policy friendships_insert on public.friendships for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');
create policy friendships_accept on public.friendships for update to authenticated
  using (addressee_id = auth.uid()) with check (addressee_id = auth.uid() and status = 'accepted');
create policy friendships_delete on public.friendships for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));
revoke update on public.friendships from authenticated;
grant update (status) on public.friendships to authenticated;

-- groups: members (incl. invited) can see it; owner manages it.
create policy groups_select on public.groups for select to authenticated
  using (owner_id = auth.uid() or private.is_group_member(id, false));
create policy groups_insert on public.groups for insert to authenticated
  with check (owner_id = auth.uid());
create policy groups_update on public.groups for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy groups_delete on public.groups for delete to authenticated
  using (owner_id = auth.uid());
revoke update on public.groups from authenticated;
grant update (name, emoji) on public.groups to authenticated;

-- group_members: members see the roster; joined members invite their friends;
-- you accept your own invite; you can leave, and the owner can remove anyone.
create policy members_select on public.group_members for select to authenticated
  using (private.is_group_member(group_id, false));
create policy members_invite on public.group_members for insert to authenticated
  with check (
    invited_by = auth.uid()
    and status = 'invited'
    and private.is_group_member(group_id, true)
    and private.is_friend(user_id)
  );
create policy members_accept on public.group_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and status = 'joined');
create policy members_delete on public.group_members for delete to authenticated
  using (user_id = auth.uid() or private.is_group_owner(group_id));
revoke update on public.group_members from authenticated;
grant update (status) on public.group_members to authenticated;

-- cheers and comments: visible to the log owner and people allowed to view it.
create policy cheers_select on public.cheers for select to authenticated
  using (private.can_social_log(log_id));
create policy cheers_insert on public.cheers for insert to authenticated
  with check (user_id = auth.uid() and private.can_social_log(log_id));
create policy cheers_update on public.cheers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and private.can_social_log(log_id));
create policy cheers_delete on public.cheers for delete to authenticated
  using (user_id = auth.uid());
revoke update on public.cheers from authenticated;
grant update (emoji) on public.cheers to authenticated;

create policy comments_select on public.comments for select to authenticated
  using (private.can_social_log(log_id));
create policy comments_insert on public.comments for insert to authenticated
  with check (user_id = auth.uid() and private.can_social_log(log_id));
create policy comments_delete on public.comments for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.progress_logs l where l.id = log_id and l.user_id = auth.uid())
  );
revoke update on public.comments from authenticated;

-- -----------------------------------------------------------------------------
-- Stats (computed, never stored). Internal: not callable by app users.
-- Weeks run Sunday–Saturday. "Today" is passed in by the app so it matches
-- the person's own time zone.
-- -----------------------------------------------------------------------------

-- Progress per goal per day, 0..1. Daily goals: that day's total / target.
-- Weekly goals: week-to-date total / target.
create or replace function private.goal_days(
  p_user uuid, p_from date, p_to date, p_shared_only boolean, p_goal uuid default null
)
returns table (goal_id uuid, day date, cadence text, progress numeric, logged boolean)
language sql stable set search_path = '' as $$
  with g as (
    select g.id, g.cadence, g.target, g.start_date
    from public.goals g
    where g.owner_id = p_user and not g.archived
      and (not p_shared_only or g.visibility = 'friends')
      and (p_goal is null or g.id = p_goal)
  ),
  d as (
    select gs::date as day from generate_series(p_from - 6, p_to, interval '1 day') gs
  ),
  l as (
    select pl.goal_id, pl.date, sum(pl.value) as v
    from public.progress_logs pl
    where pl.user_id = p_user and pl.date between p_from - 6 and p_to
      and (p_goal is null or pl.goal_id = p_goal)
    group by pl.goal_id, pl.date
  ),
  grid as (
    select g.id as goal_id, g.cadence, g.target, g.start_date, d.day,
      coalesce(l.v, 0) as v, l.v is not null as logged
    from g cross join d
    left join l on l.goal_id = g.id and l.date = d.day
  ),
  w as (
    select grid.*,
      sum(grid.v) over (
        partition by grid.goal_id, grid.day - extract(dow from grid.day)::int
        order by grid.day
      ) as wk
    from grid
  )
  select w.goal_id, w.day, w.cadence,
    least(1, (case when w.cadence = 'daily' then w.v else w.wk end) / w.target),
    w.logged
  from w
  where w.day >= p_from and w.day >= w.start_date;
$$;

-- A day is complete when every daily goal is met. With no daily goals,
-- any check-in that day counts.
create or replace function private.day_summary(p_user uuid, p_from date, p_to date, p_shared_only boolean)
returns table (day date, due int, met int, any_log boolean, complete boolean)
language sql stable set search_path = '' as $$
  with d as (
    select gs::date as day from generate_series(p_from, p_to, interval '1 day') gs
  ),
  gd as (
    select * from private.goal_days(p_user, p_from, p_to, p_shared_only)
  )
  select d.day,
    (count(gd.goal_id) filter (where gd.cadence = 'daily'))::int,
    (count(gd.goal_id) filter (where gd.cadence = 'daily' and gd.progress >= 1))::int,
    coalesce(bool_or(gd.logged), false),
    case
      when count(gd.goal_id) filter (where gd.cadence = 'daily') > 0
        then count(gd.goal_id) filter (where gd.cadence = 'daily' and gd.progress < 1) = 0
      else coalesce(bool_or(gd.logged), false)
    end
  from d
  left join gd on gd.day = d.day
  group by d.day;
$$;

-- Current streak (an unfinished today doesn't break it) and best streak.
create or replace function private.streaks(
  p_user uuid, p_today date, p_shared_only boolean,
  out current_streak int, out best_streak int
)
language plpgsql stable set search_path = '' as $$
declare
  r record;
  run int := 0;
begin
  best_streak := 0;
  for r in
    select s.day, s.complete
    from private.day_summary(p_user, p_today - 400, p_today, p_shared_only) s
    order by s.day
  loop
    if r.complete then
      run := run + 1;
      best_streak := greatest(best_streak, run);
    elsif r.day < p_today then
      run := 0;
    end if;
  end loop;
  current_streak := run;
end;
$$;

-- Streak for one goal: days in a row (daily) or weeks in a row (weekly).
create or replace function private.goal_streaks(
  p_goal uuid, p_today date,
  out current_streak int, out best_streak int
)
language plpgsql stable set search_path = '' as $$
declare
  g public.goals;
  r record;
  run int := 0;
  this_week date := p_today - extract(dow from p_today)::int;
begin
  best_streak := 0;
  current_streak := 0;
  select * into g from public.goals where id = p_goal;
  if not found then return; end if;

  if g.cadence = 'daily' then
    for r in
      select gd.day, gd.progress
      from private.goal_days(g.owner_id, greatest(g.start_date, p_today - 400), p_today, false, p_goal) gd
      order by gd.day
    loop
      if r.progress >= 1 then
        run := run + 1;
        best_streak := greatest(best_streak, run);
      elsif r.day < p_today then
        run := 0;
      end if;
    end loop;
  else
    for r in
      select w.d::date as wk, coalesce(sum(pl.value), 0) as total
      from generate_series(
        greatest(g.start_date, p_today - 400) - extract(dow from greatest(g.start_date, p_today - 400))::int,
        this_week, interval '7 days') as w(d)
      left join public.progress_logs pl
        on pl.goal_id = g.id and pl.date between w.d::date and w.d::date + 6 and pl.date <= p_today
      group by w.d
      order by w.d
    loop
      if r.total >= g.target then
        run := run + 1;
        best_streak := greatest(best_streak, run);
      elsif r.wk < this_week then
        run := 0;
      end if;
    end loop;
  end if;
  current_streak := run;
end;
$$;

-- Overall numbers for one person.
create or replace function private.user_summary_for(p_user uuid, p_today date, p_shared_only boolean)
returns table (
  current_streak int, best_streak int, consistency numeric,
  this_week numeric, last_week numeric, on_track boolean
)
language sql stable set search_path = '' as $$
  with s as (select * from private.streaks(p_user, p_today, p_shared_only)),
  days as (
    select * from private.day_summary(p_user, p_today - 29, p_today, p_shared_only)
  ),
  first_start as (
    select min(g.start_date) as d from public.goals g
    where g.owner_id = p_user and not g.archived and (not p_shared_only or g.visibility = 'friends')
  ),
  wk as (
    select gd.goal_id, gd.cadence, gd.day, gd.progress
    from private.goal_days(
      p_user,
      p_today - extract(dow from p_today)::int - 7,
      p_today, p_shared_only) gd
  ),
  per_goal as (
    -- Daily goals: average over the week's days so far. Weekly: week-to-date.
    select wk.goal_id,
      case when min(wk.cadence) = 'daily'
        then avg(wk.progress) filter (where wk.day >= p_today - extract(dow from p_today)::int)
        else max(wk.progress) filter (where wk.day >= p_today - extract(dow from p_today)::int) end as this_wk,
      case when min(wk.cadence) = 'daily'
        then avg(wk.progress) filter (where wk.day < p_today - extract(dow from p_today)::int)
        else max(wk.progress) filter (where wk.day < p_today - extract(dow from p_today)::int) end as last_wk
    from wk
    group by wk.goal_id
  )
  select
    s.current_streak,
    s.best_streak,
    coalesce((
      select round(avg(case when days.complete then 1 else 0 end)::numeric, 3)
      from days, first_start
      where days.day >= first_start.d
        and (days.day < p_today or days.complete)
    ), 0),
    coalesce((select round(avg(per_goal.this_wk), 3) from per_goal), 0),
    coalesce((select round(avg(per_goal.last_wk), 3) from per_goal), 0),
    (select count(*) filter (where days.complete) from days where days.day > p_today - 7) >= 4
      or s.current_streak >= 3
  from s;
$$;

-- Per-goal numbers (percentages and streaks only).
create or replace function private.goal_stats_for(p_user uuid, p_today date, p_shared_only boolean)
returns table (
  goal_id uuid, title text, icon text, type text, cadence text,
  current_streak int, best_streak int, this_week numeric, last_week numeric, consistency numeric
)
language sql stable set search_path = '' as $$
  with gd as (
    select * from private.goal_days(p_user, p_today - 34, p_today, p_shared_only)
  ),
  ws as (select p_today - extract(dow from p_today)::int as d)
  select g.id, g.title, g.icon, g.type, g.cadence,
    st.current_streak, st.best_streak,
    coalesce((
      select round(case when g.cadence = 'daily' then avg(gd.progress) else max(gd.progress) end, 3)
      from gd, ws where gd.goal_id = g.id and gd.day >= ws.d
    ), 0),
    coalesce((
      select round(case when g.cadence = 'daily' then avg(gd.progress) else max(gd.progress) end, 3)
      from gd, ws where gd.goal_id = g.id and gd.day between ws.d - 7 and ws.d - 1
    ), 0),
    coalesce((
      -- daily: share of the last 30 days met; weekly: share of the last 4 weeks met
      select round(case when g.cadence = 'daily'
        then avg(case when gd.progress >= 1 then 1 else 0 end) filter (
          where gd.day > p_today - 30 and (gd.day < p_today or gd.progress >= 1))
        else avg(case when gd.progress >= 1 then 1 else 0 end) filter (
          where extract(dow from gd.day) = 6 and gd.day < p_today and gd.day > p_today - 30)
        end, 3)
      from gd where gd.goal_id = g.id
    ), 0)
  from public.goals g
  cross join lateral private.goal_streaks(g.id, p_today) st
  where g.owner_id = p_user and not g.archived
    and (not p_shared_only or g.visibility = 'friends')
  order by g.sort_order, g.created_at;
$$;

revoke all on function
  private.goal_days(uuid, date, date, boolean, uuid),
  private.day_summary(uuid, date, date, boolean),
  private.streaks(uuid, date, boolean),
  private.goal_streaks(uuid, date),
  private.user_summary_for(uuid, date, boolean),
  private.goal_stats_for(uuid, date, boolean),
  private.handle_new_user(),
  private.handle_new_group()
from public, authenticated, anon;

-- -----------------------------------------------------------------------------
-- App-facing functions (called with supabase.rpc). Each checks access first.
-- For anyone other than you, only goals shared with friends are included.
-- -----------------------------------------------------------------------------

create or replace function public.user_summary(p_user uuid, p_today date)
returns table (
  current_streak int, best_streak int, consistency numeric,
  this_week numeric, last_week numeric, on_track boolean
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.can_view_user(p_user) then return; end if;
  return query select * from private.user_summary_for(p_user, p_today, p_user <> auth.uid());
end;
$$;

create or replace function public.goal_stats(p_user uuid, p_today date)
returns table (
  goal_id uuid, title text, icon text, type text, cadence text,
  current_streak int, best_streak int, this_week numeric, last_week numeric, consistency numeric
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.can_view_user(p_user) then return; end if;
  return query select * from private.goal_stats_for(p_user, p_today, p_user <> auth.uid());
end;
$$;

-- You + accepted friends, ranked by streak on shared goals.
create or replace function public.friend_leaderboard(p_today date)
returns table (
  user_id uuid, username text, display_name text, avatar_emoji text, avatar_bg text,
  current_streak int, on_track boolean, is_me boolean
)
language sql stable security definer set search_path = '' as $$
  with people as (
    select auth.uid() as id
    union
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
    from public.friendships f
    where f.status = 'accepted' and auth.uid() in (f.requester_id, f.addressee_id)
  )
  select p.id, p.username, p.display_name, p.avatar_emoji, p.avatar_bg,
    s.current_streak, s.on_track, p.id = auth.uid()
  from people
  join public.profiles p on p.id = people.id
  cross join lateral private.user_summary_for(p.id, p_today, true) s
  where auth.uid() is not null
  order by s.current_streak desc, p.display_name;
$$;

create or replace function public.group_leaderboard(p_group uuid, p_today date)
returns table (
  user_id uuid, username text, display_name text, avatar_emoji text, avatar_bg text,
  current_streak int, this_week numeric, on_track boolean, is_me boolean
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar_emoji, p.avatar_bg,
    s.current_streak, s.this_week, s.on_track, p.id = auth.uid()
  from public.group_members m
  join public.profiles p on p.id = m.user_id
  cross join lateral private.user_summary_for(p.id, p_today, true) s
  where m.group_id = p_group and m.status = 'joined'
    and private.is_group_member(p_group, true)
  order by s.current_streak desc, p.display_name;
$$;

-- Recent check-ins on shared goals, with cheers and comments. No values,
-- notes, times or distances, just which goal and whether it hit its target.
create or replace function public.activity_feed(p_user uuid, p_today date, p_limit int default 20)
returns table (
  log_id uuid, goal_title text, goal_icon text, day date, created_at timestamptz,
  completed boolean, cheers jsonb, my_cheer text, comments jsonb
)
language sql stable security definer set search_path = '' as $$
  select l.id, g.title, g.icon, l.date, l.created_at,
    coalesce((
      select gd.progress >= 1
      from private.goal_days(l.user_id, l.date, l.date, false, g.id) gd
      where gd.day = l.date
    ), false),
    coalesce((
      select jsonb_object_agg(c.emoji, c.n)
      from (select ch.emoji, count(*) as n from public.cheers ch where ch.log_id = l.id group by ch.emoji) c
    ), '{}'::jsonb),
    (select ch.emoji from public.cheers ch where ch.log_id = l.id and ch.user_id = auth.uid()),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cm.id, 'user_id', cm.user_id, 'name', p.display_name,
        'emoji', p.avatar_emoji, 'bg', p.avatar_bg, 'body', cm.body, 'at', cm.created_at
      ) order by cm.created_at)
      from public.comments cm
      join public.profiles p on p.id = cm.user_id
      where cm.log_id = l.id
    ), '[]'::jsonb)
  from public.progress_logs l
  join public.goals g on g.id = l.goal_id
  where l.user_id = p_user
    and g.visibility = 'friends' and not g.archived
    and l.date between p_today - 13 and p_today
    and auth.uid() is not null
    and private.can_view_user(p_user)
  order by l.date desc, l.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- Name and avatar behind an invite link (/i/username). Works signed out.
create or replace function public.invite_profile(p_username text)
returns table (id uuid, username text, display_name text, avatar_emoji text, avatar_bg text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar_emoji, p.avatar_bg
  from public.profiles p
  where p.username = lower(p_username) and p.onboarded;
$$;

-- Send a request by username. If they already asked you, this accepts it.
-- Returns: sent | accepted | already_friends | already_sent | not_found | self
create or replace function public.send_friend_request(p_username text)
returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  them uuid;
  existing public.friendships;
begin
  if me is null then raise exception 'not signed in'; end if;
  select p.id into them from public.profiles p where p.username = lower(btrim(p_username));
  if them is null then return 'not_found'; end if;
  if them = me then return 'self'; end if;

  select * into existing from public.friendships f
  where (f.requester_id = me and f.addressee_id = them)
     or (f.requester_id = them and f.addressee_id = me);

  if found then
    if existing.status = 'accepted' then return 'already_friends'; end if;
    if existing.requester_id = me then return 'already_sent'; end if;
    update public.friendships set status = 'accepted' where id = existing.id;
    return 'accepted';
  end if;

  insert into public.friendships (requester_id, addressee_id) values (me, them);
  return 'sent';
end;
$$;

revoke all on function
  public.user_summary(uuid, date),
  public.goal_stats(uuid, date),
  public.friend_leaderboard(date),
  public.group_leaderboard(uuid, date),
  public.activity_feed(uuid, date, int),
  public.invite_profile(text),
  public.send_friend_request(text)
from public, anon;
grant execute on function
  public.user_summary(uuid, date),
  public.goal_stats(uuid, date),
  public.friend_leaderboard(date),
  public.group_leaderboard(uuid, date),
  public.activity_feed(uuid, date, int),
  public.invite_profile(text),
  public.send_friend_request(text)
to authenticated;
grant execute on function public.invite_profile(text) to anon;
