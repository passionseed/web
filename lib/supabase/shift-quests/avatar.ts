import "server-only";

/**
 * The viewer's Discord picture as a URL the island may show: built and
 * checked on the server only (the client never sends an avatar). Only
 * Discord's own CDN hosts and Discord's avatar paths pass; every picture is
 * rewritten to a 64px still PNG, so an animated avatar becomes one frame and
 * the island's PixelAvatar never downloads more than it draws.
 *
 * The URL carries the viewer's own Discord id, so it goes only to that
 * viewer (ViewerCard), never onto a plot, the map or anyone else's page.
 */

const HOSTS: ReadonlySet<string> = new Set(["cdn.discordapp.com", "media.discordapp.net"]);
const CDN = "https://cdn.discordapp.com";
const SIZE = 64;

const SNOWFLAKE = /^\d{17,20}$/;
/** Discord's avatar hash: 32 hex characters, "a_" first when animated. */
const HASH = /^(?:a_)?[0-9a-f]{32}$/;
/** The default avatars: /embed/avatars/<0..5>.png. */
const EMBED_INDEX = /^\d{1,2}$/;
const EXTENSIONS = /\.(?:png|gif|webp|jpe?g)$/;

const USER_AVATAR = /^\/avatars\/(\d+)\/([^/]+)$/;
const EMBED_AVATAR = /^\/embed\/avatars\/([^/]+)$/;
const GUILD_AVATAR = /^\/guilds\/(\d+)\/users\/(\d+)\/avatars\/([^/]+)$/;

/** The file name without its extension, or null when the extension is not an image one. */
function stem(file: string): string | null {
  return EXTENSIONS.test(file) ? file.replace(EXTENSIONS, "") : null;
}

/** The checked path with a .png file, or null when it is not one of Discord's avatar paths. */
function avatarPath(pathname: string): string | null {
  const user = USER_AVATAR.exec(pathname);
  if (user) {
    const hash = stem(user[2]);
    return SNOWFLAKE.test(user[1]) && hash && HASH.test(hash) ? `/avatars/${user[1]}/${hash}.png` : null;
  }
  const embed = EMBED_AVATAR.exec(pathname);
  if (embed) {
    const index = stem(embed[1]);
    return index && EMBED_INDEX.test(index) ? `/embed/avatars/${index}.png` : null;
  }
  const guild = GUILD_AVATAR.exec(pathname);
  if (guild) {
    const hash = stem(guild[3]);
    return SNOWFLAKE.test(guild[1]) && SNOWFLAKE.test(guild[2]) && hash && HASH.test(hash)
      ? `/guilds/${guild[1]}/users/${guild[2]}/avatars/${hash}.png`
      : null;
  }
  return null;
}

/**
 * A Discord avatar URL from anywhere (the Supabase identity's avatar_url, a
 * URL we built) as https://<discord cdn host>/<avatar path>.png?size=64, or
 * null for anything else: another host or scheme, credentials, a port, a
 * path outside the avatar paths, a hash that is not Discord's.
 */
export function normalizeAvatarUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 500) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !HOSTS.has(url.hostname) || url.port || url.username || url.password) return null;
  const path = avatarPath(url.pathname);
  return path ? `https://${url.hostname}${path}?size=${SIZE}` : null;
}

/** A user's own avatar from its hash, or null when the id or the hash is not Discord's. */
export function userAvatarUrl(userId: string, hash: unknown): string | null {
  if (typeof hash !== "string" || !SNOWFLAKE.test(userId) || !HASH.test(hash)) return null;
  return `${CDN}/avatars/${userId}/${hash}.png?size=${SIZE}`;
}

/** The server-specific avatar a member set in one guild, or null when any part is not Discord's. */
export function guildAvatarUrl(guildId: string, userId: string, hash: unknown): string | null {
  if (typeof hash !== "string" || !SNOWFLAKE.test(guildId) || !SNOWFLAKE.test(userId) || !HASH.test(hash)) return null;
  return `${CDN}/guilds/${guildId}/users/${userId}/avatars/${hash}.png?size=${SIZE}`;
}
