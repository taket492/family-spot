import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/permissions';

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const userId = req.userId!;

  const visit = await prisma.userSpotVisit.findUnique({
    where: {
      userId_spotId: {
        userId,
        spotId: id,
      },
    },
  });

  res.status(200).json({ visit });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const userId = req.userId!;
  const { status, visitedAt, notes } = req.body;

  console.log('Spot visit API - POST:', { id, userId, status, visitedAt, notes });

  if (!['visited', 'want_to_visit', 'favorite'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const visit = await prisma.userSpotVisit.upsert({
      where: {
        userId_spotId: {
          userId,
          spotId: id,
        },
      },
      update: {
        status,
        visitedAt: visitedAt ? new Date(visitedAt) : null,
        notes,
      },
      create: {
        userId,
        spotId: id,
        status,
        visitedAt: visitedAt ? new Date(visitedAt) : null,
        notes,
      },
    });

    console.log('Spot visit created/updated:', visit);
    res.status(200).json({ visit });
  } catch (error) {
    console.error('Database error in spot visit API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const userId = req.userId!;

  await prisma.userSpotVisit.deleteMany({
    where: {
      userId,
      spotId: id,
    },
  });

  res.status(200).json({ ok: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      return requireUser()(req, res, handleGet);
    } else if (req.method === 'POST') {
      return requireUser()(req, res, handlePost);
    } else if (req.method === 'DELETE') {
      return requireUser()(req, res, handleDelete);
    } else {
      return res.status(405).json({ error: 'method_not_allowed' });
    }
  } catch (e) {
    console.error('Visit API error:', e);
    res.status(500).json({ error: 'internal_error' });
  }
}