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

    if (req.method === 'POST') {
      const { inviteCode } = req.body;

      if (!inviteCode || typeof inviteCode !== 'string' || inviteCode.trim().length === 0) {
        return res.status(400).json({ error: 'Invite code is required' });
      }

      const family = await prisma.family.findUnique({
        where: { inviteCode: inviteCode.trim() },
        include: {
          members: {
            where: {
              userId: userId
            }
          }
        }
      });

      if (!family) {
        return res.status(404).json({ error: 'Invalid invite code' });
      }

      if (family.members.length > 0) {
        return res.status(400).json({ error: 'Already a member of this family' });
      }

      const familyMember = await prisma.familyMember.create({
        data: {
          familyId: family.id,
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
              description: true,
              inviteCode: true
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
    console.error('Family join by code API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}