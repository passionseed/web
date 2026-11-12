/**
 * Bot-side Discord calls for the SHIFT server. Needs a bot in the guild with
 * Create Instant Invite + Manage Roles + Manage Nicknames, and the bot's own
 * role ranked above every role it hands out.
 *
 * Each round gets a role named after it ("SHIFT[1]"), created by the bot the
 * first time a student from that round joins. Channel access for that role
 * is still set by hand in Discord.
 */

import { isDiscordOAuthJoinError } from "@/lib/shift/discordErrors";
import { guildAvatarUrl, userAvatarUrl } from "@/lib/supabase/shift-quests/avatar";

const DISCORD_API = "https://discord.com/api/v10";

export type GuildJoinResult =
  | { ok: true; state: "joined" | "already_member" }
  | { ok: false; state: "not_member" | "not_configured" | "error"; message: string };

interface GuildConfig {
  botToken: string;
  guildId: string;
}

function guildConfig(): GuildConfig | null {
  const botToken = process.env.DISCORD_SHIFT_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_SHIFT_GUILD_ID;
  return botToken && guildId ? { botToken, guildId } : null;
}

function splitIds(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}


/** Where to send someone after linking: straight into the server, or the
 *  public invite when the bot could not add them. */
export function shiftDiscordUrls(): { server: string | null; invite: string | null } {
  const guildId = process.env.DISCORD_SHIFT_GUILD_ID;
  return {
    server: guildId ? `https://discord.com/channels/${guildId}` : null,
    invite: process.env.DISCORD_SHIFT_INVITE_URL || null,
  };
}

async function discordFetch(
  config: GuildConfig,
  path: string,
  init: RequestInit,
  reason = "SHIFT join link",
) {
  return fetch(`${DISCORD_API}/guilds/${config.guildId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${config.botToken}`,
      "Content-Type": "application/json",
      "X-Audit-Log-Reason": reason,
    },
    cache: "no-store",
  });
}

async function describeFailure(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  return `Discord ${res.status}: ${body.slice(0, 200)}`;
}

/** Role IDs by name, so one lookup per warm instance instead of per join. */
const roleIdCache = new Map<string, string>();

/** The round's existing role, or null when the server has none yet. */
async function findCohortRoleId(config: GuildConfig, cohortName: string): Promise<string | null> {
  const cached = roleIdCache.get(cohortName);
  if (cached) return cached;

  const list = await discordFetch(config, "/roles", { method: "GET" });
  if (!list.ok) throw new Error(await describeFailure(list));
  const roles = (await list.json()) as { id: string; name: string }[];
  const roleId = roles.find((r) => r.name === cohortName)?.id ?? null;
  if (roleId) roleIdCache.set(cohortName, roleId);
  return roleId;
}

/** The round's role, created on first use. */
async function cohortRoleId(config: GuildConfig, cohortName: string): Promise<string> {
  let roleId = await findCohortRoleId(config, cohortName);

  if (!roleId) {
    const created = await discordFetch(config, "/roles", {
      method: "POST",
      body: JSON.stringify({ name: cohortName, mentionable: true, hoist: true }),
    });
    if (!created.ok) throw new Error(await describeFailure(created));
    roleId = ((await created.json()) as { id: string }).id;
  }

  roleIdCache.set(cohortName, roleId);
  return roleId;
}

/** The round's role plus any server-wide extras from DISCORD_SHIFT_ROLE_IDS. */
async function shiftRoleIds(config: GuildConfig, cohortName: string): Promise<string[]> {
  const extra = splitIds(process.env.DISCORD_SHIFT_ROLE_IDS);
  return [...new Set([await cohortRoleId(config, cohortName), ...extra])];
}

async function addRoles(config: GuildConfig, discordUserId: string, roleIds: string[]) {
  for (const roleId of roleIds) {
    const res = await discordFetch(config, `/members/${discordUserId}/roles/${roleId}`, {
      method: "PUT",
    });
    if (res.status === 404) return { ok: false as const, notMember: true, message: await describeFailure(res) };
    if (!res.ok) return { ok: false as const, notMember: false, message: await describeFailure(res) };
  }
  return { ok: true as const };
}

/**
 * Puts a Discord user into the SHIFT server with roles.
 *
 * With an OAuth `accessToken` carrying the `guilds.join` scope, the bot adds
 * them directly (roles + nickname applied on join). That token must come from
 * the bot's own OAuth application. Without a usable token, it can still assign
 * roles to someone who already joined through the invite.
 */
