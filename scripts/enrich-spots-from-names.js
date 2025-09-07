/* eslint-disable no-console */
// Enrich a list of spot names (CSV/JSON) into full Spot records
// using Google Places API or Nominatim, and insert into DB (or dry-run).
//
// Usage:
//   node scripts/enrich-spots-from-names.js <input.(csv|json)> [--provider google|nominatim] [--dry-run] [--out out.csv]
// Env:
//   GOOGLE_API_KEY (when --provider=google)
//   NOMINATIM_EMAIL (optional; for polite UA contact)
//
// Input CSV headers: name, city?, type?, tags? (JSON or comma-separated)
// Input JSON: array of { name, city?, type?, tags? }

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
  return s.split(/[、,]/).map((t) => t.trim()).filter(Boolean);
}

function csvStringify(records) {
  if (!records.length) return '';
  const headers = Object.keys(records[0]);
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of records) lines.push(headers.map((h) => esc(r[h])).join(','));
  return lines.join('\n');
}

function pick(obj, keys) {
  for (const k of keys) if (obj[k] != null && String(obj[k]).trim() !== '') return obj[k];
  return undefined;
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  return await res.json();
}

async function fetchText(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  return await res.text();
}

async function geocodeWithGoogle(query) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY is required for provider=google');
  const params = new URLSearchParams({ query, key, region: 'jp', language: 'ja' });
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
  const search = await fetchJson(searchUrl);
  if (search.status !== 'OK' || !search.results?.length) return null;
  const best = search.results[0];
  const placeId = best.place_id;
  const detailParams = new URLSearchParams({
    place_id: placeId,
    key,
    language: 'ja',
    fields: [
      'name',
      'formatted_address',
      'geometry',
      'formatted_phone_number',
      'address_component',
      'opening_hours',
      'types',
      'url',
    ].join(','),
  });
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?${detailParams}`;
  const details = await fetchJson(detailsUrl);
  if (details.status !== 'OK' || !details.result) return null;
  const d = details.result;
  const lat = d.geometry?.location?.lat;
  const lng = d.geometry?.location?.lng;
  let city = '';
  for (const c of d.address_components || []) {
    if ((c.types || []).includes('locality') || (c.types || []).includes('sublocality_level_1')) {
      city = c.long_name;
      break;
    }
  }
  return {
    name: d.name || best.name,
    address: d.formatted_address || best.formatted_address || '',
    city,
    lat,
    lng,
    phone: d.formatted_phone_number || undefined,
    openHours: d.opening_hours ? '営業時間あり' : undefined,
  };
}

async function geocodeWithNominatim(query) {
  const email = process.env.NOMINATIM_EMAIL || 'family-weekend-sync';
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: query, format: 'jsonv2', addressdetails: '1', limit: '1', 'accept-language': 'ja' })}`;
  const json = await fetchJson(url, { headers: { 'User-Agent': `family-weekend/1.0 (${email})` } });
  if (!Array.isArray(json) || !json.length) return null;
  const r = json[0];
  const address = r.display_name || '';
  const lat = Number(r.lat);
  const lng = Number(r.lon);
  const city = r.address?.city || r.address?.town || r.address?.village || r.address?.county || '';
  return { name: query, address, city, lat, lng };
}

async function geocode(provider, name, cityHint, addressHint, prefectureHint) {
  const build = (...xs) => xs.filter(Boolean).join(' ');
  const addressVariants = (addr) => {
    const out = new Set();
    if (addr) {
      out.add(addr);
      // 公園内 → 公園
      out.add(addr.replace(/公園内/g, '公園'));
      // 末尾の「内」を除去（施設内など）
      out.add(addr.replace(/内$/g, ''));
      // 「〜公園」だけを抽出
      const m = addr.match(/(.+?公園)/);
      if (m) out.add(m[1]);
      // スペース区切りで公園トークンを抽出
      for (const token of addr.split(/\s+/).filter(Boolean)) {
        if (token.endsWith('公園内')) out.add(token.slice(0, -1)); // 内を除去
        if (token.endsWith('公園')) out.add(token);
      }
    }
    return Array.from(out).filter(Boolean);
  };
  if (provider === 'google') {
    const q = build(name, addressHint, cityHint, prefectureHint);
    return await geocodeWithGoogle(q);
  }
  if (provider === 'nominatim') {
    // Try multiple queries, from most specific to less specific.
    const variants = addressVariants(addressHint);
    const candidates = [
      build(name, addressHint, cityHint, prefectureHint),
      ...variants.map((v) => build(v, cityHint, prefectureHint)),
      build(name, cityHint, prefectureHint),
      build(name),
    ].filter(Boolean);
    for (const q of candidates) {
      const res = await geocodeWithNominatim(q);
      if (res && Number.isFinite(res.lat) && Number.isFinite(res.lng)) return res;
    }
    return null;
  }
  throw new Error(`Unsupported provider: ${provider}`);
}

