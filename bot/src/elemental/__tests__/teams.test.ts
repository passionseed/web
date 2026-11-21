/**
 * @jest-environment node
 */
import { randomUUID } from "node:crypto";

import { PermissionFlagsBits, type Client, type MessageCreateOptions } from "discord.js";

import { candidateSlots } from "../../../../lib/elemental/island/sectors";
import { ElementalError, type ElementalApi } from "../api";
import {
  BOT_ALLOW,
  CATEGORY_LIMIT,
  ChannelPlanError,
  EVERYONE_DENY,
  MEMBER_ALLOW,
  enqueueTeamChannel,
  onTeamLive,
  pickCategory,
  setChannelPortFactory,
  sweepPendingTeams,
  teamChannelName,
  teamOverwrites,
  type ChannelInfo,
  type GuildChannelPort,
  type PlannedOverwrite,
  type TeamJson,
} from "../channels";
import { createEvents, createSettingsCache, normalizeSettings, type ElementalRuntime, type ElementalSettings } from "../context";
import { COPY } from "../copy/teams";
import { handleElementalInteraction } from "../index";
import { createKeyedQueue } from "../queue";
import { buildRegistry } from "../registry";
import { ELEMENTS, type ElementKey } from "../roles";
import { ACTIONS, clearDrafts, createWindow, feature } from "../features/teams";

// ---------------------------------------------------------------------------
// Fixtures: made-up snowflakes only, no names.
// ---------------------------------------------------------------------------

const GUILD = "100000000000000001";
const BOT = "190000000000000001";
const START_HERE = "400000000000000001";
const ROLE = {
  host: "300000000000000001",
  helper: "300000000000000002",
  mentor: "300000000000000003",
  judge: "300000000000000004",
  safety: "300000000000000005",
  paid: "300000000000000006",
  water: "300000000000000010",
  earth: "300000000000000011",
  air: "300000000000000012",
  fire: "300000000000000013",
  aether: "300000000000000014",
};
const CATS: Record<ElementKey, string[]> = {
  water: ["500000000000000010", "500000000000000011"],
  earth: ["500000000000000020", "500000000000000021"],
  air: ["500000000000000030", "500000000000000031"],
  fire: ["500000000000000040", "500000000000000041", "500000000000000042"],
  aether: ["500000000000000050", "500000000000000051"],
};

const user = (n: number) => `2000000000000${String(n).padStart(5, "0")}`;
const CREATOR = user(1);
const A = user(2);
const B = user(3);
const OUTSIDER = user(99);

function rawSettings(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    guild_id: GUILD,
    edition: "elemental-dryrun",
    edition_kind: "rehearsal",
    roles: ROLE,
    channels: { start_here: START_HERE },
    element_categories: CATS,
    team_create_opens_at: new Date(Date.now() - 3_600_000).toISOString(),
    team_create_closes_at: new Date(Date.now() + 3_600_000).toISOString(),
    ...over,
  };
}

function settingsOf(over: Record<string, unknown> = {}): ElementalSettings {
  return normalizeSettings(rawSettings(over), GUILD)!;
}

// ---------------------------------------------------------------------------
// A fake of the elemental_bot_* functions this feature calls, mirroring E09.
// ---------------------------------------------------------------------------

interface FakeTeam {
  id: string;
  status: TeamJson["status"];
  slot: number | null;
  element: ElementKey;
  name: string;
  channelId: string | null;
  creator: string;
  invites: { id: string; state: string; creator: boolean }[];
}

class FakeDb {
  settings: Record<string, unknown> = rawSettings();
  claimed = new Set<string>();
  teamOf = new Map<string, string>();
  teams = new Map<string, FakeTeam>();
  posts = new Map<string, string>();
  calls: string[] = [];
  writes: string[] = [];

  claim(...ids: string[]) {
    for (const id of ids) this.claimed.add(id);
  }

  json(t: FakeTeam): TeamJson {
    const live = t.status === "channel_pending" || t.status === "active";
    return {
      team_id: t.id,
      edition: "elemental-dryrun",
      status: t.status,
      slot: t.slot,
      element: t.element,
      project_name: t.name,
      channel_id: t.channelId,
      lit: false,
      member_ids: live ? [...this.teamOf].filter(([, team]) => team === t.id).map(([u]) => u) : [],
      invites: t.invites.map((i) => ({ discord_user_id: i.id, state: i.state, is_creator: i.creator, expires_at: "2026-12-05T00:00:00Z" })),
    };
  }

  liveTeam(u: string): FakeTeam | null {
    const t = this.teams.get(this.teamOf.get(u) ?? "");
    return t && (t.status === "channel_pending" || t.status === "active") ? t : null;
  }

  /** Activates like elemental__activate: first free candidate slot, members joined. */
  activate(t: FakeTeam, slots: number[]) {
    const taken = new Set([...this.teams.values()].map((x) => x.slot).filter((s) => s !== null));
    t.slot = slots.find((s) => !taken.has(s)) ?? null;
    if (t.slot === null) throw new ElementalError("island_full");
    t.status = "channel_pending";
    for (const inv of t.invites) if (inv.state === "accepted") this.teamOf.set(inv.id, t.id);
  }

