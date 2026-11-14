// Privacy and access checks, run as different users against the seeded data.
const JESS = "11111111-1111-4111-8111-111111111111", ANA = "22222222-2222-4222-8222-222222222222";
const GROUP = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
let fails = 0;
export default async function runPrivacyTests(db) {
  const as = async (uid, sql, params = []) => {
    await db.exec(`reset role; set role ${uid ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
    try {
      const r = await db.query(sql, params);
      return r.rows;
    } catch (e) {
      return { error: e.message };
    } finally {
      await db.exec("reset role;");
    }
  };
  const check = (name, cond, detail) => {
    if (!cond) fails++;
    console.log(cond ? "PASS" : "FAIL", name, cond ? "" : JSON.stringify(detail));
  };

  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('99999999-9999-4999-8999-999999999999', 'kennedy.test@example.com', '{}')`);
  const ME = "99999999-9999-4999-8999-999999999999";
  const prof = await as(ME, `select username, onboarded from profiles where id = $1`, [ME]);
  check("signup trigger makes profile", prof.length === 1 && prof[0].username === "kennedytest", prof);

  let r = await as(ANA, `select count(*)::int n from progress_logs where user_id = $1`, [JESS]);
  check("friend cannot read raw logs", r[0].n === 0, r);
  r = await as(ANA, `select count(*)::int n from goals where owner_id = $1`, [JESS]);
  check("friend cannot read goals table", r[0].n === 0, r);

  r = await as(ANA, `select display_name, current_streak, on_track, is_me from friend_leaderboard(current_date)`);
  console.log("   leaderboard (Ana):", Array.isArray(r) ? r.map((x) => `${x.display_name}:${x.current_streak}${x.on_track ? "" : "(slipping)"}`).join(" ") : r);
  check("leaderboard has 4 people", r.length === 4, r);
  check("leaderboard streaks 18/14/9/5", JSON.stringify(r.map?.((x) => x.current_streak)) === "[18,14,9,5]", r);

  r = await as(ANA, `select title, current_streak, best_streak, this_week, last_week, consistency from goal_stats($1, current_date)`, [JESS]);
  console.log("   Jess goal stats seen by Ana:", JSON.stringify(r));
  check("friend sees only shared goals", r.length === 4 && !r.some((x) => x.title === "Therapy homework"), r);

  r = await as(JESS, `select title from goal_stats($1, current_date)`, [JESS]);
  check("owner sees all goals incl. private", r.length === 5, r);

  r = await as(ANA, `select * from user_summary($1, current_date)`, [JESS]);
  console.log("   Jess summary seen by Ana:", JSON.stringify(r[0]));
  check("friend summary returns", r.length === 1 && r[0].current_streak === 18, r);

  r = await as(ANA, `select * from activity_feed($1, current_date, 5)`, [JESS]);
  check("feed returns entries", r.length > 0, r);
  check("feed has no note/value fields", r.length && !("note" in r[0]) && !("value" in r[0]), Object.keys(r[0] || {}));
  console.log("   feed[0]:", JSON.stringify({ t: r[0]?.goal_title, d: r[0]?.day, c: r[0]?.completed, ch: r[0]?.cheers, cm: r[0]?.comments?.length }));

  r = await as(ME, `select * from goal_stats($1, current_date)`, [JESS]);
  check("stranger gets no stats", r.length === 0, r);
  r = await as(ME, `select * from user_summary($1, current_date)`, [JESS]);
  check("stranger gets no summary", r.length === 0, r);
  r = await as(ME, `select * from activity_feed($1, current_date, 5)`, [JESS]);
  check("stranger gets no feed", r.length === 0, r);
  r = await as(ME, `select count(*)::int n from profiles`);
  check("stranger sees only own profile", r[0].n === 1, r);
  r = await as(ME, `select count(*)::int n from cheers`);
  check("stranger sees no cheers", r[0].n === 0, r);
  r = await as(ME, `select user_id, is_me from friend_leaderboard(current_date)`);
  check("stranger leaderboard is just self", r.length === 1 && r[0].is_me, r);
  const jessLog = (await db.query(`select l.id from progress_logs l join goals g on g.id=l.goal_id where l.user_id=$1 and g.visibility='friends' limit 1`, [JESS])).rows[0].id;
  const jessPrivLog = (await db.query(`select l.id from progress_logs l join goals g on g.id=l.goal_id where l.user_id=$1 and g.visibility='private' limit 1`, [JESS])).rows[0].id;
  r = await as(ME, `insert into cheers (log_id, emoji) values ($1, '🔥')`, [jessLog]);
  check("stranger cannot cheer", !!r.error, r);
  // Same statement shape PostgREST uses for .upsert(): every column is rewritten on conflict.
  const upsert = `insert into cheers (log_id, user_id, emoji) values ($1, $2, $3)
    on conflict (log_id, user_id) do update set log_id = excluded.log_id, user_id = excluded.user_id, emoji = excluded.emoji`;
  r = await as(ANA, upsert, [jessLog, ANA, "👏"]);
  check("friend can cheer shared log", !r.error, r);
  r = await as(ANA, upsert, [jessLog, ANA, "🔥"]);
  check("friend can change their cheer (upsert)", !r.error, r);
  r = await as(ANA, upsert, [jessPrivLog, ANA, "🔥"]);
  check("upsert cannot target a private-goal log", !!r.error, r);
  r = await as(ANA, `insert into cheers (log_id, user_id, emoji) values ($1, $2, '🔥')`, [jessLog, JESS]);
  check("cannot cheer as someone else", !!r.error, r);
  r = await as(ANA, `insert into comments (log_id, body) values ($1, 'nice')`, [jessPrivLog]);
  check("friend cannot comment on private-goal log", !!r.error, r);

  r = await as(null, `select display_name from invite_profile('jess')`);
  check("invite_profile works signed out", r.length === 1 && r[0].display_name === "Jess", r);
  r = await as(null, `select * from profiles`);
  check("anon cannot read profiles", !!r.error, r);
  r = await as(null, `select * from friend_leaderboard(current_date)`);
  check("anon cannot call leaderboard", !!r.error, r);

  r = await as(ANA, `insert into goals (owner_id, title) values ($1, 'x')`, [JESS]);
  check("cannot create goal for someone else", !!r.error, r);
  const jessGoal = (await db.query(`select id from goals where owner_id=$1 limit 1`, [JESS])).rows[0].id;
  r = await as(ANA, `insert into progress_logs (goal_id, date) values ($1, current_date)`, [jessGoal]);
  check("cannot log to another person's goal", !!r.error, r);
  r = await as(ANA, `update profiles set display_name = 'hacked' where id = $1 returning id`, [JESS]);
  check("cannot edit another person's profile", Array.isArray(r) && r.length === 0, r);
  r = await as(ANA, `update profiles set id = gen_random_uuid() where id = $1`, [ANA]);
  check("cannot change own profile id", !!r.error, r);

  r = await as(ME, `select send_friend_request('Jess') s`);
  check("send request", r[0]?.s === "sent", r);
  r = await as(ME, `select send_friend_request('jess') s`);
  check("duplicate request", r[0]?.s === "already_sent", r);
  r = await as(ME, `select count(*)::int n from profiles`);
  check("pending request reveals name/avatar only", r[0].n === 2, r);
  r = await as(ME, `select * from goal_stats($1, current_date)`, [JESS]);
  check("pending is not enough for stats", r.length === 0, r);
  r = await as(ME, `update friendships set status='accepted' where addressee_id=$1 returning id`, [JESS]);
  check("requester cannot self-accept", Array.isArray(r) && r.length === 0, r);
  r = await as(JESS, `update friendships set requester_id=$1 where addressee_id=$2`, [ANA, JESS]);
  check("cannot rewrite who sent a request", !!r.error, r);
  r = await as(JESS, `update friendships set status='accepted' where requester_id=$1 returning id`, [ME]);
  check("addressee accepts", Array.isArray(r) && r.length === 1, r);
  r = await as(ME, `select count(*)::int n from goal_stats($1, current_date)`, [JESS]);
  check("accepted friend sees shared stats", r[0].n === 4, r);

  r = await as(ANA, `insert into group_members (group_id, user_id, status, invited_by) values ($3, $1, 'invited', $2)`, [ME, ANA, GROUP]);
  check("cannot invite a non-friend to a group", !!r.error, r);
  r = await as(JESS, `insert into group_members (group_id, user_id, status, invited_by) values ($3, $1, 'invited', $2)`, [ME, JESS, GROUP]);
  check("member invites a friend", !r.error, r);
  r = await as(ME, `select display_name from group_leaderboard($1, current_date)`, [GROUP]);
  check("invited (not joined) sees no group board", r.length === 0, r);
  r = await as(ME, `update group_members set status='joined' where user_id=$1 returning status`, [ME]);
  check("accept group invite", Array.isArray(r) && r.length === 1, r);
  r = await as(ME, `select display_name, current_streak from group_leaderboard($1, current_date)`, [GROUP]);
  check("group board after joining", r.length === 5, r);
  r = await as(ME, `select count(*)::int n from goal_stats($1, current_date)`, [ANA]);
  check("group mate (not friend) sees shared stats", r[0].n === 3, r);
  r = await as(ME, `select g.id from groups g`);
  check("member sees group", r.length === 1, r);
  r = await as(ANA, `insert into groups (name) values ('Night Owls') returning id`);
  check("create group", Array.isArray(r) && r.length === 1, r);
  r = await as(ANA, `select status from group_members where group_id = $1`, [r[0]?.id]);
  check("creator auto-joined", r.length === 1 && r[0].status === "joined", r);

  const t = Date.now();
  await as(ANA, `select * from friend_leaderboard(current_date)`);
  await as(ANA, `select * from goal_stats($1, current_date)`, [JESS]);
  console.log("   leaderboard + goal_stats took", Date.now() - t, "ms (wasm)");
  console.log(fails ? `${fails} FAILED` : "ALL PASSED");
  return fails;
}
