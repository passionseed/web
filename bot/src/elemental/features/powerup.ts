import { ApplicationCommandOptionType, ChannelType, type APIApplicationCommandSubcommandOption, type ChatInputCommandInteraction, type Client } from "discord.js";

import { bangkokDay } from "../../../../lib/elemental/core";
import { ElementalError, type ElementalApi } from "../api";
import { notify, say, type ElCtx, type ElementalFeature } from "../context";
import { POWERUP } from "../copy/powerup";
import { isSnowflake } from "../ids";
import type { StaffRole } from "../roles";

/**
 * /el badge-powerup voice:<channel> [session] (E31), Host only.
 *
 * A staff snapshot, not tracking: who is in the voice channel right now is
 * read from the gateway cache (GuildVoiceStates is on in bot/src/index.ts),
 * each person is mapped to their live team with elemental_bot_member_get
 * (read-only), and elemental_bot_award_badge is called ONCE per team with
 * kind 'powerup'. Nothing is written per person: no attendance row, no
 * history, no list of names in the answer (plot numbers and counts only).
 *
 * The badge ref is the Bangkok day, plus the optional session label when a
 * day has more than one power-up ("2026-12-05" or "2026-12-05:2"). SQL keeps
 * (team, kind, ref) unique, so a re-run of the same round awards nothing new.
 * Power-up times are undecided, so nothing here is scheduled.
 */

export const STAFF_CMD = "el";
export const SUB = "badge-powerup";
export const BADGE_KIND = "powerup";
export const OPT = { voice: "voice", session: "session" } as const;

/** Host only (Host always passes a gate). */
export const HOST_ONLY: readonly StaffRole[] = ["host"];

export const SESSION_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
export const VOICE_TYPES: readonly ChannelType[] = [ChannelType.GuildVoice, ChannelType.GuildStageVoice];
/** Plot numbers listed in the answer before "and N more" (the message cap is 2000). */
export const MAX_LISTED = 80;

export const SUBCOMMANDS: APIApplicationCommandSubcommandOption[] = [
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: SUB,
    description: POWERUP.description,
    options: [
      {
        type: ApplicationCommandOptionType.Channel,
        name: OPT.voice,
        description: POWERUP.optVoice,
        required: true,
        channel_types: [ChannelType.GuildVoice, ChannelType.GuildStageVoice],
      },
      { type: ApplicationCommandOptionType.String, name: OPT.session, description: POWERUP.optSession, required: false, max_length: 40 },
    ],
  },
];

/** "2026-12-05", or "2026-12-05:2" with a session label. Null for a bad label. */
export function powerupRef(day: string, session: string | null | undefined): string | null {
  const label = (session ?? "").trim().toLowerCase();
  if (!label) return day;
  return SESSION_RE.test(label) ? `${day}:${label}` : null;
}

/** The parts of discord.js's gateway cache read here (a fake in tests). */
interface VoiceStateLike {
  id: string;
  channelId: string | null;
  member?: { user?: { bot?: boolean } | null } | null;
}

interface VoiceCacheLike {
  user?: { id: string } | null;
  guilds?: { cache?: { get(id: string): { voiceStates?: { cache?: { values(): Iterable<VoiceStateLike> } } } | undefined } };
}

/**
 * The people in one voice channel now, from the gateway cache: no REST call,
 * bots left out. Null when the guild is not in the cache (not ready yet).
 */
export function voiceMemberIds(client: Client | VoiceCacheLike, guildId: string, channelId: string): string[] | null {
  const c = client as VoiceCacheLike;
  const states = c.guilds?.cache?.get(guildId)?.voiceStates?.cache;
  if (!states) return null;
  const self = c.user?.id;
  const ids = new Set<string>();
  for (const vs of states.values()) {
    if (vs.channelId !== channelId || vs.id === self || vs.member?.user?.bot) continue;
    if (isSnowflake(vs.id)) ids.add(vs.id);
  }
  return [...ids];
}

interface TeamLite {
  team_id: string;
  slot: number | null;
  member_ids?: string[];
}

