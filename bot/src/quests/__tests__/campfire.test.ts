/**
 * @jest-environment node
 */
import { EventEmitter } from "node:events";

import { ChannelType, Events, type Client } from "discord.js";

import { QuestDbError, type QuestApi } from "../api";
import { CAMPFIRE_SCHEMA, campfireFor, startCampfire } from "../campfire";
import { campersIn, voiceChange, type VoiceMember } from "../campfire-state";
import { questCommands } from "../commands";
import { statusView } from "../handlers/admin";
import { registerShiftQuests } from "..";
import { renderView } from "../ui";
import { bodyText } from "../test-helpers/view";
import { createRolePool } from "../../pg";

jest.mock("../../pg", () => ({ createRolePool: jest.fn() }));

const GUILD = "100000000000000001";
const ROOM = "200000000000000002";
const OTHER = "200000000000000003";
const TEXT = "200000000000000004";
const NEW_ROOM = "200000000000000005";
const STUDENT = "300000000000000001";
const STAFF = "300000000000000002";

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

// ---------------------------------------------------------------------------
// Pure decisions
// ---------------------------------------------------------------------------

describe("campersIn", () => {
  const m = (id: string, channelId: string | null, name: string | null = `n${id}`, bot = false): VoiceMember => ({ id, channelId, bot, name });

  it.each<[string, VoiceMember[], { ids: string[]; names: (string | null)[] }]>([
    ["nobody in voice", [], { ids: [], names: [] }],
    ["only the coworking channel counts", [m("30", ROOM), m("10", OTHER), m("20", null)], { ids: ["30"], names: ["n30"] }],
    ["bots never sit down", [m("30", ROOM), m("40", ROOM, "Bot", true)], { ids: ["30"], names: ["n30"] }],
    ["sorted by id, names follow their id", [m("30", ROOM, "C"), m("10", ROOM, null), m("20", ROOM, "B")], { ids: ["10", "20", "30"], names: [null, "B", "C"] }],
    ["one row per person", [m("10", ROOM, "A"), m("10", ROOM, "A")], { ids: ["10"], names: ["A"] }],
  ])("%s", (_label, members, expected) => {
    expect(campersIn(members, ROOM)).toEqual(expected);
  });
});

