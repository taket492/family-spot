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

    if (req.method === 'GET') {
      const families = await prisma.family.findMany({
        where: {
          members: {
            some: {
              userId: userId
            }
          }
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
          },
          _count: {
            select: {
              spotVisits: true,
              eventVisits: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return res.status(200).json(families);
    }

    if (req.method === 'POST') {
      const { name, description } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Family name is required' });
      }

      const family = await prisma.family.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          createdBy: userId,
          members: {
            create: {
              userId: userId,
              role: 'admin'
            }
          }
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

      return res.status(201).json(family);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Family API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}