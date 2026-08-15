# กินไรดี? — Menu Picker

สุ่มเมนูอาหารรายวัน ใส่ชื่อ เลือกหมวดหมู่ (หรือสุ่มสุดๆ ทุกหมวด) แล้วแอปจะจำเมนูที่คุณสุ่มไปแล้วไว้ จนกว่าจะกด "รีเซ็ตเมนู"

Built with **Next.js (App Router) + TypeScript + Tailwind CSS v4 + Prisma + PostgreSQL**, ready to push to GitHub and deploy on **Railway**.

## Features

- Enter a name → creates/loads a user (stored server-side in Postgres, so history follows you across devices/browsers under the same name).
- 6 categories × 5-6 menu items each, each with a step-by-step how-to-cook guide (see [prisma/seed.ts](prisma/seed.ts)).
- Pick a category, or hit "สุ่มสุดๆ" to pick from every category at once.
- Already-picked items are excluded from future random picks for that user, until they hit **รีเซ็ตเมนู**.
- Progress shown per-category and as a running history list (with expandable recipe steps).
- **Usage analytics**: every pick and reset is logged (which category, random-vs-deliberate, how many menus were cleared on reset), surfaced on a key-protected `/insights` dashboard — see [Insights dashboard](#insights-dashboard) below.

## Tech stack

- Next.js 16 (App Router, Turbopack)
- Prisma ORM 6 + PostgreSQL
- Tailwind CSS v4
- Deployed on Railway (Nixpacks builder + Railway Postgres plugin)

## Project structure

```
prisma/
  schema.prisma      # User, Category, MenuItem, Pick, ResetEvent models
  seed.ts            # 6 categories x 5-6 menu items, each with step-by-step instructions (Thai)
src/
  app/
    api/
      user/route.ts      # POST: get-or-create user by name
      state/route.ts     # GET: categories + pick history for a user
      pick/route.ts       # POST: random-pick a menu (category or all), records it + how it was picked
      reset/route.ts      # POST: clear a user's picks, logs a ResetEvent
      insights/route.ts   # GET: aggregated analytics (key-protected via INSIGHTS_KEY)
    insights/page.tsx   # /insights dashboard
    layout.tsx, page.tsx, globals.css
  components/           # NameForm, Header, CategoryGrid, ResultModal, HistoryList, AppShell, InsightsView
  lib/                  # prisma client singleton, typed API client, shared types
```

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Get a Postgres database. Easiest options:
   - Spin up the **Railway Postgres plugin** for this project first (see below) and copy its connection URL for local dev too, or
   - Run Postgres locally with Docker: `docker run --name menu-picker-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=menu_picker -p 5432:5432 -d postgres:16`

3. Copy `.env.example` to `.env` and set `DATABASE_URL` to your connection string.

4. Create tables and seed the menu data:

   ```bash
   npx prisma migrate dev --name init
   npm run db:seed
   ```

5. Run the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: menu picker app"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## Deploy on Railway

1. **Create a new Railway project** → "Deploy from GitHub repo" → select this repo.
2. **Add a PostgreSQL database**: in the project canvas, click "New" → "Database" → "Add PostgreSQL". Railway provisions it and exposes a `DATABASE_URL` variable on the Postgres service.
3. **Wire the database URL to the web service**: open your web service → "Variables" → add a new variable:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (reference the Postgres plugin's variable — Railway autocompletes this)
4. **Deploy**. Railway auto-detects Next.js via Nixpacks and runs `npm install` → `npm run build` → `npm run start`.
   - `npm run start` runs `prisma migrate deploy && npm run db:seed && next start` — so on every deploy, the schema is migrated **and** the menu data is (re)seeded automatically. No manual seeding step needed. Seeding is idempotent (upserts + prunes anything removed from `prisma/seed.ts`), so it's safe to run on every boot.
5. Open the generated Railway domain (Settings → Networking → "Generate Domain") to try the app.

> If you ever need to seed manually from your own machine (e.g. for local dev against a Railway DB), you need the Postgres service's **public** connection string (`DATABASE_PUBLIC_URL` on the Postgres service's Variables tab), not the `...railway.internal` one — that hostname only resolves inside Railway's private network.

### Environment variables needed on Railway

| Variable       | Value                                    |
| -------------- | ----------------------------------------- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (from the Postgres plugin) |
| `INSIGHTS_KEY` | Any secret string you make up — required to view `/insights` |

## Insights dashboard

Visit `/insights` on your deployed app (or `http://localhost:3000/insights` locally). It asks for a key, which must match the `INSIGHTS_KEY` environment variable — without that variable set, the API refuses all requests (fails closed, not open).

What it shows, all computed live from the database:

- **Totals**: registered users, users who've actually picked something, total picks, total resets.
- **Random vs. deliberate**: how often people hit "สุ่มสุดๆ" (full random) vs. picking a specific category first.
- **Category popularity**: pick count and share per category, plus what % of people who tried a category ended up completing all of its items.
- **Top 10 menu items** and, just as usefully, **items nobody has ever picked** — good signal for what to swap out of the menu.
- **Most active users** by pick count and how many distinct categories they've explored.
- **Reset behavior**: how many times people reset, and on average how many menus they'd collected first (a proxy for "how much people explore before starting over").
- **14-day activity chart** of picks per day.

This data comes from two things recorded automatically as people use the app: every `Pick` now stores whether it came from a specific category or full-random, and every reset writes a `ResetEvent` with how many menus were cleared. Nothing beyond a user's chosen name and their menu picks is collected — no device/location/tracking data.

## Troubleshooting

**`Error: Environment variable not found: DATABASE_URL` when running `npm run start` / `npm run build`**

This means `DATABASE_URL` isn't set in whatever environment is running the command:
- **Locally**: make sure a `.env` file exists in the project root (copy `.env.example`) with a real `DATABASE_URL`, and that you're running commands from the project root.
- **On Railway**: open your web service → Variables and confirm `DATABASE_URL` is set (see [Environment variables needed on Railway](#environment-variables-needed-on-railway) above). If you added the Postgres plugin after the first deploy, redeploy the web service once the variable is set.

## Notes / things you may want to customize

- Users are matched **by name only** (no login) — two people using the same name share one history. Fine for a small friend-group app; add a PIN/passcode field to `User` if you need real accounts later.
- Edit [prisma/seed.ts](prisma/seed.ts) to add/remove categories, menu items, or recipe steps, then let the next deploy (or `npm run db:seed`) pick it up.
- `Pick.method` (category vs. random) is `null` for picks made before this field was added — the insights dashboard reports those separately as "unknown" rather than guessing.
- Ideas for more insight if you want to extend this further: log when someone hits an already-fully-explored category (currently only successful picks are logged), or bucket pick timestamps by hour of day to see when people are most likely to be hungry.
