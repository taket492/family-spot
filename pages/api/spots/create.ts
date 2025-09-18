import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';
import { geocodeAddress } from '@/lib/geocoding';

function toArray(v: any): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  const s = String(v);
  try {
    const j = JSON.parse(s);
    return Array.isArray(j) ? j.map(String) : [];
  } catch {
    return s
      .split(/[、,]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const { type, name, address, url, city: cityInput, lat, lng, phone, tags, openHours, priceBand, images } = req.body || {};
    if (!type || !name) return res.status(400).json({ error: 'invalid_payload' });

    let latNum: number | null = lat == null ? null : Number(lat);
    let lngNum: number | null = lng == null ? null : Number(lng);
    let city: string | null = cityInput ? String(cityInput) : null;
    let normalizedAddress: string | null = address ? String(address) : null;

    // Try geocoding when lat/lng are missing but we have some address hint
    if ((latNum == null || isNaN(latNum) || lngNum == null || isNaN(lngNum)) && (normalizedAddress || name)) {
      const geo = await geocodeAddress({ name: String(name), city: city || undefined, address: normalizedAddress || undefined });
      if (geo?.lat != null && geo?.lng != null) {
        latNum = Number(geo.lat);
        lngNum = Number(geo.lng);
        if (!city && geo.city) city = String(geo.city);
        if (!normalizedAddress && geo.address) normalizedAddress = String(geo.address);
      }
    }

    const data: any = {
      type: String(type),
      name: String(name),
      city: String(city || ''),
      address: normalizedAddress,
      lat: latNum != null && !isNaN(latNum) ? latNum : null,
      lng: lngNum != null && !isNaN(lngNum) ? lngNum : null,
      url: url ? String(url) : null,
      phone: phone ? String(phone) : null,
      tags: JSON.stringify(toArray(tags)),
      openHours: openHours ? String(openHours) : null,
      priceBand: priceBand ? String(priceBand) : null,
      images: JSON.stringify(toArray(images)),
    };
    const created = await prisma.spot.create({ data });
    return res.status(200).json({ id: created.id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'internal_error' });
  }
}
