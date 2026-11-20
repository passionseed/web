/**
 * @jest-environment node
 */
import { PermissionFlagsBits as P } from "discord.js";

import {
  BOT_ALLOW,
  BOT_NEEDS,
  CHAT_DENY,
  MAX_ROOMS,
  MEMBER,
  OWNER_ALLOW,
  ROLE,
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
  type World,
} from "../deepfire-state";

const NONE = BigInt(0);
const GUILD = "100000000000000001";
const BOT = "100000000000000009";
const CATEGORY = "200000000000000001";
const OTHER_CATEGORY = "200000000000000002";
const LOBBY = "300000000000000001";
const LOBBY2 = "300000000000000002";
const STUDENTS = "400000000000000001";
const MODS = "400000000000000002";
const A = "500000000000000001";
const B = "500000000000000002";
const C = "500000000000000003";
const ADULT = "500000000000000009";

const SCOPE: Scope = { lobbyId: LOBBY, parentId: CATEGORY };

const ow = (id: string, type: number, allow: bigint = NONE, deny: bigint = NONE): Overwrite => ({ id, type, allow, deny });

/** A room exactly as roomOverwrites builds it for `owner`. */
function room(id: string, owner: string | null, over: Partial<ChannelInfo> = {}): ChannelInfo {
  const overwrites = owner ? roomOverwrites([], GUILD, owner, BOT) : [ow(GUILD, ROLE, NONE, P.Connect), ow(BOT, MEMBER, BOT_ALLOW)];
  return { id, voice: true, parentId: CATEGORY, userLimit: 1, overwrites, ...over };
}

const lobby: ChannelInfo = { id: LOBBY, voice: true, parentId: CATEGORY, userLimit: 0, overwrites: [] };

const seat = (userId: string, channelId: string, bot = false): Seat => ({ userId, channelId, bot });

function plan(over: Partial<World>): Action[] {
  return planReconcile({ scope: SCOPE, channels: [lobby], seats: [], botId: BOT, guildId: GUILD, canBuild: true, ...over });
}

// ---------------------------------------------------------------------------
// The overwrites of a new room
// ---------------------------------------------------------------------------

describe("roomOverwrites", () => {
  const byId = (list: Overwrite[], id: string) => list.find((o) => o.id === id);

  it("copies every role overwrite with only View Channel kept, and denies Connect and the chat on each", () => {
    const list = roomOverwrites(
      [
        // @everyone cannot see the lobby; students can, and may speak; mods were given Move Members and Manage Channels.
        ow(GUILD, ROLE, NONE, P.ViewChannel),
        ow(STUDENTS, ROLE, P.ViewChannel | P.Connect | P.Speak),
        ow(MODS, ROLE, P.ViewChannel | P.MoveMembers | P.ManageChannels, P.Stream),
      ],
      GUILD,
      A,
      BOT
    );
    expect(byId(list, GUILD)).toEqual(ow(GUILD, ROLE, NONE, P.ViewChannel | P.Connect | CHAT_DENY));
    expect(byId(list, STUDENTS)).toEqual(ow(STUDENTS, ROLE, P.ViewChannel, P.Connect | CHAT_DENY));
    // Nothing but View Channel carries over: a role allowed Move Members on the lobby is not allowed it in a room.
    expect(byId(list, MODS)).toEqual(ow(MODS, ROLE, P.ViewChannel, P.Connect | CHAT_DENY));
  });

  it("adds a Connect and chat deny for @everyone when the lobby has none, keeping visibility as it is", () => {
    const list = roomOverwrites([ow(STUDENTS, ROLE, P.ViewChannel)], GUILD, A, BOT);
    expect(byId(list, GUILD)).toEqual(ow(GUILD, ROLE, NONE, P.Connect | CHAT_DENY));
    // View Channel is never denied where the lobby did not deny it: the room is closed, never hidden.
    for (const o of list.filter((x) => x.type === ROLE)) {
      expect(o.allow & P.Connect).toBe(NONE);
      expect(o.deny & P.Connect).toBe(P.Connect);
    }
    expect(list.filter((x) => x.type === ROLE).every((o) => (o.deny & P.ViewChannel) === NONE)).toBe(true);
  });

  it("gives exactly two members an overwrite: the owner and the bot, never the lobby's members", () => {
    const list = roomOverwrites([ow(ADULT, MEMBER, P.ViewChannel | P.Connect), ow(GUILD, ROLE)], GUILD, A, BOT);
    const members = list.filter((o) => o.type === MEMBER);
    expect(members).toEqual([ow(A, MEMBER, OWNER_ALLOW, CHAT_DENY), ow(BOT, MEMBER, BOT_ALLOW, NONE)]);
    expect(byId(list, ADULT)).toBeUndefined();
  });

  it("lets the owner see, connect, speak, stream and use voice activity, with the chat off for them too", () => {
    const owner = roomOverwrites([], GUILD, A, BOT).find((o) => o.id === A)!;
    for (const bit of [P.ViewChannel, P.Connect, P.Speak, P.Stream, P.UseVAD]) expect(owner.allow & bit).toBe(bit);
    for (const bit of [
      P.SendMessages,
      P.SendMessagesInThreads,
      P.CreatePublicThreads,
      P.CreatePrivateThreads,
      P.SendVoiceMessages,
      P.SendPolls,
      P.AddReactions,
    ]) {
      expect(owner.deny & bit).toBe(bit);
      expect(owner.allow & bit).toBe(NONE);
    }
    // The owner is never handed the bot's powers.
    expect(owner.allow & (P.MoveMembers | P.ManageChannels | P.ManageRoles)).toBe(NONE);
  });

  it("only sets permissions the bot is checked for on the category (Discord refuses others)", () => {
    const set = roomOverwrites([ow(GUILD, ROLE, P.ViewChannel), ow(STUDENTS, ROLE, P.ViewChannel)], GUILD, A, BOT).reduce(
      (bits, o) => bits | o.allow | o.deny,
      NONE
    );
    const checked = ROOM_BITS.reduce((bits, b) => bits | b, NONE);
    expect(set & ~checked).toBe(NONE);
    // The four the bot needs on the lobby and the category are among them.
    for (const bit of BOT_NEEDS) expect(checked & bit).toBe(bit);
  });

  it("builds a room the marker recognises, owned by the person it was built for", () => {
    const built = room("600000000000000001", A);
    expect(isRoom(built, BOT, GUILD)).toBe(true);
    expect(ownerOf(built, BOT)).toBe(A);
  });
});