  /** A live team straight into the store (the restart and burst tests). */
  liveTeamFixture(element: ElementKey, members: string[], channelId: string | null = null): FakeTeam {
    const t: FakeTeam = {
      id: randomUUID(),
      status: "pending",
      slot: null,
      element,
      name: `Project ${this.teams.size + 1}`,
      channelId,
      creator: members[0],
      invites: members.map((id, n) => ({ id, state: "accepted", creator: n === 0 })),
    };
    this.teams.set(t.id, t);
    this.claim(...members);
    this.activate(t, candidateSlots(element));
    if (channelId) t.status = "active";
    return t;
  }

  call(fn: string, args: unknown[]): unknown {
    this.calls.push(fn);
    const [, a1, a2, a3, a4] = args as [string, string, string, unknown, unknown];
    switch (fn) {
      case "elemental_bot_settings_get":
        return this.settings;
      case "elemental_bot_member_get": {
        if (!this.claimed.has(a1)) return null;
        const t = this.liveTeam(a1);
        return { member_id: `m-${a1}`, team: t ? this.json(t) : null };
      }
      case "elemental_bot_team_create": {
        this.writes.push(fn);
        const t: FakeTeam = {
          id: randomUUID(),
          status: "pending",
          slot: null,
          element: a3 as ElementKey,
          name: a2,
          channelId: null,
          creator: a1,
          invites: [{ id: a1, state: "accepted", creator: true }, ...(a4 as string[]).map((id) => ({ id, state: "pending", creator: false }))],
        };
        this.teams.set(t.id, t);
        return { ...this.json(t), repeated: false };
      }
      case "elemental_bot_team_accept": {
        this.writes.push(fn);
        const t = this.teams.get(a1);
        if (!t) throw new ElementalError("team_not_found");
        const inv = t.invites.find((i) => i.id === a2);
        if (!inv) throw new ElementalError("invite_not_found");
        if (inv.state === "accepted") return { ...this.json(t), activated: false, joined: false, repeated: true };
        inv.state = "accepted";
        let activated = false;
        let joined = false;
        if (t.status === "pending") {
          this.activate(t, a3 as number[]);
          activated = true;
        } else {
          this.teamOf.set(a2, t.id);
          joined = true;
        }
        return { ...this.json(t), activated, joined, repeated: false };
      }
      case "elemental_bot_team_decline": {
        this.writes.push(fn);
        const inv = this.teams.get(a1)?.invites.find((i) => i.id === a2);
        if (!inv) throw new ElementalError("invite_not_found");
        inv.state = "declined";
        return this.json(this.teams.get(a1)!);
      }
      case "elemental_bot_team_get": {
        const t = this.teams.get(a1);
        return t ? this.json(t) : null;
      }
      case "elemental_bot_team_set_channel": {
        this.writes.push(fn);
        const t = this.teams.get(a1)!;
        if ([...this.teams.values()].some((x) => x !== t && x.channelId === a2)) throw new ElementalError("channel_in_use");
        t.channelId = a2;
        t.status = "active";
        return this.json(t);
      }
      case "elemental_bot_post_claim": {
        const key = `${a1}:${a2}`;
        const state = this.posts.get(key);
        if (state === undefined || state === "failed") {
          this.posts.set(key, "claimed");
          return true;
        }
        return false;
      }
      case "elemental_bot_post_mark":
        this.posts.set(`${a1}:${a2}`, a3);
        return true;
      default:
        throw new Error(`unexpected ${fn}`);
    }
  }

  rows(fn: string): unknown[] {
    this.calls.push(fn);
    if (fn !== "elemental_bot_teams_channel_pending") throw new Error(`unexpected ${fn}`);
    return [...this.teams.values()]
      .filter((t) => t.status === "channel_pending")
      .map((t) => ({ team_id: t.id, slot: t.slot, element: t.element, project_name: t.name, member_ids: this.json(t).member_ids }));
  }

  api(): ElementalApi {
    return {
      call: (async (fn: string, ...args: unknown[]) => this.call(fn, args)) as ElementalApi["call"],
      rows: (async (fn: string) => this.rows(fn)) as ElementalApi["rows"],
    };
  }
}

// ---------------------------------------------------------------------------
// A fake Discord server behind the GuildChannelPort.
// ---------------------------------------------------------------------------

interface FakeChannel extends ChannelInfo {
  overwrites: PlannedOverwrite[];
  messages: { id: string; content: string; pinned: boolean; payload: MessageCreateOptions }[];
}

let nextId = 700000000000000000n;
const snow = () => String(++nextId);

class FakeGuild implements GuildChannelPort {
  channels: FakeChannel[] = [];
  creates = 0;
  /** Return an error to throw it from that create call (1-based). */
  failCreate: (n: number) => unknown = () => null;
  failSend: (n: number) => unknown = () => null;
  sends = 0;

