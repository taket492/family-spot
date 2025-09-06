import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';
import { safeParseArray } from '@/lib/utils';


const cache = new Map<string, { ts: number; payload: any }>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query as { id: string };
    const now = Date.now();
    const hit = cache.get(id);
    if (hit && now - hit.ts < 60_000) {
      res.setHeader('x-cache', 'HIT');
      return res.status(200).json(hit.payload);
    }
    const spotRaw = await prisma.spot.findUnique({
      where: { id },
      include: {
        reviews: { where: { status: 'public' }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!spotRaw) return res.status(404).json({ error: 'not_found' });
    const spot = {
      ...spotRaw,
      tags: safeParseArray((spotRaw as any).tags),
      images: safeParseArray((spotRaw as any).images),
    } as any;
    cache.set(id, { ts: now, payload: spot });
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=120');
    res.setHeader('x-cache', 'MISS');
    res.status(200).json(spot);
  } catch (e) {
    res.status(500).json({ error: 'internal_error' });
  }
}
