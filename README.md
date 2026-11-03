# Pace

A small web app for running a fitness/wellness challenge with friends. Each person sets a start and end date, **outcome goals** (results you measure, like body weight 192 → 175 lb) and **habit goals** (actions you check off, like strength workout 4× per week). Daily check-ins feed into:

- **Pace:** your latest measurement vs. a straight line from your start value to your target. Within ±5% of the total change counts as *on track*.
- **Projection:** where you'll finish at your recent rate (last ~3 weeks), and the weekly change you need from here.
- **Habit consistency:** habits done vs. weekly targets, per challenge week.
- **Habits → results:** how much each outcome moved in weeks with 80%+ habit consistency vs. weeks under 80%. It appears once there are at least 2 weeks on each side.
- **Friends:** add people by username. Accepted friends can see each other's goals, check-ins and notes.

Built with Next.js, Tailwind and Supabase (database + logins), hosted on Vercel.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase keys, the app runs in **demo mode** with made-up example data saved in your browser. Use "Reset demo" in the banner to start over.

## Connect Supabase (real accounts and friends)

1. Create a free project at https://supabase.com.
2. In the project, open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key.
4. Copy `.env.example` to `.env.local` and paste those two values in.
5. Restart `npm run dev`. You'll now see a sign-in screen.

**Email confirmation:** by default Supabase emails a confirmation link on sign-up. For a private app between friends you can turn this off under **Authentication → Sign In / Providers → Email → Confirm email**. If you keep it on, set **Authentication → URL Configuration → Site URL** to your Vercel URL so the link points to the right place.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, click **Add New → Project** and import the repo (the defaults are fine).
3. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. Every push to `main` redeploys automatically.

## Where things live

| Path | What |
|---|---|
| `src/app/` | Pages: Today (`/`), My Goals, Progress, Friends, friend view |
| `src/lib/metrics.ts` | All the on-track / projection / consistency math |
| `src/lib/store/` | Data layer: `supabase-store.ts` (real) and `demo-store.ts` (browser-only demo) |
| `src/components/charts.tsx` | Pace chart and weekly consistency chart (plain SVG) |
| `supabase/schema.sql` | Tables and the security rules that control who sees what |

## Privacy model

Security is enforced in the database (row-level security), not just in the app. You can read and write your own data. Accepted friends can only *read* it. Anyone signed in can look up a username and display name so friend requests work, but nothing else.
