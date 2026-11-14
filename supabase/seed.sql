-- =============================================================================
-- Pace sample data: 4 made-up friends, one group ("Morning Crew"), goals and
-- about 3 weeks of check-ins. Dates are relative to today, so it always looks
-- fresh. Safe to run again (it deletes and recreates the sample people).
--
-- Run AFTER the migration: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Want to see them as your friends? Sign in to the app once, then put your
-- sign-in email in the line marked "YOUR EMAIL" below and run this file.
-- The sample people can't sign in (they have no password).
-- =============================================================================

-- Fixed ids so the file can clean up after itself.
--   Jess  11111111-1111-4111-8111-111111111111
--   Ana   22222222-2222-4222-8222-222222222222
--   Mo    33333333-3333-4333-8333-333333333333
--   Priya 44444444-4444-4444-8444-444444444444

delete from auth.users where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated', 'authenticated',
  u.email, '', now(), '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('username', u.username, 'display_name', u.name),
  now() - interval '30 days', now(), '', '', '', ''
from (values
  ('11111111-1111-4111-8111-111111111111', 'jess@example.com',  'jess',  'Jess'),
  ('22222222-2222-4222-8222-222222222222', 'ana@example.com',   'ana',   'Ana'),
  ('33333333-3333-4333-8333-333333333333', 'mo@example.com',    'mo',    'Mo'),
  ('44444444-4444-4444-8444-444444444444', 'priya@example.com', 'priya', 'Priya')
) as u(id, email, username, name);

-- The sign-up trigger made their profiles; fill in names and avatars.
update public.profiles p set
  display_name = v.name, avatar_emoji = v.emoji, avatar_bg = v.bg, accent = v.accent, onboarded = true
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'Jess',  '🌸', '#FBE3EC', 'berry'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'Ana',   '🌊', '#DDEFF7', 'lagoon'),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'Mo',    '🐝', '#FBF0D9', 'matcha'),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'Priya', '🍓', '#FBE1DF', 'peach')
) as v(id, name, emoji, bg, accent)
where p.id = v.id;

-- Everyone is friends with everyone.
insert into public.friendships (requester_id, addressee_id, status)
select a.id::uuid, b.id::uuid, 'accepted'
from (values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222'),
             ('33333333-3333-4333-8333-333333333333'), ('44444444-4444-4444-8444-444444444444')) a(id)
join (values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222'),
             ('33333333-3333-4333-8333-333333333333'), ('44444444-4444-4444-8444-444444444444')) b(id)
  on a.id < b.id;

-- Goals. "streak" sets how many days in a row each person has kept all
-- their daily goals (ending yesterday); before that it's hit and miss.
drop table if exists seed_goals;
create temporary table seed_goals as
select gen_random_uuid() as id, v.*
from (values
  -- owner, title, type, icon, target, unit, cadence, visibility, timed, sort
  ('11111111-1111-4111-8111-111111111111'::uuid, 'Morning run',     'workout', 'run',      3,  'runs',    'weekly', 'friends', false, 0),
  ('11111111-1111-4111-8111-111111111111'::uuid, 'Lights out by 11','habit',   'sleep',    1,  'times',   'daily',  'friends', false, 1),
  ('11111111-1111-4111-8111-111111111111'::uuid, 'Read 10 pages',   'habit',   'read',     10, 'pages',   'daily',  'friends', false, 2),
  ('11111111-1111-4111-8111-111111111111'::uuid, 'Drink water',     'habit',   'drop',     8,  'glasses', 'daily',  'friends', false, 3),
  ('11111111-1111-4111-8111-111111111111'::uuid, 'Therapy homework','habit',   'heart',    1,  'times',   'daily',  'private', false, 4),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'Strength',        'workout', 'power',    3,  'sessions','weekly', 'friends', false, 0),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'Alcohol-free day','habit',   'glass',    1,  'times',   'daily',  'friends', false, 1),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'Journal',         'habit',   'journal',  10, 'min',     'daily',  'friends', true,  2),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'Vitamins',        'habit',   'pill',     1,  'times',   'daily',  'private', false, 3),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'Cycling',         'workout', 'cycle',    2,  'rides',   'weekly', 'friends', false, 0),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'Meditate',        'habit',   'meditate', 10, 'min',     'daily',  'friends', true,  1),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'Read',            'habit',   'read',     20, 'min',     'daily',  'friends', false, 2),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'Run',             'workout', 'run',      3,  'runs',    'weekly', 'friends', false, 0),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'Wake by 7',       'habit',   'sun',      1,  'times',   'daily',  'friends', false, 1),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'Journal',         'habit',   'journal',  5,  'min',     'daily',  'friends', true,  2),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'Stretch',         'habit',   'stretch',  1,  'times',   'daily',  'private', false, 3)
) as v(owner_id, title, type, icon, target, unit, cadence, visibility, timed, sort_order);

insert into public.goals (id, owner_id, title, type, icon, target, unit, cadence, visibility, timed, sort_order, start_date, created_at)
select id, owner_id, title, type, icon, target, unit, cadence, visibility, timed, sort_order,
  current_date - 24, now() - interval '24 days'
from seed_goals;

drop table if exists seed_streaks;
create temporary table seed_streaks as
select * from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 18, 80),
  ('22222222-2222-4222-8222-222222222222'::uuid, 14, 75),
  ('33333333-3333-4333-8333-333333333333'::uuid, 9,  70),
  ('44444444-4444-4444-8444-444444444444'::uuid, 5,  55)
) as v(user_id, streak, hit_rate);