async function parseInput(file) {
  const isUrl = /^https?:\/\//i.test(file);
  let raw = '';
  if (isUrl) {
    raw = await fetchText(file, { headers: { 'User-Agent': 'family-weekend-enrich/1.0' } });
  } else {
    const abs = path.resolve(process.cwd(), file);
    if (!fs.existsSync(abs)) throw new Error('Input not found: ' + abs);
    raw = fs.readFileSync(abs, 'utf8');
  }
  if (/\.json$/i.test(file) || (!/\.csv$/i.test(file) && isUrl && raw.trim().startsWith('['))) {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error('JSON must be an array');
    return arr.map((r) => ({ name: r.name, city: r.city, prefecture: r.prefecture || r.pref, address: r.address, type: r.type || 'spot', tags: toArrayMaybe(r.tags) }));
  }
  // Default to CSV
  const rows = parse(raw, { columns: true, skip_empty_lines: true, bom: true, trim: true });
  return rows.map((r) => ({ name: pick(r, ['name', '名称']) || '', city: pick(r, ['city', '市区町村', '市町村']), prefecture: pick(r, ['prefecture', 'pref', '都道府県']), address: pick(r, ['address', '住所', '所在地']), type: pick(r, ['type', '種類', 'カテゴリ']) || 'spot', tags: toArrayMaybe(pick(r, ['tags', 'タグ'])) }));
}

async function main() {
  const args = process.argv.slice(2);
  const file = args[0];
  const provider = (args.find((a) => a.startsWith('--provider=')) || '').split('=')[1] || process.env.GEOCODER || 'google';
  const dryRun = args.includes('--dry-run');
  const outArg = (args.find((a) => a.startsWith('--out=')) || '').split('=')[1];
  if (!file) {
    console.error('Usage: node scripts/enrich-spots-from-names.js <input.csv|json> [--provider google|nominatim] [--dry-run] [--out out.csv]');
    process.exit(1);
  }

  const inputs = (await parseInput(file)).filter((x) => x.name);
  console.log('Input names:', inputs.length);

  const results = [];
  for (const item of inputs) {
    try {
      const geo = await geocode(provider, item.name, item.city, item.address, item.prefecture);
      if (!geo || !Number.isFinite(geo.lat) || !Number.isFinite(geo.lng)) {
        console.warn('No result:', item.name, item.city || '');
        continue;
      }
      results.push({
        type: item.type || 'spot',
        name: item.name || geo.name,
        city: geo.city || item.city || '',
        address: geo.address || item.address || '',
        lat: geo.lat,
        lng: geo.lng,
        phone: geo.phone || '',
        tags: JSON.stringify(item.tags || []),
        openHours: geo.openHours || '',
        priceBand: '',
        images: JSON.stringify([]),
      });
    } catch (e) {
      console.warn('Failed:', item.name, e.message);
    }
    // Be polite with public endpoints (Nominatim). ~1 req/sec.
    if (provider === 'nominatim') {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  console.log('Resolved records:', results.length);

  if (outArg) {
    const csv = csvStringify(results);
    fs.writeFileSync(outArg, csv);
    console.log('Wrote CSV:', outArg);
  }

  if (dryRun) {
    console.log('Dry-run. First 3:', results.slice(0, 3));
    return;
  }

  const prisma = new PrismaClient();
  try {
    // Upsert using heuristic similar to sync-spots
    const EPS = 0.0005;
    let inserted = 0;
    let updated = 0;
    for (const rec of results) {
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
        await prisma.spot.update({ where: { id: exists.id }, data: { ...rest } });
        updated += 1;
      } else {
        await prisma.spot.create({ data: rec });
        inserted += 1;
      }
    }
    console.log('Insert/Update:', { inserted, updated });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
