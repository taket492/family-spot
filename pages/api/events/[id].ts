import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';
import { safeParseArray } from '@/lib/utils';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query as { id: string };
    const e = await prisma.event.findUnique({ where: { id } });
    if (!e || e.status !== 'public') return res.status(404).json({ error: 'not_found' });
    const ev = {
      ...e,
      tags: safeParseArray((e as any).tags),
      images: safeParseArray((e as any).images),
    } as any;
    res.status(200).json(ev);
  } catch (e) {
    res.status(500).json({ error: 'internal_error' });
  }
}