// ---------------------------------------------------------------------------
// The marker and the owner
// ---------------------------------------------------------------------------

describe("isRoom", () => {
  const R = "600000000000000001";
  const built = roomOverwrites([], GUILD, A, BOT);
  const withBot = (bot: Overwrite) => room(R, A, { overwrites: [...built.filter((o) => o.id !== BOT), bot] });
  it.each<[string, ChannelInfo, boolean]>([
    ["a room the bot built", room(R, A), true],
    // Known by its own marks, wherever it sits: the lobby moved, was changed or cleared, or staff dragged the room.
    ["a room in another category (an earlier lobby's)", room(R, A, { parentId: OTHER_CATEGORY }), true],
    ["a room with no category", room(R, A, { parentId: null }), true],
    ["a user limit other than 1", room(R, A, { userLimit: 2 }), false],
    ["no user limit", room(R, A, { userLimit: 0 }), false],
    ["a stage or text channel", room(R, A, { voice: false }), false],
    ["no bot member overwrite (a staff channel)", room(R, A, { overwrites: roomOverwrites([], GUILD, A, BOT).filter((o) => o.id !== BOT) }), false],
    [
      "the bot's overwrite without Move Members",
      room(R, A, { overwrites: [ow(BOT, MEMBER, P.ViewChannel | P.ManageChannels), ow(A, MEMBER, OWNER_ALLOW)] }),
      false,
    ],
    [
      "a role (not a member) overwrite with the bot's id",
      room(R, A, { overwrites: [ow(BOT, ROLE, BOT_ALLOW), ow(A, MEMBER, OWNER_ALLOW)] }),
      false,
    ],
    ["the bot's overwrite allowing more than a room gives it", withBot(ow(BOT, MEMBER, BOT_ALLOW | P.Speak)), false],
    ["the bot's overwrite denying something", withBot(ow(BOT, MEMBER, BOT_ALLOW, P.Speak)), false],
    ["@everyone not denied Connect (anyone may join: no locked room)", room(R, A, { overwrites: built.filter((o) => o.id !== GUILD) }), false],
    [
      "@everyone allowed Connect",
      room(R, A, { overwrites: [...built.filter((o) => o.id !== GUILD), ow(GUILD, ROLE, P.Connect, P.ViewChannel)] }),
      false,
    ],
  ])("%s", (_label, channel, expected) => {
    expect(isRoom(channel, BOT, GUILD)).toBe(expected);
  });
});

