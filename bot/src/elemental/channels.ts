import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  type Client,
  type Guild,
  type GuildBasedChannel,
  type MessageCreateOptions,
} from "discord.js";

import { ElementalError } from "./api";
import { COPY } from "./copy/teams";
import type { ElementalRuntime, ElementalSettings } from "./context";
import { isSnowflake } from "./ids";
import { TEAM_CHANNEL_STAFF, isElement, roleId, type ElementKey } from "./roles";

/**
 * Team channels: one private text channel per live team, named
 * "<element>-<slot>" (fire-07), in the element's first category with room.
 *
 * Who sees it (the safeguarding rule, AGENTS.md: no private 1:1 space
 * between an adult and a student):
 * - @everyone: denied;
 * - the team's members (at least 2, so never one student alone with staff);
 * - Host (required), Helper and Mentor, always as ROLES, never as a person;
 * - the bot;
 * - never the Judge role.
 *
 * Creation and every later edit run on rt.queues.channels (keyed by guild,
 * 429-aware), and each run re-reads the team from SQL, so a retry, a restart
 * or a second request converges on the same channel. E34 (staff team ops)
 * reuses syncTeamChannel after a rename, element change, move or archive.
 */

/** Discord's cap on channels in one category. */
export const CATEGORY_LIMIT = 50;
/** Fewer members than this and a channel would be one student with staff: refused. */
export const MIN_CHANNEL_MEMBERS = 2;
/** How often pending teams are looked for again (after a restart, a 403, a full category). */
export const SWEEP_INTERVAL_MS = 3 * 60_000;
/** posts kind for the pinned welcome (elemental_bot_post_claim). */
export const WELCOME_POST_KIND = "team_welcome";
/** A welcome claimed but never marked (a crash mid-send) can be taken over after this. */
export const WELCOME_LEASE_SECONDS = 600;

const P = PermissionFlagsBits;
/** What members and the team-channel staff roles may do there. */
export const MEMBER_ALLOW =
  P.ViewChannel |
  P.SendMessages |
  P.ReadMessageHistory |
  P.AttachFiles |
  P.EmbedLinks |
  P.AddReactions |
  P.UseApplicationCommands |
  P.SendMessagesInThreads;
/**
 * The bot's own overwrite. Only permissions it surely holds server-wide
 * (granting one it lacks is a 403); Manage Channels and pinning come from its
 * server role, which the @everyone deny does not touch.
 */
export const BOT_ALLOW = P.ViewChannel | P.SendMessages | P.ReadMessageHistory | P.EmbedLinks | P.AttachFiles;
export const EVERYONE_DENY = P.ViewChannel;

export interface PlannedOverwrite {
  id: string;
  type: "role" | "member";
  allow: bigint;
  deny: bigint;
}

/** A refusal that waiting will not fix until staff change something (settings, roles, team size). */
export class ChannelPlanError extends Error {
  constructor(public readonly code: "no_host_role" | "too_few_members" | "no_category" | "category_full" | "no_bot_user" | "bad_team") {
    super(`channel plan: ${code}`);
    this.name = "ChannelPlanError";
  }
}

/** "fire-07": element and slot only. Never a student's or a project's name. */
export function teamChannelName(element: ElementKey, slot: number): string {
  if (!isElement(element) || !Number.isInteger(slot) || slot < 1 || slot > 999) throw new ChannelPlanError("bad_team");
  return `${element}-${String(slot).padStart(2, "0")}`;
}