interface MemberLite {
  team?: TeamLite | null;
}

export interface PowerupResult {
  /** One entry per team the badge call ran for. */
  teams: { teamId: string; slot: number | null; awarded: boolean }[];
  /** People in voice who are not on a live team (not claimed, or teamless). Counted, never named. */
  notOnTeam: number;
  /** Teams that stopped being live between the lookup and the award. */
  skipped: number;
}

/**
 * Maps people to live teams (a teammate already seen is not looked up again)
 * and awards the badge once per team. Only elemental_bot_member_get (read)
 * and elemental_bot_award_badge (one row per team) are called.
 */
export async function awardPowerup(api: ElementalApi, guildId: string, actor: string, userIds: readonly string[], ref: string): Promise<PowerupResult> {
  const teams = new Map<string, TeamLite>();
  const covered = new Set<string>();
  let notOnTeam = 0;
  for (const userId of new Set(userIds)) {
    if (covered.has(userId)) continue;
    covered.add(userId);
    const member = await api.call<MemberLite | null>("elemental_bot_member_get", guildId, userId);
    const team = member?.team;
    if (!team?.team_id) {
      notOnTeam += 1;
      continue;
    }
    if (!teams.has(team.team_id)) teams.set(team.team_id, team);
    for (const id of team.member_ids ?? []) covered.add(id);
  }

  const result: PowerupResult = { teams: [], notOnTeam, skipped: 0 };
  for (const team of teams.values()) {
    try {
      const r = await api.call<{ awarded?: boolean }>("elemental_bot_award_badge", guildId, team.team_id, BADGE_KIND, ref, actor);
      result.teams.push({ teamId: team.team_id, slot: team.slot, awarded: r?.awarded === true });
    } catch (error) {
      if (error instanceof ElementalError && error.code === "team_not_found") {
        result.skipped += 1;
        continue;
      }
      throw error;
    }
  }
  return result;
}

/** The Host's answer: counts and plot numbers only. */
export function powerupSummary(result: PowerupResult, ref: string): string {
  const awarded = result.teams.filter((t) => t.awarded);
  const lines: string[] = [POWERUP.summary({ awarded: awarded.length, already: result.teams.length - awarded.length, ref })];
  const slots = awarded
    .map((t) => t.slot)
    .filter((s): s is number => typeof s === "number")
    .sort((a, b) => a - b);
  if (slots.length) {
    const listed = POWERUP.awardedSlots(slots.slice(0, MAX_LISTED));
    lines.push(slots.length > MAX_LISTED ? `${listed} ${POWERUP.more(slots.length - MAX_LISTED)}` : listed);
  }
  if (result.notOnTeam) lines.push(POWERUP.notOnTeam(result.notOnTeam));
  if (result.skipped) lines.push(POWERUP.skipped(result.skipped));
  return lines.join("\n");
}

async function runPowerup(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const channel = i.options.getChannel(OPT.voice, true);
  if (!channel || !VOICE_TYPES.includes(channel.type)) {
    await notify(i, POWERUP.notVoice);
    return;
  }
  const ref = powerupRef(bangkokDay(), i.options.getString(OPT.session));
  if (!ref) {
    await notify(i, POWERUP.badSession);
    return;
  }
  // While reconnecting the voice cache may be stale: better no badge than a wrong one.
  const ids = ctx.rt.connected() ? voiceMemberIds(ctx.rt.client, ctx.guildId, channel.id) : null;
  if (!ids) {
    await notify(i, POWERUP.voiceUnknown);
    return;
  }
  if (!ids.length) {
    await notify(i, POWERUP.empty);
    return;
  }
  const result = await awardPowerup(ctx.api, ctx.guildId, ctx.userId, ids, ref);
  await say(i, powerupSummary(result, ref));
}

export const feature: ElementalFeature = {
  name: "powerup",
  staffSubcommands: SUBCOMMANDS,
  commandHandlers: {
    [`${STAFF_CMD} ${SUB}`]: { ack: "ephemeral", gate: HOST_ONLY, run: runPowerup },
  },
};
