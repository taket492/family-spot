import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';
import { safeParseArray } from '@/lib/utils';


// Simple per-process in-memory cache (60s)
const cache = new Map<string, { ts: number; payload: any }>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const q = (req.query.q as string) || '';
    const key = `q:${q}`;
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && now - hit.ts < 60_000) {
      res.setHeader('x-cache', 'HIT');
      // Even for cache hit, respect pagination params by slicing (best-effort)
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20')), 1), 50);
      const offset = Math.max(parseInt(String(req.query.offset || '0')), 0);
      const items = hit.payload.items.slice(offset, offset + limit);
      const total = hit.payload.total;
      const nextOffset = offset + items.length < total ? offset + items.length : null;
      return res.status(200).json({ items, total, nextOffset });
    }
    const tokens = q.split(/\s+/).filter(Boolean);
    const tagConds = tokens.map((t) => ({ tags: { contains: t } }));
    const where: any = q
      ? {
          OR: [{ name: { contains: q } }, { city: { contains: q } }, ...tagConds],
        }
      : {};

    // Pagination
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20')), 1), 50);
    const offset = Math.max(parseInt(String(req.query.offset || '0')), 0);

    const [raw, total] = await Promise.all([
      prisma.spot.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.spot.count({ where }),
    ]);
    const items = raw.map((s: any) => ({
      ...s,
      tags: safeParseArray(s.tags),
      images: safeParseArray(s.images),
    }));
    const payload = { items: items, total };
    cache.set(key, { ts: now, payload });
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=120');
    res.setHeader('x-cache', 'MISS');
    const nextOffset = offset + items.length < total ? offset + items.length : null;
    res.status(200).json({ ...payload, nextOffset });
  } catch (e) {
    res.status(500).json({ error: 'internal_error' });
  }
}
