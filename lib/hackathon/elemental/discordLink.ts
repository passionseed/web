/**
 * The Elemental sign-up page, /hackathon/join/{payToken}, doubles as the
 * place a paid participant connects Discord. Pure helpers, shared by the
 * button, the auth callback and the proxy onboarding gate.
 */

export const ELEMENTAL_JOIN_PREFIX = "/hackathon/join/";

const PAY_TOKEN = /^[0-9a-f]{32}$/;

/** Same scopes as the SHIFT join link: who they are, and leave to add them to the server. */
export const ELEMENTAL_DISCORD_SCOPES = "identify,email,guilds.join";

export function elementalJoinPath(token: string): string {
  return `${ELEMENTAL_JOIN_PREFIX}${token}`;
}

/** The pay token when `path` is exactly a sign-up page, else null. */
export function tokenFromElementalJoinPath(path: string): string | null {
  if (!path.startsWith(ELEMENTAL_JOIN_PREFIX)) return null;
  const token = path.slice(ELEMENTAL_JOIN_PREFIX.length).split(/[/?#]/)[0];
  return PAY_TOKEN.test(token) ? token : null;
}

/** Hackathon pages never bounce a signed-in visitor to /onboard. */
export function isHackathonPath(path: string): boolean {
  return path === "/hackathon" || path.startsWith("/hackathon/") || path.startsWith("/hackathon?");
}

export function elementalDiscordCallbackUrl(token: string, origin: string): string {
  const url = new URL("/auth/callback", origin);
  // OAuth must return to the origin holding the PKCE verifier cookie.
  if (url.hostname === "0.0.0.0" || url.hostname === "[::]") {
    url.hostname = "localhost";
  }
  url.searchParams.set("next", elementalJoinPath(token));
  return url.toString();
}

/** What the sign-up page says after the Discord round trip (?discord=…). */
export type ElementalDiscordOutcome =
  | "joined"
  | "not_member"
  | "taken"
  | "not_paid"
  | "no_discord"
  | "auth"
  | "error";

const OUTCOMES: readonly ElementalDiscordOutcome[] = [
  "joined",
  "not_member",
  "taken",
  "not_paid",
  "no_discord",
  "auth",
  "error",
];

export function parseElementalDiscordOutcome(value: string | undefined): ElementalDiscordOutcome | null {
  return OUTCOMES.find((o) => o === value) ?? null;
}
