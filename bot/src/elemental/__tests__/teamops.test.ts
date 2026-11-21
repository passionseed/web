/**
 * @jest-environment node
 */
import { randomUUID } from "node:crypto";

import { ApplicationCommandOptionType, MessageFlags, PermissionFlagsBits, type Client, type MessageCreateOptions } from "discord.js";

import { candidateSlots, sectorOf } from "../../../../lib/elemental/island/sectors";
import { ElementalError, type ElementalApi } from "../api";
import { BOT_ALLOW, MEMBER_ALLOW, setChannelPortFactory, type ChannelInfo, type GuildChannelPort, type PlannedOverwrite, type TeamJson } from "../channels";
import { createEvents, createSettingsCache, type ElementalRuntime } from "../context";
import { COMMON } from "../copy/common";
import { OPS } from "../copy/teamops";
import { handleElementalInteraction } from "../index";
import { createKeyedQueue } from "../queue";
import { buildRegistry, registry } from "../registry";
import type { ElementKey } from "../roles";
import {
  ARCHIVE_ACTION,
  LOCKED_STAFF_ALLOW,
  MESSAGE_BUDGET,
  SUB,
  feature,
  lockedOverwrites,
  parseMemberIds,
  unteamedMessages,
  type UnteamedRow,
} from "../features/teamops";

// ---------------------------------------------------------------------------
// Fixtures: made-up snowflakes only, no names.
// ---------------------------------------------------------------------------

const GUILD = "100000000000000001";
const BOT = "190000000000000001";
const HOST = "210000000000000001";
const HELPER = "210000000000000002";
const ROLE = {
  host: "300000000000000001",
  helper: "300000000000000002",
  mentor: "300000000000000003",
  judge: "300000000000000004",
  safety: "300000000000000005",
  paid: "300000000000000006",
};
const CATS: Record<ElementKey, string[]> = {
  water: ["500000000000000010"],
  earth: ["500000000000000020"],
  air: ["500000000000000030"],
  fire: ["500000000000000040"],
  aether: ["500000000000000050"],
};

const user = (n: number) => `2000000000000${String(n).padStart(5, "0")}`;

function rawSettings(): Record<string, unknown> {
  return { guild_id: GUILD, edition: "elemental-dryrun", edition_kind: "rehearsal", roles: ROLE, channels: {}, element_categories: CATS };
}

// ---------------------------------------------------------------------------
// A fake of the elemental_bot_* functions these tools call, mirroring E09.
// ---------------------------------------------------------------------------

interface FakeTeam {
  id: string;
  status: TeamJson["status"];
  slot: number | null;
  element: ElementKey;
  name: string;
  channelId: string | null;
  lit: boolean;
  counted: number;
}

interface FakeMember {
  elementPick: ElementKey | null;
  wants: boolean;
}

class FakeDb {
  settings = rawSettings();
  members = new Map<string, FakeMember>();
  teamOf = new Map<string, string>();
  teams = new Map<string, FakeTeam>();
  canvasLinks = new Set<string>();
  posts = new Map<string, string>();
  calls: string[] = [];
  writes: { fn: string; args: unknown[] }[] = [];

  claim(id: string, o: Partial<FakeMember> = {}) {
    this.members.set(id, { elementPick: o.elementPick ?? null, wants: o.wants ?? false });
  }

  isLive(t: FakeTeam | undefined): t is FakeTeam {
    return Boolean(t && (t.status === "channel_pending" || t.status === "active"));
  }

  memberIds(t: FakeTeam): string[] {
    return [...this.teamOf].filter(([, team]) => team === t.id).map(([u]) => u);
  }

  json(t: FakeTeam): TeamJson {
    return {
      team_id: t.id,
      edition: "elemental-dryrun",
      status: t.status,
      slot: t.slot,
      element: t.element,
      project_name: t.name,
      channel_id: t.channelId,
      lit: t.lit,
      member_ids: this.isLive(t) ? this.memberIds(t) : [],
      invites: [],
    };
  }

  liveTeamOf(u: string): FakeTeam | null {
    const t = this.teams.get(this.teamOf.get(u) ?? "");
    return this.isLive(t) ? t : null;
  }

  bySlot(slot: number, live = true): FakeTeam {
    const t = [...this.teams.values()].find((x) => x.slot === slot);
    if (!t || (live && !this.isLive(t))) throw new ElementalError("team_not_found");
    return t;
  }

  pickSlot(candidates: number[], keep: number | null = null): number {
    const taken = new Set([...this.teams.values()].map((x) => x.slot));
    const slot = candidates.find((s) => s >= 1 && s <= 200 && (s === keep || !taken.has(s)));
    if (slot === undefined) throw new ElementalError("island_full");
    return slot;
  }

  /** A live team straight into the store, with a channel already made when channelId is given. */
  liveTeam(element: ElementKey, people: string[], channelId: string | null = null): FakeTeam {
    for (const id of people) if (!this.members.has(id)) this.claim(id);
    const t: FakeTeam = {
      id: randomUUID(),
      status: channelId ? "active" : "channel_pending",
      slot: this.pickSlot(candidateSlots(element)),
      element,
      name: `Project ${this.teams.size + 1}`,
      channelId,
      lit: true,
      counted: 3,
    };
    this.teams.set(t.id, t);
    for (const id of people) this.teamOf.set(id, t.id);
    this.canvasLinks.add(t.id);
    return t;
  }

