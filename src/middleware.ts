import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicPaths = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ];

  // Allow root landing page (public marketing page)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Allow public auth pages
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow API auth routes and translation API (used by public landing page)
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/translate')) {
    return NextResponse.next();
  }

  // Check for session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|community-logo|.*\\.svg$|.*\\.png$).*)',
  ],
};
