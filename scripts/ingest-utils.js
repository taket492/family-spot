/* eslint-disable no-console */
const fs = require('fs');

// --- Text helpers ---
function normForMatch(s) {
  if (s == null) return '';
  // Normalize width and case for ASCII; trim whitespace.
  return String(s).normalize('NFKC').trim().toLowerCase();
}

function uniquePreserveOrder(arr) {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

// --- Tag normalization ---
function loadTagDictionary(dictPath) {
  if (!dictPath) return null;
  try {
    if (!fs.existsSync(dictPath)) return null;
    const raw = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
    return buildTagNormalizer(raw);
  } catch (e) {
    console.warn('[tag-dict] Failed to load', dictPath, e.message);
    return null;
  }
}

// Accepts formats:
//  A) { "canonical": ["syn1", "syn2"] , ... }
//  B) { "map": { "variant": "canonical", ... } }  // optional
function buildTagNormalizer(obj) {
  const map = new Map();
  if (!obj || typeof obj !== 'object') return { normalizeTags: (arr) => arr };

  if (obj.map && typeof obj.map === 'object') {
    for (const [variant, canonical] of Object.entries(obj.map)) {
      const k = normForMatch(variant);
      if (!k) continue;
      map.set(k, String(canonical));
    }
  }

  for (const [canonical, variants] of Object.entries(obj)) {
    if (canonical === 'map') continue;
    const canonStr = String(canonical);
    map.set(normForMatch(canonStr), canonStr);
    if (Array.isArray(variants)) {
      for (const v of variants) {
        const k = normForMatch(v);
        if (!k) continue;
        map.set(k, canonStr);
      }
    }
  }

  function normalizeTags(arr) {
    if (!Array.isArray(arr)) return [];
    const result = arr
      .map((t) => String(t).trim())
      .filter(Boolean)
      .map((t) => map.get(normForMatch(t)) || t);
    return uniquePreserveOrder(result);
  }

  return { normalizeTags };
}

// --- Simple array parsing ---
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

// --- Geocoding ---
const _geoCache = new Map();

async function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function geocodeWithNominatim(query, { email, rateLimitMs = 1100 } = {}) {
  const key = `nominatim:${query}`;
  if (_geoCache.has(key)) return _geoCache.get(key);
  const url = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '1',
    'accept-language': 'ja',
  });
  const headers = { 'User-Agent': `family-weekend/ingest (${email || 'contact@local'})` };
  // basic politeness delay
  await sleep(rateLimitMs);
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const json = await res.json();
  if (!Array.isArray(json) || !json.length) return null;
  const r = json[0];
  const ret = {
    lat: Number(r.lat),
    lng: Number(r.lon),
    address: r.display_name || '',
    city: r.address?.city || r.address?.town || r.address?.village || r.address?.county || '',
  };
  _geoCache.set(key, ret);
  return ret;
}

async function geocodeWithGoogle(query, { apiKey }) {
  const key = `google:${query}`;
  if (_geoCache.has(key)) return _geoCache.get(key);
  if (!apiKey) throw new Error('GOOGLE_API_KEY required for Google geocoding');
  const params = new URLSearchParams({ query, key: apiKey, region: 'jp', language: 'ja' });
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) return null;
  const search = await searchRes.json();
  const best = search.results?.[0];
  if (!best) return null;
  const lat = best.geometry?.location?.lat;
  const lng = best.geometry?.location?.lng;
  const ret = { lat, lng, address: best.formatted_address || '', city: '' };
  _geoCache.set(key, ret);
  return ret;
}

async function geocodeAddress({ name, city, address, provider = 'nominatim' }) {
  const parts = [];
  if (address) parts.push(String(address));
  if (city && (!address || !String(address).includes(city))) parts.push(String(city));
  if (!parts.length && name) parts.push(String(name));
  if (!parts.length) return null;
  const query = parts.join(', ');
  try {
    if (provider === 'google') {
      return await geocodeWithGoogle(query, { apiKey: process.env.GOOGLE_API_KEY });
    } else {
      return await geocodeWithNominatim(query, { email: process.env.NOMINATIM_EMAIL });
    }
  } catch (e) {
    console.warn('[geocode] failed for', query, e.message);
    return null;
  }
}

module.exports = {
  toArrayMaybe,
  loadTagDictionary,
  buildTagNormalizer,
  geocodeAddress,
};