  write(fn: string, args: unknown[]) {
    this.writes.push({ fn, args });
  }

  call(fn: string, args: unknown[]): unknown {
    this.calls.push(fn);
    const a = args as unknown[];
    switch (fn) {
      case "elemental_bot_settings_get":
        return this.settings;
      case "elemental_bot_team_get": {
        const [, teamId, slot, channelId] = a as [string, string | null, number | null, string | null];
        const all = [...this.teams.values()];
        const t = teamId ? this.teams.get(teamId) : slot ? all.find((x) => x.slot === slot) : channelId ? all.find((x) => x.channelId === channelId) : undefined;
        return t ? this.json(t) : null;
      }
      case "elemental_bot_team_set_channel": {
        this.write(fn, a);
        const t = this.teams.get(a[1] as string)!;
        if (t.status === "archived") throw new ElementalError("team_archived");
        t.channelId = a[2] as string;
        t.status = "active";
        return this.json(t);
      }
      case "elemental_bot_post_claim": {
        const key = `${a[1]}:${a[2]}`;
        const state = this.posts.get(key);
        if (state === undefined || state === "failed") {
          this.posts.set(key, "claimed");
          return true;
        }
        return false;
      }
      case "elemental_bot_post_mark":
        this.posts.set(`${a[1]}:${a[2]}`, a[3] as string);
        return true;
      case "elemental_bot_team_create_staff": {
        this.write(fn, a);
        const [, , name, element, people, slots] = a as [string, string, string, ElementKey, string[], number[]];
        const unique = [...new Set(people)];
        if (unique.length < 2 || unique.length > 5) throw new ElementalError("team_size");
        for (const id of unique) {
          if (!this.members.has(id)) throw new ElementalError("invitee_not_claimed", id);
          if (this.liveTeamOf(id)) throw new ElementalError("invitee_teamed", id);
        }
        const t: FakeTeam = { id: randomUUID(), status: "channel_pending", slot: this.pickSlot(slots), element, name, channelId: null, lit: false, counted: 0 };
        this.teams.set(t.id, t);
        for (const id of unique) this.teamOf.set(id, t.id);
        return { ...this.json(t), activated: true };
      }
      case "elemental_bot_team_set_element": {
        this.write(fn, a);
        const [, , slot, element, slots] = a as [string, string, number, ElementKey, number[]];
        const t = this.bySlot(slot);
        const old = { old_slot: t.slot, old_element: t.element };
        if (t.element === element) return { ...this.json(t), ...old, changed: false };
        t.slot = this.pickSlot(slots, t.slot);
        t.element = element;
        this.canvasLinks.delete(t.id);
        return { ...this.json(t), ...old, changed: true };
      }
      case "elemental_bot_team_rename": {
        this.write(fn, a);
        const t = this.bySlot(a[2] as number);
        t.name = a[3] as string;
        return this.json(t);
      }
      case "elemental_bot_team_archive": {
        this.write(fn, a);
        const t = this.bySlot(a[2] as number, false);
        const before = this.json(t).member_ids;
        t.status = "archived";
        t.lit = false;
        t.counted = 0;
        return { ...this.json(t), member_ids: before };
      }
      case "elemental_bot_member_move": {
        this.write(fn, a);
        const [, , who, slot] = a as [string, string, string, number];
        if (!this.members.has(who)) throw new ElementalError("not_claimed", who);
        const to = this.bySlot(slot);
        const from = this.liveTeamOf(who);
        if (from === to) return { from: null, to: this.json(to), changed: false };
        if (this.memberIds(to).length >= 5) throw new ElementalError("team_full");
        this.teamOf.set(who, to.id);
        return { from: from ? this.json(from) : null, to: this.json(to), changed: true };
      }
      default:
        throw new Error(`unexpected ${fn}`);
    }
  }

  rows(fn: string, args: unknown[]): unknown[] {
    this.calls.push(fn);
    switch (fn) {
      case "elemental_bot_unteamed": {
        const element = args[1] as string | null;
        return [...this.members]
          .filter(([id, m]) => !this.liveTeamOf(id) && (element === null || m.elementPick === element))
          .map(([id, m]) => ({ discord_user_id: id, element_pick: m.elementPick, wants_team_matching: m.wants, claimed_at: "2026-12-04T10:00:00Z" }));
      }
      case "elemental_bot_teams_channel_pending":
        return [...this.teams.values()].filter((t) => t.status === "channel_pending").map((t) => ({ team_id: t.id, slot: t.slot, element: t.element }));
      // Read by the test only: what the legend (E19) and the card are drawn from.
      case "elemental_bot_island_state":
        return [...this.teams.values()]
          .filter((t) => this.isLive(t))
          .map((t) => ({ team_id: t.id, slot: t.slot, element: t.element, project_name: t.name, status: t.status, counted: t.counted, lit: t.lit }));
      default:
        throw new Error(`unexpected ${fn}`);
    }
  }