  constructor() {
    for (const id of Object.values(CATS).flat()) this.channels.push({ id, name: `cat-${id.slice(-2)}`, parentId: null, kind: "category", overwrites: [], messages: [] });
    this.channels.push({ id: START_HERE, name: "start-here", parentId: null, kind: "text", overwrites: [], messages: [] });
  }

  botUserId() {
    return BOT;
  }
  async list() {
    return this.channels.map(({ id, name, parentId, kind }) => ({ id, name, parentId, kind }));
  }
  async createText(input: { name: string; parentId: string; overwrites: PlannedOverwrite[] }) {
    this.creates += 1;
    const err = this.failCreate(this.creates);
    if (err) throw err;
    const ch: FakeChannel = { id: snow(), name: input.name, parentId: input.parentId, kind: "text", overwrites: input.overwrites, messages: [] };
    this.channels.push(ch);
    return { id: ch.id, name: ch.name, parentId: ch.parentId, kind: ch.kind };
  }
  async edit(channelId: string, input: { name?: string; parentId?: string; overwrites?: PlannedOverwrite[] }) {
    const ch = this.byId(channelId);
    if (input.name !== undefined) ch.name = input.name;
    if (input.parentId !== undefined) ch.parentId = input.parentId;
    if (input.overwrites) ch.overwrites = input.overwrites;
  }
  async send(channelId: string, payload: MessageCreateOptions) {
    this.sends += 1;
    const err = this.failSend(this.sends);
    if (err) throw err;
    const msg = { id: snow(), content: String(payload.content ?? ""), pinned: false, payload };
    this.byId(channelId).messages.push(msg);
    return { id: msg.id };
  }
  async pin(channelId: string, messageId: string) {
    this.byId(channelId).messages.find((m) => m.id === messageId)!.pinned = true;
  }
  byId(id: string): FakeChannel {
    const ch = this.channels.find((c) => c.id === id);
    if (!ch) throw Object.assign(new Error("Unknown Channel"), { status: 404 });
    return ch;
  }
  teamChannels() {
    return this.channels.filter((c) => c.kind === "text" && c.id !== START_HERE);
  }
}

const rateLimited = (seconds = 0.5) => Object.assign(new Error("429"), { status: 429, rawError: { retry_after: seconds } });

function setup() {
  const db = new FakeDb();
  const guild = new FakeGuild();
  const sleeps: number[] = [];
  const api = db.api();
  const rt: ElementalRuntime = {
    client: {} as Client,
    api,
    env: { guildIds: [GUILD], databaseUrl: "postgresql://stub", cardUrl: null, cardSecret: null },
    settings: createSettingsCache(api),
    queues: {
      channels: createKeyedQueue("channels", { sleep: async (ms) => void sleeps.push(ms), onRetry: () => undefined }),
      canvas: createKeyedQueue("canvas", { sleep: async () => undefined }),
    },
    events: createEvents(),
    connected: () => true,
  };
  setChannelPortFactory(rt, () => guild);
  return { db, guild, rt, sleeps };
}

// ---------------------------------------------------------------------------
// A minimal Discord interaction.
// ---------------------------------------------------------------------------

type Kind = "command" | "modal" | "button" | "string" | "users";

function interaction(kind: Kind, o: { user?: string; customId?: string; values?: string[]; name?: string; bots?: string[]; roles?: string[] } = {}) {
  const sent: { how: string; payload: unknown }[] = [];
  const i: Record<string, unknown> = {
    guildId: GUILD,
    channelId: START_HERE,
    user: { id: o.user ?? CREATOR },
    member: { roles: o.roles ?? [ROLE.paid] },
    commandName: "team",
    customId: o.customId ?? "el|x",
    deferred: false,
    replied: false,
    values: o.values ?? [],
    users: (o.values ?? []).map((id) => ({ id, bot: (o.bots ?? []).includes(id) })),
    fields: { getTextInputValue: () => o.name ?? "" },
    inGuild: () => true,
    isAutocomplete: () => false,
    isChatInputCommand: () => kind === "command",
    isMessageComponent: () => kind === "button" || kind === "string" || kind === "users",
    isButton: () => kind === "button",
    isStringSelectMenu: () => kind === "string",
    isUserSelectMenu: () => kind === "users",
    isModalSubmit: () => kind === "modal",
    isFromMessage: () => false,
    options: { getSubcommand: () => (kind === "command" ? "create" : null) },
    deferReply: jest.fn(async () => {
      i.deferred = true;
    }),
    deferUpdate: jest.fn(async () => {
      i.deferred = true;
    }),
    showModal: jest.fn(async (p: unknown) => {
      i.replied = true;
      sent.push({ how: "modal", payload: p });
    }),
    reply: jest.fn(async (p: unknown) => {
      i.replied = true;
      sent.push({ how: "reply", payload: p });
    }),
    editReply: jest.fn(async (p: unknown) => {
      i.replied = true;
      sent.push({ how: "editReply", payload: p });
    }),
    followUp: jest.fn(async (p: unknown) => {
      sent.push({ how: "followUp", payload: p });
    }),
    deleteReply: jest.fn(async () => undefined),
  };
  return { i: i as never, raw: i as Record<string, jest.Mock>, sent };
}

