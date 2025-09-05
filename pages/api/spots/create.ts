import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';

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
    const { type, name, city, address, lat, lng, phone, tags, openHours, priceBand, images } = req.body || {};
    if (!type || !name || !city || lat == null || lng == null)
      return res.status(400).json({ error: 'invalid_payload' });
    const data: any = {
      type: String(type),
      name: String(name),
      city: String(city),
      address: address ? String(address) : null,
      lat: Number(lat),
      lng: Number(lng),
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

