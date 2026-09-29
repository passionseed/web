import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

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

export default async function proxy(request: NextRequest) {
  const authError = authErrorRedirect(request);
  if (authError) return authError;

  // Campaign redirects must work before sign-in and profile onboarding.
  if (request.nextUrl.pathname.startsWith('/go/')) {
    return NextResponse.next({ request });
  }

  // Add caching headers for GET API requests
  if (request.method === 'GET' && request.nextUrl.pathname.startsWith('/api/')) {
    const { pathname } = request.nextUrl
    const response = NextResponse.next({ request })
    
    if (pathname.startsWith('/api/maps')) {
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    } else if (pathname.startsWith('/api/assignments')) {
      response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    } else if (pathname.startsWith('/api/hero-galaxy')) {
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    } else if (pathname.startsWith('/api/tcas')) {
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    } else if (pathname.endsWith('/search') || pathname.endsWith('/list')) {
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    }
    
    return response
  }

  // Skip session refresh for API routes — they handle auth themselves
  if (request.nextUrl.pathname.startsWith('/api/')) {
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
