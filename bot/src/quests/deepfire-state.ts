import { PermissionFlagsBits } from "discord.js";

/**
 * The deep fire's decisions (กองไฟโฟกัส), kept free of Discord I/O so they can
 * be tested as tables: which voice channels are the bot's rooms, who owns
 * one, the permission overwrites of a new room, and what a reconcile does.
 * deepfire.ts reads the gateway caches into these shapes and carries out the
 * plan.
 *
 * Nothing here is stored anywhere. The bot recognises its rooms from the rooms
 * themselves, so a restart picks every room up again:
 *
 * - A room is a plain voice channel, never a lobby, with user limit 1, a
 *   member overwrite for the bot's own user that allows exactly BOT_ALLOW and
 *   denies nothing, and an @everyone overwrite that denies Connect
 *   (roomOverwrites gives every room exactly that). Where it sits does not
 *   matter: a room stays guarded after the lobby moves to another category,
 *   is changed or cleared, across a restart.
 * - Its owner is the room's one other member overwrite that allows Connect.
 *   None, or more than one (someone edited the room), means no owner: the room
 *   is closed, fail closed.
 */

/** At most this many rooms at once. Discord allows 50 channels per category and 500 per server. */
export const MAX_ROOMS = 40;

/** Discord's overwrite types (OverwriteType): 0 a role, 1 a member. */
export const ROLE = 0;
export const MEMBER = 1;

const P = PermissionFlagsBits;

/** The room's owner may see, connect, speak, stream and talk without push-to-talk. */
export const OWNER_ALLOW = P.ViewChannel | P.Connect | P.Speak | P.Stream | P.UseVAD;
/** The bot sees the room, moves people in and out, and deletes it. It never speaks there. */
export const BOT_ALLOW = P.ViewChannel | P.Connect | P.ManageChannels | P.MoveMembers;
/**
 * The room's text-in-voice chat is off for everyone, the owner included: it
 * can never become a written channel between an adult and a student.
 */
export const CHAT_DENY =
  P.SendMessages |
  P.SendMessagesInThreads |
  P.CreatePublicThreads |
  P.CreatePrivateThreads |
  P.SendVoiceMessages |
  P.SendPolls |
  P.AddReactions;
/** No permission (written without a bigint literal: the repo's TypeScript target predates them). */
const NONE = BigInt(0);

/**
 * What the bot must hold on the lobby and on its category before it builds
 * anything (decision 4). Unknown counts as missing.
 */
export const BOT_NEEDS: bigint[] = [P.ViewChannel, P.Connect, P.ManageChannels, P.MoveMembers];

/**
 * Every permission a new room's overwrites allow or deny. Discord lets a bot
 * set in a new channel's overwrites only permissions it holds in the parent
 * category, so the bot must hold all of these there (a missing one would
 * fail every room with 50013).
 */
export const ROOM_BITS: bigint[] = [
  P.ViewChannel,
  P.Connect,
  P.Speak,
  P.Stream,
  P.UseVAD,
  P.ManageChannels,
  P.MoveMembers,
  P.SendMessages,
  P.SendMessagesInThreads,
  P.CreatePublicThreads,
  P.CreatePrivateThreads,
  P.SendVoiceMessages,
  P.SendPolls,
  P.AddReactions,
];

/** One permission overwrite, as Discord sends it (allow and deny as bitfields). */
export interface Overwrite {
  id: string;
  type: number;
  allow: bigint;
  deny: bigint;
}

/** A guild channel as the planner needs it. */
export interface ChannelInfo {
  id: string;
  /** A plain voice channel (ChannelType.GuildVoice): never a stage, text channel or category. */
  voice: boolean;
  parentId: string | null;
  userLimit: number;
  overwrites: readonly Overwrite[];
}

/** Someone in a voice channel of the guild, from the gateway's voice state cache. */
export interface Seat {
  userId: string;
  channelId: string;
  /** A bot account; false when the member is not cached (bots never get a room either way). */
  bot: boolean;
}

/** A lobby and the category its rooms live in. */
export interface Scope {
  lobbyId: string;
  parentId: string;
}

function allows(o: Overwrite, bits: bigint): boolean {
  return (o.allow & bits) === bits;
}