  api(): ElementalApi {
    return {
      call: (async (fn: string, ...args: unknown[]) => this.call(fn, args)) as ElementalApi["call"],
      rows: (async (fn: string, ...args: unknown[]) => this.rows(fn, args)) as ElementalApi["rows"],
    };
  }
}

// ---------------------------------------------------------------------------
// A fake Discord server behind the GuildChannelPort.
// ---------------------------------------------------------------------------

interface FakeChannel extends ChannelInfo {
  overwrites: PlannedOverwrite[];
  messages: { id: string; content: string; payload: MessageCreateOptions }[];
}

let nextId = BigInt("700000000000000000");
const snow = () => String(++nextId);

class FakeGuild implements GuildChannelPort {
  channels: FakeChannel[] = [];
  failEdit = false;

  constructor() {
    for (const id of Object.values(CATS).flat()) this.channels.push({ id, name: `cat-${id.slice(-2)}`, parentId: null, kind: "category", overwrites: [], messages: [] });
  }
  botUserId() {
    return BOT;
  }
  async list() {
    return this.channels.map(({ id, name, parentId, kind }) => ({ id, name, parentId, kind }));
  }
  async createText(input: { name: string; parentId: string; overwrites: PlannedOverwrite[] }) {
    const ch: FakeChannel = { id: snow(), name: input.name, parentId: input.parentId, kind: "text", overwrites: input.overwrites, messages: [] };
    this.channels.push(ch);
    return { id: ch.id, name: ch.name, parentId: ch.parentId, kind: ch.kind };
  }
  async edit(channelId: string, input: { name?: string; parentId?: string; overwrites?: PlannedOverwrite[] }) {
    if (this.failEdit) throw Object.assign(new Error("Missing Permissions"), { status: 403 });
    const ch = this.byId(channelId);
    if (input.name !== undefined) ch.name = input.name;
    if (input.parentId !== undefined) ch.parentId = input.parentId;
    if (input.overwrites) ch.overwrites = input.overwrites;
  }
  async send(channelId: string, payload: MessageCreateOptions) {
    const msg = { id: snow(), content: String(payload.content ?? ""), payload };
    this.byId(channelId).messages.push(msg);
    return { id: msg.id };
  }
  async pin() {
    return undefined;
  }
  byId(id: string): FakeChannel {
    const ch = this.channels.find((c) => c.id === id);
    if (!ch) throw Object.assign(new Error("Unknown Channel"), { status: 404 });
    return ch;
  }
  /** A channel already made for a team (as E13's sync would have). */
  channelFor(db: FakeDb, t: FakeTeam): FakeChannel {
    const ch: FakeChannel = {
      id: snow(),
      name: `${t.element}-${String(t.slot).padStart(2, "0")}`,
      parentId: CATS[t.element][0],
      kind: "text",
      overwrites: db.memberIds(t).map((id) => ({ id, type: "member", allow: BigInt(1), deny: BigInt(0) })),
      messages: [],
    };
    this.channels.push(ch);
    t.channelId = ch.id;
    t.status = "active";
    return ch;
  }
}

function people(ch: FakeChannel): string[] {
  return ch.overwrites
    .filter((o) => o.type === "member" && o.id !== BOT)
    .map((o) => o.id)
    .sort();
}

function setup() {
  const db = new FakeDb();
  const guild = new FakeGuild();
  const api = db.api();
  const rt: ElementalRuntime = {
    client: {} as Client,
    api,
    env: { guildIds: [GUILD], databaseUrl: "postgresql://stub", cardUrl: null, cardSecret: null },
    settings: createSettingsCache(api),
    queues: {
      channels: createKeyedQueue("channels", { sleep: async () => undefined, onRetry: () => undefined }),
      canvas: createKeyedQueue("canvas", { sleep: async () => undefined }),
    },
    events: createEvents(),
    connected: () => true,
  };
  setChannelPortFactory(rt, () => guild);
  return { db, guild, rt };
}

// ---------------------------------------------------------------------------
// A minimal Discord interaction.
// ---------------------------------------------------------------------------

interface Opts {
  user?: string;
  roles?: string[];
  sub?: string;
  options?: Record<string, unknown>;
  customId?: string;
}

