import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    // Add custom middleware logic here if needed
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - /auth routes (login/signup pages)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|images|auth).*)',
  ],
};