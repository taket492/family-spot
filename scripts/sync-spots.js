/* eslint-disable no-console */
// Sync spots from configured sources.
// Supported source types:
// - csv: { type: "csv", url: "https://.../file.csv" } or local path
// - json: { type: "json", url: "https://.../file.json" } or local path, array of records
// Only use official/public feeds per ToS.

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');

async function fetchText(urlOrPath) {
  if (/^https?:\/\//i.test(urlOrPath)) {
    const res = await fetch(urlOrPath, { headers: { 'user-agent': 'family-spot-sync/1.0' } });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    return await res.text();
  }
  const abs = path.resolve(process.cwd(), urlOrPath);
  return fs.readFileSync(abs, 'utf8');
}

function toArrayMaybe(v) {
  if (v == null) return [];
  const s = String(v).trim();
  if (!s) return [];
  try {
    const j = JSON.parse(s);
    if (Array.isArray(j)) return j.map(String);
  } catch (_) {}
  return s.split(/[、,]/).map((t) => t.trim()).filter(Boolean);
}

function pick(obj, keys) {
  for (const k of keys) if (obj[k] != null && String(obj[k]).trim() !== '') return obj[k];
  return undefined;
}

function numMaybe(v) {
  if (v == null) return undefined;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

async function upsertSpots(prisma, records) {
  let inserted = 0;
  let updated = 0;
  const EPS = 0.0005; // ~50m
  for (const rec of records) {
    // Dedup heuristic: same name+city and within ~50m
    const exists = await prisma.spot.findFirst({
      where: {
        name: rec.name,
        city: rec.city,
        lat: { gte: rec.lat - EPS, lte: rec.lat + EPS },
        lng: { gte: rec.lng - EPS, lte: rec.lng + EPS },
      },
    });
    if (exists) {
      const { rating, createdAt, updatedAt, id, ...rest } = rec;
      // Preserve rating; update other metadata
      await prisma.spot.update({ where: { id: exists.id }, data: { ...rest } });
      updated += 1;
    } else {
      await prisma.spot.create({ data: rec });
      inserted += 1;
    }
  }
  return { inserted, updated };
}

function mapRowToSpot(r) {
  const type = pick(r, ['type', '種類', 'カテゴリ']) || 'spot';
  const name = pick(r, ['name', '名称', 'スポット名']);
  const city = pick(r, ['city', '市区町村', '市町村']);
  const address = pick(r, ['address', '住所']);
  const lat = numMaybe(pick(r, ['lat', 'latitude', '緯度']));
  const lng = numMaybe(pick(r, ['lng', 'longitude', '経度']));
  const phone = pick(r, ['phone', '電話']);
  const openHours = pick(r, ['openHours', 'open_hours', '営業時間']);
  const priceBand = pick(r, ['priceBand', 'price_band', '価格帯']);
  const tags = JSON.stringify(toArrayMaybe(pick(r, ['tags', 'タグ'])));
  const images = JSON.stringify(toArrayMaybe(pick(r, ['images', '画像'])));

  if (!type || !name || !city || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    type: String(type),
    name: String(name),
    city: String(city),
    address: address ? String(address) : undefined,
    lat,
    lng,
    phone: phone ? String(phone) : undefined,
    tags,
    openHours: openHours ? String(openHours) : undefined,
    priceBand: priceBand ? String(priceBand) : undefined,
    images,
    // rating left to default (0) on create
  };
}

async function handleCsvSource(prisma, src) {
  const text = await fetchText(src.url || src.path);
  const rows = parse(text, { columns: true, skip_empty_lines: true, bom: true, trim: true });
  const records = [];
  for (const r of rows) {
    const rec = mapRowToSpot(r);
    if (rec) records.push(rec);
  }
  const { inserted, updated } = await upsertSpots(prisma, records);
  console.log(`[csv] inserted=${inserted} updated=${updated}`);
}

async function handleJsonSource(prisma, src) {
  const text = await fetchText(src.url || src.path);
  let rows;
  try {
    rows = JSON.parse(text);
  } catch (_) {
    console.error('Invalid JSON from', src.url || src.path);
    return;
  }
  if (!Array.isArray(rows)) {
    console.error('JSON must be an array of records');
    return;
  }
  const records = [];
  for (const r of rows) {
    const rec = mapRowToSpot(r);
    if (rec) records.push(rec);
  }
  const { inserted, updated } = await upsertSpots(prisma, records);
  console.log(`[json] inserted=${inserted} updated=${updated}`);
}

async function main() {
  const cfgPath = process.argv[2] || 'scripts/spot-sources.json';
  if (!fs.existsSync(cfgPath)) {
    console.log('No sources config found. Create scripts/spot-sources.json');
    return;
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const sources = Array.isArray(cfg) ? cfg : cfg.sources || [];
  if (!sources.length) {
    console.log('No spot sources configured. Skipping.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    for (const src of sources) {
      try {
        if (src.type === 'csv') await handleCsvSource(prisma, src);
        else if (src.type === 'json') await handleJsonSource(prisma, src);
        else console.log(`Unsupported source type: ${src.type}`);
      } catch (e) {
        console.error('Source failed:', src, e.message);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