-- Daily goals: every day during the streak, nothing on the day it broke,
-- hit and miss before that, and about half of them done so far today.
insert into public.progress_logs (goal_id, user_id, date, value, duration_min, created_at)
select g.id, g.owner_id, d.day,
  g.target,
  case when g.unit = 'min' then g.target end,
  d.day + time '07:30' + (g.sort_order * interval '2 hours')
from seed_goals g
join seed_streaks s on s.user_id = g.owner_id
cross join lateral (
  select gs::date as day from generate_series(current_date - 21, current_date, interval '1 day') gs
) d
where g.cadence = 'daily'
  and (
    (d.day = current_date and g.sort_order % 2 = 1)
    or (d.day < current_date and d.day > current_date - s.streak - 1)
    or (d.day < current_date - s.streak - 1
        and abs(hashtext(g.id::text || d.day::text)) % 100 < s.hit_rate)
  );

-- Weekly workouts: roughly every other day, with workout details.
insert into public.progress_logs (goal_id, user_id, date, value, duration_min, distance, effort, activity, created_at)
select g.id, g.owner_id, d.day, 1,
  25 + abs(hashtext(g.id::text || d.day::text)) % 30,
  case when g.icon in ('run', 'cycle') then round((2 + (abs(hashtext(d.day::text || g.id::text)) % 40) / 10.0)::numeric, 1) end,
  2 + abs(hashtext(d.day::text)) % 3,
  case g.icon when 'run' then 'Run' when 'cycle' then 'Cycle' else 'Strength' end,
  d.day + time '06:45'
from seed_goals g
join seed_streaks s on s.user_id = g.owner_id
cross join lateral (
  select gs::date as day from generate_series(current_date - 21, current_date - 1, interval '1 day') gs
) d
where g.cadence = 'weekly'
  and extract(dow from d.day) in (1, 3, 5, 6)
  and abs(hashtext(g.id::text || d.day::text)) % 100 < s.hit_rate + 10;

-- A note on one of Jess's private logs (friends must never see this).
update public.progress_logs l set note = 'Talked about work stress. Felt lighter after.'
where l.id = (
  select l2.id from public.progress_logs l2 join seed_goals g on g.id = l2.goal_id
  where g.title = 'Therapy homework' order by l2.date desc limit 1
);

-- The group.
insert into public.groups (id, name, emoji, owner_id)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Morning Crew', '🌅', '11111111-1111-4111-8111-111111111111');

insert into public.group_members (group_id, user_id, status, invited_by)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', v.id::uuid, 'joined', '11111111-1111-4111-8111-111111111111'
from (values ('22222222-2222-4222-8222-222222222222'), ('33333333-3333-4333-8333-333333333333'),
             ('44444444-4444-4444-8444-444444444444')) v(id)
on conflict do nothing;

-- Some cheers and comments on each other's latest shared check-ins.
with latest as (
  select distinct on (l.user_id) l.id, l.user_id
  from public.progress_logs l join seed_goals g on g.id = l.goal_id
  where g.visibility = 'friends' and l.date < current_date
  order by l.user_id, l.date desc, l.created_at desc
)
insert into public.cheers (log_id, user_id, emoji)
select latest.id, f.id::uuid, (array['🔥', '👏', '💪', '❤️'])[1 + abs(hashtext(latest.id::text || f.id)) % 4]
from latest
cross join (values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222'),
                   ('33333333-3333-4333-8333-333333333333'), ('44444444-4444-4444-8444-444444444444')) f(id)
where f.id::uuid <> latest.user_id;

insert into public.comments (log_id, user_id, body)
select l.id, c.author::uuid, c.body
from (values
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'Let’s goooo 🙌'),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Two weeks! So proud of you'),
  ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'Back at it 💪')
) as c(owner, author, body)
cross join lateral (
  select l2.id from public.progress_logs l2 join seed_goals g on g.id = l2.goal_id
  where l2.user_id = c.owner::uuid and g.visibility = 'friends' and l2.date < current_date
  order by l2.date desc, l2.created_at desc limit 1
) l;

-- -----------------------------------------------------------------------------
-- Optional: make the sample people your friends and add you to Morning Crew.
-- -----------------------------------------------------------------------------
do $$
declare
  my_email text := '';  -- YOUR EMAIL: put the email you sign in with between the quotes
  me uuid;
begin
  if my_email = '' then return; end if;
  select id into me from auth.users where lower(email) = lower(my_email);
  if me is null then
    raise notice 'No account for %. Sign in to the app once, then run this again.', my_email;
    return;
  end if;
  insert into public.friendships (requester_id, addressee_id, status)
  select me, v.id::uuid, 'accepted'
  from (values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222'),
               ('33333333-3333-4333-8333-333333333333')) v(id)
  on conflict do nothing;
  -- Priya sends you a request so you can try accepting one.
  insert into public.friendships (requester_id, addressee_id, status)
  values ('44444444-4444-4444-8444-444444444444', me, 'pending')
  on conflict do nothing;
  insert into public.group_members (group_id, user_id, status, invited_by)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', me, 'invited', '11111111-1111-4111-8111-111111111111')
  on conflict do nothing;
end $$;
