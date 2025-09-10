import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './db';
import bcrypt from 'bcryptjs';

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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Check for test user (development only)
          if (process.env.NODE_ENV === 'development' && 
              credentials.email === 'test@example.com' && 
              credentials.password === 'password') {
            return {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user'
            };
          }

          // Check database for real users
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user) {
            if (process.env.NODE_ENV === 'development') {
              console.log('User not found:', credentials.email);
            }
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Invalid password for user:', credentials.email);
            }
            return null;
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('User authenticated successfully:', user.email);
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name || null,
            role: user.role,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  debug: process.env.NODE_ENV === 'development',
};