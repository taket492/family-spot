import { useSession } from 'next-auth/react';

export type UserRole = 'guest' | 'user' | 'admin';

export function useAuth() {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isAuthenticated = !!session?.user;
  const userRole: UserRole = session?.user?.role as UserRole || 'guest';
  const userId = session?.user?.id;

  const isAdmin = userRole === 'admin';
  const isUser = userRole === 'user' || userRole === 'admin';
  const isGuest = userRole === 'guest';

  return {
    session,
    isLoading,
    isAuthenticated,
    userRole,
    userId,
    isAdmin,
    isUser,
    isGuest,
  };
}