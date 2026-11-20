import {
  ChannelType,
  DiscordAPIError,
  Events,
  type Client,
  type Guild,
  type OverwriteType,
  type VoiceState,
} from "discord.js";

import { QuestDbError, QuestError, type QuestApi } from "./api";
import {
  BOT_NEEDS,
  MAX_ROOMS,
  ROOM_BITS,
  isRoom,
  ownerOf,
  planReconcile,
  roomOverwrites,
  type Action,
  type ChannelInfo,
  type Overwrite,
  type Scope,
  type Seat,
} from "./deepfire-state";
import { DEEPFIRE } from "./deepfireCopy";

/**
 * The deep fire (กองไฟโฟกัส): a voice room built for one person to work
 * alone, locked so nobody else can stay in it. Join to create: staff set one
 * voice channel in a category as the lobby (/admin channel kind:deepfire);
 * whoever joins it gets a new voice channel of their own in the same
 * category, "🔥 กองไฟโฟกัส", and is moved in. The room is deleted the moment it
 * is empty. Joining the lobby while your room still stands moves you back in.
 *
 * Locked, but visible (decision 2): the room copies the lobby's role
 * overwrites with only View Channel kept, so everyone who can see the lobby
 * sees the room and who sits in it ("ไม่มีห้องลับ" stays true), and Connect
 * and the room's chat are denied to every role. Only the owner and the bot
 * may connect; the user limit is 1. Discord Administrators, the server owner
 * and moderators with Move Members get past overwrites, so the bot is the
 * lock (decision 3): anyone other than the owner and the bot who walks into a
 * room is disconnected at once, straight from the voice update and without
 * waiting for any other work, and again on every reconcile; never moved
 * anywhere else. When Discord will not disconnect them, the room is deleted
 * (which disconnects everyone in it): fail closed. An owner is never moved
 * back into a room someone else is still in. An adult and a student never
 * stay alone in a locked room.
 *
 * Fail closed (decision 4): rooms are built only while the lobby is a cached
 * voice channel in a category and the bot holds View Channel, Connect, Manage
 * Channels and Move Members on it and on the category, plus every permission
 * a room's overwrites set on the category (lobbyProblem). Otherwise nothing
 * is built, people simply sit in the lobby (an ordinary shared voice
 * channel), and the heartbeat says ready=false so the web greys its button.
 * A Discord "missing permissions" (50013) stops building, and the next
 * heartbeat says ready=false, then checks again.
 *
 * Nothing per person is stored (decision 5). The bot knows its rooms by marks
 * on the rooms themselves (deepfire-state.ts isRoom, ownerOf), in any
 * category, so it is stateless across restarts and keeps guarding rooms after
 * the lobby is moved, changed or cleared: every ready, resume, lobby change
 * and 5 minutes it reconciles from the gateway caches (Guilds and
 * GuildVoiceStates, the intents the bot already has). Logs carry counts and
 * short codes only, never an id, a name or a channel name.
 *
 * The heartbeat (a database call) runs beside the work on the rooms, never in
 * front of it, and every database wait is bounded: a slow or stalled database
 * never holds up the lock.
 *
 * Silent (decision 7): no rounds, chimes, music or bot messages in a room. The
 * rooms are not the campfire: the evening guest never counts them.
 *
 * Schema 22 (20261120120000_shift_quest_deep_fire). Below it every heartbeat
 * reads the version again and nothing else happens, so the bot can deploy
 * before the migration and starts the deep fire by itself once it is applied.
 */

/** The island schema that adds the deep fire (20261120120000_shift_quest_deep_fire.sql). */
export const DEEPFIRE_SCHEMA = 22;

