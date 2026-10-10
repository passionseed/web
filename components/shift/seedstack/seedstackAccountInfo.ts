/** The slice of a Supabase `User` this module reads, so tests need no Supabase. */
export type SeedstackAccountUser = {
  email?: string | null;
  app_metadata?: { provider?: string } | null;
  user_metadata?: Record<string, unknown> | null;
  identities?: { provider: string; identity_data?: Record<string, unknown> | null }[] | null;
};

export type SeedstackAccount = {
  /** What to show after "signed in as". Null when the account has nothing safe to show. */
  label: string | null;
  isDiscord: boolean;
  /** No paid SHIFT seat on this account, so mentors would not know who it is. */
  needsSwitch: boolean;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Discord stores `name` as "username#0"; the discriminator is noise now. */
function stripDiscriminator(name: string | null): string | null {
  return name ? name.replace(/#0+$/, "") : null;
}

function discordData(user: SeedstackAccountUser): Record<string, unknown> | null {
  const identity = user.identities?.find((item) => item.provider === "discord");
  if (identity?.identity_data) return identity.identity_data;
  return user.app_metadata?.provider === "discord" ? user.user_metadata ?? null : null;
}

/**
 * Discord display name plus @username when they differ, so a student with two
 * Discord accounts can tell which one is signed in.
 */
function discordLabel(data: Record<string, unknown>): string | null {
  const claims = data.custom_claims as Record<string, unknown> | undefined;
  const username =
    text(data.user_name) ?? text(data.preferred_username) ?? text(data.full_name) ?? stripDiscriminator(text(data.name));
  const display = text(claims?.global_name);
  if (display && username && display !== username) return `${display} (@${username})`;
  return display ?? (username ? `@${username}` : null);
}

export function describeSeedstackAccount(user: SeedstackAccountUser, nickname: string | null): SeedstackAccount {
  const discord = discordData(user);
  const label = (discord && discordLabel(discord)) ?? text(user.email);
  return { label, isDiscord: discord !== null, needsSwitch: nickname === null };
}
