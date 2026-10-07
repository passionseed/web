import { shiftJoinPath } from "@/lib/shift/joinLink";

// Supabase accepts additional provider scopes as a comma-separated list.
export const SHIFT_DISCORD_SCOPES = "identify,email,guilds.join";

export type ShiftDiscordAuthError =
  | "discord_identity_exists"
  | "discord_email"
  | "discord_auth";

export function shiftDiscordCallbackUrl(token: string, origin: string): string {
  const url = new URL("/auth/callback", origin);
  // OAuth must return to the origin holding the PKCE verifier cookie.
  if (url.hostname === "0.0.0.0" || url.hostname === "[::]") {
    url.hostname = "localhost";
  }
  url.searchParams.set("next", shiftJoinPath(token));
  return url.toString();
}

export function shiftDiscordAuthError(params: URLSearchParams): ShiftDiscordAuthError {
  if (params.get("error_code") === "identity_already_exists") {
    return "discord_identity_exists";
  }
  if (
    params.get("error_code") === "provider_email_needs_verification" ||
    params.get("error_description") === "Error getting user email from external provider"
  ) {
    return "discord_email";
  }
  return "discord_auth";
}

export function isShiftDiscordAuthError(value: string | undefined): value is ShiftDiscordAuthError {
  return value === "discord_identity_exists" || value === "discord_email" || value === "discord_auth";
}
