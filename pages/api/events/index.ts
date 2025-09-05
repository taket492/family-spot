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
    const fromQ = (req.query.from as string) || '';
    const toQ = (req.query.to as string) || '';
    const tokens = q.split(/\s+/).filter(Boolean);
    const tagConds = tokens.map((t) => ({ tags: { contains: t } }));

    const now = new Date();
    const from = fromQ ? new Date(fromQ) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const to = toQ ? new Date(toQ) : new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);

    const where: any = {
      status: 'public',
      startAt: { gte: from },
    };
    if (to) where.startAt.lte = to;
    if (q) where.OR = [{ title: { contains: q } }, { city: { contains: q } }, ...tagConds];

    const raw = await prisma.event.findMany({
      where,
      orderBy: { startAt: 'asc' },
      take: 50,
    });
    const items = raw.map((e: any) => ({
      ...e,
      tags: safeParseArray(e.tags),
      images: safeParseArray(e.images),
    }));
    res.status(200).json({ items, total: items.length });
  } catch (e) {
    res.status(500).json({ error: 'internal_error' });
  }
}

