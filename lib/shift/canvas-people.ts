/**
 * Who a SHIFT canvas belongs to, as staff know them: their name, their
 * nickname (ชื่อเล่น) from the SHIFT application, and the Discord account they
 * verified when they joined the SHIFT server.
 */

export type DiscordAccount = {
  /** The Discord user id (snowflake), for a link to their profile. */
  id: string | null;
  username: string | null;
  /** Their Discord display name, when it differs from the username. */
  displayName: string | null;
};

export type ShiftPerson = {
  userId: string;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
  discord: DiscordAccount | null;
};

/** The latest SHIFT application this person was linked to (shift_applications). */
export type ApplicationLink = {
  nickname: string | null;
  discord_user_id: string | null;
  discord_username: string | null;
};

/** The Discord sign-in record Supabase keeps (auth identity_data for provider "discord"). */
export type DiscordIdentity = {
  provider_id?: unknown;
  avatar_url?: unknown;
  name?: unknown;
  custom_claims?: { global_name?: unknown } | null;
};

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
/** Discord dropped discriminators; Supabase still writes usernames as "name#0". */
const username = (v: unknown) => text(v)?.replace(/#0$/, "") ?? null;
const SNOWFLAKE = /^\d{5,25}$/;
const httpsUrl = (v: unknown) => {
  const s = text(v);
  return s && s.startsWith("https://") ? s : null;
};

export function personOf(input: {
  userId: string;
  name: string;
  application?: ApplicationLink | null;
  profileAvatar?: string | null;
  identity?: DiscordIdentity | null;
}): ShiftPerson {
  const { application, identity } = input;
  // The application's Discord fields were verified through Discord sign-in at join, so they win.
  const id = [text(application?.discord_user_id), text(identity?.provider_id)].find((v) => v && SNOWFLAKE.test(v)) ?? null;
  const user = username(application?.discord_username) ?? username(identity?.name);
  const display = text(identity?.custom_claims?.global_name);
  return {
    userId: input.userId,
    name: input.name,
    nickname: text(application?.nickname),
    avatarUrl: httpsUrl(identity?.avatar_url) ?? httpsUrl(input.profileAvatar),
    discord:
      id || user
        ? { id, username: user, displayName: display && display !== user ? display : null }
        : null,
  };
}

/** "Mint (มิ้นท์)": a name with its nickname, for reads and for Claude. */
export const nameWithNickname = (p: Pick<ShiftPerson, "name" | "nickname">) =>
  p.nickname && p.nickname !== p.name ? `${p.name} (${p.nickname})` : p.name;

/** Their Discord profile, which opens in the Discord app or website. */
export const discordProfileUrl = (account: DiscordAccount) => (account.id ? `https://discord.com/users/${account.id}` : null);