/**
 * Whether `channel` carries the marks of one of the bot's rooms, in any
 * category or none: a plain voice channel, user limit 1, the bot's own member
 * overwrite allowing exactly BOT_ALLOW and denying nothing, and @everyone
 * (whose role id is the guild id) denied Connect. Lobbies are never rooms;
 * the caller leaves them out (planReconcile's `lobbies`).
 */
export function isRoom(channel: ChannelInfo, botId: string, guildId: string): boolean {
  return (
    channel.voice &&
    channel.userLimit === 1 &&
    channel.overwrites.some((o) => o.type === MEMBER && o.id === botId && o.allow === BOT_ALLOW && o.deny === NONE) &&
    channel.overwrites.some((o) => o.type === ROLE && o.id === guildId && (o.deny & P.Connect) === P.Connect)
  );
}

/** The room's owner: its one member overwrite, other than the bot's, that allows Connect. Null when none or ambiguous. */
export function ownerOf(channel: Pick<ChannelInfo, "overwrites">, botId: string): string | null {
  const owners = channel.overwrites.filter((o) => o.type === MEMBER && o.id !== botId && allows(o, P.Connect));
  return owners.length === 1 ? owners[0].id : null;
}

/**
 * The overwrites of a new room for `ownerId` (decision 2: locked, but
 * visible). Every role overwrite of the lobby is copied (@everyone's too,
 * whose role id is the guild id) with only its View Channel allow or deny
 * kept, so everyone who can see the lobby sees the room and who sits in it,
 * and nothing else carries over (a role allowed Move Members on the lobby is
 * not allowed it here). Connect and the chat are denied on every copied role
 * and on @everyone (added when the lobby has none). The lobby's member
 * overwrites are not copied. Then the only two members: the owner (see,
 * connect, speak, stream, voice activity; chat denied) and the bot.
 *
 * Discord Administrators and the server owner ignore overwrites, and
 * moderators with Move Members can drag people in: the overwrites keep
 * ordinary members out, and the bot disconnects anyone else who gets in
 * (planReconcile). The lock is the bot, not this list.
 */
export function roomOverwrites(lobby: readonly Overwrite[], guildId: string, ownerId: string, botId: string): Overwrite[] {
  const roles: Overwrite[] = lobby
    .filter((o) => o.type === ROLE)
    .map((o) => ({
      id: o.id,
      type: ROLE,
      allow: o.allow & P.ViewChannel,
      deny: (o.deny & P.ViewChannel) | P.Connect | CHAT_DENY,
    }));
  if (!roles.some((o) => o.id === guildId)) roles.push({ id: guildId, type: ROLE, allow: NONE, deny: P.Connect | CHAT_DENY });
  return [
    ...roles,
    { id: ownerId, type: MEMBER, allow: OWNER_ALLOW, deny: CHAT_DENY },
    { id: botId, type: MEMBER, allow: BOT_ALLOW, deny: NONE },
  ];
}

export type Action =
  /** Someone other than the room's owner (and the bot) is inside: out of voice, never moved anywhere else. */
  | { kind: "disconnect"; userId: string; roomId: string }
  /** A room nobody should keep: empty, its owner gone, a second room of one owner, or no owner. */
  | { kind: "delete"; roomId: string }
  /** The owner sits in the lobby while their room stands: back into it. */
  | { kind: "move"; userId: string; roomId: string }
  /** Someone waits in the lobby with no room: build one, then move them in. */
  | { kind: "create"; userId: string };

