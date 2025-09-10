import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

export default NextAuth(authOptions);

// Add logging for debugging
console.log('NextAuth API route loaded with options:', {
  providers: authOptions.providers?.length || 0,
  secret: !!authOptions.secret,
  debug: authOptions.debug
});