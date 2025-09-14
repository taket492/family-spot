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

    if (req.method === 'POST') {
      const family = await prisma.family.findUnique({
        where: { id },
        include: {
          members: true
        }
      });

      if (!family) {
        return res.status(404).json({ error: 'Family not found' });
      }

      const existingMember = await prisma.familyMember.findUnique({
        where: {
          familyId_userId: {
            familyId: id,
            userId: userId
          }
        }
      });

      if (existingMember) {
        return res.status(400).json({ error: 'Already a member of this family' });
      }

      const familyMember = await prisma.familyMember.create({
        data: {
          familyId: id,
          userId: userId,
          role: 'member'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          family: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      });

      return res.status(201).json({
        message: 'Successfully joined family',
        member: familyMember
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Family join API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}