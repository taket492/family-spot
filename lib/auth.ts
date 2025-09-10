import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const secret = process.env.NEXTAUTH_SECRET || 'development-secret-key-please-change-in-production-min-32-chars';

if (!secret || secret.length < 32) {
  console.warn('NextAuth: Please set a secure NEXTAUTH_SECRET with at least 32 characters');
}

export const authOptions: NextAuthOptions = {
  secret,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // Simplified authorization for testing
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Temporary: allow test user
        if (credentials.email === 'test@example.com' && credentials.password === 'password') {
          return {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user'
          };
        }

        return null;
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/signin',
  },
  debug: true,
};