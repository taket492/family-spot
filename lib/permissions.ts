import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';
import { NextApiRequest, NextApiResponse } from 'next';

export type UserRole = 'guest' | 'user' | 'admin';

export interface SessionWithRole {
  user: {
    id: string;
    role: UserRole;
    email?: string;
    name?: string;
  };
}

export async function getSessionWithRole(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<SessionWithRole | null> {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user) {
    return null;
  }

  return session as SessionWithRole;
}

export function requireRole(allowedRoles: UserRole[]) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
  ) => {
    const session = await getSessionWithRole(req, res);

    if (!session) {
      if (allowedRoles.includes('guest')) {
        req.userRole = 'guest';
        return handler(req, res);
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = session.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    req.userId = session.user.id;
    req.userRole = userRole;

    return handler(req, res);
  };
}

export function requireAdmin() {
  return requireRole(['admin']);
}

export function requireUser() {
  return requireRole(['user', 'admin']);
}

export function allowGuest() {
  return requireRole(['guest', 'user', 'admin']);
}

declare global {
  namespace NodeJS {
    interface Request {
      userId?: string;
      userRole?: UserRole;
    }
  }
}

declare module 'next' {
  interface NextApiRequest {
    userId?: string;
    userRole?: UserRole;
  }
}