/** Heartbeat: keeps the web's button live and picks up a changed lobby. */
const BEAT_MS = 60_000;
/** A full reconcile even when nothing looked wrong: catches any event the gateway lost. */
const RECONCILE_MS = 5 * 60_000;
/** At most this many rooms are built in one pass: the next pass checks every room again before it builds more. */
const BUILDS_PER_PASS = 5;
/** A room whose intruder could be neither disconnected nor closed is tried again after this long, never in a loop. */
const RETRY_MS = 5_000;
/** One database step of the heartbeat waits at most this long: a stalled connection never holds the heartbeat. */
const DB_WAIT_MS = 20_000;
/** Stopping waits at most this long for running work: every other quest module stops after this one. */
const STOP_WAIT_MS = 8_000;
/** And at most this long for its last heartbeat (ready=false). */
const STOP_BEAT_MS = 3_000;

const SNOWFLAKE = /^[0-9]{5,25}$/;

/** Discord: Missing Permissions. Stops building rooms until the next heartbeat's check. */
const MISSING_PERMISSIONS = 50013;
/** Discord codes that only mean "already done": the channel is gone, the person left voice or the server. */
const GONE = new Set([10003, 10007, 40032]);

/** Why rooms cannot be built from a lobby now; null when they can. */
export type LobbyProblem = "unset" | "unknown" | "not_voice" | "no_category" | "bot_perms";

type PermissionsFor = (who: never) => { has: (permissions: bigint[]) => boolean } | null;

/** The guild pieces lobbyProblem reads (a discord.js Guild has them). */
export interface LobbyGuild {
  members?: { me?: unknown } | null;
  channels?: { cache?: { get(id: string): unknown } } | null;
}

/**
 * Whether the bot can build rooms from `lobbyId`, from the gateway cache only.
 * The lobby must be a plain voice channel in a category; the bot must hold
 * BOT_NEEDS on the lobby and on the category, and ROOM_BITS on the category
 * (Discord lets a bot set only permissions it holds there). Anything not
 * cached (the guild, the lobby, its category, the bot's member) is "unknown",
 * which refuses: unlike the live post, this fails closed.
 */
export function lobbyProblem(guild: LobbyGuild | null | undefined, lobbyId: string | null | undefined): LobbyProblem | null {
  if (!lobbyId) return "unset";
  const lobby = guild?.channels?.cache?.get(lobbyId) as
    | { type?: number; parentId?: string | null; permissionsFor?: PermissionsFor }
    | undefined;
  if (!lobby) return "unknown";
  if (lobby.type !== ChannelType.GuildVoice) return "not_voice";
  if (!lobby.parentId) return "no_category";
  const category = guild?.channels?.cache?.get(lobby.parentId) as
    | { type?: number; permissionsFor?: PermissionsFor }
    | undefined;
  const me = guild?.members?.me;
  if (!me || !category || typeof lobby.permissionsFor !== "function" || typeof category.permissionsFor !== "function") {
    return "unknown";
  }
  const onLobby = lobby.permissionsFor(me as never)?.has(BOT_NEEDS) ?? false;
  const onCategory = category.permissionsFor(me as never)?.has(ROOM_BITS) ?? false;
  return onLobby && onCategory ? null : "bot_perms";
}

export interface DeepFireOptions {
  guildId: string;
  /** Whether the gateway is connected now: no ready=true heartbeat while it is not. */
  connected: () => boolean;
  /** The database's island schema at start; below DEEPFIRE_SCHEMA each heartbeat reads it again. */
  schema?: number;
  /** At most this many rooms at once (MAX_ROOMS). */
  cap?: number;
}

export interface DeepFire {
  /** One heartbeat now; a reconcile is queued when the lobby changed or one is due. Never throws. */
  poll(): Promise<void>;
  /** One reconcile now. Never throws. */
  reconcile(): Promise<void>;
  /** What this process knows: whether the database has the deep fire, the lobby, and the last ready it reported. */
  status(): { on: boolean; lobby: string | null; ready: boolean };
  /** Stops listening. Rooms are left as they are; the heartbeat says ready=false once. Waits a few seconds at most. */
  stop(): Promise<void>;
}

