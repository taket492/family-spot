Family Weekend MVP (Shizuoka Kids Spots)

What’s included

- Next.js + React + TypeScript
- Prisma + API routes: `/api/spots`, `/api/spots/[id]`, `/api/reviews`
- MapLibre + OSM raster tiles (no API key)
- Pages: `index` (search launcher), `search` (list/map), `spots/[id]` (detail + review post)
- Tailwind CSS integration + mobile-friendly sizing (44px tap targets)
- Search: optional sort by current location distance

Setup

1) Install deps:

   npm install

2) Configure DB:

   # For local (recommend Postgres/Neon for consistency):
   cp .env.example .env
   # Set DATABASE_URL to your Postgres connection string (Neon, Supabase, etc.)

3) Create schema:

   # Initial setup (non-destructive push)
   npm run prisma:push

4) Seed sample data (optional, requires the Postgres DATABASE_URL in .env):

   npm run seed

5) Run dev server:

   npm run dev

Optional: prettier map tiles (MapTiler)

- Get a free MapTiler API key and set `NEXT_PUBLIC_MAPTILER_KEY` in `.env`.
- With the key, the map uses MapTiler Streets (vector) for faster, nicer rendering. Without it, it falls back to OSM raster tiles.

Endpoints

- GET /api/spots?q=沼津 → { items: Spot[], total }
- GET /api/spots/:id → Spot with reviews
- POST /api/reviews { spotId, name, stars(1..5), age, text }

Notes

- MapLibre uses OSM raster tiles and clusters pins; clicking a cluster zooms in, clicking a point opens the detail.
- Tailwind is enabled; utility classes are used across pages.
- Buttons/inputs meet recommended 44px tap size.
- “現在地から近い順” toggles geolocation-based sorting (permission required).

Map legend

- Spot: green pin (`#10b981`)
- Restaurant: amber pin (`#f59e0b`)

Clustering tuning

- `clusterRadius` set to 60 for better grouping on mobile.
- Color/size steps for clusters: 10 / 30 / 100 points.

Deploy to Vercel

- Prereqs: GitHub repo + Postgres DB (Neon recommended)
- Steps:
  1. Push this repo to GitHub
  2. Create a Neon Postgres project; copy the connection string
  3. In Vercel → New Project → Import from Git → select this repo
  4. Add Environment Variable `DATABASE_URL` with your Neon connection string
  5. Build Command: `npm run prisma:push && next build` (or run db push once locally and just `next build`)
  6. Deploy; the API routes will connect to Neon

Notes for Prisma

- The schema uses Postgres provider. For local development, prefer pointing `.env` to a Postgres instance to match production.
- Current fields `tags`/`images` are stored as JSON strings for portability. You can migrate them to native array/JSON types later.

Clustering

- Implemented via a GeoJSON source with `cluster: true`, plus circle and count symbol layers. Behavior mirrors Mapbox’s cluster UX.

Changelog

- 2025-09-06
  - Map: add MapLibre glyphs and improve cluster count label font.
  - Search: Geolocation sorting UX with locating indicator and disable during fetch.
  - Map: Support MapTiler Streets v2 via `NEXT_PUBLIC_MAPTILER_KEY` with OSM fallback.
