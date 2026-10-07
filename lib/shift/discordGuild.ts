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

async function discordFetch(config: GuildConfig, path: string, init: RequestInit) {
  return fetch(`${DISCORD_API}/guilds/${config.guildId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${config.botToken}`,
      "Content-Type": "application/json",
      "X-Audit-Log-Reason": "SHIFT join link",
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

/** The round's role, created on first use. */
async function cohortRoleId(config: GuildConfig, cohortName: string): Promise<string> {
  const cached = roleIdCache.get(cohortName);
  if (cached) return cached;

  const list = await discordFetch(config, "/roles", { method: "GET" });
  if (!list.ok) throw new Error(await describeFailure(list));
  const roles = (await list.json()) as { id: string; name: string }[];
  let roleId = roles.find((r) => r.name === cohortName)?.id;

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
    const roleIds = await shiftRoleIds(config, input.cohortName);
    if (input.accessToken) {
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
