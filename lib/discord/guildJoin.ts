/**
 * Puts a Discord user into a server with roles, through the PassionSeed bot.
 * Shared by the SHIFT join link and the Elemental hackathon sign-up page.
 *
 * With an OAuth `accessToken` carrying the `guilds.join` scope, the bot adds
 * them directly (roles + nickname applied on join). That token must come from
 * the bot's own OAuth application, which is also Supabase's Discord provider.
 * Without a usable token, it can still assign roles to someone who already
 * joined through an invite. The bot needs Create Instant Invite, Manage Roles
 * and Manage Nicknames, and its own role ranked above every role it hands out.
 */

import { isDiscordOAuthJoinError } from "@/lib/shift/discordErrors";

const DISCORD_API = "https://discord.com/api/v10";

export type GuildJoinResult =
  | { ok: true; state: "joined" | "already_member" }
  | { ok: false; state: "not_member" | "not_configured" | "error"; message: string };

export interface GuildConfig {
  botToken: string;
  guildId: string;
}

/** The PassionSeed bot token: the SHIFT-specific one when set, else the shared one. */
export function discordBotToken(): string | null {
  return process.env.DISCORD_SHIFT_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN || null;
}

export async function guildFetch(
  config: GuildConfig,
  path: string,
  init: RequestInit,
  reason: string,
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

export async function describeFailure(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  return `Discord ${res.status}: ${body.slice(0, 200)}`;
}

async function addRoles(config: GuildConfig, discordUserId: string, roleIds: string[], reason: string) {
  for (const roleId of roleIds) {
    const res = await guildFetch(config, `/members/${discordUserId}/roles/${roleId}`, { method: "PUT" }, reason);
    if (res.status === 404) return { ok: false as const, notMember: true, message: await describeFailure(res) };
    if (!res.ok) return { ok: false as const, notMember: false, message: await describeFailure(res) };
  }
  return { ok: true as const };
}

/**
 * `roleIds` is called only once the bot knows it can act, so a server that
 * creates roles on first use (SHIFT rounds) does not create one for nothing.
 */
export async function joinGuildWithRoles(input: {
  config: GuildConfig;
  discordUserId: string;
  roleIds: () => Promise<string[]>;
  accessToken?: string | null;
  nickname?: string | null;
  reason: string;
  logTag: string;
}): Promise<GuildJoinResult> {
  const { config, reason } = input;
  try {
    // Existing members only need the bot's role permissions. Do not send their
    // OAuth token through Add Guild Member, which has extra scope requirements.
    const member = await guildFetch(config, `/members/${input.discordUserId}`, { method: "GET" }, reason);
    const isMember = member.ok;
    if (!isMember) {
      const body = await member.clone().json().catch(() => null) as { code?: unknown } | null;
      const message = await describeFailure(member);
      if (member.status !== 404 || body?.code !== 10007) {
        return { ok: false, state: "error", message };
      }
      if (!input.accessToken) return { ok: false, state: "not_member", message };
    }
    const roleIds = await input.roleIds();
    if (!isMember && input.accessToken) {
      const res = await guildFetch(config, `/members/${input.discordUserId}`, {
        method: "PUT",
        body: JSON.stringify({
          access_token: input.accessToken,
          roles: roleIds,
          ...(input.nickname ? { nick: input.nickname.slice(0, 32) } : {}),
        }),
      }, reason);
      if (res.status === 201) return { ok: true, state: "joined" };
      // 204: already in the server, and Discord ignores roles in that case.
      if (res.status !== 204) {
        const message = await describeFailure(res);
        if (!isDiscordOAuthJoinError(message)) {
          return { ok: false, state: "error", message };
        }
        // A rejected OAuth token does not prevent bot-only role assignment.
        // If they are absent, addRoles returns not_member for the invite flow.
        console.warn(`[${input.logTag}] Discord OAuth join rejected. Check that the bot and Supabase Discord provider use the same application and guilds.join scope.`);
      }
    }

    const roles = await addRoles(config, input.discordUserId, roleIds, reason);
    if (roles.ok) return { ok: true, state: "already_member" };
    return { ok: false, state: roles.notMember ? "not_member" : "error", message: roles.message };
  } catch (error) {
    return { ok: false, state: "error", message: error instanceof Error ? error.message : "Discord request failed" };
  }
}

/**
 * The Discord user an OAuth token belongs to. The bot only acts on a token
 * that provably belongs to the Discord account being linked.
 */
export async function discordTokenOwner(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return ((await res.json()) as { id?: string }).id ?? null;
  } catch {
    return null;
  }
}
