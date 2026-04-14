import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

export async function proxy(request: NextRequest) {
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