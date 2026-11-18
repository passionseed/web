import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  DiscordAPIError,
  PermissionFlagsBits,
  type Client,
  type Message,
} from "discord.js";

import { roundsInSession } from "@/lib/shift/voiceWindow";

import { QuestDbError, QuestError, type QuestApi } from "./api";
import { CALL, STAFF_GUEST, guestOf, isGuestKey, staffNamesOf, type GuestKey } from "./callCopy";
import type { Campfire } from "./campfire";
import { cid } from "./ids";
import { LIVE } from "./island/copy";
import { cardSignature } from "./news";
import type { Evening } from "./rounds";
import { renderView, type Block, type View, type ViewPayload } from "./view";
import { ISLAND_LINK_LABEL, islandWebUrl } from "./weblink";

/**
 * The campfire call (เรียกรวมกองไฟ): one message every evening at 18:50
 * Bangkok in the news channel (#island-news): the fire lights at 19:00, come
 * and work next to each other. Every day, all year, while
 * /admin feature campfire_call is on and a news and a coworking channel are
 * set (the database decides: shift_quest_call_today).
 *
 * One ping a day at most. While /admin feature campfire_call_ping is on, the
 * call's first line mentions the student roles (settings.student_role_ids, at
 * most 5) and the send allows exactly those roles: never a user, @everyone or
 * @here. Every edit allows nothing, and Discord never pings on an edit. The
 * send carries a nonce Discord enforces (callNonce), so a POST discord.js
 * retries after a timeout, a reset or a 5xx returns the same message instead
 * of a second call and ping. The card says how to stop the ping (a muted
 * channel still notifies on mentions).
 *
 * Edited through the evening as the fire goes (at most once a minute, only
 * when its text changes): invite (18:50), lit (19:00), the evening guest
 * (19:25, during a season), embers (21:00). The people line is the campfire's
 * own count (campfire.ts), floored like the news card, never a name. When
 * today's call is recorded, the bot deletes the previous day's call (its own
 * message only), so the channel shows one call. Switched off, the latest call
 * is edited once into a paused note (no people line, no "tomorrow"), so
 * nothing stale stays up.
 *
 * SHIFT cohort weeks: while a SHIFT round is in session
 * (lib/shift/voiceWindow.ts roundsInSession, the cohort calendar that
 * shift-voice uses), shift-voice records voice time in every voice channel
 * for that round's students, the campfire included. So on those days the
 * bot sends no call, reads nobody for the guest and makes no drop, and the
 * latest call is edited once into the same paused note: the call's
 * "ไม่มีใครนับเวลาของคุณ" stays true. No staff switch is needed.
 *
 * The evening guest's drop: on every check during the guest's rest (19:25 to
 * 19:30, the database's guest_from and drop_end) that can read the room, the
 * bot passes the Discord ids in the campfire voice room (campfire.present(),
 * the gateway's voice cache; empty when nobody sits there) to
 * shift_quest_campfire_seen: anyone who sits there at any check counts, so
 * coming first is never rewarded, and the database keeps only which teams
 * were there. The first check at or after 19:30 calls
 * shift_quest_campfire_drop, which settles the night once (one roll per team,
 * restart-safe in the database); when the database's clock is still a
 * moment before 19:30, that check hands over the room as the rest's last
 * (drop). This module keeps the public count of teams
 * that got a look for the call and the round messages (evening()), and logs
 * nothing about anyone.
 *
 * Staff at the fire are the guest (founder decision, later on 2026-11-18):
 * when the founder or a mentor (an admin or reviewer member) is among the
 * ids of a check during the rest, the database makes the night a staff night
 * (guest STAFF_GUEST) and keeps up to two staff display names on it. The
 * presence answer and every later read of the call carry both, so the call
 * and the round messages name them from that check on, and a restarted bot
 * names the same staff. Students are never named.
 *
 * Once a day, restart-safe, as news.ts: claim (shift_quest_call_claim), send,
 * then record (shift_quest_call_mark, compare-and-set). A process that loses
 * the mark deletes its own message; a refused mark takes it back; a failed
 * mark is retried before anything else. After a stale claim the bot first
 * looks for its own call of the day (CALL.dayLine) among the channel's latest
 * messages, and when it cannot read them it sends nothing that night, so a
 * call never pings twice. No late call and no catch-up: the database answers
 * due only from 18:50 to 19:15 (19:30 for a stale claim).
 *
 * Before sending, the room must be ready: students can see and join the
 * coworking voice channel, and the bot can post in its chat (the rounds and
 * the guest live there). Otherwise nothing is sent and the cause is logged
 * once: the call never invites people to a fire that cannot run rounds.
 *
 * Schema 21 (20261118150000_shift_quest_campfire_call). Below it every tick
 * reads the version again, so the bot can deploy before the migration and
 * starts the call by itself once it is applied.
 */

