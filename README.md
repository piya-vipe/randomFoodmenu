# กินไรดี? — Menu Picker

สุ่มเมนูอาหารรายวัน ใส่ชื่อ เลือกหมวดหมู่ (หรือสุ่มสุดๆ ทุกหมวด) แล้วแอปจะจำเมนูที่คุณสุ่มไปแล้วไว้ จนกว่าจะกด "รีเซ็ตเมนู"

Built with **Next.js (App Router) + TypeScript + Tailwind CSS v4 + Prisma + PostgreSQL**, ready to push to GitHub and deploy on **Railway**.

## Features

- Enter a name → creates/loads a user (stored server-side in Postgres, so history follows you across devices/browsers under the same name).
- 6 categories × 5-6 menu items each, each with a brief how-to-cook note (see [prisma/seed.ts](prisma/seed.ts)).
- Pick a category, or hit "สุ่มสุดๆ" to pick from every category at once.
- Already-picked items are excluded from future random picks for that user, until they hit **รีเซ็ตเมนู**.
- Progress shown per-category and as a running history list.

## Tech stack

- Next.js 16 (App Router, Turbopack)
- Prisma ORM 6 + PostgreSQL
- Tailwind CSS v4
- Deployed on Railway (Nixpacks builder + Railway Postgres plugin)

## Project structure

```
prisma/
  schema.prisma      # User, Category, MenuItem, Pick models
  seed.ts            # 6 categories x 5-6 menu items, each with a how-to note (Thai)
src/
  app/
    api/
      user/route.ts    # POST: get-or-create user by name
      state/route.ts   # GET: categories + pick history for a user
      pick/route.ts     # POST: random-pick a menu (category or all), records it
      reset/route.ts    # POST: clear a user's picks
    layout.tsx, page.tsx, globals.css
  components/           # NameForm, Header, CategoryGrid, ResultModal, HistoryList, AppShell
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
   - `npm run start` runs `prisma migrate deploy && next start`, so your database schema is applied automatically on every deploy.
5. **Seed the menu data once**, after the first successful deploy. From your local machine (with `DATABASE_URL` pointed at the Railway Postgres, e.g. via `railway run` or by pasting the public connection string into your local `.env`):

   ```bash
   npm run db:seed
   ```

   (Safe to re-run — seeding uses upserts.)
6. Open the generated Railway domain (Settings → Networking → "Generate Domain") to try the app.

### Environment variables needed on Railway

| Variable       | Value                                    |
| -------------- | ----------------------------------------- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (from the Postgres plugin) |

## Troubleshooting

**`Error: Environment variable not found: DATABASE_URL` when running `npm run start` / `npm run build`**

This means `DATABASE_URL` isn't set in whatever environment is running the command:
- **Locally**: make sure a `.env` file exists in the project root (copy `.env.example`) with a real `DATABASE_URL`, and that you're running commands from the project root.
- **On Railway**: open your web service → Variables and confirm `DATABASE_URL` is set (see [Environment variables needed on Railway](#environment-variables-needed-on-railway) above). If you added the Postgres plugin after the first deploy, redeploy the web service once the variable is set.

## Notes / things you may want to customize

- Users are matched **by name only** (no login) — two people using the same name share one history. Fine for a small friend-group app; add a PIN/passcode field to `User` if you need real accounts later.
- Edit [prisma/seed.ts](prisma/seed.ts) to add/remove categories or menu items, then run `npm run db:seed` again.