const reg = buildRegistry([feature]);
const text = (p: unknown) => (typeof p === "string" ? p : String((p as { content?: string })?.content ?? ""));

async function run(rt: ElementalRuntime, kind: Kind, o: Parameters<typeof interaction>[1] = {}) {
  const made = interaction(kind, o);
  await handleElementalInteraction(rt, made.i, reg);
  return made;
}

/** Runs the whole create flow up to "send invites". */
async function createTeam(rt: ElementalRuntime, invitees: string[], element: ElementKey = "fire", name = "Water Filter Lab") {
  await run(rt, "modal", { customId: `el|${ACTIONS.name}`, name });
  await run(rt, "string", { customId: `el|${ACTIONS.element}`, values: [element] });
  await run(rt, "users", { customId: `el|${ACTIONS.members}`, values: invitees });
  return run(rt, "button", { customId: `el|${ACTIONS.create}` });
}

function inviteButtons(guild: FakeGuild): { inviteeId: string; accept: string; decline: string; content: string; mentions: unknown }[] {
  return guild.byId(START_HERE).messages.map((m) => {
    const row = (m.payload.components as { components: { custom_id: string }[] }[])[0];
    return {
      inviteeId: row.components[0].custom_id.split("|")[3],
      accept: row.components[0].custom_id,
      decline: row.components[1].custom_id,
      content: m.content,
      mentions: m.payload.allowedMentions,
    };
  });
}

beforeEach(() => clearDrafts());

// ---------------------------------------------------------------------------
// Overwrites and names
// ---------------------------------------------------------------------------

describe("team channel overwrites", () => {
  const settings = settingsOf();

  test("deny @everyone; allow members, Host, Helper, Mentor and the bot; never Judge", () => {
    const ow = teamOverwrites({ guildId: GUILD, settings, memberIds: [A, B], botUserId: BOT });
    expect(ow[0]).toEqual({ id: GUILD, type: "role", allow: 0n, deny: EVERYONE_DENY });
    const roles = ow.filter((o) => o.type === "role" && o.id !== GUILD).map((o) => o.id);
    expect(roles).toEqual([ROLE.host, ROLE.helper, ROLE.mentor]);
    expect(ow.map((o) => o.id)).not.toContain(ROLE.judge);
    expect(ow.filter((o) => o.type === "member").map((o) => o.id)).toEqual([A, B, BOT]);
    expect(ow.find((o) => o.id === BOT)!.allow).toBe(BOT_ALLOW);
    for (const o of ow.filter((x) => x.id !== GUILD && x.id !== BOT)) {
      expect(o.allow & PermissionFlagsBits.ViewChannel).toBe(PermissionFlagsBits.ViewChannel);
      expect(o.allow).toBe(MEMBER_ALLOW);
    }
  });

  test("always includes Host and never Judge, whatever the member list (property check)", () => {
    for (let n = 2; n <= 5; n++) {
      const members = Array.from({ length: n }, (_, k) => user(10 + k));
      const ow = teamOverwrites({ guildId: GUILD, settings, memberIds: members, botUserId: BOT });
      expect(ow.some((o) => o.id === ROLE.host && o.type === "role")).toBe(true);
      expect(ow.some((o) => o.id === ROLE.judge)).toBe(false);
      // Staff are only ever roles: no single adult is let in as a person.
      const people = ow.filter((o) => o.type === "member" && o.id !== BOT);
      expect(people.map((o) => o.id)).toEqual(members);
      expect(people.length).toBeGreaterThanOrEqual(2);
    }
  });

  test("never exactly 1 member plus 1 adult: a lone member is refused", () => {
    expect(() => teamOverwrites({ guildId: GUILD, settings, memberIds: [A], botUserId: BOT })).toThrow(ChannelPlanError);
    expect(() => teamOverwrites({ guildId: GUILD, settings, memberIds: [A, A], botUserId: BOT })).toThrow(/too_few_members/);
    // Role ids, the bot or @everyone passed as a "member" do not count as people.
    expect(() => teamOverwrites({ guildId: GUILD, settings, memberIds: [A, ROLE.host], botUserId: BOT })).toThrow(/too_few_members/);
    expect(() => teamOverwrites({ guildId: GUILD, settings, memberIds: [A, BOT], botUserId: BOT })).toThrow(/too_few_members/);
  });

  test("no Host role (or Host equal to Judge) refuses instead of a channel without Host", () => {
    const noHost = settingsOf({ roles: { ...ROLE, host: undefined } });
    expect(() => teamOverwrites({ guildId: GUILD, settings: noHost, memberIds: [A, B], botUserId: BOT })).toThrow(/no_host_role/);
    const hostIsJudge = settingsOf({ roles: { ...ROLE, host: ROLE.judge } });
    expect(() => teamOverwrites({ guildId: GUILD, settings: hostIsJudge, memberIds: [A, B], botUserId: BOT })).toThrow(/no_host_role/);
  });

  test("a Helper role misconfigured as the Judge role is left out", () => {
    const s = settingsOf({ roles: { ...ROLE, helper: ROLE.judge } });
    const ow = teamOverwrites({ guildId: GUILD, settings: s, memberIds: [A, B], botUserId: BOT });
    expect(ow.map((o) => o.id)).not.toContain(ROLE.judge);
    expect(ow.map((o) => o.id)).toContain(ROLE.host);
  });

  test("channel name has the form fire-07, element and slot only", () => {
    expect(teamChannelName("fire", 7)).toBe("fire-07");
    expect(teamChannelName("aether", 123)).toBe("aether-123");
    expect(() => teamChannelName("lava" as ElementKey, 7)).toThrow(ChannelPlanError);
    expect(() => teamChannelName("fire", 0)).toThrow(ChannelPlanError);
  });

  test("a full category rolls over to the next; all full refuses", () => {
    const filled = (cat: string, n: number): ChannelInfo[] =>
      Array.from({ length: n }, (_, k) => ({ id: `${cat}-${k}`, name: `fire-${k}`, parentId: cat, kind: "text" as const }));
    expect(pickCategory(settings, "fire", [])).toBe(CATS.fire[0]);
    expect(pickCategory(settings, "fire", filled(CATS.fire[0], CATEGORY_LIMIT - 1))).toBe(CATS.fire[0]);
    expect(pickCategory(settings, "fire", filled(CATS.fire[0], CATEGORY_LIMIT))).toBe(CATS.fire[1]);
    expect(pickCategory(settings, "fire", [...filled(CATS.fire[0], 50), ...filled(CATS.fire[1], 50)])).toBe(CATS.fire[2]);
    expect(() => pickCategory(settings, "fire", CATS.fire.flatMap((c) => filled(c, 50)))).toThrow(/category_full/);
    expect(() => pickCategory(settingsOf({ element_categories: {} }), "fire", [])).toThrow(/no_category/);
  });
});

