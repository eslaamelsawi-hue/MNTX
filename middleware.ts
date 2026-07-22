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

export default async function middleware(request: NextRequest) {
  // Run locale routing first, then refresh the Supabase session on its response.
  const response = intlMiddleware(request);
  const { user } = await updateSession(request, response);

  // Gate the client dashboard: guests get redirected to login.
  const parts = request.nextUrl.pathname.split('/');
  const locale = parts[1] === 'ar' || parts[1] === 'en' ? parts[1] : routing.defaultLocale;
  const rest = '/' + parts.slice(2).join('/');
  if (isProtected(rest) && !user) {
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
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};
