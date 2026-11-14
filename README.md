# Pace

Small daily wins, cheered on by your friends. A phone-first habit and workout tracker: check off daily habits, log workouts, run timed habits, see your streaks, and keep each other going with friends and groups.

Built with Next.js 16, Tailwind CSS v4 and Supabase (sign-in + database), hosted on Vercel. Install it to your phone's home screen like an app.

## What's in v1

- **Sign in** with a 6-digit email code (or the link in the same email).
- **Onboarding:** name, emoji avatar, goal areas, first goal, invite a friend.
- **Home:** this week, today's "X of Y" gauge, streak, and today's list. One tap checks a habit off; workouts open a quick-log sheet; timed habits open a timer.
- **Calendar:** rings for daily goals, workout markers, and a timeline for any day. Fix a missed day by tapping it.
- **Trends:** current and best streak, consistency, this week vs last, per goal.
- **Friends and groups:** leaderboard by streak, requests, invite links (`/i/your-username`), groups like "Morning Crew", cheers and comments.
- **Profile:** name and avatar, username, which goals friends can see, accent color.

Coming later: programs, the activity wheel, the petal chart, share-as-image recap, notifications, export/delete, dark mode.

## Privacy

Enforced in the database, not just the app:

- Your goals and check-ins can only be read or changed by you.
- Friends and people in your groups see **only percentages and streaks** for goals you share. Never your values, notes, times or distances. Private goals never show at all.
- Strangers see nothing. An invite link shows only your name and avatar.

`npm run test:db` checks these rules (45 checks) against an in-memory copy of the database.

## Set it up (one time)

### 1. Supabase (database and sign-in)

1. Create a free project at [supabase.com](https://supabase.com) (or use your existing Pace project).
2. **Create the tables.** Open **SQL Editor → New query**, paste all of [`supabase/migrations/20261114000100_pace_v1.sql`](supabase/migrations/20261114000100_pace_v1.sql), and click **Run**. It's safe to run again later.
   - Had the first Pace prototype in this project? The migration upgrades its profiles and friendships. The old challenge tables just sit unused; delete them with [`supabase/cleanup_prototype.sql`](supabase/cleanup_prototype.sql) when you no longer need that data.
3. **Turn on the sign-in code email.** Open **Authentication → Emails → Templates**. For both **Magic Link** and **Confirm signup**:
   - Subject: `Your Pace code: {{ .Token }}`
   - Body: paste all of [`supabase/templates/sign-in.html`](supabase/templates/sign-in.html), then **Save**.

   Without this, the email only has a link. Links open in Safari, not in the home-screen app, so the code matters on iPhone.
4. **Tell Supabase your web address.** Open **Authentication → URL Configuration**:
   - **Site URL:** your Vercel address, e.g. `https://pace-challenge.vercel.app`
   - **Redirect URLs:** add `https://*.vercel.app/**` (for preview links) and `http://localhost:3000/**`.
5. **Copy your keys.** Open **Project Settings → API** and copy the **Project URL** and the **anon public** key. You'll paste them into Vercel next (and into `.env.local` to run it on your computer).
6. *(Optional)* **Sample friends.** Sign in to the app once. Then in [`supabase/seed.sql`](supabase/seed.sql), put your sign-in email on the line marked `YOUR EMAIL`, paste the whole file into a new SQL Editor query, and run it. You'll get four sample friends (Jess, Ana, Mo, Priya), a "Morning Crew" group invite, and three weeks of their history. Run it again any time to reset them.

> Free Supabase projects send only a few emails per hour. For more, add your own email sender under **Authentication → Emails → SMTP settings**.

### 2. Vercel (hosting)

1. In Vercel, open the project linked to this repo (or **Add New → Project** and import `spann-design/pace-challenge`).
2. Open **Settings → Environment Variables** and add both, ticking **Production** and **Preview**:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon public key
3. Redeploy (**Deployments → ⋯ → Redeploy**) so it picks up the keys.

Every pull request gets its own preview link, and merging to `main` updates the live site. Preview links and the live site share the same Supabase database.

### 3. Put it on your phone

Open your Vercel address in Safari on iPhone, tap **Share → Add to Home Screen**. On Android (Chrome), use the menu's **Install app**.

## Run it on your computer

```bash
npm install
cp .env.example .env.local    # then paste your two Supabase values in
npm run dev -- -p 3005        # any free port
```

Open http://localhost:3005.

## Where things live

| Path | What |
|---|---|
| `src/app/(app)/` | Signed-in screens: Home (`page.tsx`), `calendar`, `trends`, `friends`, `groups`, `profile` |
| `src/app/login`, `onboarding`, `i/[username]` | Sign-in, first-run setup, invite links |
| `src/proxy.ts` | Keeps you signed in and sends signed-out visitors to `/login` |
| `src/components/` | Shared UI (buttons, sheets, toasts), Home pieces, goal form, social pieces |
| `src/lib/data.ts`, `social.ts` | Reading and saving data |
| `src/lib/today.ts`, `goals.ts` | What counts as done, X of Y, streak-day rules |
| `src/app/globals.css` | Design tokens: colors, accents, fonts (dark mode is defined for later) |
| `supabase/migrations/` | Tables, privacy rules and the streak/leaderboard functions |
| `supabase/seed.sql` | Sample friends and history |
| `supabase/tests/` | `npm run test:db` privacy checks |

## How streaks work

- A **day counts** when every daily goal is done. If you only have weekly goals, any check-in counts.
- Today doesn't break your streak until it's over.
- **Weekly goals** (like "run 3× a week") have their own week-by-week streak. They count toward today's X of Y only on days you check in, so rest days never hurt.
- Weeks run Sunday to Saturday.
- Friends' leaderboards use only the goals you share.
