/**
 * @jest-environment node
 */
import { EventEmitter } from "node:events";

import { ChannelType, DiscordAPIError, Events, MessageFlags, PermissionFlagsBits as P, type Client } from "discord.js";

import { COMMAND_HANDLERS, registerShiftQuests } from "..";
import { QuestDbError, type QuestApi, type Session } from "../api";
import { questCommands } from "../commands";
import type { Ctx } from "../context";
import { DEEPFIRE_SCHEMA, lobbyProblem, refreshDeepFire, startDeepFire } from "../deepfire";
import { CHAT_DENY, MEMBER, OWNER_ALLOW, ROLE, ROOM_BITS, roomOverwrites, type Overwrite } from "../deepfire-state";
import { DEEPFIRE, DEEPFIRE_ADMIN } from "../deepfireCopy";
import { statusView } from "../handlers/admin";
import { renderView } from "../ui";
import { bodyText } from "../test-helpers/view";
import { createRolePool } from "../../pg";

jest.mock("../../pg", () => ({ createRolePool: jest.fn() }));

const NONE = BigInt(0);
const GUILD = "100000000000000001";
const BOT = "100000000000000009";
const CATEGORY = "200000000000000001";
const OTHER_CATEGORY = "200000000000000002";
const LOBBY = "300000000000000001";
const LOBBY2 = "300000000000000002";
const CAMPFIRE = "300000000000000003";
const STAFF_VOICE = "300000000000000004";
const STUDENTS = "400000000000000001";
const A = "500000000000000001";
const B = "500000000000000002";
const C = "500000000000000003";
const ADULT = "500000000000000009";
const IDS = [GUILD, CATEGORY, OTHER_CATEGORY, LOBBY, LOBBY2, CAMPFIRE, STAFF_VOICE, A, B, C, ADULT];

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const settle = async (rounds = 12) => {
  for (let k = 0; k < rounds; k++) await flush();
};

const apiError = (code: number, status: number, message: string) =>
  new DiscordAPIError({ message, code }, code, status, "PATCH", "/guilds/x/members/y", {});
const missingPermissions = () => apiError(50013, 403, "Missing Permissions");
const notInVoice = () => apiError(40032, 400, "Target user is not connected to voice.");

// ---------------------------------------------------------------------------
// A fake gateway: one guild, its channel and voice caches, and the REST calls
// the deep fire makes (create a channel, edit a member's voice channel,
// delete a channel). Discord's gateway event for a move arrives after the
// REST call resolves, as in real life.
// ---------------------------------------------------------------------------

interface FakeOverwrite {
  id: string;
  type: number;
  allow: { bitfield: bigint };
  deny: { bitfield: bigint };
}

interface FakeChannel {
  id: string;
  type: ChannelType;
  parentId: string | null;
  userLimit: number;
  name?: string;
  permissionOverwrites: { cache: Map<string, FakeOverwrite> };
  permissionsFor: (who: unknown) => { has: (bits: bigint[]) => boolean };
  delete: jest.Mock;
}

interface FakeState {
  id: string;
  channelId: string | null;
  guild: unknown;
  member: { user: { bot: boolean } } | null;
}

const LOBBY_OVERWRITES: Overwrite[] = [
  { id: GUILD, type: ROLE, allow: NONE, deny: P.ViewChannel },
  { id: STUDENTS, type: ROLE, allow: P.ViewChannel | P.Connect | P.Speak, deny: NONE },
];

function fakeWorld() {
  /** What the bot holds on the lobby and on its category (everything a room sets, by default). */
  const botOnLobby = new Set<bigint>(ROOM_BITS);
  const botOnCategory = new Set<bigint>(ROOM_BITS);
  const channels = new Map<string, FakeChannel>();
  const states = new Map<string, FakeState>();
  let next = 0;
  const newId = () => `7000000000000${String((next += 1)).padStart(5, "0")}`;
  /** The next create waits for this. */
  let createHold: Promise<void> | null = null;
  const createFailures: Error[] = [];
  /** Runs inside the next create, before it resolves (someone leaves meanwhile). */
  let duringCreate: (() => void) | null = null;
  /** Edits of a person's voice channel that fail: once, or every time. */
  const editFailures: { userId: string; error: Error; always: boolean }[] = [];
  /** The next edit of a person's voice channel waits for this. */
  const editHolds = new Map<string, Promise<void>>();

  const client = Object.assign(new EventEmitter(), { user: { id: BOT }, guilds: { cache: new Map<string, unknown>() } });

  function channel(id: string, type: ChannelType, parentId: string | null, userLimit = 0, overwrites: Overwrite[] = [], perms?: Set<bigint>) {
    const ch: FakeChannel = {
      id,
      type,
      parentId,
      userLimit,
      permissionOverwrites: {
        cache: new Map(overwrites.map((o) => [o.id, { id: o.id, type: o.type, allow: { bitfield: o.allow }, deny: { bitfield: o.deny } }])),
      },
      // The bot is the only one asked about here: rooms give it everything through its own overwrite.
      permissionsFor: () => ({ has: (bits: bigint[]) => bits.every((b) => (perms ? perms.has(b) : true)) }),
      delete: jest.fn(async () => {
        channels.delete(id);
        // Discord disconnects everyone in a voice channel it deletes; the events come after the REST call.
        for (const state of [...states.values()]) {
          if (state.channelId === id) setImmediate(() => states.get(state.id)?.channelId === id && move(state.id, null));
        }
      }),
    };
    channels.set(id, ch);
    return ch;
  }

  const guild = {
    id: GUILD,
    available: true,
    members: {
      me: { id: BOT },
      edit: jest.fn(async (userId: string, o: { channel: string | null; reason?: string }) => {
        const hold = editHolds.get(userId);
        if (hold) {
          editHolds.delete(userId);
          await hold;
        }
        const failure = editFailures.findIndex((f) => f.userId === userId);
        if (failure >= 0) {
          const { error, always } = editFailures[failure];
          if (!always) editFailures.splice(failure, 1);
          // A refusal is a REST round trip too: a retry loop shows up as many calls, never a frozen test.
          await flush();
          throw error;
        }
        const state = states.get(userId);
        if (!state?.channelId) throw notInVoice();
        if (o.channel !== null && !channels.has(o.channel)) throw apiError(10003, 404, "Unknown Channel");
        setImmediate(() => move(userId, o.channel));
        return { id: userId };
      }),
    },
    channels: {
      cache: channels,
      create: jest.fn(
        async (o: { name: string; type: ChannelType; parent: string; userLimit: number; permissionOverwrites: Overwrite[]; reason?: string }) => {
          if (createHold) {
            const hold = createHold;
            createHold = null;
            await hold;
          }
          const failure = createFailures.shift();
          if (failure) throw failure;
          duringCreate?.();
          duringCreate = null;
          const ch = channel(newId(), o.type, o.parent, o.userLimit, o.permissionOverwrites);
          ch.name = o.name;
          return ch;
        }
      ),
    },
    voiceStates: { cache: states },
  };
  client.guilds.cache.set(GUILD, guild);

  channel(CATEGORY, ChannelType.GuildCategory, null, 0, [], botOnCategory);
  channel(OTHER_CATEGORY, ChannelType.GuildCategory, null, 0, [], new Set(ROOM_BITS));
  channel(LOBBY, ChannelType.GuildVoice, CATEGORY, 0, LOBBY_OVERWRITES, botOnLobby);
  channel(LOBBY2, ChannelType.GuildVoice, OTHER_CATEGORY, 0, LOBBY_OVERWRITES, new Set(ROOM_BITS));
  channel(CAMPFIRE, ChannelType.GuildVoice, OTHER_CATEGORY);
  // A staff voice channel in the lobby's category: never touched.
  channel(STAFF_VOICE, ChannelType.GuildVoice, CATEGORY, 1, [{ id: ADULT, type: MEMBER, allow: P.Connect, deny: NONE }]);

  /** Moves someone the way Discord would: the cache changes, then the event fires. */
  function move(id: string, to: string | null, opts: { bot?: boolean; guildId?: string } = {}) {
    const g = opts.guildId ? { ...guild, id: opts.guildId } : guild;
    const member = { user: { bot: opts.bot ?? false } };
    const before = states.get(id) ?? { id, channelId: null, guild: g, member };
    const after: FakeState = { id, channelId: to, guild: g, member };
    if (!opts.guildId) {
      if (to) states.set(id, after);
      else states.delete(id);
    }
    client.emit(Events.VoiceStateUpdate, before, after);
  }

  /** Someone already in voice (no event): before a restart, or an admin who walked in unseen. */
  function seat(id: string, channelId: string, bot = false) {
    states.set(id, { id, channelId, guild, member: { user: { bot } } });
  }

  /** A room the bot built earlier (as roomOverwrites builds it), in `parent`. */
  function addRoom(owner: string, parent = CATEGORY): string {
    const id = newId();
    channel(id, ChannelType.GuildVoice, parent, 1, roomOverwrites(LOBBY_OVERWRITES, GUILD, owner, BOT));
    return id;
  }

  const rooms = () => [...channels.values()].filter((c) => c.name === DEEPFIRE.roomName || (c.userLimit === 1 && c.id !== STAFF_VOICE));
  const where = (id: string) => states.get(id)?.channelId ?? null;

  return {
    client,
    asClient: client as unknown as Client,
    guild,
    channels,
    states,
    botOnLobby,
    botOnCategory,
    move,
    seat,
    addRoom,
    rooms,
    where,
    holdCreate() {
      let release!: () => void;
      createHold = new Promise<void>((resolve) => (release = resolve));
      return () => release();
    },
    failCreate(error: Error) {
      createFailures.push(error);
    },
    onCreate(run: () => void) {
      duringCreate = run;
    },
    /** Discord refuses to move or disconnect this person: once, or every time. */
    failEdit(userId: string, error: Error, always = false) {
      editFailures.push({ userId, error, always });
    },
    /** The next move or disconnect of this person waits until released. */
    holdEdit(userId: string) {
      let release!: () => void;
      editHolds.set(userId, new Promise<void>((resolve) => (release = resolve)));
      return () => release();
    },
  };
}

