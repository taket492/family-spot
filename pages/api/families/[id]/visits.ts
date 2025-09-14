import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid family ID' });
    }

    const isMember = await prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId: id,
          userId: userId
        }
      }
    });

    if (!isMember) {
      return res.status(403).json({ error: 'Not a family member' });
    }

    if (req.method === 'GET') {
      const [spots, events] = await Promise.all([
        prisma.userSpotVisit.findMany({
          where: {
            familyId: id,
            sharingLevel: 'family'
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            spot: {
              select: {
                id: true,
                name: true,
                city: true,
                address: true,
                tags: true,
                images: true,
                rating: true
              }
            }
          },
          orderBy: {
            updatedAt: 'desc'
          }
        }),
        prisma.userEventVisit.findMany({
          where: {
            familyId: id,
            sharingLevel: 'family'
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            event: {
              select: {
                id: true,
                title: true,
                city: true,
                address: true,
                startAt: true,
                endAt: true,
                tags: true,
                images: true
              }
            }
          },
          orderBy: {
            updatedAt: 'desc'
          }
        })
      ]);

      const stats = {
        totalSpots: spots.length,
        totalEvents: events.length,
        visitedSpots: spots.filter(v => v.status === 'visited').length,
        wantToVisitSpots: spots.filter(v => v.status === 'want_to_visit').length,
        favoriteSpots: spots.filter(v => v.status === 'favorite').length,
        attendedEvents: events.filter(v => v.status === 'attended').length,
        wantToAttendEvents: events.filter(v => v.status === 'want_to_attend').length,
        interestedEvents: events.filter(v => v.status === 'interested').length,
        uniqueMembers: new Set([
          ...spots.map(s => s.userId),
          ...events.map(e => e.userId)
        ]).size
      };

      const spotsByUser = spots.reduce((acc, spot) => {
        const userKey = spot.user.id;
        if (!acc[userKey]) {
          acc[userKey] = {
            user: spot.user,
            visits: []
          };
        }
        acc[userKey].visits.push(spot);
        return acc;
      }, {} as Record<string, { user: any; visits: any[] }>);

      const eventsByUser = events.reduce((acc, event) => {
        const userKey = event.user.id;
        if (!acc[userKey]) {
          acc[userKey] = {
            user: event.user,
            visits: []
          };
        }
        acc[userKey].visits.push(event);
        return acc;
      }, {} as Record<string, { user: any; visits: any[] }>);

      return res.status(200).json({
        spots,
        events,
        stats,
        spotsByUser: Object.values(spotsByUser),
        eventsByUser: Object.values(eventsByUser)
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Family visits API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}