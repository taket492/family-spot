/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');
const {
  toArrayMaybe,
  loadTagDictionary,
  geocodeAddress,
} = require('./ingest-utils');

// toArrayMaybe moved to ingest-utils

function pick(obj, keys) {
  for (const k of keys) if (obj[k] != null && String(obj[k]).trim() !== '') return obj[k];
  return undefined;
}

async function main() {
  const file = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  const enableGeocode = process.argv.includes('--geocode');
  const providerArg = (process.argv.find((a) => a.startsWith('--provider=')) || '').split('=')[1];
  const dictArg = (process.argv.find((a) => a.startsWith('--dict=')) || '').split('=')[1];
  const tagDictPath = dictArg || process.env.TAG_DICTIONARY_PATH || 'scripts/tag-dictionary.json';
  if (!file) {
    console.error('Usage: npm run import:csv -- <path/to/file.csv> [--dry-run] [--geocode] [--provider google|nominatim] [--dict path/to/tag-dictionary.json]');
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

  const tagNormalizer = loadTagDictionary(tagDictPath);

  const provider = providerArg || process.env.GEOCODER || 'nominatim';
  let geocodedCount = 0;
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

    let lat = latRaw != null ? Number(String(latRaw).replace(/[^0-9.\-]/g, '')) : undefined;
    let lng = lngRaw != null ? Number(String(lngRaw).replace(/[^0-9.\-]/g, '')) : undefined;

    // Attempt geocoding when lat/lng missing but we have enough address context
    if (enableGeocode && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
      const geo = await geocodeAddress({ name, city, address, provider });
      if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
        lat = geo.lat;
        lng = geo.lng;
        if (!address && geo.address) r.address = geo.address; // enrich in output
        geocodedCount += 1;
      }
    }

    if (!type || !name || !city || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn('Skip row (missing required fields):', { type, name, city, lat, lng });
      continue;
    }

    const tagsArr = toArrayMaybe(tagsRaw);
    const normalizedTags = tagNormalizer ? tagNormalizer.normalizeTags(tagsArr) : tagsArr;
    const tags = JSON.stringify(normalizedTags);
    const images = JSON.stringify(toArrayMaybe(imagesRaw));

    records.push({ type: String(type), name: String(name), city: String(city), address: address ? String(address) : undefined, lat, lng, phone: phone ? String(phone) : undefined, tags, openHours: openHours ? String(openHours) : undefined, priceBand: priceBand ? String(priceBand) : undefined, images });
  }

  if (enableGeocode) console.log('Geocoded rows:', geocodedCount);
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
