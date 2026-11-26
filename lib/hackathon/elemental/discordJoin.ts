import type { User } from "@supabase/supabase-js";

import {
  discordBotToken,
  discordTokenOwner,
  joinGuildWithRoles,
  type GuildJoinResult,
} from "@/lib/discord/guildJoin";
import { extractDiscordIdentity } from "@/lib/projectseed/discord";
import { createAdminClient } from "@/utils/supabase/admin";

import type { ElementalDiscordOutcome } from "./discordLink";

/**
 * Server side of "Connect Discord" on a paid Elemental sign-up page. Right
 * after the Discord OAuth exchange, in one pass:
 *   1. the sign-up is linked to the PassionSeed account Discord signed into
 *      (hackathon_event_registrations.user_id), which is then exempt from
 *      the onboard (public.has_hackathon_registration)
 *   2. the bot adds them to the hackathon Discord server with the event role
 * Every step is idempotent, so pressing the button again is always safe.
 *
 * Env: ELEMENTAL_DISCORD_GUILD_ID and ELEMENTAL_DISCORD_ROLE_ID. Without
 * them the account still links and the page falls back to the invite link.
 */

type LinkRow = {
  id: string;
  status: string;
  user_id: string | null;
  linked_at: string | null;
  discord_joined_at: string | null;
  nickname: string | null;
};

function elementalGuild() {
  const botToken = discordBotToken();
  const guildId = process.env.ELEMENTAL_DISCORD_GUILD_ID;
  const roleId = process.env.ELEMENTAL_DISCORD_ROLE_ID;
  return botToken && guildId && roleId ? { config: { botToken, guildId }, roleId } : null;
}

async function loadRow(token: string): Promise<LinkRow | null> {
  const { data, error } = await createAdminClient()
    .from("hackathon_event_registrations")
    .select("id, status, user_id, linked_at, discord_joined_at, hackathon_event_registration_members(position, nickname, full_name)")
    .eq("pay_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const first = [...(data.hackathon_event_registration_members ?? [])].sort((a, b) => a.position - b.position)[0];
  return {
    id: data.id,
    status: data.status,
    user_id: data.user_id,
    linked_at: data.linked_at,
    discord_joined_at: data.discord_joined_at,
    nickname: first ? first.nickname || first.full_name.split(" ")[0] : null,
  };
}

export async function joinElementalGuild(input: {
  discordUserId: string;
  accessToken: string | null;
  nickname: string | null;
}): Promise<GuildJoinResult> {
  const guild = elementalGuild();
  if (!guild) {
    return { ok: false, state: "not_configured", message: "ELEMENTAL_DISCORD_GUILD_ID, ELEMENTAL_DISCORD_ROLE_ID or bot token missing" };
  }
  return joinGuildWithRoles({
    config: guild.config,
    discordUserId: input.discordUserId,
    roleIds: async () => [guild.roleId],
    accessToken: input.accessToken,
    nickname: input.nickname,
    reason: "Elemental hackathon sign-up",
    logTag: "elemental-discord",
  });
}

/** Called from /auth/callback right after the Discord OAuth exchange. */
export async function completeElementalDiscordLink(input: {
  token: string;
  user: User;
  providerToken: string | null | undefined;
}): Promise<ElementalDiscordOutcome> {
  let row: LinkRow | null;
  try {
    row = await loadRow(input.token);
  } catch (error) {
    console.error("[elemental-discord] failed to load sign-up:", error instanceof Error ? error.message : error);
    return "error";
  }
  if (!row || row.status === "cancelled") return "error";
  if (row.status !== "paid") return "not_paid";
  if (row.user_id && row.user_id !== input.user.id) return "taken";

  const discord = extractDiscordIdentity(input.user);
  if (!discord) return "no_discord";

  const db = createAdminClient();
  const { data: linked, error } = await db
    .from("hackathon_event_registrations")
    .update({
      user_id: input.user.id,
      discord_user_id: discord.userId,
      discord_username: discord.username,
      linked_at: row.linked_at ?? new Date().toISOString(),
    })
    .eq("id", row.id)
    .or(`user_id.is.null,user_id.eq.${input.user.id}`)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[elemental-discord] failed to link sign-up:", error.message);
    return "error";
  }
  if (!linked) return "taken";

  const owner = await discordTokenOwner(input.providerToken);
  const result = await joinElementalGuild({
    discordUserId: discord.userId,
    accessToken: owner === discord.userId ? input.providerToken ?? null : null,
    nickname: row.nickname,
  });

  const update = result.ok
    ? { discord_joined_at: row.discord_joined_at ?? new Date().toISOString(), discord_error: null }
    : { discord_error: result.state === "not_member" ? "not_in_server" : result.message.slice(0, 300) };
  const { error: saveError } = await db.from("hackathon_event_registrations").update(update).eq("id", row.id);
  if (saveError) console.error("[elemental-discord] failed to record Discord state:", saveError.message);

  if (result.ok) return "joined";
  if (result.state === "not_member") return "not_member";
  console.error("[elemental-discord] guild join failed:", result.message);
  return "error";
}