export interface World {
  /** The lobby rooms are given out from; null when it is unset, unknown, or not a voice channel in a category. */
  scope: Scope | null;
  /**
   * Earlier lobbies this process has seen: never rooms, even marked like one.
   * (The current lobby never is either.)
   */
  lobbies?: readonly string[];
  /** The guild's channels, in every category (any kind; only rooms are ever touched). */
  channels: readonly ChannelInfo[];
  /** Everyone in voice in the guild now. */
  seats: readonly Seat[];
  botId: string;
  /** The server's id, which is also its @everyone role's id (a room denies it Connect). */
  guildId: string;
  /** Whether new rooms may be built now (the bot is ready: connected, permitted, not refused). */
  canBuild: boolean;
  /** At most this many rooms at once (MAX_ROOMS). */
  cap?: number;
  /** People with a build or move in flight: their rooms and their wait are left alone this pass. */
  busy?: ReadonlySet<string>;
}

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * What to do so the rooms match the rules, from the caches alone. Actions
 * come in the order they should run: disconnects, then deletes, then moves
 * back, then new rooms.
 *
 * - Anyone in a room other than its owner and the bot is disconnected
 *   (bots too: nobody else may sit in a locked room).
 * - Every room in the server is guarded, wherever it sits and whether or not
 *   a lobby is set now (rooms are known by their marks, isRoom).
 * - A room whose owner is inside stays. So does one room, in the current
 *   lobby's category, of an owner who sits in the current lobby: they are
 *   moved back into it (one room per person). Every other room is deleted,
 *   after its people are disconnected: an empty room, a room whose owner
 *   left, an owner's second room, a room with no clear owner, and a room
 *   outside the lobby's category (an earlier lobby's) once its owner left.
 * - People in the current lobby with no room get a new one, sorted by id,
 *   while new rooms may be built and the rooms left stay under the cap. Bots
 *   and the bot itself never get one. At the cap they stay in the lobby.
 * - Every other channel, every lobby among them, is never touched.
 */
export function planReconcile(world: World): Action[] {
  const { scope, botId, guildId } = world;
  const busy = world.busy ?? new Set<string>();
  const cap = world.cap ?? MAX_ROOMS;
  // Only rooms in the lobby's category take anyone in; rooms elsewhere are guarded until they are gone.
  const current = (c: ChannelInfo) => !!scope && c.parentId === scope.parentId;
  // A lobby is never a room, not even an earlier one marked like a room.
  const lobbies = new Set([...(scope ? [scope.lobbyId] : []), ...(world.lobbies ?? [])]);
  const rooms = world.channels.filter((c) => !lobbies.has(c.id) && isRoom(c, botId, guildId)).sort((a, b) => byId(a.id, b.id));

  const inside = new Map<string, string[]>();
  for (const seat of world.seats) {
    if (seat.userId === botId) continue;
    const list = inside.get(seat.channelId) ?? [];
    if (!list.includes(seat.userId)) list.push(seat.userId);
    inside.set(seat.channelId, list);
  }
  const waiting = new Set(
    scope ? world.seats.filter((s) => s.channelId === scope.lobbyId && !s.bot && s.userId !== botId).map((s) => s.userId) : []
  );

  const disconnects: Action[] = [];
  const deletes: Action[] = [];
  const moves: Action[] = [];
  /** Owners whose room stays (they sit in it, are moved back into it, or are busy). */
  const housed = new Set<string>();
  let kept = 0;

  // First the rooms whose owner sits inside: an owner sits in one room at most.
  const owner = new Map(rooms.map((r) => [r.id, ownerOf(r, botId)]));
  for (const room of rooms) {
    const who = owner.get(room.id);
    if (who && (inside.get(room.id) ?? []).includes(who)) housed.add(who);
  }

  for (const room of rooms) {
    const who = owner.get(room.id) ?? null;
    const people = inside.get(room.id) ?? [];
    for (const userId of people.filter((u) => u !== who).sort(byId)) disconnects.push({ kind: "disconnect", userId, roomId: room.id });

    if (who && people.includes(who)) {
      kept += 1;
      continue;
    }
    // A build or move for this owner is under way: their room waits for it.
    if (who && busy.has(who)) {
      housed.add(who);
      kept += 1;
      continue;
    }
    if (who && !housed.has(who) && waiting.has(who) && current(room)) {
      housed.add(who);
      moves.push({ kind: "move", userId: who, roomId: room.id });
      kept += 1;
      continue;
    }
    deletes.push({ kind: "delete", roomId: room.id });
  }

  const creates: Action[] = [];
  if (scope && world.canBuild) {
    for (const userId of [...waiting].sort(byId)) {
      if (housed.has(userId) || busy.has(userId)) continue;
      if (kept >= cap) break;
      creates.push({ kind: "create", userId });
      kept += 1;
    }
  }
  return [...disconnects, ...deletes, ...moves, ...creates];
}
