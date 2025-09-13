import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';
import { safeParseArray } from '@/lib/utils';
import { requireAdmin, allowGuest } from '@/lib/permissions';


const cache = new Map<string, { ts: number; payload: any }>();

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
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
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  const spot = await prisma.spot.findUnique({ where: { id } });
  if (!spot) {
    return res.status(404).json({ error: 'spot_not_found' });
  }

  await prisma.spot.delete({ where: { id } });
  cache.delete(id);

  res.status(200).json({ ok: true, message: 'Spot deleted successfully' });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      return allowGuest()(req, res, handleGet);
    } else if (req.method === 'DELETE') {
      return requireAdmin()(req, res, handleDelete);
    } else {
      return res.status(405).json({ error: 'method_not_allowed' });
    }
  } catch (e) {
    res.status(500).json({ error: 'internal_error' });
  }
}
