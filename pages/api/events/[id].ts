import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';
import { safeParseArray } from '@/lib/utils';
import { requireAdmin, allowGuest } from '@/lib/permissions';


async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const e = await prisma.event.findUnique({ where: { id } });
  if (!e || e.status !== 'public') return res.status(404).json({ error: 'not_found' });
  const ev = {
    ...e,
    tags: safeParseArray((e as any).tags),
    images: safeParseArray((e as any).images),
  } as any;
  res.status(200).json(ev);
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return res.status(404).json({ error: 'event_not_found' });
  }

  await prisma.event.delete({ where: { id } });

  res.status(200).json({ ok: true, message: 'Event deleted successfully' });
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