// ---------------------------------------------------------------------------
// /team create
// ---------------------------------------------------------------------------

describe("/team create", () => {
  test("the window is [opens_at, closes_at); no opens_at is not open", () => {
    const now = Date.parse("2026-12-04T12:00:00Z");
    expect(createWindow({ teamCreateOpensAt: null, teamCreateClosesAt: null }, now)).toBe("not_yet");
    expect(createWindow({ teamCreateOpensAt: "2026-12-04T13:00:00Z", teamCreateClosesAt: null }, now)).toBe("not_yet");
    expect(createWindow({ teamCreateOpensAt: "2026-12-04T12:00:00Z", teamCreateClosesAt: null }, now)).toBe("open");
    expect(createWindow({ teamCreateOpensAt: "2026-12-04T11:00:00Z", teamCreateClosesAt: "2026-12-04T12:00:00Z" }, now)).toBe("closed");
  });

  test("before opens_at the command is refused and no form opens", async () => {
    const { db, rt } = setup();
    db.settings = rawSettings({ team_create_opens_at: new Date(Date.now() + 60_000).toISOString() });
    const { raw, sent } = await run(rt, "command");
    expect(raw.showModal).not.toHaveBeenCalled();
    expect(text(sent[0].payload)).toBe(COPY.notOpenYet);
    expect(db.writes).toEqual([]);
  });

  test("after closes_at, or with no opens_at, it is refused too", async () => {
    const { db, rt } = setup();
    db.settings = rawSettings({ team_create_closes_at: new Date(Date.now() - 60_000).toISOString() });
    const closed = await run(rt, "command");
    expect(closed.raw.showModal).not.toHaveBeenCalled();
    expect(text(closed.sent[0].payload)).toBe(COPY.closed);

    const fresh = setup();
    fresh.db.settings = rawSettings({ team_create_opens_at: null });
    const unset = await run(fresh.rt, "command");
    expect(unset.raw.showModal).not.toHaveBeenCalled();
  });

  test("an unpaid member is refused before the form", async () => {
    const { rt } = setup();
    const { raw } = await run(rt, "command", { roles: [] });
    expect(raw.showModal).not.toHaveBeenCalled();
  });

  test("open: the command shows the project-name form first, with no defer", async () => {
    const { rt } = setup();
    const { raw, sent } = await run(rt, "command");
    expect(raw.deferReply).not.toHaveBeenCalled();
    expect(raw.showModal).toHaveBeenCalledTimes(1);
    expect((sent[0].payload as { custom_id: string }).custom_id).toBe(`el|${ACTIONS.name}`);
  });

  test("a project name with a contact is refused, names the field, never echoes it, and re-opens the form", async () => {
    const { db, rt } = setup();
    const { sent } = await run(rt, "modal", { customId: `el|${ACTIONS.name}`, name: "call 0812345678" });
    const reply = sent.at(-1)!.payload as { content: string; components: { components: { custom_id: string }[] }[] };
    expect(reply.content).toBe(COPY.namePii);
    expect(reply.content).not.toContain("0812345678");
    expect(reply.components[0].components[0].custom_id).toBe(`el|${ACTIONS.reopen}`);
    // No draft: "send invites" now says start again.
    const go = await run(rt, "button", { customId: `el|${ACTIONS.create}` });
    expect(text(go.sent.at(-1)!.payload)).toBe(COPY.draftGone);
    expect(db.writes).toEqual([]);
  });

  test.each([
    ["a team of 1 (no teammates)", []],
    ["a team of 6 (5 teammates)", [user(2), user(3), user(4), user(5), user(6)]],
  ])("%s is refused with no database write", async (_label, invitees) => {
    const { db, rt, guild } = setup();
    db.claim(CREATOR, ...invitees);
    const { sent } = await createTeam(rt, invitees);
    expect(text(sent.at(-1)!.payload)).toBe(COPY.teamSize);
    expect(db.calls).not.toContain("elemental_bot_team_create");
    expect(db.writes).toEqual([]);
    expect(guild.byId(START_HERE).messages).toHaveLength(0);
  });

  test("picking yourself does not count as a teammate", async () => {
    const { db, rt } = setup();
    db.claim(CREATOR, A);
    const { sent } = await createTeam(rt, [CREATOR]);
    expect(text(sent.at(-1)!.payload)).toBe(COPY.teamSize);
    expect(db.writes).toEqual([]);
  });

  test("an unclaimed invitee is refused with no database write", async () => {
    const { db, rt } = setup();
    db.claim(CREATOR, A);
    const { sent } = await createTeam(rt, [A, B]);
    expect(text(sent.at(-1)!.payload)).toContain(`<@${B}>`);
    expect(db.writes).toEqual([]);
  });

  test("an already-teamed invitee is refused with no database write", async () => {
    const { db, rt } = setup();
    db.liveTeamFixture("water", [user(50), B]);
    db.claim(CREATOR, A);
    const before = db.writes.length;
    const { sent } = await createTeam(rt, [A, B]);
    expect(text(sent.at(-1)!.payload)).toContain(`<@${B}>`);
    expect(db.writes.length).toBe(before);
  });

  test("an unclaimed creator is refused with no database write", async () => {
    const { db, rt } = setup();
    db.claim(A);
    await createTeam(rt, [A]);
    expect(db.writes).toEqual([]);
  });

  test("valid: one pending team, one invite per teammate in #start-here pinging only them", async () => {
    const { db, rt, guild } = setup();
    db.claim(CREATOR, A, B);
    const { sent } = await createTeam(rt, [A, B]);
    expect(db.writes).toEqual(["elemental_bot_team_create"]);
    const [team] = [...db.teams.values()];
    expect(team.status).toBe("pending");
    expect(team.slot).toBeNull();
    const invites = inviteButtons(guild);
    expect(invites.map((x) => x.inviteeId)).toEqual([A, B]);
    for (const x of invites) {
      expect(x.mentions).toEqual({ parse: [], users: [x.inviteeId] });
      expect(x.accept).toBe(`el|${ACTIONS.accept}|${team.id}|${x.inviteeId}|fire`);
      expect(x.content).toContain(`<@${x.inviteeId}>`);
    }
    expect(text(sent.at(-1)!.payload)).toContain(`<@${A}>`);
  });
});