/** The island schema that adds the call and the guest (20261118150000_shift_quest_campfire_call.sql). */
export const CALL_SCHEMA = 21;

/** One check every 30 seconds: the call goes out within a minute of 18:50, the drop within 30 seconds of the guest. */
const TICK_MS = 30_000;
/** After start: lets the gateway connect (and the voice cache fill) before the first check. */
const FIRST_DELAY_MS = 30_000;
/** At most one edit a minute. */
export const EDIT_EVERY_MS = 60_000;
/**
 * Seconds after drop_end (19:30) in which a check the database answers is not
 * settled yet (its clock a moment behind) still hands over who sits at the
 * fire. Within the database's own seen_end (19:30:15).
 */
const LATE_CHECK_S = 15;
/** How many of the channel's latest messages a stale claim looks through for its own call. */
const FIND_LIMIT = 50;
/** Discord: the message was deleted. */
const UNKNOWN_MESSAGE = 10008;
/** At most this many roles are mentioned. */
const MAX_ROLES = 5;

const SNOWFLAKE = /^[0-9]{5,25}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** shift_quest_call_today's answer, checked. Times are unix seconds. */
export interface CallData {
  day: string;
  /** Tonight's guest: the rotation's, or STAFF_GUEST once staff sat at the fire during the rest; null without a season. */
  guest: GuestKey | null;
  /** On a staff night, the display names of up to two staff who were the guest (adults: shown); else none. */
  staffNames: string[];
  callAt: number;
  litAt: number;
  guestFrom: number;
  /** 19:30 Bangkok: the guest's rest ends; the night's rolls are made at the first check from then. */
  dropEnd: number;
  guestUntil: number;
  /** The news channel, where a new call goes. */
  channelId: string;
  coworkingId: string | null;
  /** The student roles the call pings; empty while it does not. */
  pingRoleIds: string[];
  due: boolean;
  /** Tonight's recorded call, and the channel it is in. */
  messageId: string | null;
  messageChannelId: string | null;
  /** The previous day's recorded call: deleted once tonight's is recorded, or paused in a SHIFT cohort week. */
  previous: { day: string | null; channelId: string; messageId: string } | null;
  /** Once the night is settled: how many teams got a look (founder decision: always the number, never which). Null before. */
  drop: { teams: number } | null;
  /** The call is switched off: this is only the latest recorded call, to retire (normalizeOff). */
  off: boolean;
}

export type CallStage = "invite" | "lit" | "guest" | "embers" | "off";

export interface CallLoop {
  /** One check now (tests, and the timer). Never throws: failures are logged by code. */
  poll(): Promise<void>;
  stop(): Promise<void>;
  /** Tonight's evening for the round messages (rounds.ts), from the last check; null on another day or without a call. */
  evening(nowMs: number): Evening | null;
}

export interface CallOptions {
  guildId?: string;
  connected?: () => boolean;
  /** The campfire: how many sit there (the people line) and who (the guest's drop, passed on and never kept). */
  campfire: Pick<Campfire, "status" | "present">;
  /** The database's island schema at start; below CALL_SCHEMA each check reads it again. */
  schema?: number;
  now?: () => number;
  /** Whether a SHIFT cohort round is in session on a Bangkok day (default: cohortWeek). */
  inSession?: (day: string) => boolean;
}

/**
 * Whether a SHIFT cohort round is in session on `day` (Bangkok, YYYY-MM-DD):
 * the calendar shift-voice records voice time by (roundsInSession). The call
 * and the guest pause on those days.
 */
export function cohortWeek(day: string): boolean {
  return roundsInSession(day).size > 0;
}

// ---------------------------------------------------------------------------
// The database's answer
// ---------------------------------------------------------------------------

function snowflake(value: unknown): string | null {
  return typeof value === "string" && SNOWFLAKE.test(value) ? value : null;
}