describe("ownerOf", () => {
  const R = "600000000000000001";
  it.each<[string, Overwrite[], string | null]>([
    ["the one member allowed Connect besides the bot", roomOverwrites([], GUILD, A, BOT), A],
    ["nobody but the bot", [ow(BOT, MEMBER, BOT_ALLOW)], null],
    ["two members allowed Connect: ambiguous, so nobody", [...roomOverwrites([], GUILD, A, BOT), ow(ADULT, MEMBER, P.Connect)], null],
    ["a member overwrite that only views does not own", [...roomOverwrites([], GUILD, A, BOT), ow(ADULT, MEMBER, P.ViewChannel)], A],
    ["a role allowed Connect is never an owner", [ow(STUDENTS, ROLE, P.Connect), ow(BOT, MEMBER, BOT_ALLOW)], null],
  ])("%s", (_label, overwrites, expected) => {
    expect(ownerOf({ ...room(R, null), overwrites }, BOT)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// The reconcile plan
// ---------------------------------------------------------------------------

describe("planReconcile", () => {
  const R1 = "600000000000000001";
  const R2 = "600000000000000002";
  const R3 = "600000000000000003";
  const STAFF_VOICE = "600000000000000010";

  it("does nothing when everyone sits where they should", () => {
    expect(plan({ channels: [lobby, room(R1, A)], seats: [seat(A, R1)] })).toEqual([]);
  });

  it("deletes an empty room", () => {
    expect(plan({ channels: [lobby, room(R1, A)] })).toEqual([{ kind: "delete", roomId: R1 }]);
  });

  it("disconnects an intruder and keeps the room while its owner is inside", () => {
    expect(plan({ channels: [lobby, room(R1, A)], seats: [seat(A, R1), seat(ADULT, R1)] })).toEqual([
      { kind: "disconnect", userId: ADULT, roomId: R1 },
    ]);
  });

  it("disconnects another bot too, but never the bot itself", () => {
    expect(plan({ channels: [lobby, room(R1, A)], seats: [seat(A, R1), seat(BOT, R1, true), seat(C, R1, true)] })).toEqual([
      { kind: "disconnect", userId: C, roomId: R1 },
    ]);
  });

  it("when the owner is gone, disconnects everyone else first, then deletes the room", () => {
    // Sorted by id, so the same room always gives the same plan.
    expect(plan({ channels: [lobby, room(R1, A)], seats: [seat(ADULT, R1), seat(B, R1), seat(A, STAFF_VOICE)] })).toEqual([
      { kind: "disconnect", userId: B, roomId: R1 },
      { kind: "disconnect", userId: ADULT, roomId: R1 },
      { kind: "delete", roomId: R1 },
    ]);
  });

  it("closes a room with no clear owner, everyone in it out", () => {
    const edited = { ...room(R1, A), overwrites: [...roomOverwrites([], GUILD, A, BOT), ow(ADULT, MEMBER, P.Connect)] };
    expect(plan({ channels: [lobby, edited], seats: [seat(A, R1)] })).toEqual([
      { kind: "disconnect", userId: A, roomId: R1 },
      { kind: "delete", roomId: R1 },
    ]);
  });

  it("gives someone waiting in the lobby a new room", () => {
    expect(plan({ seats: [seat(A, LOBBY)] })).toEqual([{ kind: "create", userId: A }]);
  });

  it("moves an owner who sits in the lobby back into their own room instead of building a second", () => {
    expect(plan({ channels: [lobby, room(R1, A)], seats: [seat(A, LOBBY)] })).toEqual([{ kind: "move", userId: A, roomId: R1 }]);
  });

  it("clears intruders out of a room before moving its owner back in", () => {
    expect(plan({ channels: [lobby, room(R1, A)], seats: [seat(A, LOBBY), seat(ADULT, R1)] })).toEqual([
      { kind: "disconnect", userId: ADULT, roomId: R1 },
      { kind: "move", userId: A, roomId: R1 },
    ]);
  });

  it("keeps one room per person: a second room of the same owner goes", () => {
    expect(plan({ channels: [lobby, room(R1, A), room(R2, A)], seats: [seat(A, R2)] })).toEqual([{ kind: "delete", roomId: R1 }]);
    expect(plan({ channels: [lobby, room(R1, A), room(R2, A)], seats: [seat(A, LOBBY)] })).toEqual([
      { kind: "delete", roomId: R2 },
      { kind: "move", userId: A, roomId: R1 },
    ]);
  });

  it("never gives a bot, or the bot itself, a room", () => {
    expect(plan({ seats: [seat(C, LOBBY, true), seat(BOT, LOBBY)] })).toEqual([]);
  });

  it("builds nothing while rooms cannot be built, but still guards the rooms that stand", () => {
    expect(
      plan({ canBuild: false, channels: [lobby, room(R1, A), room(R2, B)], seats: [seat(C, LOBBY), seat(A, R1), seat(ADULT, R1)] })
    ).toEqual([
      { kind: "disconnect", userId: ADULT, roomId: R1 },
      { kind: "delete", roomId: R2 },
    ]);
  });

  it("stops at the cap: newcomers stay in the lobby, sorted by id, and a freed room makes space", () => {
    expect(plan({ cap: 2, channels: [lobby, room(R1, A)], seats: [seat(A, R1), seat(C, LOBBY), seat(B, LOBBY)] })).toEqual([
      { kind: "create", userId: B },
    ]);
    // A room closing in the same pass no longer counts.
    expect(plan({ cap: 1, channels: [lobby, room(R1, A)], seats: [seat(B, LOBBY)] })).toEqual([
      { kind: "delete", roomId: R1 },
      { kind: "create", userId: B },
    ]);
    expect(MAX_ROOMS).toBe(40);
    const full = Array.from({ length: MAX_ROOMS }, (_, k) => room(`61${String(k).padStart(16, "0")}`, `71${String(k).padStart(16, "0")}`));
    const seated = full.map((r) => seat(ownerOf(r, BOT)!, r.id));
    expect(plan({ channels: [lobby, ...full], seats: [...seated, seat(A, LOBBY)] })).toEqual([]);
  });

  it("never touches the lobby or other channels in the category", () => {
    const staff: ChannelInfo = { id: STAFF_VOICE, voice: true, parentId: CATEGORY, userLimit: 1, overwrites: [ow(ADULT, MEMBER, P.Connect)] };
    const markedLobby: ChannelInfo = { ...room(LOBBY, A), userLimit: 1 };
    expect(plan({ channels: [markedLobby, staff], seats: [seat(ADULT, STAFF_VOICE), seat(B, STAFF_VOICE)] })).toEqual([]);
    expect(plan({ channels: [markedLobby, staff] })).toEqual([]);
  });

  it("leaves people with a build or move in flight alone", () => {
    const busy = new Set([A]);
    // Their freshly built room is still empty in the cache, and they still sit in the lobby: no delete, no second room.
    expect(plan({ busy, channels: [lobby, room(R1, A)], seats: [seat(A, LOBBY)] })).toEqual([]);
    expect(plan({ busy, seats: [seat(A, LOBBY)] })).toEqual([]);
    // An intruder is still removed from their room.
    expect(plan({ busy, channels: [lobby, room(R1, A)], seats: [seat(ADULT, R1)] })).toEqual([
      { kind: "disconnect", userId: ADULT, roomId: R1 },
    ]);
  });

  it("with no lobby (unset, cleared, or not read yet), builds nothing and gives nothing out, but still guards every room", () => {
    const none = (over: Partial<World>) => planReconcile({ scope: null, channels: [lobby, room(R1, A)], seats: [], botId: BOT, guildId: GUILD, canBuild: true, ...over });
    expect(none({ seats: [seat(B, LOBBY)] })).toEqual([{ kind: "delete", roomId: R1 }]);
    // Its owner inside with an adult: the adult goes, the owner stays.
    expect(none({ seats: [seat(A, R1), seat(ADULT, R1)] })).toEqual([{ kind: "disconnect", userId: ADULT, roomId: R1 }]);
  });

  it("guards a room outside the lobby's category (an earlier lobby's) until it is gone, but never moves anyone into one", () => {
    const oldRoom = room(R3, A, { parentId: OTHER_CATEGORY });
    // Nothing in memory says where the lobby was: after a restart the room is still known by its marks.
    const world = { scope: SCOPE, channels: [lobby, oldRoom] };
    expect(plan({ ...world, seats: [seat(A, R3), seat(ADULT, R3)] })).toEqual([{ kind: "disconnect", userId: ADULT, roomId: R3 }]);
    expect(plan({ ...world, seats: [] })).toEqual([{ kind: "delete", roomId: R3 }]);
    // Its owner in the new lobby: the old room goes, a new one is built where the lobby is now.
    expect(plan({ ...world, seats: [seat(A, LOBBY)] })).toEqual([
      { kind: "delete", roomId: R3 },
      { kind: "create", userId: A },
    ]);
  });

  it("never counts an earlier lobby as a room, even marked like one", () => {
    const oldLobby: ChannelInfo = { ...room(LOBBY2, A), userLimit: 1 };
    expect(plan({ lobbies: [LOBBY2], channels: [lobby, oldLobby] })).toEqual([]);
    expect(plan({ lobbies: [LOBBY2], channels: [lobby, oldLobby], seats: [seat(ADULT, LOBBY2)] })).toEqual([]);
  });

  it("keeps guarding a room after the lobby moves to another category", () => {
    const moved: Scope = { lobbyId: LOBBY2, parentId: OTHER_CATEGORY };
    expect(plan({ scope: moved, channels: [lobby, room(R1, A)], seats: [seat(A, R1), seat(ADULT, R1)] })).toEqual([
      { kind: "disconnect", userId: ADULT, roomId: R1 },
    ]);
    expect(plan({ scope: moved, channels: [lobby, room(R1, A)] })).toEqual([{ kind: "delete", roomId: R1 }]);
  });
});
