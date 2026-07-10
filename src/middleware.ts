import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Routes that never require the owner session.
const PUBLIC_PREFIXES = [
  '/login',
  '/portal',
  '/api/stripe/webhook',
  '/api/cron',
  '/api/portal',
  '/api/pay',
  '/api/auth',
  '/sw.js',
  '/manifest.webmanifest',
  '/offline',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Local dev without Supabase configured: no auth wall.
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ownerEmail = (process.env.OWNER_EMAIL ?? '').trim().toLowerCase();
  const isOwner = Boolean(
    user?.email && ownerEmail && user.email.trim().toLowerCase() === ownerEmail
  );

  if (!isOwner) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', pathname);
    // Signed in but rejected — tell the login page why so it can explain
    // (OWNER_EMAIL unset vs. signed in with a different account).
    if (user?.email) {
      loginUrl.searchParams.set('denied', user.email);
      if (!ownerEmail) loginUrl.searchParams.set('reason', 'owner-unset');
    }
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
