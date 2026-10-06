import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAnonymousUser } from '@/lib/supabase/auth'
import {
  isProfileComplete,
  PROFILE_COMPLETION_SELECT,
} from '@/lib/profile-completion'
import { isPublicRoute } from './public-routes'

function shouldSkipOnboardGate(pathname: string): boolean {
  return (
    pathname === '/onboard' ||
    pathname.startsWith('/onboard/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/')
  )
}

function copySessionCookies(
  from: NextResponse,
  to: NextResponse
): NextResponse {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value)
  })
  return to
}

function isDeadRefreshToken(error: { code?: string }): boolean {
  return error.code === 'refresh_token_not_found'
}

// Delete every Supabase auth cookie (base name and chunked `.0`, `.1`, ...
// variants) on the response, so a browser holding a dead refresh token comes
// back clean instead of re-triggering a failed refresh on every request.
function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  request.cookies.getAll().forEach(({ name }) => {
    if (/^sb-.+-auth-token/.test(name)) {
      response.cookies.set(name, '', { maxAge: 0, path: '/' })
    }
  })
  return response
}

// Fail fast when Supabase is unreachable in local dev (Docker not running)
const isLocal = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost')

const fetchWithLocalTimeout = (url: RequestInfo | URL, options?: RequestInit) => {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new Error("Local Supabase request timed out after 3000ms")),
    3000
  )
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer))
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: isLocal ? fetchWithLocalTimeout : fetch },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  let user = null
  try {
    // getUser() refreshes the session if expired.
    const { data, error } = await supabase.auth.getUser()
    if (error && isDeadRefreshToken(error)) {
      // The browser holds a refresh token the auth server no longer knows
      // (revoked or already rotated). auth-js drops the session server-side,
      // but the stale cookie otherwise keeps coming back with every request,
      // resurfacing as error noise downstream. Treat as signed out.
      supabaseResponse = clearSupabaseAuthCookies(request, supabaseResponse)
    }
    user = data.user
  } catch {
    // Supabase unreachable (e.g. Docker not running in dev).
    // Skip auth check and let the request through — pages will
    // handle their own auth state gracefully.
    return supabaseResponse
  }

  const pathname = request.nextUrl.pathname

  if (!user && !isPublicRoute(pathname)) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return copySessionCookies(supabaseResponse, NextResponse.redirect(url))
  }

  // Logged-in users must finish onboard (profile essentials + journey) before app use.
  if (
    user &&
    !isAnonymousUser(user) &&
    !shouldSkipOnboardGate(pathname)
  ) {
    const { data: profile } = await supabase
      .from('profiles')
      .select(`${PROFILE_COMPLETION_SELECT}, is_onboarded`)
      .eq('id', user.id)
      .maybeSingle()
    const { data: guardianConsent } = await supabase
      .from('profile_guardian_consents')
      .select('guardian_phone, guardian_relationship, consent_confirmed_at')
      .eq('user_id', user.id)
      .maybeSingle()

    const needsOnboard =
      !isProfileComplete(profile, guardianConsent) || !profile?.is_onboarded

    if (needsOnboard) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboard'
      url.search = ''
      return copySessionCookies(supabaseResponse, NextResponse.redirect(url))
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
