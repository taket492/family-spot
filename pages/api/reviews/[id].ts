import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/permissions';

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    return res.status(404).json({ error: 'review_not_found' });
  }

  await prisma.review.delete({ where: { id } });

  const stats = await prisma.review.aggregate({
    _avg: { stars: true },
    where: { spotId: review.spotId, status: 'public' }
  });

  await prisma.spot.update({
    where: { id: review.spotId },
    data: { rating: stats._avg.stars || 0 }
  });

  res.status(200).json({ ok: true, message: 'Review deleted successfully' });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'DELETE') {
      return requireAdmin()(req, res, handleDelete);
    } else {
      return res.status(405).json({ error: 'method_not_allowed' });
    }
  } catch (e) {
    res.status(500).json({ error: 'internal_error' });
  }
}