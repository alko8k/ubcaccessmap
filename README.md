# UBC Access Map

An independent campus map for finding washrooms at UBC Vancouver.

Use it when you need a place nearby, then check the access facts before you go: step-free entry, accessible stalls, grab bars, all-gender or private rooms, and similar details. Community ranks (S–D) are separate from those facts. A popular washroom is not automatically an accessible one.

This is a student project. It is not affiliated with the University of British Columbia.

**Live:** [ubcaccessmap.xyz](https://www.ubcaccessmap.xyz)

## Features

- **Campus map.** Every student-accessible UBC Vancouver building is drawn from UBC's open building footprints. Buildings with washroom data carry a coloured rank badge and outline. Select a building to see its washrooms.
- **Access facts.** Each washroom records step-free building access, accessible stall, grab bars, transfer space, accessible sink, automatic door, changing table, and elevator access. A fact is `yes`, `no`, or `unknown`, and stays `unknown` until someone confirms it.
- **Search and filters.** Search by building, and filter by access facts and by room type (men's, women's, all-gender, private).
- **Community ranks.** Signed-in users rate cleanliness, privacy, availability, and overall experience. Ratings are combined into an S–D rank. Ranks never change the access facts.
- **Reports and moderation.** Users can flag wrong or outdated information. Admins review reports at `/moderate`.
- **UBC-only sign-in.** Passwordless magic links, restricted to `@student.ubc.ca` and `@ubc.ca` addresses.

### How ranks are calculated

Each vote's weighted score is 40% overall, 25% cleanliness, 20% privacy, and 15% availability. The per-washroom score is a Bayesian average that starts at a prior of 3.0, weighted as if it were 8 votes. A washroom with two glowing reviews can't outrank one with forty solid ones. The thresholds are S ≥ 4.4, A ≥ 3.9, B ≥ 3.3, C ≥ 2.6, and D below that. Rank badges always show the letter, so the colour is never the only cue.

The logic lives in [`packages/shared/src/ranking.ts`](packages/shared/src/ranking.ts) and is shared by the API and the web app.

## Tech stack

| Layer | Tools |
|---|---|
| Web | React 19, Vite, MapLibre GL over OpenFreeMap vector tiles, TanStack Query, React Router, Tailwind CSS |
| API | Express 5, Prisma, Zod, Nodemailer |
| Database | PostgreSQL (Supabase in production, Docker locally) |
| Shared | Zod schemas and ranking logic used by both sides |
| Hosting | Vercel: static web app, plus the API as a serverless function on the same origin |
| Testing | Vitest, Supertest |

## Repository layout

```
apps/
  api/          Express API, Prisma schema, migrations, seed and import scripts
  web/          React + Vite frontend
packages/
  shared/       Zod schemas, constants, and ranking logic
api/
  index.ts      Vercel serverless entry that wraps the Express app
vercel.json     Build command, output directory, and /api + SPA rewrites
```

## Running locally

Requires **Node.js 20.19 or newer** and **Docker** (for the local database).

```bash
# 1. Install dependencies for every workspace
npm install

# 2. Start Postgres
docker compose up -d

# 3. Configure the API
cp apps/api/.env.example apps/api/.env
#    Then set at least:
#      DATABASE_URL=postgresql://ubcaccessmap:ubcaccessmap@localhost:5432/ubcaccessmap
#      DIRECT_URL=<same as DATABASE_URL when not using a connection pooler>
#      SESSION_SECRET=<any random string, 16+ characters>

# 4. Create the schema and load data
npm run db:generate
npm run db:migrate      # local database only, see the note below
npm run db:import       # UBC building footprints from UBC Geodata
npm run db:seed         # curated washrooms and access facts

# 5. Run the API (:4000) and the web app (:5173)
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to the API.

**Signing in locally:** without SMTP credentials, the API logs each magic link to its console instead of emailing it. Copy the link from the terminal.

**Migrations against a shared database:** `npm run db:migrate` runs `prisma migrate dev`, which can offer to reset the database. Against Supabase or any database with real data, use `npm run db:migrate:deploy --workspace=api` instead.

### Environment variables

These are set in `apps/api/.env` locally and in the project settings on Vercel.

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string. On Supabase, use the transaction pooler (port 6543) with `?pgbouncer=true&connection_limit=1`. |
| `DIRECT_URL` | yes | Direct connection (port 5432), used for migrations. |
| `SESSION_SECRET` | yes | At least 16 characters. Use a fresh value per environment. |
| `NODE_ENV` | | `development` (default), `test`, or `production`. |
| `WEB_ORIGIN` / `API_ORIGIN` | | Default to `http://localhost:5173` and `http://localhost:4000`. Set both to the deployed origin in production. |
| `COOKIE_SECURE` | | `true` or `false`. If unset, the session cookie is secure in production and not in development. |
| `ADMIN_EMAILS` | | Comma-separated emails that get admin access. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | production | Used to send magic links. Defaults to Gmail SMTP on port 465. Sign-in won't work in production without these. |

## Scripts

Run these from the repository root.

| Command | What it does |
|---|---|
| `npm run dev` | API and web app in watch mode |
| `npm run build` | Builds `shared`, then typechecks the API and builds the web app |
| `npm run typecheck` | Typechecks every workspace and the serverless entry |
| `npm run lint` | ESLint |
| `npm test` | Unit tests in every workspace |
| `npm run db:generate` | Generates the Prisma client |
| `npm run db:migrate` | `prisma migrate dev` (local only) |
| `npm run db:import` | Imports building footprints from UBC's open data |
| `npm run db:seed` | Seeds curated washroom data |

There's an end-to-end spec in `apps/web/e2e`, but Playwright isn't a declared dependency yet. Install `@playwright/test` in the web workspace, then run `npx playwright test` from `apps/web`. It starts both dev servers if they aren't already running.

## Deployment

The app deploys to Vercel from `main`. `vercel.json` handles the setup:

- builds `packages/shared` and the web app, and serves `apps/web/dist` as static files;
- rewrites every `/api/*` path to the serverless function in `api/index.ts`, which runs the Express app;
- rewrites everything else to `index.html` for client-side routing.

The web app and API share one origin, which is why the session cookie works with `sameSite: "lax"` and no proxy. Keep them on the same domain.

After changing the Prisma schema, apply migrations to production with `npm run db:migrate:deploy --workspace=api`, run against the production `DIRECT_URL`.

## Data

- **Buildings** come from [UBC Geodata's open building dataset](https://github.com/UBCGeodata/ubc-geospatial-opendata). Residences, UNA neighbourhoods, and non-UBC institutions are filtered out, so the map shows only buildings students can generally use.
- **Washrooms and access facts** are curated by hand and kept in [`apps/api/prisma/seed.ts`](apps/api/prisma/seed.ts). A wrong `no` is as harmful as a wrong `yes`, so anything not confirmed stays `unknown`.
- **Basemap:** © [OpenFreeMap](https://openfreemap.org), with data © OpenStreetMap contributors.

Coverage is still growing. If you know the access details for a washroom that's missing or wrong, use the in-app report button or open an issue.
