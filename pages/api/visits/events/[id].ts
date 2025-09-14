import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/permissions';

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const userId = req.userId!;

  const visit = await prisma.userEventVisit.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId: id,
      },
    },
  });

  res.status(200).json({ visit });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const userId = req.userId!;
  const { status, attendedAt, notes, sharingLevel, familyId } = req.body;

  if (!['attended', 'want_to_attend', 'interested'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  if (!['private', 'family'].includes(sharingLevel)) {
    return res.status(400).json({ error: 'Invalid sharing level' });
  }

  if (sharingLevel === 'family' && familyId) {
    const isFamilyMember = await prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId,
        },
      },
    });

    if (!isFamilyMember) {
      return res.status(403).json({ error: 'Not a member of the specified family' });
    }
  }

  const visit = await prisma.userEventVisit.upsert({
    where: {
      userId_eventId: {
        userId,
        eventId: id,
      },
    },
    update: {
      status,
      attendedAt: attendedAt ? new Date(attendedAt) : null,
      notes,
      sharingLevel: sharingLevel || 'private',
      familyId: sharingLevel === 'family' ? familyId : null,
    },
    create: {
      userId,
      eventId: id,
      status,
      attendedAt: attendedAt ? new Date(attendedAt) : null,
      notes,
      sharingLevel: sharingLevel || 'private',
      familyId: sharingLevel === 'family' ? familyId : null,
    },
  });

  res.status(200).json({ visit });
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const userId = req.userId!;

  await prisma.userEventVisit.deleteMany({
    where: {
      userId,
      eventId: id,
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
    console.error('Event visit API error:', e);
    res.status(500).json({ error: 'internal_error' });
  }
}