export async function joinShiftGuild(input: {
  discordUserId: string;
  cohortName: string;
  accessToken?: string | null;
  nickname?: string;
}): Promise<GuildJoinResult> {
  const config = guildConfig();
  if (!config) {
    return { ok: false, state: "not_configured", message: "DISCORD_SHIFT_GUILD_ID or Discord bot token missing" };
  }

  try {
    // Existing members only need the bot's role permissions. Do not send their
    // OAuth token through Add Guild Member, which has extra scope requirements.
    const member = await discordFetch(config, `/members/${input.discordUserId}`, { method: "GET" });
    const isMember = member.ok;
    if (!isMember) {
      const body = await member.clone().json().catch(() => null) as { code?: unknown } | null;
      const message = await describeFailure(member);
      if (member.status !== 404 || body?.code !== 10007) {
        return { ok: false, state: "error", message };
      }
      if (!input.accessToken) return { ok: false, state: "not_member", message };
    }
    const roleIds = await shiftRoleIds(config, input.cohortName);
    if (!isMember && input.accessToken) {
      const res = await discordFetch(config, `/members/${input.discordUserId}`, {
        method: "PUT",
        body: JSON.stringify({
          access_token: input.accessToken,
          roles: roleIds,
          ...(input.nickname ? { nick: input.nickname.slice(0, 32) } : {}),
        }),
      });
      if (res.status === 201) return { ok: true, state: "joined" };
      // 204: already in the server, and Discord ignores roles in that case.
      if (res.status !== 204) {
        const message = await describeFailure(res);
        if (!isDiscordOAuthJoinError(message)) {
          return { ok: false, state: "error", message };
        }
        // A rejected OAuth token does not prevent bot-only role assignment.
        // If they are absent, addRoles returns not_member for the invite flow.
        console.warn("[shift-join] Discord OAuth join rejected. Check that the bot and Supabase Discord provider use the same application and guilds.join scope.");
      }
    }

    const roles = await addRoles(config, input.discordUserId, roleIds);
    if (roles.ok) return { ok: true, state: "already_member" };
    return { ok: false, state: roles.notMember ? "not_member" : "error", message: roles.message };
  } catch (error) {
    return { ok: false, state: "error", message: error instanceof Error ? error.message : "Discord request failed" };
  }
}

export type ShiftGuildMemberResult =
  | {
      ok: true;
      roles: string[];
      nick: string | null;
      /**
       * The member's picture as Discord shows it in the SHIFT server: the
       * server avatar when they set one, else their own avatar, as a checked
       * 64px PNG URL (lib/supabase/shift-quests/avatar.ts); null when neither.
       */
      avatar: string | null;
    }
  | { ok: false; reason: "not_member" | "not_configured" | "rate_limited" | "error" };

const MEMBER_TTL_MS = 60_000;
const NOT_MEMBER_TTL_MS = 15_000;
/** How long an expired answer may still stand in while Discord is down or rate limiting. */
const MEMBER_STALE_MS = 10 * 60_000;
const MEMBER_CACHE_MAX = 500;
const MEMBER_ID = /^\d{17,20}$/;

/** Member lookups by Discord id: who holds which roles, for the island's eligibility check. */
const memberCache = new Map<string, { result: ShiftGuildMemberResult; fetchedAt: number; ttl: number }>();

function pruneMemberCache(now: number) {
  if (memberCache.size < MEMBER_CACHE_MAX) return;
  for (const [id, entry] of memberCache) {
    if (now - entry.fetchedAt > MEMBER_STALE_MS) memberCache.delete(id);
  }
  // Still full of fresh entries: drop the oldest (Map keeps insertion order).
  while (memberCache.size >= MEMBER_CACHE_MAX) {
    const oldest = memberCache.keys().next().value;
    if (oldest === undefined) break;
    memberCache.delete(oldest);
  }
}

