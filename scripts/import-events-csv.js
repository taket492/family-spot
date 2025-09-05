/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');

function toArrayMaybe(v) {
  if (v == null) return [];
  const s = String(v).trim();
  if (!s) return [];
  try {
    const j = JSON.parse(s);
    if (Array.isArray(j)) return j.map(String);
  } catch (_) {}
  return s
    .split(/[、,]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function pick(obj, keys) {
  for (const k of keys) if (obj[k] != null && String(obj[k]).trim() !== '') return obj[k];
  return undefined;
}

function toDateISOMaybe(v) {
  if (!v) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(+d) ? undefined : d.toISOString();
}

async function main() {
  const file = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  if (!file) {
    console.error('Usage: npm run import:events:csv -- <path/to/events.csv> [--dry-run]');
    process.exit(1);
  }
  const abs = path.resolve(process.cwd(), file);
  if (!fs.existsSync(abs)) {
    console.error('File not found:', abs);
    process.exit(1);
  }

  const input = fs.readFileSync(abs, 'utf8');
  const rows = parse(input, { columns: true, skip_empty_lines: true, bom: true, trim: true });
  console.log('Parsed rows:', rows.length);

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
    const startAt = toDateISOMaybe(startRaw);
    const endAt = toDateISOMaybe(endRaw);
    if (!title || !city || !Number.isFinite(lat) || !Number.isFinite(lng) || !startAt) {
      console.warn('Skip row (missing required fields):', { title, city, lat, lng, startAt });
      continue;
    }
    const tags = JSON.stringify(toArrayMaybe(tagsRaw));
    const images = JSON.stringify(toArrayMaybe(imagesRaw));

    records.push({
      title: String(title),
      city: String(city),
      address: address ? String(address) : undefined,
      venue: venue ? String(venue) : undefined,
      lat,
      lng,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : undefined,
      priceBand: priceBand ? String(priceBand) : undefined,
      tags,
      images,
      url: url ? String(url) : undefined,
      status: 'public',
    });
  }

  console.log('Ready to insert:', records.length);
  if (dryRun) {
    console.log('Dry-run mode: showing first 3 records');
    console.log(records.slice(0, 3));
    return;
  }

  const prisma = new PrismaClient();
  try {
    let inserted = 0;
    for (const rec of records) {
      // Dedup heuristic: same url + startAt
      const keyUrl = rec.url || null;
      const keyStart = rec.startAt;
      if (keyUrl) {
        const exists = await prisma.event.findFirst({ where: { url: keyUrl, startAt: keyStart } });
        if (exists) {
          // Optionally update details
          await prisma.event.update({ where: { id: exists.id }, data: { ...rec } });
          continue;
        }
      }
      await prisma.event.create({ data: rec });
      inserted += 1;
    }
    console.log('Inserted:', inserted);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