function fakeApi(o: { schema?: number; lobby?: string | null } = {}) {
  const setting = { schema: o.schema ?? DEEPFIRE_SCHEMA, lobby: o.lobby === undefined ? LOBBY : o.lobby };
  const calls: unknown[][] = [];
  const api = {
    call: jest.fn(async (fn: string, ...args: unknown[]) => {
      calls.push([fn, ...args]);
      if (fn === "shift_quest_schema_version") return setting.schema;
      if (fn === "shift_quest_deepfire_beat") return { channel_id: setting.lobby };
      throw new Error(`unexpected ${fn}`);
    }),
    rows: jest.fn(),
  };
  const beats = () => calls.filter((c) => c[0] === "shift_quest_deepfire_beat").map((c) => c[2]);
  return { api: api as unknown as QuestApi, calls, setting, beats };
}

describe("startDeepFire", () => {
  let logs: jest.SpyInstance;
  let warns: jest.SpyInstance;
  let errors: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["setImmediate"] });
    logs = jest.spyOn(console, "log").mockImplementation(() => undefined);
    warns = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    errors = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    // Logs carry counts and short codes only: never an id of a person, a channel or the server.
    const logged = [...logs.mock.calls, ...warns.mock.calls, ...errors.mock.calls].flat().join("\n");
    for (const id of IDS) expect(logged).not.toContain(id);
    expect(logged).not.toContain(DEEPFIRE.roomName);
    jest.useRealTimers();
    logs.mockRestore();
    warns.mockRestore();
    errors.mockRestore();
  });

  type World = ReturnType<typeof fakeWorld>;

  async function started(
    o: {
      schema?: number;
      lobby?: string | null;
      connected?: () => boolean;
      cap?: number;
      before?: (w: World) => void;
      db?: (d: ReturnType<typeof fakeApi>) => void;
    } = {}
  ) {
    const world = fakeWorld();
    const db = fakeApi({ schema: o.schema, lobby: o.lobby });
    o.before?.(world);
    o.db?.(db);
    const deepfire = startDeepFire(world.asClient, db.api, {
      guildId: GUILD,
      connected: o.connected ?? (() => true),
      schema: o.schema ?? DEEPFIRE_SCHEMA,
      cap: o.cap,
    });
    await settle();
    return { ...world, ...db, deepfire };
  }

  it("at start, reads the lobby and says ready once the bot can build rooms there", async () => {
    const s = await started();
    // The first beat knows no lobby yet; the answer names one, which is checked and beaten again.
    expect(s.beats()).toEqual([false, true]);
    expect(s.deepfire.status()).toEqual({ on: true, lobby: LOBBY, ready: true });
    expect(logs).toHaveBeenCalledWith("[shift-quests] deep fire ready");
    await s.deepfire.stop();
  });

  it("builds a room for whoever joins the lobby, in the lobby's category, locked, and moves them in", async () => {
    const s = await started();
    s.move(A, LOBBY);
    await settle();
    expect(s.guild.channels.create).toHaveBeenCalledTimes(1);
    const made = s.guild.channels.create.mock.calls[0][0];
    expect(made).toMatchObject({ name: "🔥 กองไฟโฟกัส", type: ChannelType.GuildVoice, parent: CATEGORY, userLimit: 1 });
    // The server's default bitrate.
    expect((made as Record<string, unknown>).bitrate).toBeUndefined();
    const ow = made.permissionOverwrites as Overwrite[];
    // Locked but visible: the lobby's visibility, Connect and chat denied on every role, two members only.
    expect(ow.find((o) => o.id === GUILD)).toEqual({ id: GUILD, type: ROLE, allow: NONE, deny: P.ViewChannel | P.Connect | CHAT_DENY });
    expect(ow.find((o) => o.id === STUDENTS)).toEqual({ id: STUDENTS, type: ROLE, allow: P.ViewChannel, deny: P.Connect | CHAT_DENY });
    expect(ow.find((o) => o.id === A)).toEqual({ id: A, type: MEMBER, allow: OWNER_ALLOW, deny: CHAT_DENY });
    expect(ow.filter((o) => o.type === MEMBER).map((o) => o.id)).toEqual([A, BOT]);
    const room = s.rooms()[0];
    expect(s.guild.members.edit).toHaveBeenCalledWith(A, { channel: room.id, reason: DEEPFIRE.reason.move });
    expect(s.where(A)).toBe(room.id);
    // Settled: nothing more happens to a room whose owner sits in it.
    expect(room.delete).not.toHaveBeenCalled();
    expect(logs).toHaveBeenCalledWith("[shift-quests] deep fire: 1 room(s) built, 1 moved in");
    await s.deepfire.stop();
  });

  it("never builds a second room when the join arrives twice while the first is being built", async () => {
    const s = await started();
    const release = s.holdCreate();
    s.move(A, LOBBY);
    await settle();
    // The same join again (a replayed event), and someone hopping out and back in.
    s.client.emit(Events.VoiceStateUpdate, { id: A, channelId: null, guild: s.guild }, s.states.get(A));
    s.move(A, CAMPFIRE);
    s.move(A, LOBBY);
    await settle();
    release();
    await settle(20);
    expect(s.guild.channels.create).toHaveBeenCalledTimes(1);
    expect(s.rooms()).toHaveLength(1);
    expect(s.where(A)).toBe(s.rooms()[0].id);
    await s.deepfire.stop();
  });

  it("moves an owner who steps back into the lobby into their own room, never a second one", async () => {
    const s = await started({ before: (w) => w.seat(A, w.addRoom(A)) });
    const room = s.rooms()[0];
    s.move(A, LOBBY);
    await settle();
    expect(s.guild.channels.create).not.toHaveBeenCalled();
    expect(room.delete).not.toHaveBeenCalled();
    expect(s.where(A)).toBe(room.id);
    await s.deepfire.stop();
  });

  it("disconnects anyone else who gets into a room at once, and never moves them anywhere", async () => {
    const s = await started({ before: (w) => w.seat(A, w.addRoom(A)) });
    const room = s.rooms()[0];
    // An Administrator ignores the overwrites; a moderator could drag someone in. The bot is the lock.
    s.move(ADULT, room.id);
    await settle();
    expect(s.guild.members.edit).toHaveBeenCalledWith(ADULT, { channel: null, reason: DEEPFIRE.reason.remove });
    expect(s.guild.members.edit.mock.calls.filter(([id]) => id === ADULT)).toEqual([[ADULT, { channel: null, reason: DEEPFIRE.reason.remove }]]);
    expect(s.where(ADULT)).toBeNull();
    expect(s.where(A)).toBe(room.id);
    expect(room.delete).not.toHaveBeenCalled();
    expect(logs).toHaveBeenCalledWith("[shift-quests] deep fire: 1 removed from a room");
    await s.deepfire.stop();
  });

  it("deletes a room the moment its owner leaves it empty", async () => {
    const s = await started({ before: (w) => w.seat(A, w.addRoom(A)) });
    const room = s.rooms()[0];
    s.move(A, null);
    await settle();
    expect(room.delete).toHaveBeenCalledWith(DEEPFIRE.reason.close);
    expect(s.channels.has(room.id)).toBe(false);
    await s.deepfire.stop();
  });

  it("when the owner leaves while someone else is inside, disconnects them and deletes the room", async () => {
    const s = await started({ before: (w) => w.seat(A, w.addRoom(A)) });
    const room = s.rooms()[0];
    // In before the bot could react (no event seen yet).
    s.seat(ADULT, room.id);
    s.move(A, CAMPFIRE);
    await settle();
    expect(s.guild.members.edit).toHaveBeenCalledWith(ADULT, { channel: null, reason: DEEPFIRE.reason.remove });
    expect(room.delete).toHaveBeenCalled();
    // The owner is left where they went.
    expect(s.where(A)).toBe(CAMPFIRE);
    await s.deepfire.stop();
  });

  it("closes the new room when its owner left before the move", async () => {
    const s = await started();
    s.onCreate(() => s.states.delete(A));
    s.move(A, LOBBY);
    await settle();
    expect(s.guild.channels.create).toHaveBeenCalledTimes(1);
    expect(s.rooms()).toHaveLength(0);
    // They left: no warning for that.
    expect(warns).not.toHaveBeenCalled();
    await s.deepfire.stop();
  });

  it("without the permissions it needs, builds nothing and tells the database it is not ready", async () => {
    const s = await started({ before: (w) => w.botOnCategory.delete(P.MoveMembers) });
    // The first beat knows no lobby yet; the lobby it names checks out not ready either, so no second beat.
    expect(s.beats()).toEqual([false]);
    expect(s.deepfire.status().ready).toBe(false);
    expect(logs).toHaveBeenCalledWith("[shift-quests] deep fire not ready (bot_perms)");
    s.move(A, LOBBY);
    await settle();
    expect(s.guild.channels.create).not.toHaveBeenCalled();
    // People simply sit in the lobby, an ordinary voice channel.
    expect(s.where(A)).toBe(LOBBY);

    // Staff fix it: the next heartbeat says ready and the person waiting gets their room.
    s.botOnCategory.add(P.MoveMembers);
    s.calls.length = 0;
    await jest.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(s.beats()).toEqual([true]);
    expect(s.guild.channels.create).toHaveBeenCalledTimes(1);
    expect(s.where(A)).toBe(s.rooms()[0].id);
    await s.deepfire.stop();
  });

  it.each<[string, (w: ReturnType<typeof fakeWorld>) => void]>([
    ["View Channel on the lobby", (w) => w.botOnLobby.delete(P.ViewChannel)],
    ["Connect on the lobby", (w) => w.botOnLobby.delete(P.Connect)],
    ["Manage Channels on the lobby", (w) => w.botOnLobby.delete(P.ManageChannels)],
    ["Move Members on the lobby", (w) => w.botOnLobby.delete(P.MoveMembers)],
    ["Manage Channels on the category", (w) => w.botOnCategory.delete(P.ManageChannels)],
    ["a permission a room denies (Create Polls) on the category", (w) => w.botOnCategory.delete(P.SendPolls)],
    ["the category itself (not cached)", (w) => w.channels.delete(CATEGORY)],
    ["a parent category", (w) => (w.channels.get(LOBBY)!.parentId = null)],
    ["a voice lobby (a stage)", (w) => (w.channels.get(LOBBY)!.type = ChannelType.GuildStageVoice)],
    ["the bot's member (not cached)", (w) => ((w.guild.members as { me: unknown }).me = null)],
  ])("fails closed without %s", async (_label, breakIt) => {
    const s = await started({ before: breakIt });
    expect(s.beats()).toEqual([false]);
    expect(s.deepfire.status()).toEqual({ on: true, lobby: LOBBY, ready: false });
    s.move(A, LOBBY);
    await settle();
    expect(s.guild.channels.create).not.toHaveBeenCalled();
    await s.deepfire.stop();
  });

  it("a Discord 'missing permissions' stops building, tells the database it is not ready, until the next heartbeat checks again", async () => {
    const s = await started();
    s.failCreate(missingPermissions());
    s.move(A, LOBBY);
    await settle();
    expect(warns.mock.calls.flat().join(" ")).toContain("discord 50013 (403)");
    s.move(B, LOBBY);
    await settle();
    expect(s.guild.channels.create).toHaveBeenCalledTimes(1);

    // The heartbeat reports the refusal (the web greys its button), then checks again; both people waiting get their rooms.
    s.calls.length = 0;
    await jest.advanceTimersByTimeAsync(60_000);
    await settle(20);
    expect(s.beats()).toEqual([false]);
    expect(s.deepfire.status().ready).toBe(false);
    expect(s.guild.channels.create).toHaveBeenCalledTimes(3);
    expect(s.rooms()).toHaveLength(2);
    expect(s.where(A)).not.toBe(LOBBY);
    expect(s.where(B)).not.toBe(LOBBY);
    // Built without a refusal: the next heartbeat says ready again.
    await jest.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(s.beats()).toEqual([false, true]);
    expect(s.deepfire.status().ready).toBe(true);
    await s.deepfire.stop();
  });

  it("at the cap, newcomers stay in the lobby until a room closes", async () => {
    const s = await started({ cap: 1, before: (w) => w.seat(A, w.addRoom(A)) });
    s.move(B, LOBBY);
    await settle();
    expect(s.guild.channels.create).not.toHaveBeenCalled();
    expect(s.where(B)).toBe(LOBBY);
    s.move(A, null);
    await settle();
    expect(s.guild.channels.create).toHaveBeenCalledTimes(1);
    expect(s.where(B)).toBe(s.rooms()[0].id);
    await s.deepfire.stop();
  });

  it("after a restart, picks every room up from the rooms themselves", async () => {
    let r: Record<string, string> = {};
    const s = await started({
      connected: () => true,
      before: (w) => {
        r = { a: w.addRoom(A), b: w.addRoom(B), c: w.addRoom(C) };
        w.seat(A, r.a);
        // B's room is empty; C left theirs with an adult still inside.
        w.seat(ADULT, r.c);
        w.seat("500000000000000004", LOBBY);
        // Staff talk in their own channel in the same category: never touched.
        w.seat("500000000000000005", STAFF_VOICE);
        w.seat("500000000000000006", STAFF_VOICE);
      },
    });
    expect(s.guild.members.edit).toHaveBeenCalledWith(ADULT, { channel: null, reason: DEEPFIRE.reason.remove });
    expect(s.channels.has(r.a)).toBe(true);
    expect(s.channels.has(r.b)).toBe(false);
    expect(s.channels.has(r.c)).toBe(false);
    expect(s.guild.channels.create).toHaveBeenCalledTimes(1);
    expect(s.where("500000000000000004")).not.toBe(LOBBY);
    expect(s.channels.has(STAFF_VOICE)).toBe(true);
    expect(s.where("500000000000000005")).toBe(STAFF_VOICE);
    expect(s.channels.get(LOBBY)?.delete).not.toHaveBeenCalled();
    await s.deepfire.stop();
  });

  it("reconciles on a gateway ready and resume, and every five minutes", async () => {
    const s = await started();
    // Missed while disconnected: someone waits in the lobby, nobody saw them come.
    s.seat(A, LOBBY);
    s.client.emit(Events.ShardResume, 0, 0);
    await settle();
    expect(s.guild.channels.create).toHaveBeenCalledTimes(1);

    s.seat(B, LOBBY);
    s.client.emit(Events.ShardReady, 0);
    await settle();
    expect(s.guild.channels.create).toHaveBeenCalledTimes(2);

    // A lost event: an adult in A's room. The 5-minute reconcile catches it.
    s.seat(ADULT, s.where(A)!);
    await jest.advanceTimersByTimeAsync(4 * 60_000);
    await settle();
    expect(s.guild.members.edit).not.toHaveBeenCalledWith(ADULT, expect.anything());
    await jest.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(s.guild.members.edit).toHaveBeenCalledWith(ADULT, { channel: null, reason: DEEPFIRE.reason.remove });
    await s.deepfire.stop();
  });

  it("ignores another server, a mute or camera, channels outside the lobby's category, and does no database call for them", async () => {
    const s = await started();
    s.calls.length = 0;
    s.move(A, LOBBY, { guildId: "999999999999999999" });
    s.move(B, CAMPFIRE);
    s.move(B, CAMPFIRE);
    s.move(B, null);
    await settle();
    expect(s.guild.channels.create).not.toHaveBeenCalled();
    expect(s.guild.members.edit).not.toHaveBeenCalled();
    expect(s.calls).toEqual([]);
    await s.deepfire.stop();
  });

  it("never gives a bot a room", async () => {
    const s = await started();
    s.move(C, LOBBY, { bot: true });
    await settle();
    expect(s.guild.channels.create).not.toHaveBeenCalled();
    await s.deepfire.stop();
  });

  it("while the gateway is disconnected, beats ready=false and builds nothing", async () => {
    let connected = true;
    const s = await started({ connected: () => connected });
    connected = false;
    s.calls.length = 0;
    await jest.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(s.beats()).toEqual([false]);
    connected = true;
    await jest.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(s.beats()).toEqual([false, true]);
    await s.deepfire.stop();
  });

  it("follows a changed lobby, and guards the old lobby's rooms until they are gone", async () => {
    const s = await started({ before: (w) => w.seat(A, w.addRoom(A)) });
    const old = s.rooms()[0];
    s.setting.lobby = LOBBY2;
    await jest.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(s.deepfire.status().lobby).toBe(LOBBY2);
    // Still guarded: an intruder is removed; the owner stays.
    s.move(ADULT, old.id);
    await settle();
    expect(s.where(ADULT)).toBeNull();
    expect(s.where(A)).toBe(old.id);
    // The old room goes once its owner leaves.
    s.move(A, null);
    await settle();
    expect(old.delete).toHaveBeenCalled();
    // New rooms are built where the lobby is now.
    s.move(B, LOBBY2);
    await settle();
    expect(s.guild.channels.create.mock.calls.at(-1)?.[0]).toMatchObject({ parent: OTHER_CATEGORY });
    // The old lobby is an ordinary voice channel now.
    s.move(C, LOBBY);
    await settle();
    expect(s.guild.channels.create).toHaveBeenCalledTimes(1);
    await s.deepfire.stop();
  });

  it("reads a lobby just set by /admin at once and gives whoever already waits there a room, before the next heartbeat", async () => {
    const s = await started({ lobby: null, before: (w) => w.seat(A, LOBBY) });
    expect(s.guild.channels.create).not.toHaveBeenCalled();
    s.setting.lobby = LOBBY;
    await refreshDeepFire();
    await settle();
    expect(s.deepfire.status()).toEqual({ on: true, lobby: LOBBY, ready: true });
    expect(s.guild.channels.create).toHaveBeenCalledTimes(1);
    expect(s.where(A)).toBe(s.rooms()[0].id);
    await s.deepfire.stop();
  });

  it("a refresh after stop does nothing", async () => {
    const s = await started();
    await s.deepfire.stop();
    const before = s.calls.length;
    await refreshDeepFire();
    await settle();
    expect(s.calls.length).toBe(before);
  });

  it("with the lobby cleared, builds nothing and says not ready", async () => {
    const s = await started({ lobby: null });
    expect(s.beats()).toEqual([false]);
    s.move(A, LOBBY);
    await settle();
    expect(s.guild.channels.create).not.toHaveBeenCalled();
    await s.deepfire.stop();
  });

  it("on stop, leaves every room as it is and tells the database it is not ready", async () => {
    const s = await started({ before: (w) => w.seat(A, w.addRoom(A)) });
    const room = s.rooms()[0];
    s.calls.length = 0;
    await s.deepfire.stop();
    expect(room.delete).not.toHaveBeenCalled();
    expect(s.guild.members.edit).not.toHaveBeenCalled();
    expect(s.calls).toEqual([["shift_quest_deepfire_beat", GUILD, false]]);
    expect(s.client.listenerCount(Events.VoiceStateUpdate)).toBe(0);
    expect(s.client.listenerCount(Events.ShardReady)).toBe(0);
    // Nothing after stop.
    s.move(B, LOBBY);
    await jest.advanceTimersByTimeAsync(5 * 60_000);
    await settle();
    expect(s.guild.channels.create).not.toHaveBeenCalled();
    expect(s.calls).toHaveLength(1);
  });

  it("below schema 22 stays idle (no listener, no beat), then starts by itself once the migration is applied", async () => {
    let connected = false;
    const s = await started({ schema: 21, connected: () => connected });
    expect(s.client.listenerCount(Events.VoiceStateUpdate)).toBe(0);
    // Offline: not even the version is read.
    expect(s.calls).toEqual([]);
    connected = true;
    await jest.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(s.calls).toEqual([["shift_quest_schema_version"]]);
    s.move(A, LOBBY);
    await settle();
    expect(s.guild.channels.create).not.toHaveBeenCalled();
    expect(s.deepfire.status().on).toBe(false);

    s.setting.schema = 22;
    await jest.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(s.deepfire.status()).toEqual({ on: true, lobby: LOBBY, ready: true });
    expect(s.client.listenerCount(Events.VoiceStateUpdate)).toBe(1);
    expect(logs).toHaveBeenCalledWith("[shift-quests] deep fire on (schema 22)");
    // The person who was already waiting gets a room on that first reconcile.
    expect(s.guild.channels.create).toHaveBeenCalledTimes(1);
    expect(s.where(A)).toBe(s.rooms()[0].id);
    await s.deepfire.stop();
  });

  it("logs a failed beat by code only and keeps going", async () => {
    const s = await started();
    (s.api.call as jest.Mock).mockImplementationOnce(async () => {
      throw new QuestDbError("shift_quest_deepfire_beat", "08006");
    });
    await jest.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(warns.mock.calls.flat().join(" ")).toContain("SQLSTATE 08006");
    s.move(A, LOBBY);
    await settle();
    expect(s.guild.channels.create).toHaveBeenCalledTimes(1);
    await s.deepfire.stop();
  });

  // -------------------------------------------------------------------------
  // The lock holds when Discord, the database or the timing does not help
  // -------------------------------------------------------------------------

  const editsOf = (s: { guild: { members: { edit: jest.Mock } } }, id: string) => s.guild.members.edit.mock.calls.filter(([who]) => who === id);

  it("when Discord will not disconnect someone, closes the room in the same pass and never moves its owner in with them", async () => {
    let room = "";
    const s = await started({
      before: (w) => {
        room = w.addRoom(A);
        // The owner stepped back into the lobby; an adult sits in their room (the server owner, say, whom the bot
        // cannot disconnect).
        w.seat(A, LOBBY);
        w.seat(ADULT, room);
        w.failEdit(ADULT, new Error("refused"), true);
      },
    });
    await settle(20);
    expect(editsOf(s, ADULT)[0]).toEqual([ADULT, { channel: null, reason: DEEPFIRE.reason.remove }]);
    // Closed instead: deleting the room disconnects everyone in it.
    expect(s.channels.has(room)).toBe(false);
    expect(s.where(ADULT)).toBeNull();
    // The owner was never moved into the room with the adult, and gets a new room of their own.
    expect(s.guild.members.edit).not.toHaveBeenCalledWith(A, { channel: room, reason: DEEPFIRE.reason.move });
    expect(s.rooms()).toHaveLength(1);
    expect(s.where(A)).toBe(s.rooms()[0].id);
    expect(warns.mock.calls.flat().join(" ")).toContain("disconnect failed: Error");
    expect(logs.mock.calls.flat().join("\n")).toContain("1 room(s) closed");
    await s.deepfire.stop();
  });

  it("when Discord will not disconnect someone who walks in, closes the room with both inside, after one attempt", async () => {
    const s = await started({ before: (w) => w.seat(A, w.addRoom(A)) });
    const room = s.rooms()[0];
    s.failEdit(ADULT, new Error("refused"), true);
    s.move(ADULT, room.id);
    await settle(20);
    // The reconcile shares the voice update's attempt: no second one, the room goes.
    expect(editsOf(s, ADULT)).toHaveLength(1);
    expect(room.delete).toHaveBeenCalledWith(DEEPFIRE.reason.close);
    expect(s.where(ADULT)).toBeNull();
    expect(s.where(A)).toBeNull();
    await s.deepfire.stop();
  });

  it("when the room cannot be closed either, tries again a few seconds later, never in a loop", async () => {
    const s = await started({ before: (w) => w.seat(A, w.addRoom(A)) });
    const room = s.rooms()[0];
    s.failEdit(ADULT, new Error("refused"), true);
    room.delete.mockRejectedValueOnce(new Error("refused"));
    s.move(ADULT, room.id);
    await settle(20);
    expect(room.delete).toHaveBeenCalledTimes(1);
    expect(s.channels.has(room.id)).toBe(true);
    await jest.advanceTimersByTimeAsync(5_000);
    await settle(20);
    expect(room.delete).toHaveBeenCalledTimes(2);
    expect(s.channels.has(room.id)).toBe(false);
    expect(s.where(ADULT)).toBeNull();
    await s.deepfire.stop();
  });

  it("disconnects someone who walks into a room at once, even while a room is being built for someone else", async () => {
    const s = await started({ before: (w) => w.seat(A, w.addRoom(A)) });
    const room = s.rooms()[0];
    const release = s.holdCreate();
    s.move(B, LOBBY);
    await settle();
    expect(s.guild.channels.create).toHaveBeenCalledTimes(1);
    // The build is still waiting on Discord: the lock does not wait for it.
    s.move(ADULT, room.id);
    await settle();
    expect(s.guild.members.edit).toHaveBeenCalledWith(ADULT, { channel: null, reason: DEEPFIRE.reason.remove });
    expect(s.where(ADULT)).toBeNull();
    expect(s.where(A)).toBe(room.id);
    release();
    await settle(20);
    expect(s.where(B)).toBe(s.rooms().find((r) => r.id !== room.id)?.id);
    expect(editsOf(s, ADULT)).toHaveLength(1);
    await s.deepfire.stop();
  });

  it("builds a few rooms per pass, guarding every room again between them", async () => {
    const s = await started();
    const many = Array.from({ length: 7 }, (_, k) => `51000000000000000${k}`);
    for (const id of many) s.seat(id, LOBBY);
    s.deepfire.reconcile();
    await settle(30);
    expect(s.guild.channels.create).toHaveBeenCalledTimes(7);
    for (const id of many) expect(s.where(id)).not.toBe(LOBBY);
    await s.deepfire.stop();
  });

  it("a stalled database never holds up the rooms: the heartbeat runs beside them and gives up after a while", async () => {
    const s = await started({ before: (w) => w.seat(A, w.addRoom(A)) });
    const room = s.rooms()[0];
    // The next database call never answers (a half-open connection).
    (s.api.call as jest.Mock).mockImplementationOnce(() => new Promise(() => undefined));
    await jest.advanceTimersByTimeAsync(60_000);
    await settle();
    s.move(B, LOBBY);
    s.seat(ADULT, room.id);
    s.client.emit(Events.ShardResume, 0, 0);
    await settle(20);
    expect(s.guild.channels.create).toHaveBeenCalledTimes(1);
    expect(s.where(B)).not.toBe(LOBBY);
    expect(s.where(ADULT)).toBeNull();
    // The heartbeat gives up and says so by code; the next one goes out as usual.
    await jest.advanceTimersByTimeAsync(20_000);
    await settle();
    expect(warns.mock.calls.flat().join(" ")).toContain("beat failed: TimeoutError");
    s.calls.length = 0;
    await jest.advanceTimersByTimeAsync(40_000);
    await settle();
    expect(s.beats()).toEqual([true]);
    await s.deepfire.stop();
  });

  it("a move back that keeps failing is tried again on the next heartbeat, never in a loop", async () => {
    let room = "";
    const s = await started({
      before: (w) => {
        room = w.addRoom(A);
        w.seat(A, LOBBY);
        w.failEdit(A, new Error("refused"), true);
      },
    });
    await settle(40);
    expect(editsOf(s, A)).toEqual([[A, { channel: room, reason: DEEPFIRE.reason.move }]]);
    // Their room stands, and no second one is built.
    expect(s.channels.has(room)).toBe(true);
    expect(s.guild.channels.create).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(60_000);
    await settle(40);
    expect(editsOf(s, A)).toHaveLength(2);
    await s.deepfire.stop();
  });

  it("never pulls someone who gave up waiting out of where they went", async () => {
    const s = await started();
    const release = s.holdCreate();
    s.move(A, LOBBY);
    await settle();
    // The room is slow to build; they go to the campfire instead.
    s.move(A, CAMPFIRE);
    await settle();
    release();
    await settle(20);
    expect(s.where(A)).toBe(CAMPFIRE);
    expect(editsOf(s, A)).toEqual([]);
    // The room nobody went into is closed again.
    expect(s.rooms()).toHaveLength(0);
    await s.deepfire.stop();
  });

  it("never disconnects someone who left the room before their turn, from wherever they went", async () => {
    const s = await started({ before: (w) => w.seat(A, w.addRoom(A)) });
    const room = s.rooms()[0];
    // Two in the room, unseen (lost events). B's disconnect is slow; the adult walks out to the staff channel meanwhile.
    s.seat(B, room.id);
    s.seat(ADULT, room.id);
    const release = s.holdEdit(B);
    s.deepfire.reconcile();
    await settle();
    s.move(ADULT, STAFF_VOICE);
    release();
    await settle(20);
    expect(s.where(B)).toBeNull();
    expect(s.where(ADULT)).toBe(STAFF_VOICE);
    expect(editsOf(s, ADULT)).toEqual([]);
    await s.deepfire.stop();
  });

  it("after a restart, guards rooms left in the lobby's old category", async () => {
    let room = "";
    const s = await started({
      lobby: LOBBY2,
      before: (w) => {
        room = w.addRoom(A, CATEGORY);
        w.seat(A, room);
        w.seat(ADULT, room);
      },
    });
    expect(s.where(ADULT)).toBeNull();
    expect(s.where(A)).toBe(room);
    s.move(C, room);
    await settle();
    expect(s.where(C)).toBeNull();
    s.move(A, null);
    await settle();
    expect(s.channels.has(room)).toBe(false);
    await s.deepfire.stop();
  });

  it("after a restart with the lobby cleared, still guards every room until it is gone", async () => {
    let room = "";
    const s = await started({
      lobby: null,
      before: (w) => {
        room = w.addRoom(A);
        w.seat(A, room);
        w.seat(ADULT, room);
      },
    });
    expect(s.where(ADULT)).toBeNull();
    s.move(ADULT, room);
    await settle();
    expect(s.where(ADULT)).toBeNull();
    s.move(A, null);
    await settle();
    expect(s.channels.has(room)).toBe(false);
    expect(s.guild.channels.create).not.toHaveBeenCalled();
    await s.deepfire.stop();
  });

  it("while the lobby has not been read yet (the database is down), still guards every room", async () => {
    let room = "";
    const s = await started({
      before: (w) => {
        room = w.addRoom(A);
        w.seat(A, room);
      },
      db: (d) =>
        (d.api.call as jest.Mock).mockImplementation(async () => {
          throw new QuestDbError("shift_quest_deepfire_beat", "08006");
        }),
    });
    expect(s.deepfire.status().lobby).toBeNull();
    s.move(ADULT, room);
    await settle();
    expect(s.where(ADULT)).toBeNull();
    expect(s.where(A)).toBe(room);
    s.move(A, null);
    await settle();
    expect(s.channels.has(room)).toBe(false);
    await s.deepfire.stop();
  });

  it("never treats an earlier lobby as a room, even marked like one", async () => {
    const s = await started();
    // Staff gave the lobby a user limit of 1 and the bot exactly a room's permissions there.
    const lobby = s.channels.get(LOBBY)!;
    lobby.userLimit = 1;
    for (const o of roomOverwrites(LOBBY_OVERWRITES, GUILD, ADULT, BOT)) {
      lobby.permissionOverwrites.cache.set(o.id, { id: o.id, type: o.type, allow: { bitfield: o.allow }, deny: { bitfield: o.deny } });
    }
    s.setting.lobby = LOBBY2;
    await jest.advanceTimersByTimeAsync(60_000);
    await settle();
    s.move(B, LOBBY);
    await settle();
    expect(lobby.delete).not.toHaveBeenCalled();
    expect(s.where(B)).toBe(LOBBY);
    await s.deepfire.stop();
  });

  it("stops within a few seconds even while Discord holds a build, and still says not ready", async () => {
    const s = await started();
    s.holdCreate();
    s.move(A, LOBBY);
    await settle();
    s.calls.length = 0;
    let finished = false;
    const stopping = s.deepfire.stop().then(() => {
      finished = true;
    });
    await settle();
    expect(finished).toBe(false);
    await jest.advanceTimersByTimeAsync(8_000);
    await stopping;
    expect(finished).toBe(true);
    expect(s.calls).toEqual([["shift_quest_deepfire_beat", GUILD, false]]);
  });
});