/** Staff role IDs that may see team channels: Host first, then Helper and Mentor; never Judge. */
export function teamStaffRoleIds(settings: ElementalSettings): string[] {
  const judge = roleId(settings, "judge");
  const host = roleId(settings, "host");
  // A Host role equal to the Judge role would let judges in: refuse rather than guess.
  if (!host || host === judge) throw new ChannelPlanError("no_host_role");
  const ids: string[] = [];
  for (const key of TEAM_CHANNEL_STAFF) {
    const id = roleId(settings, key);
    if (id && id !== judge && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export interface OverwriteInput {
  guildId: string;
  settings: ElementalSettings;
  memberIds: readonly string[];
  botUserId: string;
}

/**
 * The full overwrite list for a team channel. Throws ChannelPlanError when it
 * would break the safeguarding rule: no Host role, or fewer than 2 members.
 */
export function teamOverwrites(input: OverwriteInput): PlannedOverwrite[] {
  if (!isSnowflake(input.botUserId)) throw new ChannelPlanError("no_bot_user");
  const staff = teamStaffRoleIds(input.settings);
  const roleIds = new Set([input.guildId, ...Object.values(input.settings.roles)]);
  const members = [...new Set(input.memberIds)].filter((id) => isSnowflake(id) && id !== input.botUserId && !roleIds.has(id));
  if (members.length < MIN_CHANNEL_MEMBERS) throw new ChannelPlanError("too_few_members");
  return [
    { id: input.guildId, type: "role", allow: 0n, deny: EVERYONE_DENY },
    ...staff.map((id): PlannedOverwrite => ({ id, type: "role", allow: MEMBER_ALLOW, deny: 0n })),
    ...members.map((id): PlannedOverwrite => ({ id, type: "member", allow: MEMBER_ALLOW, deny: 0n })),
    { id: input.botUserId, type: "member", allow: BOT_ALLOW, deny: 0n },
  ];
}

export interface ChannelInfo {
  id: string;
  name: string;
  parentId: string | null;
  kind: "category" | "text" | "other";
}

/** The element's categories that exist, in settings order. */
export function elementCategoryIds(settings: ElementalSettings, element: ElementKey): string[] {
  return settings.elementCategories[element] ?? [];
}

/** The element's first category with fewer than 50 channels. */
export function pickCategory(settings: ElementalSettings, element: ElementKey, channels: readonly ChannelInfo[]): string {
  const categories = elementCategoryIds(settings, element);
  if (categories.length === 0) throw new ChannelPlanError("no_category");
  const counts = new Map<string, number>();
  for (const c of channels) if (c.parentId) counts.set(c.parentId, (counts.get(c.parentId) ?? 0) + 1);
  const free = categories.find((id) => (counts.get(id) ?? 0) < CATEGORY_LIMIT);
  if (!free) throw new ChannelPlanError("category_full");
  return free;
}

// ---------------------------------------------------------------------------
// The Discord side, behind a small port so tests (and E34) can fake it.
// ---------------------------------------------------------------------------

export interface ChannelEdit {
  name?: string;
  parentId?: string;
  overwrites?: PlannedOverwrite[];
  reason: string;
}

export interface GuildChannelPort {
  /** The bot's own user id (for its overwrite), or null before ready. */
  botUserId(): string | null;
  /** Every channel in the server (not threads). */
  list(): Promise<ChannelInfo[]>;
  createText(input: { name: string; parentId: string; overwrites: PlannedOverwrite[]; reason: string }): Promise<ChannelInfo>;
  edit(channelId: string, input: ChannelEdit): Promise<void>;
  send(channelId: string, payload: MessageCreateOptions): Promise<{ id: string }>;
  pin(channelId: string, messageId: string): Promise<void>;
}

function infoOf(c: GuildBasedChannel): ChannelInfo {
  const kind = c.type === ChannelType.GuildCategory ? "category" : c.type === ChannelType.GuildText ? "text" : "other";
  return { id: c.id, name: c.name, parentId: c.parentId ?? null, kind };
}

function toDiscord(o: PlannedOverwrite) {
  return { id: o.id, type: o.type === "role" ? OverwriteType.Role : OverwriteType.Member, allow: o.allow, deny: o.deny };
}

/** The real port: discord.js, errors (429s included) thrown as-is for the queue's retry. */
export function discordGuildPort(client: Client, guildId: string): GuildChannelPort {
  let guild: Guild | null = null;
  async function g(): Promise<Guild> {
    guild ??= client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));
    return guild;
  }
  async function textChannel(channelId: string) {
    const gd = await g();
    const channel = gd.channels.cache.get(channelId) ?? (await gd.channels.fetch(channelId));
    if (!channel || !channel.isTextBased() || channel.isThread()) throw new ChannelPlanError("bad_team");
    return channel;
  }
  return {
    botUserId: () => client.user?.id ?? null,
    async list() {
      const gd = await g();
      const cached = [...gd.channels.cache.values()];
      const all = cached.length > 0 ? cached : [...(await gd.channels.fetch()).values()].filter((c): c is NonNullable<typeof c> => Boolean(c));
      return all.filter((c) => !c.isThread()).map(infoOf);
    },
    async createText(input) {
      const gd = await g();
      const made = await gd.channels.create({
        name: input.name,
        type: ChannelType.GuildText,
        parent: input.parentId,
        permissionOverwrites: input.overwrites.map(toDiscord),
        reason: input.reason,
      });
      return infoOf(made);
    },
    async edit(channelId, input) {
      const gd = await g();
      await gd.channels.edit(channelId, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.parentId !== undefined ? { parent: input.parentId, lockPermissions: false } : {}),
        ...(input.overwrites ? { permissionOverwrites: input.overwrites.map(toDiscord) } : {}),
        reason: input.reason,
      });
    },
    async send(channelId, payload) {
      const channel = await textChannel(channelId);
      const message = await channel.send(payload);
      return { id: message.id };
    },
    async pin(channelId, messageId) {
      const channel = await textChannel(channelId);
      await channel.messages.pin(messageId);
    },
  };
}