function record(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function seconds(value: unknown): number | null {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** shift_quest_call_today's answer with every field checked; null when there is no call today (or it is malformed). */
export function normalizeCall(raw: unknown): CallData | null {
  const r = record(raw);
  if (typeof r.day !== "string" || !DAY.test(r.day)) return null;
  const channelId = snowflake(r.channel_id);
  const [callAt, litAt, guestFrom, dropEnd, guestUntil] = [r.call_at, r.lit_at, r.guest_from, r.drop_end, r.guest_until].map(seconds);
  if (!channelId || !callAt || !litAt || !guestFrom || !dropEnd || !guestUntil) return null;
  const roles = Array.isArray(r.ping_role_ids) ? r.ping_role_ids.map(snowflake).filter((id): id is string => !!id) : [];
  const previous = record(r.previous);
  const prevChannel = snowflake(previous.channel_id);
  const prevMessage = snowflake(previous.message_id);
  const prevDay = typeof previous.day === "string" && DAY.test(previous.day) ? previous.day : null;
  const messageId = snowflake(r.message_id);
  const teams = r.drop && typeof r.drop === "object" ? teamsOf(record(r.drop).teams) : null;
  const guest = isGuestKey(r.guest) ? r.guest : null;
  return {
    day: r.day,
    guest,
    staffNames: guest === STAFF_GUEST ? staffNamesOf(r.staff_names) : [],
    callAt,
    litAt,
    guestFrom,
    dropEnd,
    guestUntil,
    channelId,
    coworkingId: snowflake(r.coworking_channel_id),
    pingRoleIds: [...new Set(roles)].slice(0, MAX_ROLES),
    due: r.due === true,
    messageId,
    messageChannelId: messageId ? (snowflake(r.message_channel_id) ?? channelId) : null,
    previous: prevChannel && prevMessage ? { day: prevDay, channelId: prevChannel, messageId: prevMessage } : null,
    drop: teams === null ? null : { teams },
    off: false,
  };
}

/** The public count of teams that got a look: a whole number, or null when unreadable (then the night reads as not settled). */
function teamsOf(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

/**
 * shift_quest_call_today's answer while the call is switched off: the latest
 * recorded call ({off: true, day, message_id, message_channel_id}), as a
 * CallData the loop only edits into the paused note (stage "off"). Null for
 * anything else.
 */
export function normalizeOff(raw: unknown): CallData | null {
  const r = record(raw);
  if (r.off !== true || typeof r.day !== "string" || !DAY.test(r.day)) return null;
  const messageId = snowflake(r.message_id);
  const channelId = snowflake(r.message_channel_id);
  if (!messageId || !channelId) return null;
  return pausedCall(r.day, channelId, messageId);
}

/** A recorded call as the paused note (stage "off"): only edited, never sent. */
function pausedCall(day: string, channelId: string, messageId: string): CallData {
  return {
    day,
    guest: null,
    staffNames: [],
    callAt: 0,
    litAt: 0,
    guestFrom: 0,
    dropEnd: 0,
    guestUntil: 0,
    channelId,
    coworkingId: null,
    pingRoleIds: [],
    due: false,
    messageId,
    messageChannelId: channelId,
    previous: null,
    drop: null,
    off: true,
  };
}

/**
 * In a SHIFT cohort week, the call to edit into the paused note: tonight's
 * recorded call, else the latest earlier one (previous), each under its own
 * day so its issue line stays its own. Null when there is none.
 */
export function pausedFrom(d: CallData): CallData | null {
  if (d.messageId && d.messageChannelId) return pausedCall(d.day, d.messageChannelId, d.messageId);
  if (d.previous?.day) return pausedCall(d.previous.day, d.previous.channelId, d.previous.messageId);
  return null;
}

/**
 * The send's nonce: one per Bangkok day, at most 25 characters (Discord's
 * limit). With enforceNonce, Discord returns the message already created with
 * it (same author, the last few minutes) instead of a second one: a POST that
 * discord.js retries (a 15-second timeout, a reset, a 5xx) never posts or
 * pings twice.
 */
export function callNonce(day: string): string {
  return `sqcall${day.replace(/-/g, "")}`;
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

/** Where the evening is at nowMs: before 19:00, the fire lit, the guest here (a guest night only), embers from 21:00. */
export function stageAt(d: Pick<CallData, "litAt" | "guestFrom" | "guestUntil" | "guest"> & { off?: boolean }, nowMs: number): CallStage {
  if (d.off) return "off";
  const t = nowMs / 1000;
  if (t >= d.guestUntil) return "embers";
  if (d.guest && t >= d.guestFrom) return "guest";
  if (t >= d.litAt) return "lit";
  return "invite";
}

/** The day's opening line: picked by the day, so a restart or an edit keeps the same one. */
export function openerOf(day: string): string {
  const at = Date.parse(`${day}T00:00:00Z`);
  const n = Number.isFinite(at) ? Math.floor(at / 86_400_000) : 0;
  const size = CALL.openers.length;
  return CALL.openers[((n % size) + size) % size];
}

export interface CallViewOptions {
  stage: CallStage;
  /** Everyone at the fire now (campfire.status().sitters), staff included. */
  sitters: number;
  guildId: string;
  webUrl: string | null;
}

function linkButton(url: string, label: string): ButtonBuilder {
  return new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel(label);
}

/**
 * The call as it should read at a stage. The role mention line first (only
 * on a pinging call), then the stage's lines, the people line (not in
 * embers or off), the fine print with the mute line (pinging calls only) and
 * the issue line. Buttons: the private 🎁 check once the guest's drop is made,
 * then links to the campfire voice channel and the web island.
 */
export function callView(d: CallData, o: CallViewOptions): View {
  const blocks: Block[] = [];
  if (d.pingRoleIds.length > 0) blocks.push({ kind: "text", text: d.pingRoleIds.map((id) => `<@&${id}>`).join(" ") });
  const guest = d.guest ? guestOf(d.guest, d.staffNames) : null;
  const people = { kind: "text", text: CALL.people(Math.max(0, Math.floor(o.sitters))) } as const;
  let title: string;
  switch (o.stage) {
    case "invite":
      title = CALL.title;
      blocks.push({ kind: "text", text: [openerOf(d.day), CALL.invite].join("\n") });
      blocks.push({ kind: "text", text: CALL.round(d.litAt) });
      if (guest) blocks.push({ kind: "text", text: [CALL.teaser(d.guestFrom), CALL.drop(d.guestFrom, d.dropEnd)].join("\n") });
      blocks.push(people);
      break;
    case "lit":
      title = CALL.litTitle;
      blocks.push({ kind: "text", text: CALL.lit });
      if (guest) blocks.push({ kind: "text", text: [CALL.teaser(d.guestFrom), CALL.drop(d.guestFrom, d.dropEnd)].join("\n") });
      blocks.push(people);
      break;
    case "guest":
      title = guest ? guest.here : CALL.litTitle;
      if (guest) {
        // A staff night's title already names them: under it, what they brought.
        blocks.push({ kind: "text", text: guest.brought ?? guest.arrive });
        // Until the night is settled: who counts (anyone at the fire during the rest); then how many teams got a look.
        const drop = d.drop ? CALL.dropped(guest, d.drop.teams) : CALL.drop(d.guestFrom, d.dropEnd);
        blocks.push({ kind: "text", text: [drop, CALL.stay(guest, d.guestUntil)].join("\n") });
      } else {
        blocks.push({ kind: "text", text: CALL.lit });
      }
      blocks.push(people);
      break;
    case "embers":
      title = CALL.embersTitle;
      blocks.push({ kind: "text", text: CALL.embers });
      if (guest && d.drop) blocks.push({ kind: "text", text: CALL.dropped(guest, d.drop.teams) });
      break;
    case "off":
      // Paused (switched off, or a SHIFT cohort week): no people line, no promise of tomorrow, no guest.
      title = CALL.offTitle;
      blocks.push({ kind: "text", text: CALL.off });
      break;
  }
  // Paused: only the issue line. In a cohort week shift-voice counts voice time, so CALL.fine would not hold.
  const fine =
    o.stage === "off" ? [CALL.dayLine(d.day)] : [CALL.fine, ...(d.pingRoleIds.length > 0 ? [CALL.mute] : []), CALL.dayLine(d.day)];
  blocks.push({ kind: "subtext", text: fine.join("\n") });

  const buttons: ButtonBuilder[] = [];
  if (guest && d.drop && (o.stage === "guest" || o.stage === "embers")) {
    buttons.push(new ButtonBuilder().setCustomId(cid("rd_guest", d.day)).setLabel(CALL.btnCheck).setStyle(ButtonStyle.Primary));
  }
  if (d.coworkingId && SNOWFLAKE.test(o.guildId)) {
    buttons.push(linkButton(`https://discord.com/channels/${o.guildId}/${d.coworkingId}`, LIVE.join));
  }
  if (o.webUrl) buttons.push(linkButton(o.webUrl, ISLAND_LINK_LABEL));
  const rows = buttons.length > 0 ? [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)] : [];
  return { tone: "island", title, blocks, rows };
}

/** The call's payload: a send allows the call's roles to be pinged and nothing else; an edit allows nothing. */
export function callPayload(view: View, d: Pick<CallData, "pingRoleIds">, kind: "send" | "edit"): ViewPayload {
  const allowedMentions = kind === "send" && d.pingRoleIds.length > 0 ? { roles: [...d.pingRoleIds], parse: [] as [] } : { parse: [] as [] };
  return renderView(view, { ephemeral: false, action: `call_${kind}`, allowedMentions });
}

/**
 * Why the call cannot invite people to the fire now, or null when it can:
 * students must be able to see and join the coworking voice channel (open:
 * campfire.present() is not null), and the bot must be able to see and post
 * in that channel's chat, where the rounds and the guest are.
 */
export function roomProblem(client: Client, coworkingId: string | null, open: boolean): string | null {
  if (!coworkingId) return "no coworking channel is set";
  if (!open) return `coworking channel ${coworkingId} is not open to students (View Channel and Connect), or not seen yet`;
  const room = client.channels?.cache?.get(coworkingId) as
    | { guild?: { members?: { me?: unknown } }; permissionsFor?: (who: unknown) => { has: (p: bigint[]) => boolean } | null }
    | undefined;
  const me = room?.guild?.members?.me;
  if (!room || !me || typeof room.permissionsFor !== "function") return `the bot cannot see coworking channel ${coworkingId}`;
  if (!room.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
    return `the bot cannot send messages in the chat of coworking channel ${coworkingId}`;
  }
  return null;
}

/**
 * Whether a role ping would reach anyone: some pinged role is mentionable,
 * or the bot may mention every role in the channel. Null when unknown (the
 * roles or the bot's member are not cached).
 */
export function pingHeard(client: Client, guildId: string, channel: unknown, roleIds: string[]): boolean | null {
  const guild = client.guilds?.cache?.get(guildId) as
    | { roles?: { cache?: Map<string, { mentionable?: boolean }> }; members?: { me?: unknown } }
    | undefined;
  const roles = roleIds.map((id) => guild?.roles?.cache?.get(id)).filter((r): r is { mentionable?: boolean } => !!r);
  if (!guild || roles.length === 0) return null;
  if (roles.some((r) => r.mentionable)) return true;
  const me = guild.members?.me;
  const perms = (channel as { permissionsFor?: (who: unknown) => { has: (p: bigint) => boolean } | null }).permissionsFor;
  if (!me || typeof perms !== "function") return null;
  return perms.call(channel, me)?.has(PermissionFlagsBits.MentionEveryone) ?? false;
}

/** The Bangkok calendar day of an instant. */
function bangkokDay(nowMs: number): string {
  return new Date(nowMs + 7 * 3600_000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// The loop
// ---------------------------------------------------------------------------

/** A failure as a code only: database messages can carry student text, which never goes to logs. */
function reasonOf(error: unknown): string {
  if (error instanceof DiscordAPIError) return `discord ${error.code} (${error.status})`;
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  return (error as Error)?.name ?? "unknown";
}

function isUnknownMessage(error: unknown): boolean {
  return error instanceof DiscordAPIError && Number(error.code) === UNKNOWN_MESSAGE;
}

type Sendable = {
  id?: string;
  send(payload: unknown): Promise<Message>;
  messages?: { fetch(arg: unknown): Promise<unknown> };
  permissionsFor?: unknown;
};

interface Unmarked {
  day: string;
  channelId: string;
  message: Message;
  pinged: boolean;
}

/** Tonight's recorded call as this process last saw it. */
interface Shown {
  day: string;
  messageId: string;
  sig: string;
  /** When it was last edited (0: never by this process). */
  at: number;
  /** Deleted in Discord (Unknown Message): no more edits that day, never a repost. */
  gone: boolean;
  message?: Message;
}

export function startCall(client: Client, api: QuestApi, options: CallOptions): CallLoop {
  const now = options.now ?? Date.now;
  const guildId = options.guildId ?? "";
  let stopped = false;
  let running: Promise<void> | null = null;
  /** Whether the database has the call (schema 21); below it every check reads the version again. */
  let on = (options.schema ?? 0) >= CALL_SCHEMA;
  /** The last failure of each job, so each cause is logged once until that job works again. */
  const problems = new Map<string, string>();
  /** The last answer of shift_quest_call_today: the rounds read the evening from it. */
  let today: CallData | null = null;
  let unmarked: Unmarked | null = null;
  let shown: Shown | null = null;
  /** The day whose previous call this process has dealt with. */
  let previousDone: string | null = null;
  const inSession = options.inSession ?? cohortWeek;
  /** The last Bangkok day logged as a SHIFT cohort day (the call paused), so it is said once a day. */
  let pausedDay: string | null = null;
  /** The last Bangkok day logged as a staff night (staff were the guest), so it is said once a day. */
  let staffDay: string | null = null;

  function warnOnce(job: string, reason: string): void {
    if (problems.get(job) === reason) return;
    problems.set(job, reason);
    console.warn(`[shift-quests] campfire call: ${reason}`);
  }

  const viewOf = (d: CallData, nowMs: number) =>
    callView(d, { stage: stageAt(d, nowMs), sitters: options.campfire.status().sitters, guildId, webUrl: islandWebUrl() });

  /** A text or announcement channel of the SHIFT server, or null (logged once for `job`). Never a DM or a thread. */
  async function target(channelId: string, job: string): Promise<Sendable | null> {
    const channel = await client.channels.fetch(channelId);
    const ok =
      !!channel &&
      (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) &&
      (!options.guildId || channel.guildId === options.guildId);
    if (!ok) {
      warnOnce(job, `channel ${channelId} is not a text or announcement channel of the SHIFT server`);
      return null;
    }
    return channel as unknown as Sendable;
  }

  /**
   * Records a sent call (compare-and-set). Keeps it when its id won; deletes
   * it when another process recorded tonight's call first. Throws (and
   * remembers it) when the mark fails, so nothing is sent again meanwhile.
   */
  async function mark(post: Unmarked): Promise<void> {
    let kept: string | null;
    try {
      kept = await api.call<string | null>("shift_quest_call_mark", post.day, post.channelId, post.message.id);
    } catch (error) {
      if (error instanceof QuestError) {
        // A refusal will not change on a retry: take the unrecorded message back.
        unmarked = null;
        shown = null;
        await post.message.delete().catch(() => undefined);
      } else {
        unmarked = post;
      }
      throw error;
    }
    unmarked = null;
    if (kept !== post.message.id) {
      // Another process sent tonight's call first: ours is the duplicate.
      shown = null;
      await post.message.delete().catch(() => undefined);
      return;
    }
    problems.delete("post");
    if (today?.day === post.day) {
      today.messageId = post.message.id;
      today.messageChannelId = post.channelId;
    }
    console.log(`[shift-quests] campfire call posted for ${post.day} (${post.pinged ? "pinged the student roles" : "no ping"})`);
  }

  /** This bot's own call of `day` among the channel's latest messages; null when none, "failed" when it could not look. */
  async function findPosted(channel: Sendable, day: string): Promise<Message | null | "failed"> {
    if (!channel.messages) return "failed";
    const marker = CALL.dayLine(day);
    try {
      const found = (await channel.messages.fetch({ limit: FIND_LIMIT })) as { values(): Iterable<Message> } | null;
      for (const m of found?.values() ?? []) {
        if (client.user && m.author?.id !== client.user.id) continue;
        if (JSON.stringify(m.components ?? []).includes(marker)) return m;
      }
      return null;
    } catch {
      return "failed";
    }
  }

  /** Tonight's call, once: the room checks, claim, then send (or find the call a stopped process sent), then mark. */
  async function postToday(d: CallData): Promise<void> {
    const channel = await target(d.channelId, "post");
    if (!channel || stopped) return;
    const room = roomProblem(client, d.coworkingId, options.campfire.present() !== null);
    if (room) {
      warnOnce("room", `${room}; no call until it is fixed`);
      return;
    }
    problems.delete("room");
    if (d.pingRoleIds.length > 0 && pingHeard(client, guildId, channel, d.pingRoleIds) === false) {
      warnOnce(
        "mention",
        "the student roles are not mentionable and the bot lacks Mention @everyone, @here and All Roles in the news channel: the ping will be silent"
      );
    }
    const claim = await api.call<string | null>("shift_quest_call_claim", d.day, d.channelId);
    if (claim !== "new" && claim !== "stale") return;
    let message: Message | null = null;
    if (claim === "stale") {
      const found = await findPosted(channel, d.day);
      if (found === "failed") {
        // It may have been sent (and pinged) already: better no call tonight than a second ping.
        warnOnce("post", "could not read the news channel to recover a stale claim (Read Message History?); no call sent, so nobody is pinged twice");
        return;
      }
      message = found;
    }
    const sending = !message;
    if (!message) {
      const nowMs = now();
      const payload = callPayload(viewOf(d, nowMs), d, "send");
      // The nonce makes a retried POST return this call, never a second one (callNonce).
      message = await channel.send({ ...payload, nonce: callNonce(d.day), enforceNonce: true });
      shown = { day: d.day, messageId: message.id, sig: cardSignature(payload.components), at: nowMs, gone: false, message };
    }
    await mark({ day: d.day, channelId: d.channelId, message, pinged: sending && d.pingRoleIds.length > 0 });
  }

  /**
   * One check of the guest's rest: the ids in the room now go to the
   * database (an empty room included: the bot watched). Unknown (the room is
   * closed or not seen yet): nobody counted from this check. The answer says
   * tonight's guest: on a staff night, the staff and their names, shown from
   * this check on.
   */
  async function seen(d: CallData, ids: string[] | null): Promise<void> {
    if (!ids) return;
    const answer = record(await api.call<unknown>("shift_quest_campfire_seen", d.day, ids));
    problems.delete("drop");
    if (answer.guest === STAFF_GUEST) {
      d.guest = STAFF_GUEST;
      d.staffNames = staffNamesOf(answer.staff_names);
      if (staffDay !== d.day) {
        staffDay = d.day;
        // A count only: names never go to logs.
        console.log(`[shift-quests] campfire guest for ${d.day}: staff at the fire (${d.staffNames.length} name(s) shown)`);
      }
    }
  }

  /**
   * The evening guest's drop. During its rest (guest_from to drop_end), every
   * check that can read the room hands the ids there to the database
   * (seen): anyone who sits there at any check counts, so nobody is rewarded
   * for coming first, and the database keeps only which teams were there.
   * From drop_end, the first check settles the night (the database rolls
   * once per team, once). The two clocks differ by a moment: when the
   * database answers that it is not 19:30 there yet, a check within
   * LATE_CHECK_S of drop_end still hands over the room, as the rest's last
   * (the database takes it until its seen_end, 19:30:15, while the night is
   * not settled). Nothing about anyone is kept here.
   */
  async function drop(d: CallData): Promise<void> {
    if (!d.guest || d.drop) return;
    const t = now() / 1000;
    if (t < d.guestFrom) return;
    const ids = options.campfire.present();
    if (t < d.dropEnd) {
      await seen(d, ids);
      return;
    }
    const r = record(await api.call<unknown>("shift_quest_campfire_drop", d.day));
    problems.delete("drop");
    const teams = teamsOf(r.teams);
    if (r.done !== true || teams === null) {
      if (r.done !== true && t < d.dropEnd + LATE_CHECK_S) await seen(d, ids);
      return;
    }
    d.drop = { teams };
    if (r.fresh === true) console.log(`[shift-quests] campfire guest's drop for ${d.day} settled (${teams} team(s) got a look)`);
  }

  /**
   * A SHIFT cohort day: no call, no guest, no drop. The latest call (tonight's,
   * else the previous one) is edited once into the paused note.
   */
  async function pause(d: CallData): Promise<void> {
    if (pausedDay !== d.day) {
      pausedDay = d.day;
      console.log(`[shift-quests] campfire call paused for ${d.day}: a SHIFT round is in session (shift-voice counts voice time)`);
    }
    const latest = pausedFrom(d);
    if (!latest) return;
    try {
      await keep(latest);
    } catch (error) {
      warnOnce("edit", `edit failed: ${reasonOf(error)}`);
    }
  }

  /**
   * Keeps tonight's recorded call reading as it should now: an edit only when
   * its text changes, at most once a minute, never a ping. After a restart
   * it reads the message from Discord once and edits only on a difference. A
   * deleted call stays deleted.
   */
  async function keep(d: CallData): Promise<void> {
    if (!d.messageId || !d.messageChannelId) return;
    const nowMs = now();
    const same = shown?.day === d.day && shown.messageId === d.messageId ? shown : null;
    if (same?.gone) return;
    const payload = callPayload(viewOf(d, nowMs), d, "edit");
    const sig = cardSignature(payload.components);
    if (same && same.sig === sig) return;
    if (same && same.at > 0 && nowMs - same.at < EDIT_EVERY_MS) return;
    let message = same?.message;
    try {
      if (!message) {
        const channel = await target(d.messageChannelId, "edit");
        if (!channel?.messages) return;
        // From Discord (force), never discord.js's cache, which keeps a message as first sent.
        message = (await channel.messages.fetch({ message: d.messageId, force: true })) as Message;
        const current = cardSignature(message.components);
        shown = { day: d.day, messageId: d.messageId, sig: current, at: 0, gone: false, message };
        if (current === sig) return;
      }
      await message.edit({ components: payload.components, flags: payload.flags, allowedMentions: { parse: [] } });
    } catch (error) {
      if (isUnknownMessage(error)) {
        shown = { day: d.day, messageId: d.messageId, sig, at: nowMs, gone: true };
        warnOnce("edit", `the call for ${d.day} was deleted in Discord; no more edits tonight`);
        return;
      }
      throw error;
    }
    shown = { day: d.day, messageId: d.messageId, sig, at: nowMs, gone: false, message };
    problems.delete("edit");
  }

  /** Once tonight's call is recorded: the previous day's call goes, when this bot wrote it. Unknown Message is fine. */
  async function removePrevious(d: CallData): Promise<void> {
    if (!d.messageId || previousDone === d.day) return;
    const prev = d.previous;
    if (!prev || prev.messageId === d.messageId) {
      previousDone = d.day;
      return;
    }
    const channel = await target(prev.channelId, "previous");
    if (channel?.messages) {
      try {
        const m = (await channel.messages.fetch({ message: prev.messageId, force: true })) as Message;
        if (!client.user || m.author?.id === client.user.id) await m.delete();
      } catch (error) {
        if (!isUnknownMessage(error)) throw error;
      }
    }
    previousDone = d.day;
    problems.delete("previous");
  }

  async function tick(): Promise<void> {
    if (stopped || (options.connected && !options.connected())) return;
    if (!on) {
      const version = Number(await api.call<number>("shift_quest_schema_version"));
      if (!(version >= CALL_SCHEMA)) return;
      on = true;
      console.log(`[shift-quests] campfire call on (schema ${version})`);
    }
    if (unmarked) {
      try {
        await mark(unmarked);
      } catch (error) {
        warnOnce("post", reasonOf(error));
      }
    }
    const raw = await api.call<unknown>("shift_quest_call_today");
    problems.delete("read");
    const off = normalizeOff(raw);
    if (off) {
      // Switched off: no evening for the rounds; the latest call becomes the paused note, once.
      today = null;
      try {
        await keep(off);
      } catch (error) {
        warnOnce("edit", `edit failed: ${reasonOf(error)}`);
      }
      return;
    }
    const d = normalizeCall(raw);
    if (!d) {
      today = null;
      return;
    }
    if (inSession(d.day)) {
      // shift-voice counts voice time in every channel this week: no evening for the rounds either.
      today = null;
      await pause(d);
      return;
    }
    // Keep what this process learned today (the drop, the recorded message) until the database says it too.
    if (today?.day === d.day) {
      d.drop ??= today.drop;
      // A staff night never goes back to the rotation's guest (the database's rule too).
      if (today.guest === STAFF_GUEST && d.guest && d.guest !== STAFF_GUEST) {
        d.guest = STAFF_GUEST;
        d.staffNames = [...today.staffNames];
      }
      if (!d.messageId && today.messageId) {
        d.messageId = today.messageId;
        d.messageChannelId = today.messageChannelId;
      }
    }
    today = d;
    const jobs: [string, () => Promise<void>][] = [
      ["post", async () => (!unmarked && d.due && !d.messageId ? postToday(d) : undefined)],
      ["drop", () => drop(d)],
      ["edit", () => keep(d)],
      ["previous", () => removePrevious(d)],
    ];
    // Each on its own: a failure in one never holds back the others.
    for (const [job, run] of jobs) {
      if (stopped) return;
      try {
        await run();
      } catch (error) {
        warnOnce(job, `${job} failed: ${reasonOf(error)}`);
      }
    }
  }

  function poll(): Promise<void> {
    if (stopped) return Promise.resolve();
    if (running) return running;
    running = tick()
      .catch((error) => warnOnce("read", `the call could not be read: ${reasonOf(error)}`))
      .finally(() => {
        running = null;
      });
    return running;
  }

  const first = setTimeout(() => void poll(), FIRST_DELAY_MS);
  first.unref?.();
  const timer = setInterval(() => void poll(), TICK_MS);
  timer.unref?.();

  return {
    poll,
    evening(nowMs: number): Evening | null {
      const d = today;
      if (!d || d.day !== bangkokDay(nowMs)) return null;
      return {
        day: d.day,
        guest: d.guest,
        staffNames: [...d.staffNames],
        litAt: d.litAt,
        guestFrom: d.guestFrom,
        dropEnd: d.dropEnd,
        guestUntil: d.guestUntil,
        drop: d.drop ? { ...d.drop } : null,
      };
    },
    async stop() {
      stopped = true;
      clearTimeout(first);
      clearInterval(timer);
      await running;
    },
  };
}
