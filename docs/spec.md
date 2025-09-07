# Family Weekend MVP – Product & Technical Spec

## Overview
- Purpose: Help families in Shizuoka find kid‑friendly spots quickly and post lightweight reviews. Event UI is currently hidden; the event pipeline remains available for future use.
- Users: General public (no auth), family members adding spots/reviews, maintainers operating CI sync.
- Hosting: Next.js app (Vercel‑friendly). DB via Postgres (Neon/Supabase/etc.).

## Tech Stack
- Framework: Next.js + React + TypeScript
- Styling: Tailwind CSS
- Map: MapLibre (OSM raster by default; MapTiler vector if key present)
- Data: Prisma (Postgres). `tags`/`images` stored as JSON strings for portability.
- Storage (optional): Vercel Blob for image uploads. Supabase Storage migration script included.

## Environment
- Required
  - `DATABASE_URL`: Postgres connection string
- Optional
  - `NEXT_PUBLIC_MAPTILER_KEY`: MapTiler API key (vector tiles)
  - `BLOB_READ_WRITE_TOKEN`: Vercel Blob token (image upload API)
  - Web Search (disabled unless keys provided)
    - `SEARCH_PROVIDER=google|bing`
    - Google: `GOOGLE_API_KEY`, `GOOGLE_CSE_ID`
    - Bing: `BING_SEARCH_KEY`

## Data Model (Prisma)
- Spot
  - id, type, name, city, address?, lat, lng, phone?, tags(JSON string[]), openHours?, priceBand?, images(JSON string[]), rating, createdAt, updatedAt
- Review
  - id, spotId(FK), stars(1..5), childAge, text, status('public'), createdAt
- Event (UI hidden for now)
  - id, title, description?, city, venue?, address?, lat, lng, startAt, endAt?, priceBand?, tags(JSON string[]), images(JSON string[]), source?, url?, status('public'), createdAt, updatedAt
  - Index: startAt, city

## Pages
- Home `/`
  - Search launcher (keyword → `/search?q=...`)
  - Quick filters (age range/indoor/lactation room tags)
  - Entrypoints: `/search-top`, `/search-top-restaurant`, `/spots/new`
  - Featured spots: Fetch `/api/spots` and show top 4
  - Hidden: “開催中・これからのイベント”, “Webのイベント情報（静岡・今週末）”
- Search `/search`
  - Inputs: Query bar; Sort: default | distance (geolocation) | rating
  - Tabs: List | Map (MapLibre cluster); Events tab is disabled
  - Always in “spots” mode (feature flag disabled for events)
- Spot Detail `/spots/[id]`
  - Basics, image, tags, rating, open Google Maps, reviews list
  - CTA: “レビューを書く” → `/reviews/new?spotId=...`
- New Review `/reviews/new`
  - POST to `/api/reviews`; clamps stars to 1..5 and recalculates spot rating
- New Spot `/spots/new`
  - Upload image via Vercel Blob → POST `/api/spots/create`
- Event Detail `/events/[id]` (entry hidden)

## API
- `GET /api/spots?q=...` → `{ items: Spot[], total }`
  - name/city/tags partial match; 50 max; ordered by updatedAt desc
- `GET /api/spots/:id` → Spot with public `reviews[]`
- `POST /api/spots/create`
  - body: `{ type, name, city, address?, lat, lng, phone?, tags, openHours?, priceBand?, images }`
  - returns: `{ id }`
- `POST /api/reviews`
  - body: `{ spotId, name, stars, age, text }`; updates spot rating
- `POST /api/blob/upload`
  - query: `filename`, `contentType` (image/*)
  - env: `BLOB_READ_WRITE_TOKEN`
  - returns: `{ url, pathname, contentType }`
- Events (kept for future usage)
  - `GET /api/events?q&from&to` (default range: today..+14d)
  - `GET /api/events/:id`
- Web Search (optional; requires keys)
  - `GET /api/websearch?q&count` → `{ items: [{ title, link, snippet?, source? }] }`

## Map Behaviour (MapLibre)
- Data: GeoJSON source with cluster: true
- Cluster circle color/radius: stepwise by point_count
- Marker color: spot=green, restaurant=orange, event=purple (event UI off)
- Interactions: click cluster → zoom; click marker → open detail

## Feature Flags / Current State
- Home
  - `SHOW_HOME_EVENTS=false`
  - `SHOW_HOME_WEB=false`
- Search
  - Events tab disabled; ignore `kind=events` query; always spots
- Event ingestion API/CI remains available but not shown in UI

## Batch & Tooling
- Spot ingest: `scripts/sync-spots.js` (CSV/JSON)
  - Source file: `scripts/spot-sources.json` (see `scripts/spot-sources.json.example`)
  - Dedup heuristic: same `name+city` and coordinates within ~50m
- Event ingest: `scripts/sync-events.js` (CSV/JSON/ICS)
  - Source file: `scripts/event-sources.json`
  - Dedup: `url + startAt`
- CSV importers: `scripts/import-csv.js` (spots), `scripts/import-events-csv.js` (events)
- Utilities: `scripts/add-image.js`, `scripts/migrate-images-to-supabase.js`
- Samples: `scripts/events-sample.csv`, `scripts/event-sources.json`
- Count check: `scripts/check-events-count.js`

## CI/CD
- CI: `.github/workflows/ci.yml`
  - Node 20, install, Prisma generate, typecheck, build, lint(if defined)
- Daily Event Sync: `.github/workflows/sync-events.yml`
  - 03:00 JST daily; `DATABASE_URL` check; migrate deploy; sync; post‑sync count
- Spot Sync: `.github/workflows/sync-spots.yml`
  - Manual dispatch; can be scheduled. Requires `DATABASE_URL` secret.
- Release: `.github/workflows/release-please.yml` + `.release-please-config.json`
  - `googleapis/release-please-action@v4`
  - Org policy may restrict PR creation; toggle `skip-github-pull-request` if needed

## Validation & Limits
- No auth/roles; all reviews are public by default
- Basic server‑side validation only (required fields, star clamping)
- `tags`/`images` persisted as JSON strings (future migration possible)
- Web Search API is opt‑in and should be rate‑limited/cached when enabled

## Future Work (optional)
- Re‑enable Event UI behind an env flag, add week/weekend filters
- Add short‑term cache to `/api/websearch`
- Harden validations and introduce moderation or simple auth for admin ops
- Migrate `tags`/`images` to native array/JSON types
- Unify/clean older event sync workflow (`events-sync.yml`)