/** Tests (and E34's tests) swap the Discord side for a fake, per runtime. */
const PORTS = new WeakMap<ElementalRuntime, (guildId: string) => GuildChannelPort>();

export function setChannelPortFactory(rt: ElementalRuntime, factory: ((guildId: string) => GuildChannelPort) | null): void {
  if (factory) PORTS.set(rt, factory);
  else PORTS.delete(rt);
}

export function channelPort(rt: ElementalRuntime, guildId: string): GuildChannelPort {
  const factory = PORTS.get(rt);
  return factory ? factory(guildId) : discordGuildPort(rt.client, guildId);
}

// ---------------------------------------------------------------------------
// The team as SQL returns it (elemental__team_json) and the sync itself
// ---------------------------------------------------------------------------

export interface TeamInvite {
  discord_user_id: string;
  state: "pending" | "accepted" | "declined" | "cancelled" | "expired" | string;
  is_creator: boolean;
  expires_at: string;
}

export interface TeamJson {
  team_id: string;
  edition: string;
  status: "pending" | "channel_pending" | "active" | "archived";
  slot: number | null;
  element: ElementKey;
  project_name: string;
  channel_id: string | null;
  lit: boolean;
  /** Empty unless the team is live. */
  member_ids: string[];
  invites: TeamInvite[];
}

export function isLive(status: unknown): boolean {
  return status === "channel_pending" || status === "active";
}

export type SyncOutcome = "created" | "linked" | "synced" | "skipped";

function welcomeText(team: TeamJson & { slot: number }): string {
  return COPY.welcome({ slot: team.slot, element: team.element, project: team.project_name, memberIds: team.member_ids });
}

/** Posts and pins the welcome once per team (elemental_posts claim). A failed pin is not a failure. */
async function ensureWelcome(rt: ElementalRuntime, guildId: string, port: GuildChannelPort, team: TeamJson & { slot: number }, channelId: string) {
  const claimed = await rt.api.call<boolean>("elemental_bot_post_claim", guildId, WELCOME_POST_KIND, team.team_id, WELCOME_LEASE_SECONDS);
  if (!claimed) return;
  let messageId: string;
  try {
    const sent = await port.send(channelId, {
      content: welcomeText(team),
      // Pings the team once, in their own channel; nobody else.
      allowedMentions: { parse: [], users: team.member_ids.slice(0, 5) },
    });
    messageId = sent.id;
  } catch (error) {
    await rt.api.call("elemental_bot_post_mark", guildId, WELCOME_POST_KIND, team.team_id, "failed", null).catch(() => undefined);
    throw error;
  }
  await rt.api.call("elemental_bot_post_mark", guildId, WELCOME_POST_KIND, team.team_id, "sent", messageId);
  try {
    await port.pin(channelId, messageId);
  } catch (error) {
    console.warn(`[elemental] team ${team.slot} welcome not pinned: ${(error as { status?: number })?.status ?? (error as Error)?.name ?? "error"}`);
  }
}

/**
 * Brings one team's Discord channel in line with SQL. Re-reads the team, so
 * it is safe to repeat:
 * - archived, pending or unknown team: nothing;
 * - live with a channel that exists: name, category and overwrites set again;
 * - live without one (channel_pending, or the channel was deleted): reuse a
 *   channel of the right name in the element's categories (made before a
 *   crash), else create it; then _team_set_channel and the pinned welcome.
 */
