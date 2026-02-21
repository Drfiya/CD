import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api/auth (NextAuth routes)
     * - api/stripe (Stripe webhooks — unauthenticated by design)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - login, register, forgot-password, reset-password, registration-success (auth pages)
     */
    '/((?!api/auth|api/stripe|_next/static|_next/image|favicon.ico|login|register|forgot-password|reset-password|registration-success).*)',
  ],
};