/** A wait cut short (bounded). Only its name is ever logged. */
class TimeoutError extends Error {
  constructor() {
    super("timed out");
    this.name = "TimeoutError";
  }
}

/** `work`, or a TimeoutError once `ms` have passed; the timer never outlives it. */
function bounded<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), ms);
    (timer as { unref?: () => void }).unref?.();
  });
  return Promise.race([work, limit]).finally(() => clearTimeout(timer));
}

/** A failure as a short code only: messages can carry names, which never go to logs. */
function reasonOf(error: unknown): string {
  if (error instanceof DiscordAPIError) return `discord ${error.code} (${error.status})`;
  if (error instanceof QuestError) return `sq:${error.code}`;
  if (error instanceof QuestDbError) return `SQLSTATE ${error.sqlstate}`;
  return (error as Error)?.name ?? "unknown";
}

function codeOf(error: unknown): number | null {
  return error instanceof DiscordAPIError ? Number(error.code) : null;
}

/** Discord said it is already done: the channel is gone, or the person left voice or the server. */
function gone(error: unknown): boolean {
  const code = codeOf(error);
  return code !== null && GONE.has(code);
}

function channelOf(answer: unknown): string | null {
  const id = answer && typeof answer === "object" ? (answer as { channel_id?: unknown }).channel_id : null;
  return typeof id === "string" && SNOWFLAKE.test(id) ? id : null;
}

interface CachedOverwrite {
  id: string;
  type: number;
  allow: { bitfield: bigint };
  deny: { bitfield: bigint };
}

/** A cached channel's overwrites as plain bitfields. */
function overwritesOf(channel: unknown): Overwrite[] {
  const cache = (channel as { permissionOverwrites?: { cache?: { values(): Iterable<CachedOverwrite> } } } | undefined)
    ?.permissionOverwrites?.cache;
  if (!cache) return [];
  return [...cache.values()].map((o) => ({ id: o.id, type: Number(o.type), allow: BigInt(o.allow.bitfield), deny: BigInt(o.deny.bitfield) }));
}

function infoOf(channel: { id: string; type: number; parentId?: string | null; userLimit?: number }): ChannelInfo {
  return {
    id: channel.id,
    voice: channel.type === ChannelType.GuildVoice,
    parentId: channel.parentId ?? null,
    userLimit: Number(channel.userLimit ?? 0),
    overwrites: overwritesOf(channel),
  };
}

/** What became of one disconnect: done, already done (they had left), or Discord would not (logged). */
type Removal = "removed" | "gone" | "failed";

/** What a pass did, as counts only. */
interface Done {
  built: number;
  movedIn: number;
  removed: number;
  closed: number;
}

/** Counts only: never who, never which channel. */
function sayDone(done: Done): void {
  const said = [
    done.built ? `${done.built} room(s) built` : "",
    done.movedIn ? `${done.movedIn} moved in` : "",
    done.removed ? `${done.removed} removed from a room` : "",
    done.closed ? `${done.closed} room(s) closed` : "",
  ].filter(Boolean);
  if (said.length > 0) console.log(`[shift-quests] deep fire: ${said.join(", ")}`);
}

