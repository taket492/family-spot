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

    const currentUserId = session.user.id;
    const { id: familyId, userId } = req.query;

    if (!familyId || typeof familyId !== 'string' || !userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Invalid family ID or user ID' });
    }

    const currentUserMembership = await prisma.familyMember.findUnique({
      where: {
        familyId_userId: {
          familyId: familyId,
          userId: currentUserId
        }
      }
    });

    if (!currentUserMembership) {
      return res.status(403).json({ error: 'Not a family member' });
    }

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: { createdBy: true }
    });

    if (!family) {
      return res.status(404).json({ error: 'Family not found' });
    }

    if (req.method === 'DELETE') {
      if (userId === currentUserId) {
        await prisma.familyMember.delete({
          where: {
            familyId_userId: {
              familyId: familyId,
              userId: userId
            }
          }
        });

        return res.status(200).json({ message: 'Left family successfully' });
      } else {
        const isAdmin = currentUserMembership.role === 'admin' || family.createdBy === currentUserId;

        if (!isAdmin) {
          return res.status(403).json({ error: 'Admin access required to remove members' });
        }

        if (userId === family.createdBy) {
          return res.status(400).json({ error: 'Cannot remove family creator' });
        }

        await prisma.familyMember.delete({
          where: {
            familyId_userId: {
              familyId: familyId,
              userId: userId
            }
          }
        });

        return res.status(200).json({ message: 'Member removed successfully' });
      }
    }

    if (req.method === 'PUT') {
      const { role } = req.body;

      if (!role || !['admin', 'member'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const isCreator = family.createdBy === currentUserId;

      if (!isCreator) {
        return res.status(403).json({ error: 'Only family creator can change member roles' });
      }

      if (userId === family.createdBy) {
        return res.status(400).json({ error: 'Cannot change creator role' });
      }

      const updatedMember = await prisma.familyMember.update({
        where: {
          familyId_userId: {
            familyId: familyId,
            userId: userId
          }
        },
        data: { role },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return res.status(200).json(updatedMember);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Family member API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}