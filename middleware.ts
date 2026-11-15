import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

/** Paths (locale-stripped) that require a logged-in account. */
function isProtected(path: string): boolean {
  return (
    path === '/dashboard' ||
    path.startsWith('/dashboard/')
  )
}

/**
 * An admin opening a client's dashboard from the Users page. Allowed through
 * without a client session, but only with a current admin cookie and an
 * explicit ?as= target, so a stray visit can't land on someone's dashboard.
 */
function isAdminViewingAs(request: NextRequest): boolean {
  if (!request.nextUrl.searchParams.get('as')) return false;
  const token = request.cookies.get('admin_session')?.value;
  if (!token) return false;
  try {
    const decoded = atob(token);
    const parts = decoded.split(':');
    if (parts[0] !== 'admin' && parts[0] !== 'mentor') return false;
    const issuedAt = Number(parts[parts.length - 1]);
    // Matches the cookie's own 24-hour lifetime.
    return Number.isFinite(issuedAt) && Date.now() - issuedAt < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** mentorship.mentixtrading.com is a single-page microsite: every request to
 *  it serves the mentorship-features page, except /apply which serves the
 *  application form directly on the subdomain too. */
function isMentorshipSubdomain(host: string): boolean {
  return host === 'mentorship.mentixtrading.com' || host.startsWith('mentorship.localhost');
}

export default async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  if (isMentorshipSubdomain(host) && !request.nextUrl.pathname.startsWith('/api/') && !request.nextUrl.pathname.startsWith('/_next/')) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.pathname.startsWith('/apply') ? '/en/apply' : '/en/mentorship-features';
    return NextResponse.rewrite(url);
  }

  // API routes: only refresh the Supabase session cookie (so an expired
  // access token gets rotated before the route handler reads it) — never
  // run next-intl's locale routing here, since it would try to redirect
  // e.g. /api/course/access to /en/api/course/access and break every
  // client-side fetch() call to the API.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    await updateSession(request, response);
    return response;
  }

  // Run locale routing first, then refresh the Supabase session on its response.
  const response = intlMiddleware(request);
  const { user } = await updateSession(request, response);

  // Gate the client dashboard: guests get redirected to login.
  const parts = request.nextUrl.pathname.split('/');
  const locale = parts[1] === 'ar' || parts[1] === 'en' ? parts[1] : routing.defaultLocale;
  const rest = '/' + parts.slice(2).join('/');
  if (isProtected(rest) && !user && !isAdminViewingAs(request)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = '';
    url.searchParams.set('redirect', rest);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/(ar|en)/:path*',
    '/api/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
