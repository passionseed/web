import "server-only";

import type { User } from "@supabase/supabase-js";

import { extractDiscordIdentity } from "@/lib/projectseed/discord";

/** A Discord user id (snowflake). The quest database keys every member on it. */
const SNOWFLAKE = /^\d{17,20}$/;
const NAME_MAX = 40;
/** Shown only when Discord sent no usable name at all. */
const FALLBACK_NAME = "สมาชิก SHIFT";

export interface DiscordActor {
  /** The Discord snowflake. Server-only: never send it to a client component. */
  actor: string;
  name: string;
  avatarUrl: string | null;
}

interface DiscordIdentityData {
  user_name?: unknown;
  full_name?: unknown;
  custom_claims?: { global_name?: unknown } | null;
}

/** A display name: trimmed, Discord's legacy "#0" suffix dropped, at most 40 characters. */
function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/#0$/, "").trim();
  if (!name) return null;
  return Array.from(name).slice(0, NAME_MAX).join("").trim();
}

function httpsUrl(value: string | null): string | null {
  return value && value.startsWith("https://") ? value : null;
}

/**
 * The Discord account on this Supabase user (signed in with Discord, or
 * linked later with linkIdentity), or null when there is none or its id is
 * not a snowflake. The name prefers Discord's display name (global_name),
 * then the username.
 */
export function discordActor(user: User | null): DiscordActor | null {
  const identity = extractDiscordIdentity(user);
  if (!identity || !SNOWFLAKE.test(identity.userId)) return null;

  const data = (user?.identities?.find((i) => i.provider === "discord")?.identity_data ?? {}) as DiscordIdentityData;
  const name =
    cleanName(data.custom_claims?.global_name) ??
    cleanName(data.user_name) ??
    cleanName(data.full_name) ??
    cleanName(identity.username) ??
    FALLBACK_NAME;

  return { actor: identity.userId, name, avatarUrl: httpsUrl(identity.avatarUrl) };
}

/** How the account is known when it has no Discord: its email, or null. */
export function accountLabel(user: User | null): string | null {
  const email = user?.email?.trim();
  return email ? email : null;
}