describe("voiceChange", () => {
  it.each<[string, string | null, string | null, string | null, string | null, string | null | undefined, unknown]>([
    ["no coworking channel set", null, ROOM, null, "A", undefined, { kind: "none" }],
    ["another channel to another", OTHER, TEXT, ROOM, "A", undefined, { kind: "none" }],
    ["joining another channel", null, OTHER, ROOM, "A", undefined, { kind: "none" }],
    ["leaving another channel", OTHER, null, ROOM, "A", "A", { kind: "none" }],
    ["joining the coworking channel", null, ROOM, ROOM, "A", undefined, { kind: "join", name: "A" }],
    ["moving in from another channel", OTHER, ROOM, ROOM, null, undefined, { kind: "join", name: null }],
    ["leaving the coworking channel", ROOM, null, ROOM, "A", "A", { kind: "leave" }],
    ["moving out to another channel", ROOM, OTHER, ROOM, "A", "A", { kind: "leave" }],
    ["muting with the same name", ROOM, ROOM, ROOM, "A", "A", { kind: "none" }],
    ["a new server name", ROOM, ROOM, ROOM, "B", "A", { kind: "rename", name: "B" }],
    ["a name set where none was known", ROOM, ROOM, ROOM, "B", null, { kind: "rename", name: "B" }],
    ["a name the bot cannot read never overwrites", ROOM, ROOM, ROOM, null, "A", { kind: "none" }],
    ["someone the bot has no row for", ROOM, ROOM, ROOM, null, undefined, { kind: "rename", name: null }],
  ])("%s", (_label, oldChannel, newChannel, coworking, nameNow, nameKnown, expected) => {
    expect(voiceChange(oldChannel, newChannel, coworking, nameNow, nameKnown)).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// The live module, with a fake gateway and a fake database
// ---------------------------------------------------------------------------

interface FakeMember {
  displayName: string;
  user: { bot: boolean };
}

interface FakeState {
  id: string;
  channelId: string | null;
  guild: FakeGuild;
  member: FakeMember | null;
}

interface FakeChannel {
  id: string;
  isVoiceBased: () => boolean;
  permissionsFor: (role: string) => { has: () => boolean };
}

interface FakeGuild {
  id: string;
  voiceStates: { cache: Map<string, FakeState> };
  channels: { cache: Map<string, FakeChannel> };
  members: { fetch: jest.Mock };
}

function fakeWorld() {
  /** The roles that can see and join each channel; every voice channel starts open to @everyone (the guild id). */
  const access = new Map<string, Set<string>>([
    [ROOM, new Set([GUILD])],
    [OTHER, new Set([GUILD])],
    [NEW_ROOM, new Set([GUILD])],
  ]);
  const channel = (id: string, voice = true): FakeChannel => ({
    id,
    isVoiceBased: () => voice,
    permissionsFor: (role) => ({ has: () => access.get(id)?.has(role) ?? false }),
  });
  const guild: FakeGuild = {
    id: GUILD,
    voiceStates: { cache: new Map() },
    channels: {
      cache: new Map([
        [ROOM, channel(ROOM)],
        [OTHER, channel(OTHER)],
        [NEW_ROOM, channel(NEW_ROOM)],
        [TEXT, channel(TEXT, false)],
      ]),
    },
    members: { fetch: jest.fn(async () => Promise.reject(new Error("unknown member"))) },
  };
  const elsewhere: FakeGuild = { ...guild, id: "999999999999999999", voiceStates: { cache: new Map() } };
  const client = Object.assign(new EventEmitter(), { guilds: { cache: new Map([[GUILD, guild]]) } });

  /** Moves someone the way Discord would: the cache changes, then the event fires. */
  function move(id: string, to: string | null, name: string | null = `Name ${id}`, opts: { bot?: boolean; in?: FakeGuild } = {}) {
    const g = opts.in ?? guild;
    const member = name === null ? null : { displayName: name, user: { bot: opts.bot ?? false } };
    const before = g.voiceStates.cache.get(id) ?? { id, channelId: null, guild: g, member };
    const after: FakeState = { id, channelId: to, guild: g, member };
    if (to) g.voiceStates.cache.set(id, after);
    else g.voiceStates.cache.delete(id);
    client.emit(Events.VoiceStateUpdate, before, after);
  }

  /** Someone already in voice when the bot connects (no event). */
  function seat(id: string, channelId: string, name: string | null, bot = false) {
    guild.voiceStates.cache.set(id, {
      id,
      channelId,
      guild,
      member: name === null ? null : { displayName: name, user: { bot } },
    });
  }

  /** Staff change who may see a channel, then Discord sends ChannelUpdate (unless `silent`, as a role edit). */
  function permit(id: string, roles: string[], opts: { silent?: boolean } = {}) {
    access.set(id, new Set(roles));
    const updated = guild.channels.cache.get(id);
    if (!opts.silent) client.emit(Events.ChannelUpdate, updated, updated);
  }

  return { client, guild, elsewhere, move, seat, permit, access, asClient: client as unknown as Client };
}

function fakeApi(start: string | null = ROOM) {
  const setting: { channel: string | null; roles: string[] } = { channel: start, roles: [] };
  const calls: unknown[][] = [];
  const failNext = new Set<string>();
  const holds = new Map<string, Promise<void>>();
  const api = {
    call: jest.fn(async (fn: string, ...args: unknown[]) => {
      calls.push([fn, ...args]);
      const hold = holds.get(fn);
      if (hold) {
        holds.delete(fn);
        await hold;
      }
      if (failNext.delete(fn)) throw new QuestDbError(fn, "08006");
      if (fn === "shift_quest_voice_beat") return { channel_id: setting.channel, student_role_ids: [...setting.roles] };
      if (fn === "shift_quest_voice_set") return args[2] !== null && args[2] === setting.channel;
      if (fn === "shift_quest_voice_sync") return args[1] === setting.channel ? (args[2] as string[]).length : 0;
      throw new Error(`unexpected ${fn}`);
    }),
    rows: jest.fn(),
  };
  /** The next call to fn waits until the returned release() runs. */
  function hold(fn: string): () => void {
    let release!: () => void;
    holds.set(fn, new Promise<void>((resolve) => (release = resolve)));
    return () => release();
  }
  return { api: api as unknown as QuestApi, calls, setting, failNext, hold };
}

describe("startCampfire", () => {
  let errors: jest.SpyInstance;
  let warns: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["setImmediate"] });
    errors = jest.spyOn(console, "error").mockImplementation(() => undefined);
    warns = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    errors.mockRestore();
    warns.mockRestore();
  });

  async function started(opts: { setting?: string | null; connected?: () => boolean } = {}) {
    const world = fakeWorld();
    const db = fakeApi(opts.setting === undefined ? ROOM : opts.setting);
    const campfire = startCampfire(world.asClient, db.api, GUILD, opts.connected ?? (() => true));
    return { ...world, ...db, campfire };
  }

  async function ready(opts: Parameters<typeof started>[0] = {}) {
    const s = await started(opts);
    s.client.emit(Events.ShardReady, 0);
    await flush();
    s.calls.length = 0;
    return s;
  }

  it("on ready, beats then replaces the campfire with who is in the room now", async () => {
    const s = await started();
    s.seat("30", ROOM, "Ploy");
    s.seat("10", ROOM, null);
    s.seat("20", OTHER, "Elsewhere");
    s.seat("40", ROOM, "Some Bot", true);
    s.client.emit(Events.ShardReady, 0);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, ["10", "30"], [null, "Ploy"]],
    ]);
    await s.campfire.stop();
  });

  it("ignores every event until the first heartbeat says which channel counts", async () => {
    const s = await started();
    s.move("10", ROOM);
    await flush();
    expect(s.calls).toEqual([]);
    await s.campfire.stop();
  });

  it("never writes for another channel, another guild or a bot", async () => {
    const s = await ready();
    s.move("10", OTHER);
    s.move("10", TEXT);
    s.move("10", null);
    s.move("11", ROOM, "Elsewhere", { in: s.elsewhere });
    s.move("12", ROOM, "Some Bot", { bot: true });
    await flush();
    expect(s.calls).toEqual([]);
    await s.campfire.stop();
  });

  it("writes a join, a rename and a leave, and nothing for a mute", async () => {
    const s = await ready();
    s.move("10", ROOM, "Ploy");
    // Mute or camera: same channel, same name.
    s.move("10", ROOM, "Ploy");
    s.move("10", ROOM, "Ploy (พักกินข้าว)");
    s.move("10", OTHER, "Ploy (พักกินข้าว)");
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_set", GUILD, "10", ROOM, "Ploy"],
      ["shift_quest_voice_set", GUILD, "10", ROOM, "Ploy (พักกินข้าว)"],
      ["shift_quest_voice_set", GUILD, "10", null, null],
    ]);
    await s.campfire.stop();
  });

  it("asks the server for a name the voice state did not carry", async () => {
    const s = await ready();
    s.guild.members.fetch.mockResolvedValueOnce({ displayName: "Fetched", user: { bot: false } });
    s.move("10", ROOM, null);
    s.move("11", ROOM, null);
    await flush();
    expect(s.guild.members.fetch).toHaveBeenCalledWith("10");
    expect(s.calls).toEqual([
      ["shift_quest_voice_set", GUILD, "10", ROOM, "Fetched"],
      // Unknown to the server too: stored without a name, the web shows a placeholder.
      ["shift_quest_voice_set", GUILD, "11", ROOM, null],
    ]);
    await s.campfire.stop();
  });

  it("keeps writes in the order they happened", async () => {
    const s = await ready();
    const release = s.hold("shift_quest_voice_set");
    s.move("10", ROOM, "Ploy");
    s.move("10", null);
    s.move("20", ROOM, "Mek");
    await flush();
    // The join is still waiting on the database: nothing after it has gone out.
    expect(s.calls).toEqual([["shift_quest_voice_set", GUILD, "10", ROOM, "Ploy"]]);
    release();
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_set", GUILD, "10", ROOM, "Ploy"],
      ["shift_quest_voice_set", GUILD, "10", null, null],
      ["shift_quest_voice_set", GUILD, "20", ROOM, "Mek"],
    ]);
    await s.campfire.stop();
  });

  it("logs a failed write by code only, then resyncs on the next heartbeat", async () => {
    const s = await ready();
    s.failNext.add("shift_quest_voice_set");
    s.move("10", ROOM, "Ploy");
    await flush();
    const logged = errors.mock.calls.flat().join(" ");
    expect(logged).toContain("SQLSTATE 08006");
    expect(logged).not.toContain("Ploy");

    s.calls.length = 0;
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, ["10"], ["Ploy"]],
    ]);

    // Clean again: the next heartbeat only beats.
    s.calls.length = 0;
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(s.calls).toEqual([["shift_quest_voice_beat", GUILD]]);
    await s.campfire.stop();
  });

  it("beats every minute while connected, resyncs every five, and follows a new channel", async () => {
    let connected = true;
    const s = await ready({ connected: () => connected });
    s.seat("10", ROOM, "Ploy");
    s.seat("20", NEW_ROOM, "Mek");

    // The first heartbeat after a ready resyncs anyway (a deploy's old process may have emptied it).
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, ["10"], ["Ploy"]],
    ]);

    s.calls.length = 0;
    await jest.advanceTimersByTimeAsync(4 * 60_000);
    await flush();
    expect(s.calls.map((c) => c[0])).toEqual(Array(4).fill("shift_quest_voice_beat"));

    s.calls.length = 0;
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, ["10"], ["Ploy"]],
    ]);

    // Disconnected: no heartbeat vouches for rows the bot cannot see.
    connected = false;
    s.calls.length = 0;
    await jest.advanceTimersByTimeAsync(3 * 60_000);
    await flush();
    expect(s.calls).toEqual([]);

    // An admin points coworking at another voice channel.
    connected = true;
    s.setting.channel = NEW_ROOM;
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, NEW_ROOM, ["20"], ["Mek"]],
    ]);
    s.calls.length = 0;
    s.move("10", null);
    s.move("20", null);
    await flush();
    expect(s.calls).toEqual([["shift_quest_voice_set", GUILD, "20", null, null]]);
    await s.campfire.stop();
  });

  it("puts the campfire back after a deploy's old process empties it on its clean stop", async () => {
    const world = fakeWorld();
    const db = fakeApi(ROOM);
    world.seat("10", ROOM, "Ploy");
    const old = startCampfire(world.asClient, db.api, GUILD, () => true);
    world.client.emit(Events.ShardReady, 0);
    await flush();
    // The new process: same server, same database, ready while the old one still runs.
    const nextWorld = fakeWorld();
    nextWorld.seat("10", ROOM, "Ploy");
    const next = startCampfire(nextWorld.asClient, db.api, GUILD, () => true);
    nextWorld.client.emit(Events.ShardReady, 0);
    await flush();
    db.calls.length = 0;
    await old.stop();
    expect(db.calls).toEqual([["shift_quest_voice_sync", GUILD, ROOM, [], []]]);

    db.calls.length = 0;
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(db.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, ["10"], ["Ploy"]],
    ]);
    await next.stop();
  });

  it("resyncs on resume", async () => {
    const s = await ready();
    s.seat("10", ROOM, "Ploy");
    s.client.emit(Events.ShardResume, 0, 3);
    await flush();
    expect(s.calls).toEqual([["shift_quest_voice_sync", GUILD, ROOM, ["10"], ["Ploy"]]]);
    await s.campfire.stop();
  });

  it("keeps the campfire empty, with one warning, when coworking is not a voice channel", async () => {
    const s = await started({ setting: TEXT });
    s.seat("10", TEXT, "Ploy");
    s.client.emit(Events.ShardReady, 0);
    await flush();
    s.client.emit(Events.ShardResume, 0, 1);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, TEXT, [], []],
      ["shift_quest_voice_sync", GUILD, TEXT, [], []],
    ]);
    expect(warns).toHaveBeenCalledTimes(1);
    expect(warns.mock.calls[0].join(" ")).not.toContain("Ploy");
    await s.campfire.stop();
  });

  it("looks again at the next heartbeat when the guild was not in the cache yet", async () => {
    const s = await started();
    s.client.guilds.cache.delete(GUILD);
    s.seat("10", ROOM, "Ploy");
    s.client.emit(Events.ShardReady, 0);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, [], []],
    ]);
    expect(warns).toHaveBeenCalledTimes(1);

    // The guild arrives: the next heartbeat (not the five-minute one) fills the campfire.
    s.client.guilds.cache.set(GUILD, s.guild);
    s.calls.length = 0;
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, ["10"], ["Ploy"]],
    ]);
    await s.campfire.stop();
  });

  it("clears everything when no coworking channel is set", async () => {
    const s = await started({ setting: null });
    s.seat("10", ROOM, "Ploy");
    s.client.emit(Events.ShardReady, 0);
    await flush();
    s.move("10", null);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, null, [], []],
    ]);
    await s.campfire.stop();
  });

  // -------------------------------------------------------------------------
  // Only while students can see the channel
  // -------------------------------------------------------------------------

  it("a channel staff make private empties the campfire at once, and nothing per person is written", async () => {
    const s = await ready();
    s.seat("10", ROOM, "Ploy");
    s.move("20", ROOM, "Mek");
    await flush();
    expect(s.calls).toEqual([["shift_quest_voice_set", GUILD, "20", ROOM, "Mek"]]);

    s.calls.length = 0;
    s.permit(ROOM, [STAFF]);
    await flush();
    expect(s.calls).toEqual([["shift_quest_voice_sync", GUILD, ROOM, [], []]]);
    expect(warns).toHaveBeenCalledTimes(1);
    const warned = warns.mock.calls.flat().join(" ");
    expect(warned).toContain("not open to students");
    expect(warned).not.toMatch(/Ploy|Mek/);

    // Joins, renames and leaves in the private room: not one write.
    s.calls.length = 0;
    s.move("30", ROOM, "Fon");
    s.move("20", ROOM, "Mek (staff)");
    s.move("10", null);
    await flush();
    expect(s.calls).toEqual([]);

    // The settle resync after the ready, then heartbeats only beat; the
    // five-minute resync keeps it empty, with no second warning.
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, [], []],
    ]);
    s.calls.length = 0;
    await jest.advanceTimersByTimeAsync(4 * 60_000);
    await flush();
    expect(s.calls.map((c) => c[0])).toEqual(Array(4).fill("shift_quest_voice_beat"));
    s.calls.length = 0;
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, [], []],
    ]);
    expect(warns).toHaveBeenCalledTimes(1);
    await s.campfire.stop();
  });

  it("puts everyone back when the channel opens to students again", async () => {
    const s = await ready();
    s.seat("10", ROOM, "Ploy");
    s.permit(ROOM, [STAFF]);
    await flush();
    s.move("20", ROOM, "Mek");
    await flush();

    s.calls.length = 0;
    s.permit(ROOM, [GUILD]);
    await flush();
    expect(s.calls).toEqual([["shift_quest_voice_sync", GUILD, ROOM, ["10", "20"], ["Ploy", "Mek"]]]);

    // Open again: per-person writes resume.
    s.calls.length = 0;
    s.move("10", null);
    await flush();
    expect(s.calls).toEqual([["shift_quest_voice_set", GUILD, "10", null, null]]);
    await s.campfire.stop();
  });

  it("a role permission edit (no channel event) is caught by the next heartbeat, both ways", async () => {
    const s = await ready();
    s.seat("10", ROOM, "Ploy");
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();

    s.calls.length = 0;
    s.permit(ROOM, [STAFF], { silent: true });
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, [], []],
    ]);

    s.calls.length = 0;
    s.permit(ROOM, [GUILD], { silent: true });
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, ["10"], ["Ploy"]],
    ]);
    await s.campfire.stop();
  });

  it("a voice update after a silent permission change resyncs empty instead of writing the person", async () => {
    const s = await ready();
    s.permit(ROOM, [STAFF], { silent: true });
    s.move("10", ROOM, "Ploy");
    s.move("20", ROOM, "Mek");
    await flush();
    expect(s.calls).toEqual([["shift_quest_voice_sync", GUILD, ROOM, [], []]]);
    expect(warns.mock.calls.flat().join(" ")).not.toMatch(/Ploy|Mek/);
    await s.campfire.stop();
  });

  it("drops a queued write when the channel closed while it waited", async () => {
    const s = await ready();
    const release = s.hold("shift_quest_voice_set");
    s.move("10", ROOM, "Ploy");
    s.move("20", ROOM, "Mek");
    await flush();
    s.access.set(ROOM, new Set([STAFF]));
    release();
    await flush();
    expect(s.calls).toEqual([["shift_quest_voice_set", GUILD, "10", ROOM, "Ploy"]]);

    s.calls.length = 0;
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, [], []],
    ]);
    await s.campfire.stop();
  });

  it("resyncs on ChannelUpdate or ChannelDelete of the coworking channel only", async () => {
    const s = await ready();
    s.seat("10", ROOM, "Ploy");
    const other = s.guild.channels.cache.get(OTHER);
    s.client.emit(Events.ChannelUpdate, other, other);
    s.client.emit(Events.ChannelDelete, other);
    await flush();
    expect(s.calls).toEqual([]);

    // A rename or a topic edit: still open, the same people.
    const room = s.guild.channels.cache.get(ROOM);
    s.client.emit(Events.ChannelUpdate, room, room);
    await flush();
    expect(s.calls).toEqual([["shift_quest_voice_sync", GUILD, ROOM, ["10"], ["Ploy"]]]);

    s.calls.length = 0;
    s.guild.channels.cache.delete(ROOM);
    s.client.emit(Events.ChannelDelete, room);
    await flush();
    expect(s.calls).toEqual([["shift_quest_voice_sync", GUILD, ROOM, [], []]]);
    expect(warns).toHaveBeenCalledTimes(1);
    expect(warns.mock.calls[0].join(" ")).not.toContain("Ploy");
    await s.campfire.stop();
  });

  it("follows the student roles: a role list that cannot see the channel closes it, one that can opens it", async () => {
    const s = await started();
    s.access.set(ROOM, new Set([STUDENT]));
    s.setting.roles = [STUDENT];
    s.seat("10", ROOM, "Ploy");
    s.client.emit(Events.ShardReady, 0);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, ["10"], ["Ploy"]],
    ]);
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();

    // An admin swaps the student role for one that cannot see the room.
    s.calls.length = 0;
    s.setting.roles = [STAFF];
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, [], []],
    ]);
    s.calls.length = 0;
    s.move("20", ROOM, "Mek");
    await flush();
    expect(s.calls).toEqual([]);

    // No student role at all: @everyone decides, and it cannot see the room either.
    s.setting.roles = [];
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(s.calls).toEqual([["shift_quest_voice_beat", GUILD]]);

    s.calls.length = 0;
    s.setting.roles = [STAFF, STUDENT];
    await jest.advanceTimersByTimeAsync(60_000);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, ["10", "20"], ["Ploy", "Mek"]],
    ]);
    await s.campfire.stop();
  });

  it("treats a heartbeat without a role list as closed", async () => {
    const s = await started();
    (s.api.call as jest.Mock).mockImplementationOnce(async (fn: string, ...args: unknown[]) => {
      s.calls.push([fn, ...args]);
      return { channel_id: ROOM };
    });
    s.seat("10", ROOM, "Ploy");
    s.client.emit(Events.ShardReady, 0);
    await flush();
    expect(s.calls).toEqual([
      ["shift_quest_voice_beat", GUILD],
      ["shift_quest_voice_sync", GUILD, ROOM, [], []],
    ]);
    await s.campfire.stop();
  });

  it("stop waits for pending writes, empties the campfire and stops listening", async () => {
    const s = await ready();
    const release = s.hold("shift_quest_voice_set");
    s.move("10", ROOM, "Ploy");
    await flush();
    const stopping = s.campfire.stop();
    await flush();
    expect(s.calls).toEqual([["shift_quest_voice_set", GUILD, "10", ROOM, "Ploy"]]);
    release();
    await stopping;
    expect(s.calls).toEqual([
      ["shift_quest_voice_set", GUILD, "10", ROOM, "Ploy"],
      ["shift_quest_voice_sync", GUILD, ROOM, [], []],
    ]);
    expect(s.client.listenerCount(Events.VoiceStateUpdate)).toBe(0);
    expect(s.client.listenerCount(Events.ShardReady)).toBe(0);
    expect(s.client.listenerCount(Events.ChannelUpdate)).toBe(0);
    expect(s.client.listenerCount(Events.ChannelDelete)).toBe(0);

    s.calls.length = 0;
    s.move("20", ROOM, "Mek");
    await jest.advanceTimersByTimeAsync(10 * 60_000);
    await flush();
    expect(s.calls).toEqual([]);
  });

  it("stop never throws when the database is gone", async () => {
    const s = await ready();
    s.failNext.add("shift_quest_voice_sync");
    await expect(s.campfire.stop()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Setting the coworking channel
// ---------------------------------------------------------------------------

describe("/admin channel", () => {
  it("accepts a text or a voice channel", () => {
    const adminCommand = questCommands().find((c) => c.name === "admin");
    const sub = adminCommand?.options?.find((o) => o.name === "channel") as { options?: { name: string; channel_types?: number[] }[] } | undefined;
    const option = sub?.options?.find((o) => o.name === "channel");
    expect(option?.channel_types).toEqual([ChannelType.GuildText, ChannelType.GuildVoice]);
  });

  it("tells an admin a voice channel lights the campfire, set or not", () => {
    const status = (coworking: string | null) => ({
      settings: {
        student_role_ids: ["777"],
        help_channel_id: "801",
        staff_channel_id: "802",
        celebrate_channel_id: "803",
        coworking_channel_id: coworking,
        reward_terms: true,
        redemption_terms: true,
        fulfillment_process: true,
        fulfillment_owner: "ครู",
      },
      live: {},
      blockers: {},
      rules: [],
      staff: { admin: 1, reviewer: 1, fulfillment: 1 },
      outbox: { pending: 0, blocked: 0, failed: 0 },
      data_requests_open: 0,
    });
    const hint = "(ห้องเสียงได้: คนในห้องจะนั่งรอบกองไฟบนเกาะ)";
    expect(bodyText(renderView(statusView(status(ROOM) as never)))).toContain(`✅ ห้อง coworking: <#${ROOM}> ${hint}`);
    expect(bodyText(renderView(statusView(status(null) as never)))).toContain(`⚠️ ห้อง coworking: ยังไม่ตั้ง ${hint}`);
  });
});

// ---------------------------------------------------------------------------
// Only on a database that has the campfire functions
// ---------------------------------------------------------------------------

describe("campfire gate", () => {
  let logs: jest.SpyInstance;

  beforeEach(() => {
    logs = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => logs.mockRestore());

  it("starts from schema 7 and says once when it is off", () => {
    const start = jest.fn(() => ({ stop: async () => undefined }));
    expect(CAMPFIRE_SCHEMA).toBe(7);
    expect(campfireFor(6, start)).toBeNull();
    expect(start).not.toHaveBeenCalled();
    expect(logs).toHaveBeenCalledWith("[shift-quests] campfire off (schema 6 < 7)");
    expect(campfireFor(7, start)).not.toBeNull();
    expect(campfireFor(8, start)).not.toBeNull();
    expect(start).toHaveBeenCalledTimes(2);
  });

  function fakePool(version: number) {
    const log: string[] = [];
    const pool = {
      query: jest.fn(async (sql: string) => {
        const fn = /public\.(shift_quest_[a-z_]+)\(/.exec(sql)?.[1] ?? sql;
        log.push(fn);
        return { rows: [{ r: fn === "shift_quest_schema_version" ? version : null }] };
      }),
      end: jest.fn(async () => {
        log.push("end");
      }),
    };
    (createRolePool as jest.Mock).mockReturnValue(pool);
    return log;
  }

  const env = { guildId: GUILD, databaseUrl: "postgres://bot@127.0.0.1:5432/quests" };

  it("registerShiftQuests on schema 6: no voice listener, and the bot still runs", async () => {
    const log = fakePool(6);
    const client = new EventEmitter();
    const quests = await registerShiftQuests(client as unknown as Client, env);
    expect(client.listenerCount(Events.VoiceStateUpdate)).toBe(0);
    expect(logs).toHaveBeenCalledWith("[shift-quests] campfire off (schema 6 < 7)");
    await quests.stop();
    expect(log).toEqual(["shift_quest_schema_version", "end"]);
  });

  it("registerShiftQuests on schema 7: listens, and empties the campfire before the pool closes", async () => {
    const log = fakePool(7);
    const client = new EventEmitter();
    const quests = await registerShiftQuests(client as unknown as Client, env);
    expect(client.listenerCount(Events.VoiceStateUpdate)).toBe(1);
    await quests.stop();
    expect(client.listenerCount(Events.VoiceStateUpdate)).toBe(0);
    expect(log).toEqual(["shift_quest_schema_version", "shift_quest_voice_sync", "end"]);
  });
});
