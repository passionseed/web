import {
  ApplicationCommandOptionType,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  PermissionFlagsBits,
  type APIApplicationCommandOptionChoice,
  type APIApplicationCommandSubcommandOption,
  type ChatInputCommandInteraction,
} from "discord.js";

import { refusePii } from "../../../../lib/elemental/core";
import { candidateSlots } from "../../../../lib/elemental/island/sectors";
import { ElementalError } from "../api";
import {
  BOT_ALLOW,
  EVERYONE_DENY,
  MIN_CHANNEL_MEMBERS,
  channelPort,
  elementCategoryIds,
  enqueueTeamChannel,
  isLive,
  onTeamLive,
  teamChannelName,
  teamStaffRoleIds,
  type GuildChannelPort,
  type PlannedOverwrite,
  type SyncOutcome,
  type TeamJson,
} from "../channels";
import { notify, say, type ComponentOrModal, type ElCtx, type ElementalFeature, type ElementalRuntime, type ElementalSettings } from "../context";
import { OPS, opsErrorText } from "../copy/teamops";
import { cid, isSnowflake, isUuid } from "../ids";
import { ELEMENTS, isElement, type ElementKey, type StaffRole } from "../roles";

/**
 * Staff team tools (E34), all under /el, Host only, every answer ephemeral.
 * Every write is audited in SQL (actor = the Host's Discord id):
 *
 * - /el unteamed [element]: claimed members on no live team, as mentions
 *   (never pinging), with the registration's wants_team_matching flag.
 * - /el team-create members project element: a live team for matched solos
 *   (2-5 people, all accepted); its channel is made on the channel queue.
 * - /el team-set-element slot element: after a pivot. SQL re-slots the team
 *   (candidateSlots of the new element), clears its canvas link and marks its
 *   notes for a rewrite; the channel is renamed and moved to the new element's
 *   category, and the team is told to link a canvas on the new board.
 * - /el team-rename slot project.
 * - /el team-move-member member slot: both teams' channels are synced. A team
 *   left with one person has its channel locked: never one student alone with
 *   staff (AGENTS.md safeguarding).
 * - /el team-archive slot: a confirm button, then SQL takes the team off the
 *   island, legend and totals (un-counts entries, clears lit_at), and the
 *   channel is locked (members out, staff read-only).
 *
 * Channel work reuses channels.ts (E13) and runs on rt.queues.channels, keyed
 * by guild, so it never interleaves with a channel creation or another sync.
 */

export const STAFF_CMD = "el";
export const SUB = {
  unteamed: "unteamed",
  create: "team-create",
  setElement: "team-set-element",
  rename: "team-rename",
  move: "team-move-member",
  archive: "team-archive",
} as const;

/** Custom-id action of the archive confirm button: el|tops_arc|<team uuid>|<slot>. */
export const ARCHIVE_ACTION = "tops_arc";

/** Host only (Host always passes a gate; "host" is the only role listed), as join.ts's /el picker. */
export const HOST_ONLY: readonly StaffRole[] = ["host"];

export const OPT = {
  element: "element",
  slot: "slot",
  project: "project",
  members: "members",
  member: "member",
} as const;

export const NAME_MIN = 3;
export const NAME_MAX = 60;
export const MIN_MEMBERS = 2;
export const MAX_MEMBERS = 5;
export const SLOT_MAX = 200;

/** How long a staff answer waits for the channel before saying "queued". */
export const CHANNEL_WAIT_MS = 8_000;
/** Discord's message cap is 2000; leave room. */
export const MESSAGE_BUDGET = 1_900;
/** One answer plus at most this many follow-ups for /el unteamed. */
export const MAX_FOLLOWUPS = 9;

// ---------------------------------------------------------------------------
// Command definitions
// ---------------------------------------------------------------------------

const elementChoices: APIApplicationCommandOptionChoice<string>[] = ELEMENTS.map((e) => ({ name: OPS.elementChoice(e), value: e }));

function slotOption(description: string = OPS.optSlot) {
  return { type: ApplicationCommandOptionType.Integer as const, name: OPT.slot, description, required: true, min_value: 1, max_value: SLOT_MAX };
}

