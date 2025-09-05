import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';

function safeParseArray(json: unknown): string[] {
  try {
    const v = JSON.parse(String(json ?? '[]'));
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const q = (req.query.q as string) || '';
    const tokens = q.split(/\s+/).filter(Boolean);
    const tagConds = tokens.map((t) => ({ tags: { contains: t } }));
    const where: any = q
      ? {
          OR: [{ name: { contains: q } }, { city: { contains: q } }, ...tagConds],
        }
      : {};

    const raw = await prisma.spot.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    const items = raw.map((s: any) => ({
      ...s,
      tags: safeParseArray(s.tags),
      images: safeParseArray(s.images),
    }));
    res.status(200).json({ items, total: items.length });
  } catch (e) {
    res.status(500).json({ error: 'internal_error' });
  }
}