// ---------------------------------------------------------------------------
// Accept / Decline
// ---------------------------------------------------------------------------

describe("invite answers", () => {
  async function pendingTeam() {
    const s = setup();
    s.db.claim(CREATOR, A, B);
    await createTeam(s.rt, [A, B]);
    const invites = inviteButtons(s.guild);
    return { ...s, team: [...s.db.teams.values()][0], invites };
  }

  test("a click by a non-invitee does nothing", async () => {
    const { db, rt, invites } = await pendingTeam();
    const writes = db.writes.length;
    for (const who of [OUTSIDER, CREATOR, B]) {
      const { raw, sent } = await run(rt, "button", { user: who, customId: invites[0].accept });
      expect(raw.editReply).not.toHaveBeenCalled();
      expect(sent.map((s) => s.how)).toEqual(["followUp"]);
      expect(text(sent[0].payload)).toBe(COPY.notYours);
    }
    const decline = await run(rt, "button", { user: OUTSIDER, customId: invites[0].decline });
    expect(decline.raw.editReply).not.toHaveBeenCalled();
    expect(db.writes.length).toBe(writes);
    expect(db.calls).not.toContain("elemental_bot_team_accept");
    expect(db.calls).not.toContain("elemental_bot_team_decline");
  });

  test("the invitee's Accept activates the team with sector slots and queues fire-NN with correct overwrites", async () => {
    const { db, rt, guild, team, invites } = await pendingTeam();
    const events: unknown[] = [];
    rt.events.on("team.activated", (p) => void events.push(p));
    const { raw, sent } = await run(rt, "button", { user: A, customId: invites[0].accept });
    await rt.queues.channels.idle();

    expect(team.slot).toBe(candidateSlots("fire")[0]);
    expect(team.status).toBe("active");
    expect(raw.editReply).toHaveBeenCalledWith(expect.objectContaining({ components: [] }));
    expect(text(sent.at(-1)!.payload)).toBe(COPY.activated(team.slot!));
    expect(events).toEqual([{ guildId: GUILD, edition: "elemental-dryrun", teamId: team.id, slot: team.slot, element: "fire" }]);

    const [channel] = guild.teamChannels();
    expect(channel.name).toBe(`fire-${String(team.slot).padStart(2, "0")}`);
    expect(channel.name).toMatch(/^fire-\d{2,3}$/);
    expect(CATS.fire).toContain(channel.parentId);
    expect(team.channelId).toBe(channel.id);
    const people = channel.overwrites.filter((o) => o.type === "member" && o.id !== BOT).map((o) => o.id);
    expect(people.sort()).toEqual([CREATOR, A].sort());
    expect(channel.overwrites.map((o) => o.id)).not.toContain(ROLE.judge);

    // Welcome: pinned once, plot number and the three steps.
    expect(channel.messages).toHaveLength(1);
    expect(channel.messages[0].pinned).toBe(true);
    expect(channel.messages[0].content).toContain(String(team.slot).padStart(2, "0"));
    expect(channel.messages[0].content).toContain("/canvas link");
    expect(channel.messages[0].content).toContain("/tester");
    expect(channel.messages[0].content).toContain("/checkin");
    expect(channel.messages[0].payload.allowedMentions).toEqual({ parse: [], users: expect.arrayContaining([CREATOR, A]) });

    // The second teammate joins later: their overwrite is added to the same channel.
    await run(rt, "button", { user: B, customId: invites[1].accept });
    await rt.queues.channels.idle();
    expect(guild.teamChannels()).toHaveLength(1);
    expect(channel.overwrites.filter((o) => o.type === "member" && o.id !== BOT)).toHaveLength(3);
    expect(channel.messages).toHaveLength(1);
    expect(db.writes.filter((w) => w === "elemental_bot_team_set_channel")).toHaveLength(1);
  });

  test("Decline by the invitee closes their invite only", async () => {
    const { db, rt, team, invites } = await pendingTeam();
    const { raw } = await run(rt, "button", { user: B, customId: invites[1].decline });
    expect(db.writes).toContain("elemental_bot_team_decline");
    expect(team.invites.find((x) => x.id === B)!.state).toBe("declined");
    expect(raw.editReply).toHaveBeenCalledWith(expect.objectContaining({ components: [] }));
    expect(team.status).toBe("pending");
  });

  test("an archived team's invite is closed, not an error", async () => {
    const { rt, team, invites } = await pendingTeam();
    team.status = "archived";
    // SQL raises el:team_archived for it.
    const api = rt.api;
    rt.api = {
      ...api,
      call: (async (fn: string, ...args: unknown[]) => {
        if (fn === "elemental_bot_team_accept") throw new ElementalError("team_archived");
        return api.call(fn, ...args);
      }) as ElementalApi["call"],
    };
    const made = interaction("button", { user: A, customId: invites[0].accept });
    await handleElementalInteraction(rt, made.i, reg);
    expect(made.raw.editReply).toHaveBeenCalledWith(expect.objectContaining({ content: COPY.inviteClosed, components: [] }));
  });
});

