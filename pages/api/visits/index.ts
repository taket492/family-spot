import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/permissions';
import { safeParseArray } from '@/lib/utils';

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.userId!;
  const { type, status } = req.query;

  const spotVisits = await prisma.userSpotVisit.findMany({
    where: {
      userId,
      ...(status && { status: String(status) }),
    },
    include: {
      spot: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  const eventVisits = await prisma.userEventVisit.findMany({
    where: {
      userId,
      ...(status && { status: String(status) }),
    },
    include: {
      event: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  const formattedSpotVisits = spotVisits.map(visit => ({
    ...visit,
    spot: {
      ...visit.spot,
      tags: safeParseArray(visit.spot.tags),
      images: safeParseArray(visit.spot.images),
    },
  }));

  const formattedEventVisits = eventVisits.map(visit => ({
    ...visit,
    event: {
      ...visit.event,
      tags: safeParseArray(visit.event.tags),
      images: safeParseArray(visit.event.images),
    },
  }));

  if (type === 'spots') {
    return res.status(200).json({ visits: formattedSpotVisits });
  } else if (type === 'events') {
    return res.status(200).json({ visits: formattedEventVisits });
  }

  res.status(200).json({
    spots: formattedSpotVisits,
    events: formattedEventVisits,
    stats: {
      totalSpots: spotVisits.length,
      totalEvents: eventVisits.length,
      visitedSpots: spotVisits.filter(v => v.status === 'visited').length,
      attendedEvents: eventVisits.filter(v => v.status === 'attended').length,
      favoriteSpots: spotVisits.filter(v => v.status === 'favorite').length,
      interestedEvents: eventVisits.filter(v => v.status === 'interested').length,
    },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      return requireUser()(req, res, handleGet);
    } else {
      return res.status(405).json({ error: 'method_not_allowed' });
    }
  } catch (e) {
    console.error('Visits API error:', e);
    res.status(500).json({ error: 'internal_error' });
  }
}