function elementOption(required: boolean, description: string) {
  return { type: ApplicationCommandOptionType.String as const, name: OPT.element, description, required, choices: elementChoices };
}

function projectOption() {
  return {
    type: ApplicationCommandOptionType.String as const,
    name: OPT.project,
    description: OPS.optProject,
    required: true,
    min_length: NAME_MIN,
    max_length: NAME_MAX,
  };
}

export const SUBCOMMANDS: APIApplicationCommandSubcommandOption[] = [
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: SUB.unteamed,
    description: OPS.unteamedDescription,
    options: [elementOption(false, OPS.optElementFilter)],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: SUB.create,
    description: OPS.createDescription,
    options: [
      { type: ApplicationCommandOptionType.String, name: OPT.members, description: OPS.optMembers, required: true, max_length: 200 },
      projectOption(),
      elementOption(true, OPS.optElement),
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: SUB.setElement,
    description: OPS.setElementDescription,
    options: [slotOption(), elementOption(true, OPS.optElement)],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: SUB.rename,
    description: OPS.renameDescription,
    options: [slotOption(), projectOption()],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: SUB.move,
    description: OPS.moveDescription,
    options: [
      { type: ApplicationCommandOptionType.User, name: OPT.member, description: OPS.optMember, required: true },
      slotOption(OPS.optToSlot),
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: SUB.archive,
    description: OPS.archiveDescription,
    options: [slotOption()],
  },
];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** A refusal shown to staff; nothing was written. */
class Refusal extends Error {
  constructor(public readonly text: string) {
    super("refused");
    this.name = "Refusal";
  }
}

const MENTION_OR_ID = /<@!?(\d{17,20})>|(?<![\d<@&#!])(\d{17,20})(?!\d)/g;

/** Discord ids from "<@a> <@!b> 123...": deduplicated, in the order typed. Role and channel mentions are ignored. */
export function parseMemberIds(input: string): string[] {
  const ids: string[] = [];
  for (const match of input.matchAll(MENTION_OR_ID)) {
    const id = match[1] ?? match[2];
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Spaces collapsed and trimmed, as SQL's elemental__project_name does. */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function checkName(raw: string): string {
  const name = cleanName(raw);
  // Code points, as SQL's char_length counts (an emoji is 2 UTF-16 units).
  const length = [...name].length;
  if (length < NAME_MIN || length > NAME_MAX) throw new Refusal(OPS.nameLength);
  // The matched text is never echoed or logged.
  if (!refusePii({ project_name: name }).ok) throw new Refusal(OPS.namePii);
  return name;
}

function checkSlot(slot: number | null): number {
  if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 1 || slot > SLOT_MAX) throw new Refusal(opsErrorText("team_not_found")!);
  return slot;
}

export interface UnteamedRow {
  discord_user_id: string;
  element_pick: string | null;
  wants_team_matching: boolean;
  claimed_at?: string;
}

/**
 * The /el unteamed answer as messages of at most MESSAGE_BUDGET characters:
 * those who asked for matching first, then in SQL's order (claim time).
 */
export function unteamedMessages(rows: readonly UnteamedRow[], element: ElementKey | null, maxMessages = 1 + MAX_FOLLOWUPS): string[] {
  const people = rows.filter((r) => isSnowflake(r.discord_user_id));
  if (people.length === 0) return [OPS.unteamedNone(element)];
  const sorted = [...people.filter((r) => r.wants_team_matching), ...people.filter((r) => !r.wants_team_matching)];
  const header = OPS.unteamedHeader({ count: sorted.length, wanting: sorted.filter((r) => r.wants_team_matching).length, element });
  const lines = sorted.map((r) =>
    OPS.unteamedLine({ userId: r.discord_user_id, element: isElement(r.element_pick) ? r.element_pick : null, wants: r.wants_team_matching })
  );

  const size = (parts: readonly string[]) => parts.reduce((n, part) => n + part.length + 1, -1);
  const messages: string[][] = [];
  let current: string[] = [header];
  let shown = 0;
  for (const line of lines) {
    if (size(current) + 1 + line.length > MESSAGE_BUDGET) {
      if (messages.length + 1 >= maxMessages) break;
      messages.push(current);
      current = [];
    }
    current.push(line);
    shown += 1;
  }
  if (shown < lines.length) {
    // Cut whole lines (never half a mention) until the count fits.
    while (current.length > 1 && size(current) + 1 + OPS.unteamedMore(lines.length - shown).length > MESSAGE_BUDGET) {
      current.pop();
      shown -= 1;
    }
    current.push(OPS.unteamedMore(lines.length - shown));
  }
  messages.push(current);
  return messages.map((parts) => parts.join("\n"));
}

const P = PermissionFlagsBits;
const NONE = BigInt(0);
/**
 * Staff in a locked channel: read the history, write nothing. Every bit here
 * is one of MEMBER_ALLOW, which the bot is required to hold: Discord refuses
 * (403) an overwrite that allows OR denies a permission the bot lacks, and a
 * refused lock would leave the students' overwrites in place. Thread creation
 * is not denied for that reason (the bot is not required to hold it); with
 * SendMessagesInThreads denied, nobody can post in such a thread anyway.
 */
export const LOCKED_STAFF_ALLOW = P.ViewChannel | P.ReadMessageHistory;
export const LOCKED_STAFF_DENY = P.SendMessages | P.SendMessagesInThreads | P.AddReactions;

/**
 * Overwrites for a team channel that must hold no students: an archived team,
 * or a live team down to one person. @everyone denied, team-channel staff
 * roles read-only (never Judge), the bot; no member overwrites at all.
 */
export function lockedOverwrites(guildId: string, settings: ElementalSettings, botUserId: string): PlannedOverwrite[] {
  let staff: string[] = [];
  try {
    staff = teamStaffRoleIds(settings);
  } catch {
    // No Host role configured: lock it for everyone but the bot rather than not at all.
  }
  return [
    { id: guildId, type: "role", allow: NONE, deny: EVERYONE_DENY },
    ...staff.map((id): PlannedOverwrite => ({ id, type: "role", allow: LOCKED_STAFF_ALLOW, deny: LOCKED_STAFF_DENY })),
    { id: botUserId, type: "member", allow: BOT_ALLOW, deny: NONE },
  ];
}

// ---------------------------------------------------------------------------
// Channel work on the guild's channel queue
// ---------------------------------------------------------------------------

export type LockOutcome = "locked" | "skipped" | "no_channel" | "failed";

function errorCode(error: unknown): string {
  const e = error as { code?: unknown; status?: number; name?: string } | null;
  if (error instanceof ElementalError) return error.code;
  if (typeof e?.code === "string") return e.code;
  return e?.status ? `http ${e.status}` : e?.name ?? "error";
}

/**
 * The team's channel id, or a same-named channel in its element's categories
 * that no team owns (one made by a sync that lost the race with an archive).
 */
async function findTeamChannel(rt: ElementalRuntime, guildId: string, settings: ElementalSettings, team: TeamJson, port: GuildChannelPort): Promise<string | null> {
  const channels = await port.list();
  if (team.channel_id) return channels.some((c) => c.id === team.channel_id) ? team.channel_id : null;
  if (typeof team.slot !== "number" || !isElement(team.element)) return null;
  const name = teamChannelName(team.element, team.slot);
  const categories = elementCategoryIds(settings, team.element);
  const orphan = channels.find((c) => c.kind === "text" && c.name === name && c.parentId !== null && categories.includes(c.parentId));
  if (!orphan) return null;
  const owner = await rt.api.call<TeamJson | null>("elemental_bot_team_get", guildId, null, null, orphan.id);
  return owner ? null : orphan.id;
}

/**
 * Locks a team's channel when it must hold no students: the team is archived
 * or has fewer than 2 members. Re-reads the team on the queue, so a member who
 * joined meanwhile keeps the channel (then: "skipped"). Never rejects.
 */
export function lockTeamChannel(rt: ElementalRuntime, guildId: string, teamId: string, port?: GuildChannelPort): Promise<LockOutcome> {
  return rt.queues.channels
    .run(guildId, async (): Promise<LockOutcome> => {
      const settings = await rt.settings.get(guildId);
      if (!settings) return "skipped";
      const team = await rt.api.call<TeamJson | null>("elemental_bot_team_get", guildId, teamId);
      if (!team) return "no_channel";
      if (isLive(team.status) && team.member_ids.length >= MIN_CHANNEL_MEMBERS) return "skipped";
      const p = port ?? channelPort(rt, guildId);
      const botUserId = p.botUserId();
      if (!botUserId) throw new ElementalError("no_bot_user");
      const channelId = await findTeamChannel(rt, guildId, settings, team, p);
      if (!channelId) return "no_channel";
      await p.edit(channelId, { overwrites: lockedOverwrites(guildId, settings, botUserId), reason: OPS.lockReason(team.slot ?? 0) });
      return "locked";
    })
    .catch((error: unknown): LockOutcome => {
      console.error(`[elemental] team channel lock failed (${errorCode(error)})`);
      return "failed";
    });
}

/**
 * Posts "link a canvas on the new board" in the team's channel, queued after
 * the channel sync (same guild queue), so it lands in the renamed channel.
 */
export function postNewBoardNotice(rt: ElementalRuntime, guildId: string, teamId: string, port?: GuildChannelPort): Promise<boolean> {
  return rt.queues.channels
    .run(guildId, async () => {
      const team = await rt.api.call<TeamJson | null>("elemental_bot_team_get", guildId, teamId);
      if (!team || !isLive(team.status) || !team.channel_id || typeof team.slot !== "number" || !isElement(team.element)) return false;
      const p = port ?? channelPort(rt, guildId);
      await p.send(team.channel_id, {
        content: OPS.newBoardNotice({ slot: team.slot, element: team.element, memberIds: team.member_ids }),
        // Pings the team once, in their own channel; nobody else.
        allowedMentions: { parse: [], users: team.member_ids.slice(0, 5) },
      });
      return true;
    })
    .catch((error: unknown) => {
      console.error(`[elemental] element change notice not posted (${errorCode(error)})`);
      return false;
    });
}

/** Waits a bounded time for a queued channel task; "queued" when it is still waiting. */
export async function within<T>(task: Promise<T>, ms = CHANNEL_WAIT_MS): Promise<T | "queued"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"queued">((resolve) => {
    timer = setTimeout(() => resolve("queued"), ms);
    (timer as { unref?: () => void }).unref?.();
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function syncLine(outcome: SyncOutcome | "failed" | "queued"): string {
  if (outcome === "queued") return OPS.channelQueued;
  if (outcome === "failed") return OPS.channelFailed;
  if (outcome === "skipped") return OPS.channelNone;
  return OPS.channelDone;
}

function lockLine(outcome: LockOutcome | "queued"): string {
  if (outcome === "queued") return OPS.channelQueued;
  if (outcome === "locked") return OPS.channelLocked;
  if (outcome === "failed") return OPS.channelLockFailed;
  if (outcome === "no_channel") return OPS.channelNone;
  return OPS.channelDone;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** Shows a refusal or a known SQL code; anything else goes to the wrapper. */
async function answerRefusal(i: ChatInputCommandInteraction | ComponentOrModal, error: unknown): Promise<boolean> {
  if (error instanceof Refusal) {
    await notify(i, error.text);
    return true;
  }
  if (error instanceof ElementalError) {
    const text = opsErrorText(error.code, isSnowflake(error.detail) ? error.detail : undefined);
    if (text) {
      await notify(i, text);
      return true;
    }
  }
  return false;
}

function guarded(run: (i: ChatInputCommandInteraction, ctx: ElCtx) => Promise<void>) {
  return async (i: ChatInputCommandInteraction, ctx: ElCtx) => {
    try {
      await run(i, ctx);
    } catch (error) {
      if (!(await answerRefusal(i, error))) throw error;
    }
  };
}

function elementArg(i: ChatInputCommandInteraction, required: boolean): ElementKey | null {
  const raw = i.options.getString(OPT.element, required);
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : null;
  if (value === null || value === "") {
    if (required) throw new Refusal(opsErrorText("bad_element")!);
    return null;
  }
  if (!isElement(value)) throw new Refusal(opsErrorText("bad_element")!);
  return value;
}

async function runUnteamed(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const element = elementArg(i, false);
  const rows = await ctx.api.rows<UnteamedRow>("elemental_bot_unteamed", ctx.guildId, element);
  const [first, ...rest] = unteamedMessages(rows, element);
  await say(i, first);
  for (const content of rest) {
    await i.followUp({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
  }
}

async function runCreate(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const members = parseMemberIds(i.options.getString(OPT.members, true) ?? "");
  if (members.length < MIN_MEMBERS || members.length > MAX_MEMBERS) throw new Refusal(OPS.createSize);
  const botId = ctx.rt.client.user?.id;
  if (botId && members.includes(botId)) throw new Refusal(OPS.noBots);
  const name = checkName(i.options.getString(OPT.project, true) ?? "");
  const element = elementArg(i, true)!;

  const team = await ctx.api.call<TeamJson & { activated?: boolean; repeated?: boolean }>(
    "elemental_bot_team_create_staff",
    ctx.guildId,
    ctx.userId,
    name,
    element,
    members,
    candidateSlots(element)
  );
  if (typeof team.slot !== "number") throw new ElementalError("team_not_found");
  const channel = await within(onTeamLive(ctx.rt, ctx.guildId, ctx.settings.edition, team));
  await say(i, [OPS.created({ slot: team.slot, element: team.element, name: team.project_name, memberIds: team.member_ids }), syncLine(channel)].join("\n"));
}

async function runSetElement(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const slot = checkSlot(i.options.getInteger(OPT.slot, true));
  const element = elementArg(i, true)!;
  const team = await ctx.api.call<TeamJson & { old_slot: number; old_element: ElementKey; changed: boolean }>(
    "elemental_bot_team_set_element",
    ctx.guildId,
    ctx.userId,
    slot,
    element,
    candidateSlots(element)
  );
  if (!team.changed || typeof team.slot !== "number") {
    await say(i, OPS.sameElement(slot, element));
    return;
  }
  const synced = enqueueTeamChannel(ctx.rt, ctx.guildId, team.team_id);
  const notice = postNewBoardNotice(ctx.rt, ctx.guildId, team.team_id);
  const channel = await within(synced);
  if (channel !== "queued") await within(notice, 2_000);
  await say(
    i,
    [OPS.elementChanged({ oldSlot: team.old_slot, slot: team.slot, from: team.old_element, to: team.element }), syncLine(channel)].join("\n")
  );
}

async function runRename(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const slot = checkSlot(i.options.getInteger(OPT.slot, true));
  const name = checkName(i.options.getString(OPT.project, true) ?? "");
  const team = await ctx.api.call<TeamJson>("elemental_bot_team_rename", ctx.guildId, ctx.userId, slot, name);
  // The channel name carries no project name; the sync re-asserts name, category and overwrites.
  const channel = await within(enqueueTeamChannel(ctx.rt, ctx.guildId, team.team_id));
  await say(i, [OPS.renamed(slot, team.project_name), syncLine(channel)].join("\n"));
}

async function runMove(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const target = i.options.getUser(OPT.member, true);
  if (!target || !isSnowflake(target.id)) throw new Refusal(opsErrorText("bad_user")!);
  if (target.bot) throw new Refusal(OPS.noBots);
  const slot = checkSlot(i.options.getInteger(OPT.slot, true));
  const moved = await ctx.api.call<{ from: TeamJson | null; to: TeamJson; changed: boolean }>(
    "elemental_bot_member_move",
    ctx.guildId,
    ctx.userId,
    target.id,
    slot
  );
  if (!moved.changed) {
    await say(i, OPS.moveSame(target.id, slot));
    return;
  }
  const lines = [OPS.moved({ userId: target.id, fromSlot: moved.from?.slot ?? null, toSlot: moved.to.slot ?? slot })];
  const tasks: Promise<string>[] = [within(enqueueTeamChannel(ctx.rt, ctx.guildId, moved.to.team_id)).then(syncLine)];
  const from = moved.from;
  if (from && isLive(from.status)) {
    if (from.member_ids.length >= MIN_CHANNEL_MEMBERS) {
      tasks.push(within(enqueueTeamChannel(ctx.rt, ctx.guildId, from.team_id)).then(syncLine));
    } else {
      // One student left: take everyone out of that channel until staff move or archive them.
      if (typeof from.slot === "number") lines.push(OPS.leftAlone(from.slot));
      tasks.push(within(lockTeamChannel(ctx.rt, ctx.guildId, from.team_id)).then(lockLine));
    }
  }
  const outcomes = await Promise.all(tasks);
  await say(i, [...lines, ...new Set(outcomes)].join("\n"));
}

async function runArchiveAsk(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const slot = checkSlot(i.options.getInteger(OPT.slot, true));
  const team = await ctx.api.call<TeamJson | null>("elemental_bot_team_get", ctx.guildId, null, slot);
  if (!team) throw new Refusal(opsErrorText("team_not_found")!);
  if (team.status === "archived") {
    // Lock again in case the first lock failed; harmless when it held.
    const lock = await within(lockTeamChannel(ctx.rt, ctx.guildId, team.team_id));
    await say(i, [OPS.alreadyArchived(slot), lockLine(lock)].join("\n"));
    return;
  }
  if (!isLive(team.status)) throw new Refusal(opsErrorText("team_not_found")!);
  await say(i, {
    content: OPS.archiveConfirm({ slot, name: team.project_name, members: team.member_ids.length }),
    components: [
      {
        type: ComponentType.ActionRow,
        components: [{ type: ComponentType.Button, custom_id: cid(ARCHIVE_ACTION, team.team_id, slot), label: OPS.archiveButton, style: ButtonStyle.Danger }],
      },
    ],
  });
}

async function runArchiveConfirm(i: ComponentOrModal, ctx: ElCtx, args: string[]): Promise<void> {
  const [teamId, slotArg] = args;
  const slot = Number(slotArg);
  try {
    if (!isUuid(teamId) || !Number.isInteger(slot)) throw new Refusal(OPS.archiveStale);
    // The button names a team: archive only if that team still holds the slot.
    const current = await ctx.api.call<TeamJson | null>("elemental_bot_team_get", ctx.guildId, teamId);
    if (!current || current.slot !== slot) throw new Refusal(OPS.archiveStale);
    let line: string;
    let archivedId = teamId;
    if (current.status === "archived") {
      line = OPS.alreadyArchived(slot);
    } else {
      const archived = await ctx.api.call<TeamJson>("elemental_bot_team_archive", ctx.guildId, ctx.userId, slot);
      // SQL archives by slot. Should the slot have changed hands in between,
      // whatever SQL archived is what must be locked and reported.
      archivedId = archived.team_id;
      line = OPS.archived(slot);
    }
    const lock = await within(lockTeamChannel(ctx.rt, ctx.guildId, archivedId));
    await say(i, { content: [line, lockLine(lock)].join("\n"), components: [] });
  } catch (error) {
    if (error instanceof Refusal || error instanceof ElementalError) {
      await say(i, { components: [] }).catch(() => undefined);
    }
    if (!(await answerRefusal(i, error))) throw error;
  }
}

export const feature: ElementalFeature = {
  name: "teamops",
  staffSubcommands: SUBCOMMANDS,
  commandHandlers: {
    [`${STAFF_CMD} ${SUB.unteamed}`]: { ack: "ephemeral", gate: HOST_ONLY, run: guarded(runUnteamed) },
    [`${STAFF_CMD} ${SUB.create}`]: { ack: "ephemeral", gate: HOST_ONLY, run: guarded(runCreate) },
    [`${STAFF_CMD} ${SUB.setElement}`]: { ack: "ephemeral", gate: HOST_ONLY, run: guarded(runSetElement) },
    [`${STAFF_CMD} ${SUB.rename}`]: { ack: "ephemeral", gate: HOST_ONLY, run: guarded(runRename) },
    [`${STAFF_CMD} ${SUB.move}`]: { ack: "ephemeral", gate: HOST_ONLY, run: guarded(runMove) },
    [`${STAFF_CMD} ${SUB.archive}`]: { ack: "ephemeral", gate: HOST_ONLY, run: guarded(runArchiveAsk) },
  },
  actions: {
    // The confirm button sits on an ephemeral Host-only answer; the gate re-checks anyway.
    [ARCHIVE_ACTION]: { ack: "update", gate: HOST_ONLY, run: runArchiveConfirm },
  },
};