// ---------------------------------------------------------------------------
// The channel queue: bursts, 429s, restarts
// ---------------------------------------------------------------------------

describe("channel queue", () => {
  test("100 activations with injected 429s all end with a channel and correct overwrites", async () => {
    const { db, rt, guild, sleeps } = setup();
    // Every third create and every fifth welcome send hits a rate limit first.
    guild.failCreate = (n) => (n % 3 === 0 ? rateLimited(0.75) : null);
    guild.failSend = (n) => (n % 5 === 0 ? rateLimited(1.5) : null);
    const teams: FakeTeam[] = [];
    for (let k = 0; k < 100; k++) {
      const element = ELEMENTS[k % ELEMENTS.length];
      teams.push(db.liveTeamFixture(element, [user(1000 + k * 3), user(1001 + k * 3), user(1002 + k * 3)]));
    }
    const results = await Promise.all(teams.map((t) => onTeamLive(rt, GUILD, "elemental-dryrun", db.json(t))));
    await rt.queues.channels.idle();

    // A 429 on the welcome retries the whole sync, which then finds its channel: "synced".
    expect(results.filter((r) => r !== "created" && r !== "synced")).toEqual([]);
    expect(guild.creates).toBeGreaterThan(100);
    expect(sleeps.length).toBeGreaterThan(0);
    expect(sleeps).toContain(1000); // 0.75 s retry_after + 250 ms pad
    expect(sleeps).toContain(1750);
    const channels = guild.teamChannels();
    expect(channels).toHaveLength(100);
    expect(new Set(channels.map((c) => c.name)).size).toBe(100);
    for (const t of teams) {
      expect(t.status).toBe("active");
      const ch = guild.byId(t.channelId!);
      expect(ch.name).toBe(teamChannelName(t.element, t.slot!));
      expect(CATS[t.element]).toContain(ch.parentId);
      expect(ch.overwrites).toEqual(teamOverwrites({ guildId: GUILD, settings: settingsOf(), memberIds: db.json(t).member_ids, botUserId: BOT }));
      expect(ch.messages.filter((m) => m.pinned)).toHaveLength(1);
    }
  });

  test("a full first category rolls over during real creation", async () => {
    const { db, rt, guild } = setup();
    for (let k = 0; k < CATEGORY_LIMIT; k++) guild.channels.push({ id: snow(), name: `x-${k}`, parentId: CATS.fire[0], kind: "text", overwrites: [], messages: [] });
    const t = db.liveTeamFixture("fire", [A, B]);
    expect(await enqueueTeamChannel(rt, GUILD, t.id)).toBe("created");
    expect(guild.byId(t.channelId!).parentId).toBe(CATS.fire[1]);
  });

  test("a restart with channel_pending teams completes them, reusing a channel made before the crash", async () => {
    const { db, rt, guild } = setup();
    const a = db.liveTeamFixture("fire", [user(10), user(11)]);
    const b = db.liveTeamFixture("water", [user(12), user(13), user(14)]);
    const c = db.liveTeamFixture("air", [user(15), user(16)]);
    // b's channel was created, then the bot died before _team_set_channel.
    const orphan: FakeChannel = { id: snow(), name: teamChannelName("water", b.slot!), parentId: CATS.water[0], kind: "text", overwrites: [], messages: [] };
    guild.channels.push(orphan);
    expect([a, b, c].every((t) => t.status === "channel_pending")).toBe(true);

    // A fresh runtime, as after a restart: the feature's start sweeps pending teams.
    const stop = await feature.start!(rt);
    for (let n = 0; n < 20 && [a, b, c].some((t) => t.status !== "active"); n++) {
      await new Promise((r) => setImmediate(r));
      await rt.queues.channels.idle();
    }
    if (typeof stop === "function") await stop();

    expect([a, b, c].map((t) => t.status)).toEqual(["active", "active", "active"]);
    expect(b.channelId).toBe(orphan.id);
    expect(guild.teamChannels()).toHaveLength(3);
    expect(orphan.overwrites.filter((o) => o.type === "member" && o.id !== BOT)).toHaveLength(3);
    // Nothing left: a second sweep queues nothing.
    expect(await sweepPendingTeams(rt)).toBe(0);
  });

  test("started before login, the first sweep waits for the gateway's ready", async () => {
    const { db, rt } = setup();
    const t = db.liveTeamFixture("fire", [A, B]);
    const handlers: Record<string, () => void> = {};
    rt.client = { isReady: () => false, once: (name: string, fn: () => void) => void (handlers[name] = fn) } as unknown as Client;
    const stop = await feature.start!(rt);
    await new Promise((r) => setImmediate(r));
    expect(db.calls).not.toContain("elemental_bot_teams_channel_pending");
    handlers.clientReady();
    for (let n = 0; n < 10 && t.status !== "active"; n++) {
      await new Promise((r) => setImmediate(r));
      await rt.queues.channels.idle();
    }
    if (typeof stop === "function") await stop();
    expect(t.status).toBe("active");
  });

  test("a permanent failure leaves the team channel_pending for the next sweep", async () => {
    const { db, rt, guild } = setup();
    guild.failCreate = (n) => (n === 1 ? Object.assign(new Error("Missing Permissions"), { status: 403 }) : null);
    const t = db.liveTeamFixture("earth", [A, B]);
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await enqueueTeamChannel(rt, GUILD, t.id)).toBe("failed");
    expect(spy.mock.calls.flat().join(" ")).not.toContain(A);
    spy.mockRestore();
    expect(t.status).toBe("channel_pending");
    expect(await sweepPendingTeams(rt)).toBe(1);
    await rt.queues.channels.idle();
    expect(t.status).toBe("active");
  });

  test("a team with one member left gets no channel (never one student alone with staff)", async () => {
    const { db, rt, guild } = setup();
    const t = db.liveTeamFixture("fire", [A, B]);
    db.teamOf.delete(B);
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await enqueueTeamChannel(rt, GUILD, t.id)).toBe("failed");
    spy.mockRestore();
    expect(guild.teamChannels()).toHaveLength(0);
  });

  test("an archived or pending team is skipped", async () => {
    const { db, rt, guild } = setup();
    const t = db.liveTeamFixture("fire", [A, B]);
    t.status = "archived";
    expect(await enqueueTeamChannel(rt, GUILD, t.id)).toBe("skipped");
    expect(guild.teamChannels()).toHaveLength(0);
  });
});