async function lookupShiftGuildMember(config: GuildConfig, discordUserId: string): Promise<ShiftGuildMemberResult> {
  try {
    const res = await discordFetch(config, `/members/${discordUserId}`, { method: "GET" }, "SHIFT island access check");
    if (res.ok) {
      const body = (await res.json()) as { roles?: unknown; nick?: unknown; avatar?: unknown; user?: { avatar?: unknown } | null };
      const roles = Array.isArray(body.roles) ? body.roles.filter((r): r is string => typeof r === "string") : [];
      const nick = typeof body.nick === "string" && body.nick.trim() ? body.nick.trim() : null;
      const avatar =
        guildAvatarUrl(config.guildId, discordUserId, body.avatar) ??
        userAvatarUrl(discordUserId, body.user && typeof body.user === "object" ? body.user.avatar : null);
      return { ok: true, roles, nick, avatar };
    }
    if (res.status === 404) {
      const body = (await res.json().catch(() => null)) as { code?: unknown } | null;
      return { ok: false, reason: body?.code === 10007 ? "not_member" : "error" };
    }
    return { ok: false, reason: res.status === 429 ? "rate_limited" : "error" };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * The person's roles, server nickname and picture in the SHIFT server right now, for
 * pages that have no Discord interaction to read them from (the web island).
 * Cached per Discord id: 60 s for a member, 15 s for "not in the server". When
 * Discord is rate limiting or failing, a recent answer stands in; otherwise
 * the caller gets the failure and must deny access.
 */
export async function fetchShiftGuildMember(discordUserId: string): Promise<ShiftGuildMemberResult> {
  const config = guildConfig();
  if (!config) return { ok: false, reason: "not_configured" };
  if (!MEMBER_ID.test(discordUserId)) return { ok: false, reason: "error" };

  const now = Date.now();
  const cached = memberCache.get(discordUserId);
  if (cached && now - cached.fetchedAt < cached.ttl) return cached.result;

  const result = await lookupShiftGuildMember(config, discordUserId);
  if (result.ok || result.reason === "not_member") {
    memberCache.delete(discordUserId);
    pruneMemberCache(now);
    memberCache.set(discordUserId, { result, fetchedAt: now, ttl: result.ok ? MEMBER_TTL_MS : NOT_MEMBER_TTL_MS });
    return result;
  }
  if (cached && now - cached.fetchedAt < MEMBER_STALE_MS) return cached.result;
  return result;
}

export type RoleRemovalResult =
  | { ok: true; state: "removed" | "nothing_to_remove" }
  | { ok: false; state: "not_configured" | "error"; message: string };

/**
 * Takes the round's role back, e.g. when an admin declines an applicant who
 * joined the server straight from the apply page. Server-wide extras from
 * DISCORD_SHIFT_ROLE_IDS stay: other rounds may have granted them too.
 */
export async function removeShiftCohortRole(input: {
  discordUserId: string;
  cohortName: string;
}): Promise<RoleRemovalResult> {
  const config = guildConfig();
  if (!config) {
    return { ok: false, state: "not_configured", message: "DISCORD_SHIFT_GUILD_ID or Discord bot token missing" };
  }

  try {
    const roleId = await findCohortRoleId(config, input.cohortName);
    if (!roleId) return { ok: true, state: "nothing_to_remove" };

    const res = await discordFetch(
      config,
      `/members/${input.discordUserId}/roles/${roleId}`,
      { method: "DELETE" },
      "SHIFT application declined",
    );
    if (res.ok) return { ok: true, state: "removed" };
    // Unknown member (left the server) or unknown role: nothing to take back.
    if (res.status === 404) return { ok: true, state: "nothing_to_remove" };
    return { ok: false, state: "error", message: await describeFailure(res) };
  } catch (error) {
    return { ok: false, state: "error", message: error instanceof Error ? error.message : "Discord request failed" };
  }
}

/**
 * Server nicknames in the SHIFT (PassionSeed) Discord server, by Discord id: the
 * name people go by there. Only members who set one are in the result. A few
 * lookups at a time (each cached by fetchShiftGuildMember); whatever has not
 * answered within `withinMs` is left out, so a page never waits long on Discord.
 */
export async function fetchShiftNicknames(discordIds: readonly string[], withinMs = 2500): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const queue = [...new Set(discordIds)].filter((id) => MEMBER_ID.test(id));
  if (queue.length === 0 || !guildConfig()) return out;
  const worker = async () => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      const member = await fetchShiftGuildMember(id);
      if (member.ok && member.nick) out.set(id, member.nick);
    }
  };
  const deadline = new Promise<void>((resolve) => setTimeout(resolve, withinMs));
  await Promise.race([Promise.all(Array.from({ length: 4 }, worker)), deadline]);
  // Late answers are dropped: a copy, so they cannot change what was returned.
  return new Map(out);
}