export function startDeepFire(client: Client, api: QuestApi, options: DeepFireOptions): DeepFire {
  const { guildId } = options;
  const cap = options.cap ?? MAX_ROOMS;
  /** Whether the database has the deep fire (schema 22); below it each heartbeat only reads the version. */
  let on = false;
  let stopped = false;
  /** The lobby from the last heartbeat; undefined until the first one answers. */
  let lobby: string | null | undefined;
  /** Every lobby this process has seen: never a room, even one marked like a room. */
  const lobbies = new Set<string>();
  /** The ready the last heartbeat reported. */
  let ready = false;
  /** Whether any heartbeat was sent, so stop says ready=false once. */
  let beaten = false;
  /** Discord answered "missing permissions" since the last heartbeat: no new rooms, and that heartbeat says not ready. */
  let refused = false;
  /** A move back into a room failed while its owner still waits in the lobby: the next heartbeat tries again. */
  let moveRetry = false;
  let lastReconcile = 0;
  /** A reconcile is queued and has not started: events coalesce into it. */
  let queued = false;
  /** The heartbeat running now, if any: one at a time, never on the chain that guards the rooms. */
  let ticking: Promise<void> | null = null;
  /** Heartbeats, one after another (the timer's, a ready's, a resume's). */
  let beating: Promise<unknown> = Promise.resolve();
  /** A failed close waits for this timer. */
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  /** People with a build or a move in flight: a second event never gives them a second room. */
  const busy = new Set<string>();
  /**
   * Disconnects sent straight from a voice update, by person, until their
   * next voice update: a reconcile meanwhile shares the outcome instead of
   * sending a second one.
   */
  const removing = new Map<string, Promise<Removal>>();
  /** The last failure of each job, so each cause is logged once until that job works again. */
  const problems = new Map<string, string>();
  /** The last readiness logged, so a change is said once. */
  let saidReady: string | null = null;
  /** One chain for all work on the rooms: two events never race to build two rooms for one person. */
  let chain: Promise<void> = Promise.resolve();

  function warnOnce(job: string, reason: string): void {
    if (problems.get(job) === reason) return;
    problems.set(job, reason);
    console.warn(`[shift-quests] deep fire: ${reason}`);
  }

  function enqueue(job: string, task: () => Promise<void>): Promise<void> {
    const next = chain.then(task).then(
      () => undefined,
      (error) => warnOnce(job, `${job} failed: ${reasonOf(error)}`)
    );
    chain = next;
    return next;
  }

  const guildOf = (): Guild | undefined => client.guilds?.cache?.get(guildId);

  /** Whether rooms can be built now: connected, not refused since the last check, and the lobby checks out. */
  function problemNow(): LobbyProblem | "offline" | "refused" | null {
    if (!options.connected()) return "offline";
    if (refused) return "refused";
    const guild = guildOf();
    if (!guild || guild.available === false) return "unknown";
    return lobbyProblem(guild as unknown as LobbyGuild, lobby);
  }

  function sayReadiness(problem: string | null): void {
    const line = problem === null ? "ready" : `not ready (${problem})`;
    if (saidReady === line) return;
    saidReady = line;
    console.log(`[shift-quests] deep fire ${line}`);
  }

  /**
   * Vouches for the lobby's readiness and reads the lobby setting; true when
   * it changed. A refusal from Discord since the last heartbeat is reported
   * as not ready (then cleared, so the reconcile that follows tries again). A
   * changed lobby is checked at once and, when its readiness differs from
   * what was just sent, beaten again: the web never shows a new lobby as
   * ready on the old one's say-so.
   */
  async function beat(): Promise<boolean> {
    const wasRefused = refused;
    refused = false;
    let problem: ReturnType<typeof problemNow> = wasRefused ? "refused" : problemNow();
    const answer = await api.call<unknown>("shift_quest_deepfire_beat", guildId, problem === null);
    beaten = true;
    ready = problem === null;
    const next = channelOf(answer);
    const changed = next !== lobby;
    lobby = next;
    if (next) lobbies.add(next);
    if (changed) {
      console.log(`[shift-quests] deep fire lobby ${next ? "set" : "cleared"}`);
      problem = problemNow();
      if ((problem === null) !== ready) {
        await api.call<unknown>("shift_quest_deepfire_beat", guildId, problem === null);
        ready = problem === null;
      }
    }
    // Unset is no fault: nothing to say until staff set a lobby.
    if (lobby || saidReady !== null) sayReadiness(problem);
    problems.delete("beat");
    return changed;
  }

  /** One heartbeat, after any running one, bounded: never on the chain that guards the rooms. */
  function heartbeat(): Promise<boolean> {
    const run = beating.then(() => (stopped ? false : bounded(beat(), DB_WAIT_MS)));
    beating = run.catch(() => undefined);
    return run;
  }

  /** The lobby and its category as the cache has them now; null when it is unset or not a voice channel in a category. */
  function scopeIn(guild: Guild): Scope | null {
    if (!lobby) return null;
    const channel = guild.channels.cache.get(lobby);
    if (!channel || channel.type !== ChannelType.GuildVoice || !channel.parentId) return null;
    return { lobbyId: lobby, parentId: channel.parentId };
  }

  /** The room `channelId` is, by its marks; null when it is no room (a lobby never is). */
  function roomAt(guild: Guild, channelId: string | null | undefined, botId: string): ChannelInfo | null {
    if (!channelId || channelId === lobby || lobbies.has(channelId)) return null;
    const channel = guild.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildVoice) return null;
    const info = infoOf(channel);
    return isRoom(info, botId, guildId) ? info : null;
  }

  /**
   * Makes the rooms match the rules (planReconcile) from the gateway caches:
   * no REST read, no member fetch. Every room in the server is guarded,
   * wherever it sits and whether or not a lobby is known now; rooms are given
   * out only from the current lobby.
   */
  async function reconcile(): Promise<void> {
    if (stopped || !on) return;
    const guild = guildOf();
    const botId = client.user?.id;
    if (!guild || guild.available === false || !botId) return;

    const now = scopeIn(guild);
    const channels: ChannelInfo[] = [];
    for (const channel of guild.channels.cache.values()) {
      if (channel.type === ChannelType.GuildVoice) channels.push(infoOf(channel));
    }
    const seats: Seat[] = [];
    for (const state of guild.voiceStates.cache.values()) {
      if (!state.channelId) continue;
      seats.push({ userId: state.id, channelId: state.channelId, bot: state.member?.user?.bot ?? false });
    }
    const canBuild = now !== null && problemNow() === null;
    const plan = planReconcile({ scope: now, lobbies: [...lobbies], channels, seats, botId, guildId, canBuild, cap, busy });
    lastReconcile = Date.now();
    if (plan.length > 0) await carryOut(guild, botId, now, plan);
  }

  /** Whether anyone (the bot aside) sits in a channel, per the voice cache. */
  function occupied(guild: Guild, channelId: string, botId: string): boolean {
    for (const state of guild.voiceStates.cache.values()) {
      if (state.channelId === channelId && state.id !== botId) return true;
    }
    return false;
  }

  /** Whether anyone but the owner, the bot and people just disconnected sits in a room, per the voice cache. */
  function othersIn(guild: Guild, roomId: string, ownerId: string, botId: string, cleared: ReadonlySet<string>): boolean {
    for (const state of guild.voiceStates.cache.values()) {
      if (state.channelId === roomId && state.id !== botId && state.id !== ownerId && !cleared.has(state.id)) return true;
    }
    return false;
  }

  /** Records a refusal: 50013 stops building until the next heartbeat; an "already gone" is no failure. */
  function failed(job: string, error: unknown): void {
    if (gone(error)) return;
    if (codeOf(error) === MISSING_PERMISSIONS) {
      refused = true;
      sayReadiness("refused");
    }
    warnOnce(job, `${job} failed: ${reasonOf(error)}`);
  }

  /** Out of voice, never into another channel. */
  async function disconnect(guild: Guild, userId: string): Promise<Removal> {
    try {
      await guild.members.edit(userId, { channel: null, reason: DEEPFIRE.reason.remove });
      problems.delete("disconnect");
      return "removed";
    } catch (error) {
      if (gone(error)) return "gone";
      failed("disconnect", error);
      return "failed";
    }
  }

  /** Deletes a room, which disconnects everyone in it (the owner too). True when it is gone. */
  async function close(room: { delete(reason?: string): Promise<unknown> } | undefined, done: Done): Promise<boolean> {
    if (!room) return true;
    try {
      await room.delete(DEEPFIRE.reason.close);
      done.closed += 1;
      problems.delete("delete");
      return true;
    } catch (error) {
      if (gone(error)) return true;
      failed("delete", error);
      return false;
    }
  }

  /** One more reconcile in a few seconds (one timer at most): a refusal that repeats never becomes a hot loop. */
  function retrySoon(): void {
    if (stopped || retryTimer !== undefined) return;
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      if (!stopped) void schedule("retry");
    }, RETRY_MS);
    (retryTimer as { unref?: () => void }).unref?.();
  }

  async function carryOut(guild: Guild, botId: string, lobbyScope: Scope | null, plan: Action[]): Promise<void> {
    const done: Done = { built: 0, movedIn: 0, removed: 0, closed: 0 };
    /** Someone moved or left while this pass ran, or a room closed: one more pass looks again. */
    let again = false;
    /** Rooms deleted in this pass because someone in them could not be disconnected: nothing more happens to them. */
    const closing = new Set<string>();
    /** People out of a room in this pass (the voice cache hears of it a moment later). */
    const cleared = new Set<string>();
    let builds = 0;
    const seatOf = (userId: string) => guild.voiceStates.cache.get(userId)?.channelId ?? null;

    for (const action of plan) {
      // Stopping: the next start picks everything up from the rooms themselves.
      if (stopped) break;
      try {
        if (action.kind === "disconnect") {
          if (closing.has(action.roomId)) continue;
          // They left the room while this pass ran: never disconnect them from wherever they went.
          if (seatOf(action.userId) !== action.roomId) continue;
          // A disconnect sent straight from their voice update: its outcome counts, no second one.
          const sent = removing.get(action.userId);
          const outcome = sent ? await sent : await disconnect(guild, action.userId);
          if (outcome !== "failed") {
            if (!sent && outcome === "removed") done.removed += 1;
            cleared.add(action.userId);
            continue;
          }
          // Discord would not disconnect them: close the room, which disconnects everyone in it. Fail closed.
          closing.add(action.roomId);
          if (await close(guild.channels.cache.get(action.roomId), done)) again = true;
          else retrySoon();
        } else if (action.kind === "delete") {
          if (closing.has(action.roomId)) continue;
          const room = guild.channels.cache.get(action.roomId);
          if (!room) continue;
          // Its owner came back while this pass ran: the next pass decides.
          const owner = ownerOf(infoOf(room), botId);
          if (owner && seatOf(owner) === room.id) continue;
          await room.delete(DEEPFIRE.reason.close);
          done.closed += 1;
          problems.delete("delete");
        } else if (action.kind === "move") {
          if (!lobbyScope) continue;
          // Never move an owner into a room someone else is still in, or one closed in this pass: the next pass decides.
          if (closing.has(action.roomId) || othersIn(guild, action.roomId, action.userId, botId, cleared)) {
            again = true;
            continue;
          }
          // They left the lobby while this pass ran: never pull them out of wherever they went.
          if (seatOf(action.userId) !== lobbyScope.lobbyId) {
            again = true;
            continue;
          }
          busy.add(action.userId);
          try {
            await guild.members.edit(action.userId, { channel: action.roomId, reason: DEEPFIRE.reason.move });
            done.movedIn += 1;
            problems.delete("move");
          } catch (error) {
            failed("move", error);
            // Still waiting: the next heartbeat tries again, never at once in a loop. Gone: one more pass closes the
            // room they left empty.
            if (seatOf(action.userId) === lobbyScope.lobbyId) moveRetry = true;
            else again = true;
          } finally {
            busy.delete(action.userId);
          }
        } else {
          if (!lobbyScope || refused || problemNow() !== null) continue;
          // A few rooms per pass: the next pass checks every room again before it builds more.
          if (builds >= BUILDS_PER_PASS) {
            again = true;
            break;
          }
          // They may have left the lobby while this pass ran.
          if (seatOf(action.userId) !== lobbyScope.lobbyId) continue;
          builds += 1;
          if (await build(guild, botId, lobbyScope, action.userId, done)) again = true;
        }
      } catch (error) {
        failed(action.kind, error);
      }
    }
    sayDone(done);
    if (again && !stopped) void schedule("again");
  }

  /**
   * Builds one room for `userId` and moves them in, if they still wait in the
   * lobby. When they left meanwhile or the move fails, the room goes again at
   * once if nobody is in it. Returns true when another pass should look again
   * now; a person still waiting after a failed move is tried again on the
   * next heartbeat instead (never a loop of rooms built and closed).
   */
  async function build(guild: Guild, botId: string, lobbyScope: Scope, userId: string, done: Done): Promise<boolean> {
    busy.add(userId);
    try {
      const overwrites = roomOverwrites(overwritesOf(guild.channels.cache.get(lobbyScope.lobbyId)), guildId, userId, botId);
      const room = await guild.channels.create({
        name: DEEPFIRE.roomName,
        type: ChannelType.GuildVoice,
        parent: lobbyScope.parentId,
        userLimit: 1,
        permissionOverwrites: overwrites.map((o) => ({ id: o.id, type: o.type as OverwriteType, allow: o.allow, deny: o.deny })),
        reason: DEEPFIRE.reason.build,
      });
      done.built += 1;
      problems.delete("create");
      const waiting = () => guild.voiceStates.cache.get(userId)?.channelId === lobbyScope.lobbyId;
      // Building can take a while: someone who left the lobby meanwhile is never pulled out of wherever they went.
      if (waiting()) {
        try {
          await guild.members.edit(userId, { channel: room.id, reason: DEEPFIRE.reason.move });
          done.movedIn += 1;
          return false;
        } catch (error) {
          failed("move", error);
        }
      }
      // Someone is in it: the next pass sorts it out.
      if (occupied(guild, room.id, botId)) return true;
      await close(room, done);
      if (!waiting()) return true;
      moveRetry = true;
      return false;
    } finally {
      busy.delete(userId);
    }
  }

  function schedule(job: string): Promise<void> {
    if (queued) return chain;
    queued = true;
    return enqueue(job, async () => {
      queued = false;
      await reconcile();
    });
  }

  const onVoice = (oldState: VoiceState, newState: VoiceState): void => {
    if (stopped || !on) return;
    const guild = newState.guild;
    if (guild?.id !== guildId) return;
    // Mute, deafen, stream, camera: no seat changed.
    if (oldState.channelId === newState.channelId) return;
    const botId = client.user?.id;
    if (!botId || newState.id === botId) return;
    // A new seat: an earlier disconnect of theirs has been heard of.
    removing.delete(newState.id);
    const into = roomAt(guild, newState.channelId, botId);
    if (into && newState.id !== ownerOf(into, botId)) {
      // The lock: out at once, straight from the voice update, never waiting behind a build or a heartbeat. The
      // reconcile below shares this outcome, and closes the room if Discord would not.
      const sent = disconnect(guild, newState.id);
      removing.set(newState.id, sent);
      void sent.then((outcome) => {
        if (outcome === "removed") sayDone({ built: 0, movedIn: 0, removed: 1, closed: 0 });
      });
    }
    const lobbyNow = (id: string | null) => !!id && id === lobby;
    if (!into && !lobbyNow(newState.channelId) && !lobbyNow(oldState.channelId) && !roomAt(guild, oldState.channelId, botId)) return;
    void schedule("voice");
  };

  /** A heartbeat beside the work on the rooms, then another reconcile once it answers (a lobby read for the first time). */
  function beatThenReconcile(job: string): void {
    void heartbeat().then(
      () => {
        if (!stopped) void schedule(job);
      },
      (error) => warnOnce("beat", `beat failed: ${reasonOf(error)}`)
    );
  }

  // A fresh session: guard every room at once, read the lobby beside it, and make every room match.
  const onReady = (): void => {
    if (stopped || !on) return;
    void schedule("ready");
    beatThenReconcile("ready");
  };
  // A resume replays missed events, but a reconcile is cheap and certain.
  const onResume = (): void => {
    if (stopped || !on) return;
    void schedule("resume");
    if (lobby === undefined) beatThenReconcile("resume");
  };

  /** The database has the deep fire: listen from now on. */
  function turnOn(version: number): void {
    if (on) return;
    on = true;
    client.on(Events.VoiceStateUpdate, onVoice);
    client.on(Events.ShardReady, onReady);
    client.on(Events.ShardResume, onResume);
    console.log(`[shift-quests] deep fire on (schema ${version})`);
  }

  async function tick(): Promise<void> {
    if (stopped) return;
    if (!on) {
      // The version is read again only while connected, as the call does: no database call while offline.
      if (!options.connected()) return;
      const version = Number(await bounded(api.call<number>("shift_quest_schema_version"), DB_WAIT_MS));
      if (stopped || !(version >= DEEPFIRE_SCHEMA)) return;
      turnOn(version);
    }
    let changed = false;
    const readyBefore = ready;
    const wasRefused = refused;
    const retry = moveRetry;
    moveRetry = false;
    try {
      changed = await heartbeat();
    } catch (error) {
      warnOnce("beat", `beat failed: ${reasonOf(error)}`);
    }
    // A new lobby, a readiness that flipped (staff fixed the permissions), a refusal or a failed move checked again:
    // people waiting in the lobby get their rooms now, not at the next 5-minute reconcile. Queued, never awaited:
    // the next heartbeat never waits for the rooms.
    const due = changed || ready !== readyBefore || wasRefused || retry || Date.now() - lastReconcile >= RECONCILE_MS;
    if (!stopped && options.connected() && due) void schedule("tick");
  }

  function poll(): Promise<void> {
    if (stopped) return Promise.resolve();
    if (ticking) return ticking;
    const run = tick()
      .catch((error) => warnOnce("tick", `tick failed: ${reasonOf(error)}`))
      .finally(() => {
        ticking = null;
      });
    ticking = run;
    return run;
  }

  if ((options.schema ?? 0) >= DEEPFIRE_SCHEMA) turnOn(options.schema ?? DEEPFIRE_SCHEMA);
  const timer = setInterval(() => void poll(), BEAT_MS);
  timer.unref?.();
  // At start too: while offline this beats ready=false (schema 22) or does nothing (below it).
  void poll();

  return {
    poll,
    reconcile: () => (stopped ? chain : schedule("reconcile")),
    status() {
      return { on, lobby: lobby ?? null, ready };
    },
    async stop() {
      stopped = true;
      clearInterval(timer);
      if (retryTimer !== undefined) clearTimeout(retryTimer);
      client.off(Events.VoiceStateUpdate, onVoice);
      client.off(Events.ShardReady, onReady);
      client.off(Events.ShardResume, onResume);
      // The running action and heartbeat, but never long: the other quest modules stop after this one, and the rooms
      // need nothing from a clean stop (the next start picks them up). Waiting for the heartbeat first means a late
      // one never says ready after the line below.
      await bounded(Promise.all([chain, ticking, beating]), STOP_WAIT_MS).catch(() => undefined);
      removing.clear();
      // Rooms stay as they are; the web greys the button now, not in 3 minutes.
      if (on && beaten) {
        try {
          await bounded(api.call("shift_quest_deepfire_beat", guildId, false), STOP_BEAT_MS);
        } catch {
          // The web stops trusting the heartbeat after 3 minutes anyway.
        }
      }
    },
  };
}