function interaction(kind: "command" | "button", o: Opts = {}) {
  const sent: { how: string; payload: unknown }[] = [];
  const opt = o.options ?? {};
  const i: Record<string, unknown> = {
    guildId: GUILD,
    channelId: "400000000000000001",
    user: { id: o.user ?? HOST },
    member: { roles: o.roles ?? [ROLE.host] },
    commandName: "el",
    customId: o.customId ?? "el|x",
    deferred: false,
    replied: false,
    inGuild: () => true,
    isAutocomplete: () => false,
    isChatInputCommand: () => kind === "command",
    isMessageComponent: () => kind === "button",
    isButton: () => kind === "button",
    isModalSubmit: () => false,
    isFromMessage: () => false,
    options: {
      getSubcommand: () => o.sub ?? null,
      getString: (name: string) => (typeof opt[name] === "string" ? opt[name] : null),
      getInteger: (name: string) => (typeof opt[name] === "number" ? opt[name] : null),
      getUser: (name: string) => (opt[name] as { id: string; bot?: boolean } | undefined) ?? null,
    },
    deferReply: jest.fn(async (p: unknown) => {
      i.deferred = true;
      sent.push({ how: "deferReply", payload: p });
    }),
    deferUpdate: jest.fn(async () => {
      i.deferred = true;
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
const replies = (sent: { how: string; payload: unknown }[]) => sent.filter((s) => s.how !== "deferReply");
const last = (sent: { how: string; payload: unknown }[]) => text(replies(sent).at(-1)?.payload);

async function el(rt: ElementalRuntime, sub: string, options: Record<string, unknown>, o: Omit<Opts, "sub" | "options"> = {}) {
  const made = interaction("command", { ...o, sub, options });
  await handleElementalInteraction(rt, made.i, reg);
  await rt.queues.channels.idle();
  return made;
}

async function click(rt: ElementalRuntime, customId: string, o: Omit<Opts, "customId"> = {}) {
  const made = interaction("button", { ...o, customId });
  await handleElementalInteraction(rt, made.i, reg);
  await rt.queues.channels.idle();
  return made;
}

let errorSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
beforeEach(() => {
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

// ---------------------------------------------------------------------------
// Registration and the Host gate
// ---------------------------------------------------------------------------

describe("registration", () => {
  test("six /el tools, each Host-only, in the real registry next to every other feature", () => {
    const el = registry().commands.find((c) => c.name === "el")!;
    const names = (el.options ?? []).map((o) => o.name);
    for (const sub of Object.values(SUB)) {
      expect(names).toContain(sub);
      expect(registry().commandHandlers.get(`el ${sub}`)?.gate).toEqual(["host"]);
      expect(registry().commandHandlers.get(`el ${sub}`)?.ack ?? "ephemeral").toBe("ephemeral");
    }
    expect(registry().actions.get(ARCHIVE_ACTION)?.gate).toEqual(["host"]);
    expect(el.default_member_permissions).toBe(PermissionFlagsBits.ManageGuild.toString());
  });

  test("descriptions fit Discord's 100 characters and slots are bounded 1-200", () => {
    for (const sub of feature.staffSubcommands ?? []) {
      expect(sub.description.length).toBeLessThanOrEqual(100);
      for (const o of sub.options ?? []) {
        expect(o.description.length).toBeLessThanOrEqual(100);
        if (o.name === "slot") expect(o).toMatchObject({ type: ApplicationCommandOptionType.Integer, min_value: 1, max_value: 200 });
      }
    }
  });
});

describe("the Host gate", () => {
  const cases: [string, Record<string, unknown>][] = [
    [SUB.unteamed, {}],
    [SUB.create, { members: `<@${user(1)}> <@${user(2)}>`, project: "Rain Catcher", element: "water" }],
    [SUB.setElement, { slot: 1, element: "water" }],
    [SUB.rename, { slot: 1, project: "New Name" }],
    [SUB.move, { member: { id: user(1) }, slot: 1 }],
    [SUB.archive, { slot: 1 }],
  ];

  test.each(cases)("/el %s by a Helper, a Judge or a student is refused with no database call", async (sub, options) => {
    for (const roles of [[ROLE.helper], [ROLE.judge], [ROLE.mentor, ROLE.safety], [ROLE.paid]]) {
      const { db, rt } = setup();
      const { sent } = await el(rt, sub, options, { user: HELPER, roles });
      expect(last(sent)).toBe(COMMON.staffOnly);
      expect(db.calls.filter((fn) => fn !== "elemental_bot_settings_get")).toEqual([]);
      // Ephemeral: deferred with the ephemeral flag before anything else.
      expect(sent[0]).toEqual({ how: "deferReply", payload: { flags: MessageFlags.Ephemeral } });
    }
  });

  test("the archive button pressed by a non-Host does nothing", async () => {
    const { db, rt } = setup();
    const t = db.liveTeam("fire", [user(1), user(2)]);
    const { sent } = await click(rt, `el|${ARCHIVE_ACTION}|${t.id}|${t.slot}`, { user: HELPER, roles: [ROLE.helper] });
    expect(last(sent)).toBe(COMMON.staffOnly);
    expect(t.status).not.toBe("archived");
    expect(db.writes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// /el unteamed
// ---------------------------------------------------------------------------

describe("/el unteamed", () => {
  test("lists claimed members not on a live team as silent mentions, with the matching flag; excludes team members", async () => {
    const { db, rt } = setup();
    db.claim(user(1), { elementPick: "fire", wants: false });
    db.claim(user(2), { elementPick: "water", wants: true });
    db.claim(user(3));
    db.liveTeam("air", [user(4), user(5)]);
    const { sent } = await el(rt, SUB.unteamed, {});
    const reply = replies(sent).at(-1)!;
    const body = text(reply.payload);
    expect(body).toContain(OPS.unteamedHeader({ count: 3, wanting: 1, element: null }));
    expect(body).toContain(OPS.unteamedLine({ userId: user(2), element: "water", wants: true }));
    expect(body).toContain(OPS.unteamedLine({ userId: user(1), element: "fire", wants: false }));
    expect(body).toContain(OPS.unteamedLine({ userId: user(3), element: null, wants: false }));
    expect(body).not.toContain(user(4));
    expect(body).not.toContain(user(5));
    // Those who asked for matching come first.
    expect(body.indexOf(user(2))).toBeLessThan(body.indexOf(user(1)));
    // Mentions never ping.
    expect((reply.payload as { allowedMentions: unknown }).allowedMentions).toEqual({ parse: [] });
    expect(db.writes).toEqual([]);
  });

  test("a member of an archived team counts as unteamed again", async () => {
    const { db, rt } = setup();
    const t = db.liveTeam("air", [user(4), user(5)]);
    t.status = "archived";
    const { sent } = await el(rt, SUB.unteamed, {});
    expect(last(sent)).toContain(user(4));
  });

  test("the element filter goes to SQL", async () => {
    const { db, rt } = setup();
    db.claim(user(1), { elementPick: "fire" });
    db.claim(user(2), { elementPick: "water", wants: true });
    const { sent } = await el(rt, SUB.unteamed, { element: "fire" });
    expect(last(sent)).toContain(user(1));
    expect(last(sent)).not.toContain(user(2));
    expect(last(sent)).toContain(OPS.unteamedHeader({ count: 1, wanting: 0, element: "fire" }));
  });

  test("nobody left", async () => {
    const { rt } = setup();
    const { sent } = await el(rt, SUB.unteamed, {});
    expect(last(sent)).toBe(OPS.unteamedNone(null));
  });

  test("a long list is split into ephemeral messages under 2000 characters, then cut with a count", async () => {
    const rows: UnteamedRow[] = Array.from({ length: 900 }, (_, k) => ({ discord_user_id: user(k + 1), element_pick: "fire", wants_team_matching: k % 3 === 0 }));
    const messages = unteamedMessages(rows, null);
    expect(messages.length).toBe(10);
    for (const m of messages) expect(m.length).toBeLessThanOrEqual(MESSAGE_BUDGET);
    const shown = messages.join("\n").match(/<@\d+>/g)!.length;
    expect(messages.at(-1)).toContain(OPS.unteamedMore(900 - shown));

    const { db, rt } = setup();
    for (let k = 1; k <= 120; k++) db.claim(user(k));
    const { sent } = await el(rt, SUB.unteamed, {});
    const follow = sent.filter((s) => s.how === "followUp");
    expect(follow.length).toBeGreaterThan(0);
    for (const f of follow) {
      expect(f.payload).toMatchObject({ flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
      expect(text(f.payload).length).toBeLessThanOrEqual(2000);
    }
    const all = replies(sent).map((s) => text(s.payload)).join("\n");
    expect(all.match(/<@\d+>/g)!.length).toBe(120);
  });
});

// ---------------------------------------------------------------------------
// /el team-create
// ---------------------------------------------------------------------------

describe("/el team-create", () => {
  test("parses mentions and ids, deduplicated; ignores role and channel mentions", () => {
    expect(parseMemberIds(`<@${user(1)}> <@!${user(2)}>, ${user(3)} <@${user(1)}> <@&${ROLE.host}> <#${CATS.fire[0]}>`)).toEqual([
      user(1),
      user(2),
      user(3),
    ]);
  });

  test.each([
    ["one member", () => `<@${user(1)}>`],
    ["one member twice", () => `<@${user(1)}> <@${user(1)}>`],
    ["six members", () => [1, 2, 3, 4, 5, 6].map((n) => `<@${user(n)}>`).join(" ")],
    ["no members", () => "nobody"],
  ])("%s is refused with no database write", async (_label, members) => {
    const { db, rt } = setup();
    for (let k = 1; k <= 6; k++) db.claim(user(k));
    const { sent } = await el(rt, SUB.create, { members: members(), project: "Rain Catcher", element: "water" });
    expect(last(sent)).toBe(OPS.createSize);
    expect(db.writes).toEqual([]);
  });

  test("a project name with a contact is refused before SQL and never echoed", async () => {
    const { db, rt } = setup();
    const { sent } = await el(rt, SUB.create, { members: `<@${user(1)}> <@${user(2)}>`, project: "call 0812345678", element: "water" });
    expect(last(sent)).toBe(OPS.namePii);
    expect(last(sent)).not.toContain("0812345678");
    expect(db.writes).toEqual([]);
  });

  test("an already-teamed member is named (SQL refusal with the id in DETAIL)", async () => {
    const { db, rt } = setup();
    db.claim(user(1));
    db.liveTeam("air", [user(2), user(3)]);
    const { sent } = await el(rt, SUB.create, { members: `<@${user(1)}> <@${user(2)}>`, project: "Rain Catcher", element: "water" });
    expect(last(sent)).toContain(`<@${user(2)}>`);
    expect([...db.teams.values()]).toHaveLength(1);
  });

  test("matched solos: a live team in the element's sector, all members on its channel, team.activated emitted", async () => {
    const { db, guild, rt } = setup();
    for (const k of [1, 2, 3]) db.claim(user(k), { wants: true });
    const events: unknown[] = [];
    rt.events.on("team.activated", (p) => void events.push(p));
    const { sent } = await el(rt, SUB.create, { members: `<@${user(1)}> <@${user(2)}> <@${user(3)}>`, project: "  Rain   Catcher ", element: "water" });

    const [write] = db.writes;
    expect(write.fn).toBe("elemental_bot_team_create_staff");
    // (guild, actor, name, element, members, candidate slots): the Host is the audited actor.
    expect(write.args.slice(0, 5)).toEqual([GUILD, HOST, "Rain Catcher", "water", [user(1), user(2), user(3)]]);
    expect(write.args[5]).toEqual(candidateSlots("water"));

    const [team] = [...db.teams.values()];
    expect(sectorOf(team.slot!)).toBe("water");
    expect(team.status).toBe("active");
    const ch = guild.byId(team.channelId!);
    expect(ch.name).toBe(`water-${String(team.slot).padStart(2, "0")}`);
    expect(CATS.water).toContain(ch.parentId);
    expect(people(ch)).toEqual([user(1), user(2), user(3)]);
    expect(ch.overwrites.map((o) => o.id)).not.toContain(ROLE.judge);
    expect(events).toEqual([{ guildId: GUILD, edition: "elemental-dryrun", teamId: team.id, slot: team.slot, element: "water" }]);
    expect(last(sent)).toContain(OPS.channelDone);
    // Off the unteamed list.
    const list = await el(rt, SUB.unteamed, {});
    expect(last(list.sent)).toBe(OPS.unteamedNone(null));
  });
});

// ---------------------------------------------------------------------------
// /el team-set-element
// ---------------------------------------------------------------------------

describe("/el team-set-element", () => {
  test("a new slot in the new sector, channel renamed and moved, canvas link dropped, team told to link on the new board", async () => {
    const { db, guild, rt } = setup();
    const t = db.liveTeam("fire", [user(1), user(2)]);
    const ch = guild.channelFor(db, t);
    const oldSlot = t.slot!;
    expect(sectorOf(oldSlot)).toBe("fire");
    expect(db.canvasLinks.has(t.id)).toBe(true);

    const { sent } = await el(rt, SUB.setElement, { slot: oldSlot, element: "water" });

    expect(db.writes[0]).toEqual({ fn: "elemental_bot_team_set_element", args: [GUILD, HOST, oldSlot, "water", candidateSlots("water")] });
    expect(t.slot).not.toBe(oldSlot);
    expect(sectorOf(t.slot!)).toBe("water");
    expect(db.canvasLinks.has(t.id)).toBe(false);
    // Same channel (history kept), new name, new category, same people.
    expect(t.channelId).toBe(ch.id);
    expect(ch.name).toBe(`water-${String(t.slot).padStart(2, "0")}`);
    expect(CATS.water).toContain(ch.parentId);
    expect(people(ch)).toEqual([user(1), user(2)]);
    expect(guild.channels.filter((c) => c.kind === "text")).toHaveLength(1);
    // The notice in the team's channel, pinging only the team.
    const notice = ch.messages.at(-1)!;
    expect(notice.content).toBe(OPS.newBoardNotice({ slot: t.slot!, element: "water", memberIds: [user(1), user(2)] }));
    expect(notice.content).toContain("/canvas link");
    expect(notice.payload.allowedMentions).toEqual({ parse: [], users: [user(1), user(2)] });
    expect(last(sent)).toContain(OPS.elementChanged({ oldSlot, slot: t.slot!, from: "fire", to: "water" }));
  });

  test("the same element changes nothing and posts nothing", async () => {
    const { db, guild, rt } = setup();
    const t = db.liveTeam("fire", [user(1), user(2)]);
    const ch = guild.channelFor(db, t);
    const { sent } = await el(rt, SUB.setElement, { slot: t.slot, element: "fire" });
    expect(last(sent)).toBe(OPS.sameElement(t.slot!, "fire"));
    expect(ch.messages).toHaveLength(0);
    expect(db.canvasLinks.has(t.id)).toBe(true);
  });

  test("no live team on that plot", async () => {
    const { rt } = setup();
    const { sent } = await el(rt, SUB.setElement, { slot: 77, element: "water" });
    expect(last(sent)).toBe("ไม่พบทีมที่ยังใช้งานอยู่ในแปลงนี้");
  });
});

// ---------------------------------------------------------------------------
// /el team-rename
// ---------------------------------------------------------------------------

describe("/el team-rename", () => {
  test("renames in SQL and keeps the channel's name and overwrites", async () => {
    const { db, guild, rt } = setup();
    const t = db.liveTeam("earth", [user(1), user(2)]);
    const ch = guild.channelFor(db, t);
    const name = ch.name;
    const { sent } = await el(rt, SUB.rename, { slot: t.slot, project: "Soil Sensor" });
    expect(t.name).toBe("Soil Sensor");
    expect(ch.name).toBe(name);
    expect(people(ch)).toEqual([user(1), user(2)]);
    expect(last(sent)).toContain(OPS.renamed(t.slot!, "Soil Sensor"));
  });

  test("a contact in the new name is refused before SQL", async () => {
    const { db, rt } = setup();
    const t = db.liveTeam("earth", [user(1), user(2)]);
    const { sent } = await el(rt, SUB.rename, { slot: t.slot, project: "line 0812345678" });
    expect(last(sent)).toBe(OPS.namePii);
    expect(db.writes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// /el team-move-member
// ---------------------------------------------------------------------------

describe("/el team-move-member", () => {
  test("updates both channels' overwrites", async () => {
    const { db, guild, rt } = setup();
    const a = db.liveTeam("fire", [user(1), user(2), user(3)]);
    const b = db.liveTeam("water", [user(4), user(5)]);
    const chA = guild.channelFor(db, a);
    const chB = guild.channelFor(db, b);

    const { sent } = await el(rt, SUB.move, { member: { id: user(3) }, slot: b.slot });

    expect(db.writes[0]).toEqual({ fn: "elemental_bot_member_move", args: [GUILD, HOST, user(3), b.slot] });
    expect(people(chA)).toEqual([user(1), user(2)]);
    expect(people(chB)).toEqual([user(3), user(4), user(5)]);
    for (const ch of [chA, chB]) {
      expect(ch.overwrites.some((o) => o.id === ROLE.host)).toBe(true);
      expect(ch.overwrites.map((o) => o.id)).not.toContain(ROLE.judge);
    }
    expect(last(sent)).toContain(OPS.moved({ userId: user(3), fromSlot: a.slot, toSlot: b.slot! }));
  });

  test("an unteamed member moved onto a team gets its channel", async () => {
    const { db, guild, rt } = setup();
    db.claim(user(9));
    const b = db.liveTeam("water", [user(4), user(5)]);
    const chB = guild.channelFor(db, b);
    await el(rt, SUB.move, { member: { id: user(9) }, slot: b.slot });
    expect(people(chB)).toEqual([user(4), user(5), user(9)]);
  });

  test("the team left with one person has its channel locked: no student alone with staff", async () => {
    const { db, guild, rt } = setup();
    const a = db.liveTeam("fire", [user(1), user(2)]);
    const b = db.liveTeam("water", [user(4), user(5)]);
    const chA = guild.channelFor(db, a);
    guild.channelFor(db, b);

    const { sent } = await el(rt, SUB.move, { member: { id: user(2) }, slot: b.slot });

    expect(people(chA)).toEqual([]);
    expect(chA.overwrites).toEqual(lockedOverwrites(GUILD, rt.settings.peek(GUILD)!, BOT));
    expect(last(sent)).toContain(OPS.leftAlone(a.slot!));
    expect(last(sent)).toContain(OPS.channelLocked);
  });

  test("a full team refuses the move (SQL team_full) and no channel changes", async () => {
    const { db, guild, rt } = setup();
    db.claim(user(9));
    const b = db.liveTeam("water", [user(1), user(2), user(3), user(4), user(5)]);
    const chB = guild.channelFor(db, b);
    const before = JSON.stringify(chB.overwrites, (_k, v) => (typeof v === "bigint" ? String(v) : v));
    const { sent } = await el(rt, SUB.move, { member: { id: user(9) }, slot: b.slot });
    expect(last(sent)).toBe("ทีมนี้ครบ 5 คนแล้ว");
    expect(JSON.stringify(chB.overwrites, (_k, v) => (typeof v === "bigint" ? String(v) : v))).toBe(before);
  });

  test("a bot cannot be moved", async () => {
    const { db, rt } = setup();
    const b = db.liveTeam("water", [user(1), user(2)]);
    const { sent } = await el(rt, SUB.move, { member: { id: BOT, bot: true }, slot: b.slot });
    expect(last(sent)).toBe(OPS.noBots);
    expect(db.writes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// /el team-archive
// ---------------------------------------------------------------------------

describe("/el team-archive", () => {
  async function ask(rt: ElementalRuntime, slot: number) {
    const made = await el(rt, SUB.archive, { slot });
    const payload = replies(made.sent).at(-1)!.payload as { components?: { components: { custom_id: string }[] }[] };
    return { ...made, button: payload.components?.[0]?.components[0]?.custom_id };
  }

  test("asks first: nothing is archived until the Host confirms", async () => {
    const { db, rt } = setup();
    const t = db.liveTeam("fire", [user(1), user(2)]);
    const { sent, button } = await ask(rt, t.slot!);
    expect(last(sent)).toBe(OPS.archiveConfirm({ slot: t.slot!, name: t.name, members: 2 }));
    expect(button).toBe(`el|${ARCHIVE_ACTION}|${t.id}|${t.slot}`);
    expect(db.writes).toEqual([]);
  });

  test("confirmed: off the legend and totals, un-lit and un-counted, channel locked to staff read-only", async () => {
    const { db, guild, rt } = setup();
    const t = db.liveTeam("fire", [user(1), user(2), user(3)]);
    const other = db.liveTeam("water", [user(4), user(5)]);
    const ch = guild.channelFor(db, t);
    const before = (await rt.api.rows<{ slot: number }>("elemental_bot_island_state", "elemental-dryrun")).map((r) => r.slot);
    expect(before).toEqual(expect.arrayContaining([t.slot, other.slot]));

    const { button } = await ask(rt, t.slot!);
    const { sent, raw } = await click(rt, button!);

    expect(db.writes.map((w) => w.fn)).toEqual(["elemental_bot_team_archive"]);
    expect(db.writes[0].args).toEqual([GUILD, HOST, t.slot]);
    expect(t.status).toBe("archived");
    expect(t.lit).toBe(false);
    expect(t.counted).toBe(0);
    // The legend (island_state) and the totals read live teams only.
    const after = await rt.api.rows<{ slot: number; counted: number }>("elemental_bot_island_state", "elemental-dryrun");
    expect(after.map((r) => r.slot)).toEqual([other.slot]);
    expect(after.reduce((n, r) => n + r.counted, 0)).toBe(other.counted);

    // Locked: no member overwrite at all, staff read-only, never Judge, bot kept.
    expect(people(ch)).toEqual([]);
    const staff = ch.overwrites.filter((o) => o.type === "role" && o.id !== GUILD);
    expect(staff.map((o) => o.id)).toEqual([ROLE.host, ROLE.helper, ROLE.mentor]);
    for (const o of staff) {
      expect(o.allow).toBe(LOCKED_STAFF_ALLOW);
      expect(o.deny & PermissionFlagsBits.SendMessages).toBe(PermissionFlagsBits.SendMessages);
      // Discord 403s an overwrite that allows or denies a permission the bot
      // lacks; the bot is only required to hold MEMBER_ALLOW.
      expect((o.allow | o.deny) & ~MEMBER_ALLOW).toBe(BigInt(0));
    }
    expect(ch.overwrites.find((o) => o.id === BOT)?.allow).toBe(BOT_ALLOW);
    expect(ch.overwrites.find((o) => o.id === GUILD)?.deny).toBe(PermissionFlagsBits.ViewChannel);

    // The confirm message loses its button.
    expect(raw.editReply).toHaveBeenLastCalledWith(expect.objectContaining({ components: [] }));
    expect(last(sent)).toContain(OPS.archived(t.slot!));
    expect(last(sent)).toContain(OPS.channelLocked);

    // A later sync (e.g. a sweep) leaves the archived team's channel alone.
    const { enqueueTeamChannel } = await import("../channels");
    expect(await enqueueTeamChannel(rt, GUILD, t.id)).toBe("skipped");
    expect(people(ch)).toEqual([]);
  });

  test("a second press, or archiving again, is a no-op that re-locks", async () => {
    const { db, guild, rt } = setup();
    const t = db.liveTeam("fire", [user(1), user(2)]);
    guild.channelFor(db, t);
    const { button } = await ask(rt, t.slot!);
    await click(rt, button!);
    const again = await click(rt, button!);
    expect(last(again.sent)).toContain(OPS.alreadyArchived(t.slot!));
    expect(db.writes.filter((w) => w.fn === "elemental_bot_team_archive")).toHaveLength(1);
    const slash = await el(rt, SUB.archive, { slot: t.slot });
    expect(last(slash.sent)).toContain(OPS.alreadyArchived(t.slot!));
  });

  test("a button for another team on that plot archives nothing", async () => {
    const { db, rt } = setup();
    const t = db.liveTeam("fire", [user(1), user(2)]);
    const { sent } = await click(rt, `el|${ARCHIVE_ACTION}|${randomUUID()}|${t.slot}`);
    expect(last(sent)).toBe(OPS.archiveStale);
    expect(t.status).not.toBe("archived");
    expect(db.writes).toEqual([]);
  });

  test("if the plot changed hands between the check and the archive, the team SQL archived is the one locked", async () => {
    const { db, guild, rt } = setup();
    const t = db.liveTeam("fire", [user(1), user(2)]);
    const other = db.liveTeam("water", [user(3), user(4)]);
    guild.channelFor(db, t);
    const chOther = guild.channelFor(db, other);
    const slot = t.slot!;
    const { button } = await ask(rt, slot);
    // Another Host re-slots t and the plot goes to the other team just before the archive runs.
    const call = db.call.bind(db);
    db.call = (fn: string, args: unknown[]) => {
      if (fn === "elemental_bot_team_archive") {
        t.slot = 199;
        other.slot = slot;
      }
      return call(fn, args);
    };
    await click(rt, button!);
    expect(other.status).toBe("archived");
    expect(people(chOther)).toEqual([]);
  });

  test("a lock Discord refuses is reported, the archive stands", async () => {
    const { db, guild, rt } = setup();
    const t = db.liveTeam("fire", [user(1), user(2)]);
    guild.channelFor(db, t);
    guild.failEdit = true;
    const { button } = await ask(rt, t.slot!);
    const { sent } = await click(rt, button!);
    expect(t.status).toBe("archived");
    expect(last(sent)).toContain(OPS.channelLockFailed);
  });

  test("an archived team whose channel was made in a race (no channel id) still gets that channel locked", async () => {
    const { db, guild, rt } = setup();
    const t = db.liveTeam("fire", [user(1), user(2)]);
    // A channel_pending team: a sync made the channel but lost to the archive before team_set_channel.
    const orphan = await guild.createText({
      name: `fire-${String(t.slot).padStart(2, "0")}`,
      parentId: CATS.fire[0],
      overwrites: [
        { id: user(1), type: "member", allow: BigInt(1), deny: BigInt(0) },
        { id: user(2), type: "member", allow: BigInt(1), deny: BigInt(0) },
      ],
    });
    const { button } = await ask(rt, t.slot!);
    await click(rt, button!);
    expect(people(guild.byId(orphan.id))).toEqual([]);
  });
});
