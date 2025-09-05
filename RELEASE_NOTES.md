Release v0.1.0 — 2025-09-06

Highlights

- Clustering: Implement GeoJSON clustering in MapLibre with count labels and click-to-zoom (Issue #1).
- Distance Sort: Add geolocation-based sorting with locating indicator and better UX (Issue #2).
- MapTiler Support: Use MapTiler Streets v2 vector tiles when `NEXT_PUBLIC_MAPTILER_KEY` is set; fallback to OSM raster (Issue #3).

Details

- Map: Added glyphs for label rendering and robust `text-font` fallback.
- Search: Disable “現在地から近い順” button while locating; show progress text.
- Docs/Env: `.env.example` now includes `NEXT_PUBLIC_MAPTILER_KEY`; README updated with setup notes.

Setup Notes

- Optional: set `NEXT_PUBLIC_MAPTILER_KEY` in `.env` for faster, nicer vector tiles from MapTiler.

