import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { JwtPayload, User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { isAnonymousUser } from '@/lib/supabase/auth'
import {
  isProfileComplete,
  PROFILE_COMPLETION_SELECT,
} from '@/lib/profile-completion'
import { isShiftPath } from '@/lib/shift/joinLink'
import { isPublicRoute } from './public-routes'

function shouldSkipOnboardGate(pathname: string): boolean {
  return (
    pathname === '/onboard' ||
    pathname.startsWith('/onboard/') ||
    pathname.startsWith('/auth/') ||
    // SHIFT applicants never do the full onboard, so no /shift page may
    // bounce them (or a friend applying on the same phone) to /onboard. This
    // also covers the school proposal forwarded to teachers and parents who
    // may hold a half-finished account.
    isShiftPath(pathname) ||
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

/** decodeURIComponent that keeps any escape it cannot decode, instead of throwing. */
function decodeLeniently(path: string): string {
  try {
    return decodeURIComponent(path)
  } catch {
    // One bad escape (e.g. "%zz") must not hide the rest of the path.
    return path.replace(/%[0-9a-f]{2}/gi, (escape) => {
      try {
        return decodeURIComponent(escape)
      } catch {
        return escape
      }
    })
  }
}

/**
 * The path as Next's router matches it. Next decodes percent-escapes before
 * it picks a route, so /%61dmin/users and /admin%2Fusers both render
 * app/admin/users, while request.nextUrl.pathname keeps the escapes. Route
 * checks that guard something (the admin gate, the admin no-store rule) must
 * use this. Decoding repeats (at most three passes) and repeated slashes
 * collapse: either can only make a path look more like a guarded one, so the
 * checks fail closed.
 */
export function routingPathname(pathname: string): string {
  let path = pathname
  for (let pass = 0; pass < 3; pass += 1) {
    const decoded = decodeLeniently(path)
    if (decoded === path) break
    path = decoded
  }
  return path.replace(/\/{2,}/g, '/')
}

/**
 * /admin and everything under it, but not look-alikes such as /administrator.
 * Also /admin.rsc and similar suffixes, which Next's router can map back to
 * /admin. Matches the decoded routing path (see routingPathname).
 */
export function isAdminPagePath(pathname: string): boolean {
  return /^\/admin(?:$|[/.])/.test(routingPathname(pathname))
}

/**
 * Whether the signed-in user holds the web admin role. Uses the request's own
 * client, so RLS (users_read_own_roles) applies. Any error counts as "no":
 * the admin gate fails closed.
 */
async function hasAdminRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .limit(1)
    return !error && Array.isArray(data) && data.length > 0
  } catch {
    return false
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
    // handle their own auth state gracefully. Admin pages fail closed.
    if (isAdminPagePath(request.nextUrl.pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = ''
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  const pathname = request.nextUrl.pathname

  // Admin pages are never public, even when a public rule (such as the .md
  // suffix) would otherwise match the path.
  if (!user && (isAdminPagePath(pathname) || !isPublicRoute(pathname))) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Whiteboards and the calendar: come back to the page after signing in.
    if (/^\/(whiteboard|calendar)(\/|$)/.test(pathname)) {
      url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`
    }
    return copySessionCookies(supabaseResponse, NextResponse.redirect(url))
  }

  // Admin pages are checked here as well as in app/admin/layout.tsx. An RSC
  // request carrying a forged Next-Router-State-Tree header can make Next
  // render an admin page without its layout, so the layout alone is not a
  // boundary (docs/features/admin-console.md, S1). Non-admins go to /me, like
  // lib/admin/requireAdmin.ts. Link-preview bots never reach this: proxy.ts
  // rewrites them to /link-preview first.
  if (user && isAdminPagePath(pathname) && !(await hasAdminRole(supabase, user.id))) {
    const url = request.nextUrl.clone()
    url.pathname = '/me'
    url.search = ''
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