// ---------------------------------------------------------------------------
// lobbyProblem: what /admin and the heartbeat check
// ---------------------------------------------------------------------------

describe("lobbyProblem", () => {
  const me = { id: BOT };
  const cached = (lobby: Record<string, unknown> | null, category: Record<string, unknown> | null, withMe: unknown = me) => ({
    members: { me: withMe },
    channels: {
      cache: new Map(
        [
          [LOBBY, lobby],
          [CATEGORY, category],
        ].filter((e): e is [string, Record<string, unknown>] => !!e[1])
      ),
    },
  });
  const perms = (held: bigint[]) => () => ({ has: (bits: bigint[]) => bits.every((b) => held.includes(b)) });
  const voice = (held: bigint[] = ROOM_BITS, parentId: string | null = CATEGORY) => ({ type: ChannelType.GuildVoice, parentId, permissionsFor: perms(held) });
  const category = (held: bigint[] = ROOM_BITS) => ({ type: ChannelType.GuildCategory, permissionsFor: perms(held) });

  it.each<[string, unknown, string | null | undefined, string | null]>([
    ["all good", cached(voice(), category()), LOBBY, null],
    ["no lobby set", cached(voice(), category()), null, "unset"],
    ["no guild", null, LOBBY, "unknown"],
    ["the lobby not cached", cached(null, category()), LOBBY, "unknown"],
    ["a text channel", cached({ ...voice(), type: ChannelType.GuildText }, category()), LOBBY, "not_voice"],
    ["no category", cached(voice(ROOM_BITS, null), category()), LOBBY, "no_category"],
    ["the category not cached", cached(voice(), null), LOBBY, "unknown"],
    ["the bot's member not cached", cached(voice(), category(), null), LOBBY, "unknown"],
    ["no permissions to read", cached({ type: ChannelType.GuildVoice, parentId: CATEGORY }, category()), LOBBY, "unknown"],
    ["no Move Members on the lobby", cached(voice(ROOM_BITS.filter((b) => b !== P.MoveMembers)), category()), LOBBY, "bot_perms"],
    ["no Connect on the category", cached(voice(), category(ROOM_BITS.filter((b) => b !== P.Connect))), LOBBY, "bot_perms"],
    ["no Add Reactions on the category", cached(voice(), category(ROOM_BITS.filter((b) => b !== P.AddReactions))), LOBBY, "bot_perms"],
  ])("%s", (_label, guild, lobbyId, expected) => {
    expect(lobbyProblem(guild as never, lobbyId)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// /admin channel kind:deepfire
// ---------------------------------------------------------------------------

describe("/admin channel kind:deepfire", () => {
  const ADMIN_GUILD = "900000000000000000";
  const ACTOR = "1111111111";

  function session(): Session {
    return {
      member_id: "m",
      onboarded: true,
      roles: ["admin"],
      current_project_id: null,
      unread: 0,
      prefs: null,
      settings: { student_role_ids: ["555"], awards: true, redemption: false, sharing: false, reminders: false, reward_terms: null, redemption_terms: null },
    };
  }

  const status = (settings: Record<string, unknown> = {}) => ({
    settings: {
      student_role_ids: ["555"],
      help_channel_id: "801",
      staff_channel_id: "802",
      celebrate_channel_id: "803",
      coworking_channel_id: "804",
      reward_terms: true,
      redemption_terms: true,
      fulfillment_process: true,
      fulfillment_owner: "ครู",
      ...settings,
    },
    live: {},
    blockers: {},
    rules: [],
    staff: { admin: 1, reviewer: 0, fulfillment: 0 },
    outbox: { pending: 0, blocked: 0, failed: 0 },
    data_requests_open: 0,
  });

  function ctx(schema: number | "missing" = 22, settings: Record<string, unknown> = { deepfire_channel_id: LOBBY }): Ctx {
    const api = {
      call: jest.fn(async (fn: string) => {
        if (fn === "shift_quest_schema_version") {
          if (schema === "missing") throw new QuestDbError(fn, "42883");
          return schema;
        }
        return status(settings);
      }),
      rows: jest.fn(),
    };
    return { api: api as unknown as QuestApi, userId: ACTOR, name: "x", memberRoleIds: ["555"], session: session() };
  }

  /**
   * A guild whose cache has the lobby (in a category unless parentId is null) and the bot's member. On the lobby the
   * bot holds `onLobby`, and the student role (555) holds `students` (View Channel and Connect by default).
   */
  function guildWith(
    o: { onLobby?: bigint[]; onCategory?: bigint[]; students?: bigint[]; parentId?: string | null; type?: ChannelType; category?: boolean } = {}
  ) {
    const me = { id: BOT };
    const has = (held: bigint[]) => () => ({ has: (bits: bigint[]) => bits.every((b) => held.includes(b)) });
    const onLobby = has(o.onLobby ?? ROOM_BITS);
    const students = has(o.students ?? [P.ViewChannel, P.Connect]);
    const lobby = {
      id: LOBBY,
      type: o.type ?? ChannelType.GuildVoice,
      parentId: o.parentId === undefined ? CATEGORY : o.parentId,
      permissionsFor: (who: unknown) => (who === me ? onLobby() : who === "555" ? students() : { has: () => false }),
    };
    const entries: [string, unknown][] = [[LOBBY, lobby]];
    if (o.category !== false) entries.push([CATEGORY, { id: CATEGORY, type: ChannelType.GuildCategory, permissionsFor: has(o.onCategory ?? ROOM_BITS) }]);
    return { lobby, guild: { members: { me }, channels: { cache: new Map(entries) } } };
  }

  function run(c: Ctx, channel: unknown, guild?: unknown) {
    const sent: unknown[] = [];
    const i = {
      id: "222222222222222222",
      guildId: ADMIN_GUILD,
      guild,
      deferred: false,
      replied: false,
      commandName: "admin",
      isChatInputCommand: () => true,
      isMessageComponent: () => false,
      isModalSubmit: () => false,
      reply: async (p: unknown) => {
        sent.push(p);
      },
      editReply: async (p: unknown) => {
        sent.push(p);
      },
      options: {
        getSubcommand: () => "channel",
        getString: (n: string) => (n === "kind" ? "deepfire" : null),
        getChannel: () => channel ?? null,
      },
    };
    return { done: COMMAND_HANDLERS.get("admin channel")!(i as never, c), sent };
  }

  const saved = (c: Ctx) => (c.api.call as jest.Mock).mock.calls.filter(([fn]) => fn === "shift_quest_admin_set");

  it("saves a voice channel in a category where the bot can build rooms, as 'deepfire_channel'", async () => {
    const c = ctx();
    const { lobby, guild } = guildWith();
    const r = run(c, lobby, guild);
    await r.done;
    expect(saved(c)).toEqual([["shift_quest_admin_set", ACTOR, "deepfire_channel", LOBBY]]);
    const reply = r.sent[0] as { flags?: number };
    expect((reply.flags ?? 0) & MessageFlags.Ephemeral).toBe(MessageFlags.Ephemeral);
  });

  it("wakes the deep fire right after saving, so the next join gets a room without waiting for its heartbeat", async () => {
    const logs = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const world = fakeWorld();
    const db = fakeApi({ lobby: null });
    const deepfire = startDeepFire(world.asClient, db.api, { guildId: GUILD, connected: () => true, schema: DEEPFIRE_SCHEMA });
    try {
      await settle();
      expect(deepfire.status().lobby).toBeNull();
      db.setting.lobby = LOBBY;
      const c = ctx();
      const { lobby, guild } = guildWith();
      await run(c, lobby, guild).done;
      await settle();
      expect(saved(c)).toHaveLength(1);
      // No timer advanced: the save itself made the module read the lobby.
      expect(deepfire.status()).toEqual({ on: true, lobby: LOBBY, ready: true });
    } finally {
      await deepfire.stop();
      logs.mockRestore();
    }
  });

  it("clears it like every other kind", async () => {
    const c = ctx();
    await run(c, null).done;
    expect(saved(c)).toEqual([["shift_quest_admin_set", ACTOR, "deepfire_channel", ""]]);
  });

  it.each<[string, () => { channel: unknown; guild?: unknown }, string]>([
    ["a text channel", () => ({ channel: { id: LOBBY, type: ChannelType.GuildText } }), DEEPFIRE_ADMIN.notVoice],
    ["a stage channel", () => ({ channel: { id: LOBBY, type: ChannelType.GuildStageVoice } }), DEEPFIRE_ADMIN.notVoice],
    ["a forum", () => ({ channel: { id: LOBBY, type: ChannelType.GuildForum } }), DEEPFIRE_ADMIN.notVoice],
    ["an announcement channel", () => ({ channel: { id: LOBBY, type: ChannelType.GuildAnnouncement } }), DEEPFIRE_ADMIN.notVoice],
    ["a voice channel with no category", () => { const g = guildWith({ parentId: null }); return { channel: g.lobby, guild: g.guild }; }, DEEPFIRE_ADMIN.noCategory],
    ["nothing cached to check (fails closed)", () => ({ channel: { id: LOBBY, type: ChannelType.GuildVoice } }), DEEPFIRE_ADMIN.unknown],
    ["the category not cached", () => { const g = guildWith({ category: false }); return { channel: g.lobby, guild: g.guild }; }, DEEPFIRE_ADMIN.unknown],
    ...BOT_NEEDS_CASES("lobby"),
    ...BOT_NEEDS_CASES("category"),
    [
      "a permission a room sets missing on the category (Send Voice Messages)",
      () => { const g = guildWith({ onCategory: ROOM_BITS.filter((b) => b !== P.SendVoiceMessages) }); return { channel: g.lobby, guild: g.guild }; },
      DEEPFIRE_ADMIN.botPerms,
    ],
  ])("refuses %s, saving nothing", async (_label, make, message) => {
    const c = ctx();
    const { channel, guild } = make();
    await expect(run(c, channel, guild).done).rejects.toThrow(message);
    expect(saved(c)).toEqual([]);
  });

  function BOT_NEEDS_CASES(where: "lobby" | "category"): [string, () => { channel: unknown; guild?: unknown }, string][] {
    return (
      [
        ["View Channel", P.ViewChannel],
        ["Connect", P.Connect],
        ["Manage Channels", P.ManageChannels],
        ["Move Members", P.MoveMembers],
      ] as const
    ).map(([name, bit]) => [
      `a channel where the bot lacks ${name} on the ${where}`,
      () => {
        const held = ROOM_BITS.filter((b) => b !== bit);
        const g = guildWith(where === "lobby" ? { onLobby: held } : { onCategory: held });
        return { channel: g.lobby, guild: g.guild };
      },
      DEEPFIRE_ADMIN.botPerms,
    ]);
  }

  it.each<[string, bigint[]]>([
    ["see", [P.Connect]],
    ["join", [P.ViewChannel]],
  ])("refuses a lobby students cannot %s (its rooms would be hidden from them), saving nothing", async (_label, students) => {
    const c = ctx();
    const { lobby, guild } = guildWith({ students });
    await expect(run(c, lobby, guild).done).rejects.toThrow(DEEPFIRE_ADMIN.lobbyPrivate);
    expect(saved(c)).toEqual([]);
  });

  it("refuses the campfire's coworking channel as the lobby, saving nothing", async () => {
    const c = ctx(22, { coworking_channel_id: LOBBY, deepfire_channel_id: null });
    const { lobby, guild } = guildWith();
    await expect(run(c, lobby, guild).done).rejects.toThrow(DEEPFIRE_ADMIN.notCampfire);
    expect(saved(c)).toEqual([]);
    // Clearing still works.
    await run(c, null).done;
    expect(saved(c)).toEqual([["shift_quest_admin_set", ACTOR, "deepfire_channel", ""]]);
  });

  it("refuses below schema 22, set or clear, and saves nothing", async () => {
    for (const schema of [21, "missing"] as const) {
      const c = ctx(schema);
      const { lobby, guild } = guildWith();
      await expect(run(c, lobby, guild).done).rejects.toThrow(DEEPFIRE_ADMIN.needsSchema);
      await expect(run(c, null).done).rejects.toThrow(DEEPFIRE_ADMIN.needsSchema);
      expect(saved(c)).toEqual([]);
    }
  });

  it("still refuses a voice channel for the text kinds (only coworking and deepfire take one)", async () => {
    const c = ctx();
    const { lobby, guild } = guildWith();
    const i = {
      guildId: ADMIN_GUILD,
      guild,
      options: { getString: (n: string) => (n === "kind" ? "help" : null), getChannel: () => lobby },
    };
    await expect(COMMAND_HANDLERS.get("admin channel")!(i as never, c)).rejects.toThrow();
    expect(saved(c)).toEqual([]);
  });

  it("offers deepfire in /admin channel kind", () => {
    const sub = questCommands()
      .find((x) => x.name === "admin")
      ?.options?.find((o) => o.name === "channel") as { options?: { name: string; choices?: { name: string; value: string }[]; channel_types?: number[] }[] };
    const kind = sub.options?.find((o) => o.name === "kind");
    expect(kind?.choices?.map((x) => x.value)).toContain("deepfire");
    expect(kind?.choices?.find((x) => x.value === "deepfire")?.name.length).toBeLessThanOrEqual(100);
    expect(sub.options?.find((o) => o.name === "channel")?.channel_types).toContain(ChannelType.GuildVoice);
  });

  it("shows the lobby on /admin status once the database has it: set, unset, or not at all", () => {
    const line = (settings: Record<string, unknown>) => bodyText(renderView(statusView(status(settings) as never)));
    expect(line({ deepfire_channel_id: LOBBY })).toContain(`✅ ${DEEPFIRE_ADMIN.label}: <#${LOBBY}> (${DEEPFIRE_ADMIN.hint})`);
    expect(line({ deepfire_channel_id: null })).toContain(`⚪ ${DEEPFIRE_ADMIN.label}: ยังไม่ตั้ง (${DEEPFIRE_ADMIN.hint})`);
    expect(line({})).not.toContain(DEEPFIRE_ADMIN.label);
  });
});

// ---------------------------------------------------------------------------
// Copy: DRAFT Thai, no dashes, never talking down
// ---------------------------------------------------------------------------

describe("deep fire copy", () => {
  const strings = [DEEPFIRE.roomName, ...Object.values(DEEPFIRE.reason), ...Object.values(DEEPFIRE_ADMIN)];

  it.each(strings.map((s) => [s]))("%s", (text) => {
    expect(text).not.toMatch(/[\u2013\u2014]/);
    expect(text).not.toMatch(/น้องๆ|น้อง ๆ|เด็กๆ|เด็ก ๆ|พรุ่งนี้/);
    expect(text.trim()).toBe(text);
    expect(text.length).toBeGreaterThan(0);
  });

  it("names the room generically, never after a person", () => {
    expect(DEEPFIRE.roomName).toBe("🔥 กองไฟโฟกัส");
    expect(DEEPFIRE.roomName.length).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// Wiring: started with the quests, idle below schema 22
// ---------------------------------------------------------------------------

describe("deep fire wiring", () => {
  let logs: jest.SpyInstance;
  let warns: jest.SpyInstance;
  let errors: jest.SpyInstance;

  beforeEach(() => {
    logs = jest.spyOn(console, "log").mockImplementation(() => undefined);
    warns = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    errors = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logs.mockRestore();
    warns.mockRestore();
    errors.mockRestore();
  });

  function fakePool(version: number) {
    const log: string[] = [];
    const args: unknown[][] = [];
    const pool = {
      query: jest.fn(async (sql: string, values: unknown[]) => {
        const fn = /public\.(shift_quest_[a-z_]+)\(/.exec(sql)?.[1] ?? sql;
        log.push(fn);
        args.push([fn, ...(values ?? [])]);
        if (fn === "shift_quest_schema_version") return { rows: [{ r: version }] };
        if (fn === "shift_quest_deepfire_beat") return { rows: [{ r: { channel_id: null } }] };
        return { rows: [{ r: null }] };
      }),
      end: jest.fn(async () => {
        log.push("end");
      }),
    };
    (createRolePool as jest.Mock).mockReturnValue(pool);
    return { log, args };
  }

  const env = { guildId: GUILD, databaseUrl: "postgres://bot@127.0.0.1:5432/quests" };

  it("on schema 21 adds no listener and calls nothing of its own", async () => {
    const { log } = fakePool(21);
    const client = new EventEmitter();
    const quests = await registerShiftQuests(client as unknown as Client, env);
    // The campfire's only.
    expect(client.listenerCount(Events.VoiceStateUpdate)).toBe(1);
    await quests.stop();
    expect(log).not.toContain("shift_quest_deepfire_beat");
    expect(log.at(-1)).toBe("end");
  });

  it("on schema 22 listens, and says not ready before the pool closes", async () => {
    const { log, args } = fakePool(22);
    const client = new EventEmitter();
    const quests = await registerShiftQuests(client as unknown as Client, env);
    expect(client.listenerCount(Events.VoiceStateUpdate)).toBe(2);
    await quests.stop();
    expect(client.listenerCount(Events.VoiceStateUpdate)).toBe(0);
    // Offline the whole time: never ready.
    expect(args.filter(([fn]) => fn === "shift_quest_deepfire_beat").every(([, , ready]) => ready === false)).toBe(true);
    expect(log.lastIndexOf("shift_quest_deepfire_beat")).toBeGreaterThan(-1);
    expect(log.lastIndexOf("shift_quest_deepfire_beat")).toBeLessThan(log.indexOf("end"));
  });
});