export async function syncTeamChannel(rt: ElementalRuntime, guildId: string, teamId: string, port: GuildChannelPort = channelPort(rt, guildId)): Promise<SyncOutcome> {
  const settings = await rt.settings.get(guildId);
  if (!settings) return "skipped";
  const team = await rt.api.call<TeamJson | null>("elemental_bot_team_get", guildId, teamId);
  if (!team || !isLive(team.status) || typeof team.slot !== "number") return "skipped";
  const live = team as TeamJson & { slot: number };

  const botUserId = port.botUserId();
  if (!botUserId) throw new ChannelPlanError("no_bot_user");
  const name = teamChannelName(live.element, live.slot);
  const overwrites = teamOverwrites({ guildId, settings, memberIds: live.member_ids, botUserId });
  const channels = await port.list();
  const categories = elementCategoryIds(settings, live.element);
  const reason = COPY.auditReason(live.slot);

  const current = live.channel_id ? channels.find((c) => c.id === live.channel_id) : undefined;
  if (current) {
    const parentOk = current.parentId !== null && categories.includes(current.parentId);
    await port.edit(current.id, {
      ...(current.name !== name ? { name } : {}),
      ...(parentOk ? {} : { parentId: pickCategory(settings, live.element, channels) }),
      overwrites,
      reason,
    });
    if (live.status !== "active") await rt.api.call("elemental_bot_team_set_channel", guildId, live.team_id, current.id);
    await ensureWelcome(rt, guildId, port, live, current.id);
    return "synced";
  }

  let outcome: SyncOutcome = "linked";
  let channel = channels.find((c) => c.kind === "text" && c.name === name && c.parentId !== null && categories.includes(c.parentId));
  if (channel) {
    await port.edit(channel.id, { overwrites, reason });
  } else {
    channel = await port.createText({ name, parentId: pickCategory(settings, live.element, channels), overwrites, reason });
    outcome = "created";
  }
  await rt.api.call("elemental_bot_team_set_channel", guildId, live.team_id, channel.id);
  await ensureWelcome(rt, guildId, port, live, channel.id);
  return outcome;
}

/** Waiting (not yet started) syncs per runtime, so a burst of joins makes one run, not five. */
const WAITING = new WeakMap<ElementalRuntime, Map<string, Promise<SyncOutcome | "failed">>>();

function logFailure(error: unknown): string {
  if (error instanceof ChannelPlanError || error instanceof ElementalError) return error.code;
  const e = error as { status?: number; name?: string } | null;
  return e?.status ? `http ${e.status}` : e?.name ?? "error";
}

/**
 * Queues syncTeamChannel on the guild's channel queue (429s wait their
 * retry_after, 5xx back off). Never rejects: a failure is logged by code and
 * the team stays channel_pending for the next sweep.
 */
export function enqueueTeamChannel(rt: ElementalRuntime, guildId: string, teamId: string, port?: GuildChannelPort): Promise<SyncOutcome | "failed"> {
  let waiting = WAITING.get(rt);
  if (!waiting) WAITING.set(rt, (waiting = new Map()));
  const key = `${guildId}:${teamId}`;
  const queued = waiting.get(key);
  if (queued) return queued;
  const map = waiting;
  const run = rt.queues.channels
    .run(guildId, () => {
      map.delete(key);
      return syncTeamChannel(rt, guildId, teamId, port ?? channelPort(rt, guildId));
    })
    .catch((error: unknown): "failed" => {
      map.delete(key);
      console.error(`[elemental] team channel failed (${logFailure(error)}); the sweep tries again`);
      return "failed";
    });
  map.set(key, run);
  return run;
}

/** A team just went live (accept or staff create): queue its channel and tell listeners. */
export function onTeamLive(rt: ElementalRuntime, guildId: string, edition: string, team: TeamJson): Promise<SyncOutcome | "failed"> {
  if (typeof team.slot === "number" && isElement(team.element)) {
    void rt.events.emit("team.activated", { guildId, edition, teamId: team.team_id, slot: team.slot, element: team.element });
  }
  return enqueueTeamChannel(rt, guildId, team.team_id);
}

interface PendingRow {
  team_id: string;
  slot: number;
  element: string;
}

/** Re-queues every channel_pending team of every guild (start, then every few minutes). */
export async function sweepPendingTeams(rt: ElementalRuntime, port?: (guildId: string) => GuildChannelPort): Promise<number> {
  let queued = 0;
  for (const guildId of rt.env.guildIds) {
    let rows: PendingRow[];
    try {
      rows = await rt.api.rows<PendingRow>("elemental_bot_teams_channel_pending", guildId);
    } catch (error) {
      if (!(error instanceof ElementalError && error.code === "unknown_guild")) {
        console.error(`[elemental] pending team sweep failed (${logFailure(error)})`);
      }
      continue;
    }
    for (const row of rows) {
      void enqueueTeamChannel(rt, guildId, row.team_id, port?.(guildId));
      queued += 1;
    }
  }
  return queued;
}
