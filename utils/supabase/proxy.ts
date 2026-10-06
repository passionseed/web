import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { JwtPayload, User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { isAnonymousUser } from '@/lib/supabase/auth'
import {
  isProfileComplete,
  PROFILE_COMPLETION_SELECT,
} from '@/lib/profile-completion'
import { SHIFT_JOIN_PREFIX } from '@/lib/shift/joinLink'
import { isPublicRoute } from './public-routes'

function shouldSkipOnboardGate(pathname: string): boolean {
  return (
    pathname === '/onboard' ||
    pathname.startsWith('/onboard/') ||
    pathname.startsWith('/auth/') ||
    // Paid SHIFT students link Discord without the full PassionSeed onboard.
    pathname.startsWith(SHIFT_JOIN_PREFIX) ||
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

// Remembers, per user, that the onboard gate already passed, so ordinary
// navigation skips the two profile queries. Bound to the user id so a shared
// browser re-checks after an account switch, and short-lived so a newly added
// required profile field is still enforced within a day. It is a UX gate, not
// an authorization boundary, so a client-side cookie is enough.
const ONBOARDED_COOKIE = 'ps_onboarded'
const ONBOARDED_COOKIE_MAX_AGE = 60 * 60 * 24

async function needsOnboard(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<boolean> {
  const [{ data: profile }, { data: guardianConsent }] = await Promise.all([
    supabase
      .from('profiles')
      .select(`${PROFILE_COMPLETION_SELECT}, is_onboarded`)
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('profile_guardian_consents')
      .select('guardian_phone, guardian_relationship, consent_confirmed_at')
      .eq('user_id', userId)
      .maybeSingle(),
  ])
  return !isProfileComplete(profile, guardianConsent) || !profile?.is_onboarded
}

// The JWT carries every field the proxy reads (id, email, app_metadata,
// is_anonymous, aud), so it stands in for the full User without a fetch.
function userFromClaims(claims: JwtPayload): User {
  return {
    id: claims.sub,
    email: claims.email,
    aud: typeof claims.aud === 'string' ? claims.aud : '',
    is_anonymous: claims.is_anonymous,
    app_metadata: claims.app_metadata ?? {},
    user_metadata: claims.user_metadata ?? {},
    created_at: '',
  }
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
  let user: User | null = null
  try {
    // getClaims() refreshes the session if expired, then verifies the JWT
    // locally against the cached JWKS instead of a round trip to the auth
    // server on every navigation.
    const { data, error } = await supabase.auth.getClaims()
    if (error && isDeadRefreshToken(error)) {
      // The browser holds a refresh token the auth server no longer knows
      // (revoked or already rotated). auth-js drops the session server-side,
      // but the stale cookie otherwise keeps coming back with every request,
      // resurfacing as error noise downstream. Treat as signed out.
      supabaseResponse = clearSupabaseAuthCookies(request, supabaseResponse)
    }
    user = data?.claims ? userFromClaims(data.claims) : null
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
    !shouldSkipOnboardGate(pathname) &&
    request.cookies.get(ONBOARDED_COOKIE)?.value !== user.id
  ) {
    if (await needsOnboard(supabase, user.id)) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboard'
      url.search = ''
      return copySessionCookies(supabaseResponse, NextResponse.redirect(url))
    }
    supabaseResponse.cookies.set(ONBOARDED_COOKIE, user.id, {
      maxAge: ONBOARDED_COOKIE_MAX_AGE,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
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
