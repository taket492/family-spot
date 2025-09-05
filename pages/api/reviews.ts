import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const { spotId, name, stars, age, text } = req.body || {};
    if (!spotId || !name || !stars || !age || !text) return res.status(400).json({ error: 'invalid_payload' });

    const clamped = Math.max(1, Math.min(5, Number(stars)));
    const exists = await prisma.spot.findUnique({ where: { id: spotId } });
    if (!exists) return res.status(404).json({ error: 'spot_not_found' });

    await prisma.review.create({
      data: { spotId, stars: clamped, childAge: String(age), text: String(text).slice(0, 1000), status: 'public' },
    });

    const stats = await prisma.review.aggregate({ _avg: { stars: true }, where: { spotId, status: 'public' } });
    await prisma.spot.update({ where: { id: spotId }, data: { rating: stats._avg.stars || 0 } });

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'internal_error' });
  }
}

