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
  // Fallback: split by comma or Japanese comma
  return s.split(/[、,]/).map((t) => t.trim()).filter(Boolean);
}

function pick(obj, keys) {
  for (const k of keys) if (obj[k] != null && String(obj[k]).trim() !== '') return obj[k];
  return undefined;
}

async function main() {
  const file = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  if (!file) {
    console.error('Usage: npm run import:csv -- <path/to/file.csv> [--dry-run]');
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
    const type = pick(r, ['type', '種類', 'カテゴリ']);
    const name = pick(r, ['name', '名称', 'スポット名']);
    const city = pick(r, ['city', '市区町村', '市町村']);
    const address = pick(r, ['address', '住所']);
    const latRaw = pick(r, ['lat', 'latitude', '緯度']);
    const lngRaw = pick(r, ['lng', 'longitude', '経度']);
    const phone = pick(r, ['phone', '電話']);
    const openHours = pick(r, ['openHours', 'open_hours', '営業時間']);
    const priceBand = pick(r, ['priceBand', 'price_band', '価格帯']);
    const tagsRaw = pick(r, ['tags', 'タグ']);
    const imagesRaw = pick(r, ['images', '画像']);

    const lat = latRaw != null ? Number(String(latRaw).replace(/[^0-9.\-]/g, '')) : undefined;
    const lng = lngRaw != null ? Number(String(lngRaw).replace(/[^0-9.\-]/g, '')) : undefined;
    if (!type || !name || !city || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn('Skip row (missing required fields):', { type, name, city, lat, lng });
      continue;
    }
    const tags = JSON.stringify(toArrayMaybe(tagsRaw));
    const images = JSON.stringify(toArrayMaybe(imagesRaw));

    records.push({ type: String(type), name: String(name), city: String(city), address: address ? String(address) : undefined, lat, lng, phone: phone ? String(phone) : undefined, tags, openHours: openHours ? String(openHours) : undefined, priceBand: priceBand ? String(priceBand) : undefined, images });
  }

  console.log('Ready to insert:', records.length);
  if (dryRun) {
    console.log('Dry-run mode: showing first 3 records');
    console.log(records.slice(0, 3));
    return;
  }

  const prisma = new PrismaClient();
  try {
    const chunk = 100;
    let inserted = 0;
    for (let i = 0; i < records.length; i += chunk) {
      const data = records.slice(i, i + chunk);
      const res = await prisma.spot.createMany({ data, skipDuplicates: true });
      inserted += res.count;
      console.log(`Inserted batch ${i / chunk + 1}: +${res.count}`);
    }
    console.log('Total inserted:', inserted);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

