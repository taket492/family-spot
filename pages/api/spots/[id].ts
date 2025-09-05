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
    const { id } = req.query as { id: string };
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
    res.status(200).json(spot);
  } catch (e) {
    res.status(500).json({ error: 'internal_error' });
  }
}
