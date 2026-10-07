import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { trackAppRegister, assignUserToCohort } from "@/lib/supabase/funnel-tracking";
import {
  isProfileComplete,
  PROFILE_COMPLETION_SELECT,
} from "@/lib/profile-completion";
import { completeShiftJoin } from "@/lib/shift/join";
import { shiftJoinPath, tokenFromShiftJoinPath } from "@/lib/shift/joinLink";
import { shiftDiscordAuthError } from "@/lib/shift/discordAuth";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Prefer the browser Host header. `next dev -H 0.0.0.0` makes `request.url`
 * report origin `http://0.0.0.0:3000`, which breaks cookies + OAuth allowlists.
 */
function resolveAppOrigin(request: Request): string {
  const url = new URL(request.url);
  const hostHeader =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protoHeader = request.headers.get("x-forwarded-proto");
  const protocol = protoHeader ?? url.protocol.replace(":", "") ?? "http";

  const host = hostHeader?.split(",")[0]?.trim() || url.host;
  if (host.startsWith("0.0.0.0") || host.startsWith("[::]")) {
    return `${protocol}://localhost:${url.port || "3000"}`;
  }

  return `${protocol}://${host}`;
}

function redirectWithCookies(url: URL, pendingCookies: PendingCookie[]) {
  const response = NextResponse.redirect(url);
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = resolveAppOrigin(request);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/me";
  if (!next.startsWith("/") || next.startsWith("//")) {
    next = "/me";
  }

  if (code) {
    const cookieStore = await cookies();
    // `cookies().set()` alone often does NOT attach Set-Cookie to a separately
    // constructed NextResponse.redirect(). Collect and write onto the redirect.
    const pendingCookies: PendingCookie[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: PendingCookie[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              pendingCookies.push({ name, value, options });
              try {
                cookieStore.set(name, value, options);
              } catch {
                // Still applied on the redirect Response below.
              }
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session && data.user) {
      const userId = data.user.id;
      const isNewUser =
        data.user.created_at &&
        new Date(data.user.created_at) > new Date(Date.now() - 60000);

      if (isNewUser) {
        await trackAppRegister(userId);
        await assignUserToCohort(userId, "organic", "oauth_signup");
      }

      // Paid SHIFT students skip onboarding: linking Discord is the whole
      // signup. The provider token only exists here, so the join runs now.
      const shiftJoinToken = tokenFromShiftJoinPath(next);
      if (shiftJoinToken) {
        const joinError = await completeShiftJoin({
          token: shiftJoinToken,
          user: data.user,
          providerToken: data.session.provider_token,
        });
        const target = new URL(shiftJoinPath(shiftJoinToken), origin);
        if (joinError) target.searchParams.set("error", joinError);
        return redirectWithCookies(target, pendingCookies);
      }

      // SeedStack links an existing SHIFT student's CLI; no onboarding detour.
      if (next.startsWith("/shift/seedstack")) {
        return redirectWithCookies(new URL(next, origin), pendingCookies);
      }

      let profileData = null;
      let profileError = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        const waitTime = 200 + retryCount * 300;
        await new Promise((resolve) => setTimeout(resolve, waitTime));

        const result = await supabase
          .from("profiles")
          .select(`${PROFILE_COMPLETION_SELECT}, is_onboarded`)
          .eq("id", userId)
          .single();

        profileData = result.data;
        profileError = result.error;

        if (!profileError) {
          break;
        }

        if (profileError.code !== "PGRST116") {
          break;
        }

        retryCount++;
      }

      let redirectTo = next;

      if (profileError && profileError.code === "PGRST116") {
        console.error("Profile creation trigger failed for user:", userId);
        return redirectWithCookies(
          new URL("/auth/auth-code-error?error=profile_creation_failed", origin),
          pendingCookies
        );
      } else if (profileError) {
        console.error("Error fetching profile:", profileError);
        return redirectWithCookies(
          new URL(
            `/auth/auth-code-error?error=profile_fetch_failed&details=${encodeURIComponent(profileError.message)}`,
            origin
          ),
          pendingCookies
        );
      }

      if (profileData) {
        const { data: guardianConsent } = await supabase
          .from("profile_guardian_consents")
          .select("guardian_phone, guardian_relationship, consent_confirmed_at")
          .eq("user_id", userId)
          .maybeSingle();

        if (
          !isProfileComplete(profileData, guardianConsent) ||
          !profileData.is_onboarded
        ) {
          // Carry the destination through onboarding, otherwise a first-time
          // signup arriving from a join link loses where they were headed.
          redirectTo =
            next === "/me" ? "/onboard" : `/onboard?next=${encodeURIComponent(next)}`;
        }
      }

      return redirectWithCookies(new URL(redirectTo, origin), pendingCookies);
    }
  }

  // OAuth failures must preserve the paid student's destination and offer a
  // Discord-specific retry, rather than sending them to generic onboarding.
  const failedShiftJoinToken = tokenFromShiftJoinPath(next);
  if (failedShiftJoinToken) {
    const retry = new URL(shiftJoinPath(failedShiftJoinToken), origin);
    retry.searchParams.set("error", shiftDiscordAuthError(searchParams));
    return NextResponse.redirect(retry);
  }

  const errorRedirect = new URL("/auth/auth-code-error", origin);
  errorRedirect.searchParams.set("next", next);
  for (const key of ["error", "error_code", "error_description"]) {
    const value = searchParams.get(key);
    if (value) errorRedirect.searchParams.set(key, value);
  }

  return NextResponse.redirect(errorRedirect);
}
