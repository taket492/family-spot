import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
      const includeMembers = req.query.includeMembers === 'true';

      const family = await prisma.family.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          inviteCode: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          members: includeMembers ? {
            select: {
              id: true,
              role: true,
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: {
              joinedAt: 'asc'
            }
          } : false,
          _count: {
            select: {
              members: true,
              spotVisits: true,
              eventVisits: true
            }
          }
        }
      });

      if (!family) {
        return res.status(404).json({ error: 'Family not found' });
      }

      res.setHeader('Cache-Control', 'private, max-age=30, s-maxage=30');
      return res.status(200).json(family);
    }

    if (req.method === 'PUT') {
      const isAdmin = isMember.role === 'admin' || isMember.userId === (await prisma.family.findUnique({
        where: { id },
        select: { createdBy: true }
      }))?.createdBy;

      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { name, description } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Family name is required' });
      }

      const family = await prisma.family.update({
        where: { id },
        data: {
          name: name.trim(),
          description: description?.trim() || null
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      return res.status(200).json(family);
    }

    if (req.method === 'DELETE') {
      const family = await prisma.family.findUnique({
        where: { id },
        select: { createdBy: true }
      });

      if (!family || family.createdBy !== userId) {
        return res.status(403).json({ error: 'Only the family creator can delete the family' });
      }

      await prisma.family.delete({
        where: { id }
      });

      return res.status(200).json({ message: 'Family deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Family detail API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}