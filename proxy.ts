import { NextResponse, type NextRequest } from "next/server";
import { routingPathname, updateSession } from "@/utils/supabase/proxy";
import { adminPreviewPath } from "@/lib/og/linkPreviewBots";

/**
 * Supabase Auth reports OAuth failures by redirecting to the project's Site URL
 * with `error`, `error_code`, and `error_description` attached — not to the
 * `redirectTo` we asked for. That drops the user on the homepage with the
 * failure sitting invisibly in the query string, which reads as "the button did
 * nothing".
 *
 * Catch it anywhere it lands and route it to the page built to explain it.
 * Keyed on `error_code` because that parameter is GoTrue's and is not used
 * anywhere else in the app.
 */
function authErrorRedirect(request: NextRequest): NextResponse | null {
  const { searchParams, pathname } = request.nextUrl;

  if (!searchParams.get("error_code")) return null;
  if (pathname.startsWith("/auth/")) return null;

  const target = request.nextUrl.clone();
  target.pathname = "/auth/auth-code-error";
  return NextResponse.redirect(target);
}

/**
 * Public music-catalogue searches. Listed by name: a suffix rule such as
 * "ends in /search" would also hand a public cache header to any new or
 * percent-encoded route that happens to end the same way.
 */
const PUBLIC_SEARCH_ROUTES = new Set([
  '/api/apple-music/search',
  '/api/deezer/search',
  '/api/soundcloud/search',
  '/api/spotify/search',
])

/**
 * Cache-Control for GET /api/* responses, or null to leave the route's own.
 * `pathname` is the decoded routing path (routingPathname), so an encoded
 * admin URL such as /api/%61dmin/search is still recognised as admin.
 *
 * Admin APIs answer per signed-in admin and carry student data, so they are
 * never cached by the CDN, whatever their path ends in. A public s-maxage on
 * an admin path (e.g. /api/admin/search) would let a CDN serve one admin's
 * results to anyone requesting the same URL, because the cache key ignores
 * cookies. Checked before the public rules below.
 */
function apiCacheControl(pathname: string): string | null {
  if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) return 'private, no-store'
  if (pathname.startsWith('/api/maps')) return 'public, s-maxage=60, stale-while-revalidate=300'
  if (pathname.startsWith('/api/assignments')) return 'public, s-maxage=30, stale-while-revalidate=120'
  if (pathname.startsWith('/api/hero-galaxy')) return 'public, s-maxage=300, stale-while-revalidate=600'
  if (pathname.startsWith('/api/tcas')) return 'public, s-maxage=300, stale-while-revalidate=600'
  if (PUBLIC_SEARCH_ROUTES.has(pathname)) return 'public, s-maxage=300, stale-while-revalidate=600'
  return null
}

export default async function proxy(request: NextRequest) {
  const authError = authErrorRedirect(request);
  if (authError) return authError;

  // Chat apps fetch admin links signed out; show them a preview, not /login.
  const previewPath = adminPreviewPath(request.method, request.nextUrl.pathname, request.headers.get("user-agent"));
  if (previewPath) return NextResponse.rewrite(new URL(previewPath, request.url));

  // Campaign redirects must work before sign-in and profile onboarding.
  if (request.nextUrl.pathname.startsWith('/go/')) {
    return NextResponse.next({ request });
  }

  // Route checks below use the decoded path, the one Next's router matches.
  const routePath = routingPathname(request.nextUrl.pathname)

  // Add caching headers for GET API requests
  if (request.method === 'GET' && routePath.startsWith('/api/')) {
    const response = NextResponse.next({ request })
    const cacheControl = apiCacheControl(routePath)
    if (cacheControl) response.headers.set('Cache-Control', cacheControl)
    return response
  }

  // Skip session refresh for API routes — they handle auth themselves
  if (routePath.startsWith('/api/')) {
    return NextResponse.next({ request });
  }

  // Handle Supabase session updates for page navigations only
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
