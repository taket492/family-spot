/* eslint-disable no-console */
// Sync events from configured sources.
// Supported source types:
// - csv: { type: "csv", url: "https://.../file.csv" } or local path
// Only use official/public feeds per ToS.

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');

async function fetchText(urlOrPath) {
  if (/^https?:\/\//i.test(urlOrPath)) {
    const res = await fetch(urlOrPath, { headers: { 'user-agent': 'family-spot-events-sync/1.0' } });
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

function toDateMaybe(v) {
  if (!v) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(+d) ? undefined : d;
}

async function upsertEvents(prisma, records) {
  let inserted = 0;
  let updated = 0;
  for (const rec of records) {
    if (rec.url) {
      const exists = await prisma.event.findFirst({ where: { url: rec.url, startAt: rec.startAt } });
      if (exists) {
        await prisma.event.update({ where: { id: exists.id }, data: rec });
        updated += 1;
        continue;
      }
    }
    await prisma.event.create({ data: rec });
    inserted += 1;
  }
  return { inserted, updated };
}

async function handleCsvSource(prisma, src) {
  const text = await fetchText(src.url || src.path);
  const rows = parse(text, { columns: true, skip_empty_lines: true, bom: true, trim: true });
  const records = [];
  for (const r of rows) {
    const title = pick(r, ['title', 'イベント名', '名称']);
    const city = pick(r, ['city', '市区町村', '市町村']);
    const address = pick(r, ['address', '住所']);
    const venue = pick(r, ['venue', '会場']);
    const latRaw = pick(r, ['lat', 'latitude', '緯度']);
    const lngRaw = pick(r, ['lng', 'longitude', '経度']);
    const startRaw = pick(r, ['startAt', 'start', '開始', '開始日時', 'date']);
    const endRaw = pick(r, ['endAt', 'end', '終了', '終了日時']);
    const priceBand = pick(r, ['priceBand', '価格帯', '料金']);
    const tagsRaw = pick(r, ['tags', 'タグ']);
    const imagesRaw = pick(r, ['images', '画像']);
    const url = pick(r, ['url', 'link', 'URL']);
    const lat = latRaw != null ? Number(String(latRaw).replace(/[^0-9.\-]/g, '')) : undefined;
    const lng = lngRaw != null ? Number(String(lngRaw).replace(/[^0-9.\-]/g, '')) : undefined;
    const startAt = toDateMaybe(startRaw);
    const endAt = toDateMaybe(endRaw);
    if (!title || !city || !Number.isFinite(lat) || !Number.isFinite(lng) || !startAt) continue;
    records.push({
      title: String(title),
      city: String(city),
      address: address ? String(address) : undefined,
      venue: venue ? String(venue) : undefined,
      lat,
      lng,
      startAt,
      endAt: endAt || undefined,
      priceBand: priceBand ? String(priceBand) : undefined,
      tags: JSON.stringify(toArrayMaybe(tagsRaw)),
      images: JSON.stringify(toArrayMaybe(imagesRaw)),
      url: url ? String(url) : undefined,
      status: 'public',
      source: src.name || src.url || src.path || 'csv',
    });
  }
  const { inserted, updated } = await upsertEvents(prisma, records);
  console.log(`[csv] inserted=${inserted} updated=${updated}`);
}

async function main() {
  const cfgPath = process.argv[2] || 'scripts/event-sources.json';
  if (!fs.existsSync(cfgPath)) {
    console.log('No sources config found. Create scripts/event-sources.json');
    return;
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const sources = Array.isArray(cfg) ? cfg : cfg.sources || [];
  if (!sources.length) {
    console.log('No event sources configured. Skipping.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    for (const src of sources) {
      try {
        if (src.type === 'csv') await handleCsvSource(prisma, src);
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

