/**
 * @jest-environment node
 */
import { randomUUID } from "node:crypto";

import { ApplicationCommandOptionType, MessageFlags, PermissionFlagsBits, Routes, type Client } from "discord.js";

import { ElementalError, type ElementalApi } from "../api";
import { MAX_SUBCOMMANDS, buildRegistry, registry } from "../registry";
import { createEvents, createSettingsCache, type ElementalEventMap, type ElementalRuntime } from "../context";
import { COMMON } from "../copy/common";
import { CANVAS } from "../copy/canvas";
import { STAFF, staffErrorText } from "../copy/staff";
import { TESTER } from "../copy/tester";
import { handleElementalInteraction } from "../index";
import { createKeyedQueue } from "../queue";
import type { ElementKey } from "../roles";
import { feature as canvasFeature } from "../features/canvas";
import {
  ACTIONS,
  FN,
  HOST_ONLY,
  SUB,
  TESTER_GATE,
  WHOIS_GATE,
  feature,
  shouldRetry,
  whoisText,
} from "../features/staff";

// ---------------------------------------------------------------------------
// Fixtures: made-up snowflakes and UUIDs only, no names.
// ---------------------------------------------------------------------------

const GUILD = "100000000000000001";
const BOT = "190000000000000001";
const STAFFER = "210000000000000001";
const ROLE = {
  host: "300000000000000001",
  helper: "300000000000000002",
  mentor: "300000000000000003",
  judge: "300000000000000004",
  safety: "300000000000000005",
  paid: "300000000000000006",
};
const MIRROR = "400000000000000009";
const REPORTS = "400000000000000008";
const START = "400000000000000007";
const CATS: Record<ElementKey, string[]> = {
  water: ["500000000000000010"],
  earth: ["500000000000000020"],
  air: ["500000000000000030"],
  fire: ["500000000000000040"],
  aether: ["500000000000000050"],
};
const BOARD = "00000000-0000-4000-8000-0000000000e1";
const OWNER = "00000000-0000-4000-8000-0000000000b0";
const REG = "00000000-0000-4000-8000-00000000aa01";
const user = (n: number) => `2000000000000${String(n).padStart(5, "0")}`;
const chan = (n: number) => `7000000000000${String(n).padStart(5, "0")}`;

type Kind = "event" | "rehearsal";

function rawSettings(kind: Kind): Record<string, unknown> {
  return {
    guild_id: GUILD,
    edition: kind === "event" ? "elemental-2026" : "elemental-dryrun",
    edition_kind: kind,
    tester_cap: 10,
    roles: ROLE,
    channels: { mirror: MIRROR, reports: REPORTS, start_here: START },
    element_categories: CATS,
  };
}

// ---------------------------------------------------------------------------
// A fake of the elemental_bot_* functions these tools call, mirroring E09/E11.
// ---------------------------------------------------------------------------

interface FakeTeam {
  id: string;
  slot: number;
  element: ElementKey;
  name: string;
  channelId: string | null;
  live: boolean;
  lit: boolean;
  linked: boolean;
}

interface FakeEntry {
  id: string;
  teamId: string;
  source: "bot" | "staff";
  who: string;
  tried: string;
  counted: boolean;
  removed: boolean;
  reviewed: boolean;
  canvas: "none" | "pending" | "written" | "failed" | "tombstoned";
  createdAt: number;
}

class FakeDb {
  settings: Record<string, unknown>;
  teams = new Map<string, FakeTeam>();
  entries = new Map<string, FakeEntry>();
  calls: { fn: string; args: unknown[] }[] = [];
  /** Entries the board write refuses (canvas_write ok=false). */
  failWrites = new Set<string>();
  whoisExtra: Record<string, unknown> = {};

  constructor(kind: Kind = "event") {
    this.settings = rawSettings(kind);
  }

  fns(): string[] {
    return this.calls.map((c) => c.fn).filter((fn) => fn !== "elemental_bot_settings_get");
  }

  team(element: ElementKey, slot: number, o: Partial<FakeTeam> = {}): FakeTeam {
    const t: FakeTeam = { id: randomUUID(), slot, element, name: `Project ${slot}`, channelId: chan(slot), live: true, lit: false, linked: false, ...o };
    this.teams.set(t.id, t);
    return t;
  }

  entry(t: FakeTeam, o: Partial<FakeEntry> = {}): FakeEntry {
    const e: FakeEntry = {
      id: randomUUID(),
      teamId: t.id,
      source: "bot",
      who: "a neighbour",
      tried: "the map",
      counted: true,
      removed: false,
      reviewed: false,
      canvas: "none",
      createdAt: this.entries.size,
      ...o,
    };
    this.entries.set(e.id, e);
    if (e.counted) t.lit = true;
    return e;
  }

  counted(t: FakeTeam): number {
    return [...this.entries.values()].filter((e) => e.teamId === t.id && e.counted && !e.removed).length;
  }

  json(e: FakeEntry) {
    const t = this.teams.get(e.teamId)!;
    return {
      id: e.id,
      entry_id: e.id,
      team_id: t.id,
      slot: t.slot,
      element: t.element,
      project_name: t.name,
      source: e.source,
      who: e.who,
      tried: e.tried,
      quote: null,
      changed: null,
      counted: e.counted,
      created_at: "2026-12-04T12:00:00Z",
      edited_at: null,
      removed: e.removed,
      reviewed: e.reviewed,
      canvas_status: e.canvas,
      canvas_ids: null,
    };
  }

  bySlot(slot: number): FakeTeam {
    const t = [...this.teams.values()].find((x) => x.slot === slot && x.live);
    if (!t) throw new ElementalError("team_not_found");
    return t;
  }

  getEntry(id: string): FakeEntry {
    const e = this.entries.get(id);
    if (!e) throw new ElementalError("entry_not_found");
    return e;
  }

  target(id: string) {
    const e = this.getEntry(id);
    const t = this.teams.get(e.teamId)!;
    const base = {
      entry_id: e.id,
      kind: "test",
      // As elemental__note_ref: every tester entry is source "tester", staff-logged or not.
      source: "tester",
      team_id: t.id,
      slot: t.slot,
      element: t.element,
      project_name: t.name,
      live: t.live,
      removed: e.removed,
      canvas_status: e.canvas,
      fields: { who: e.who, tried: e.tried, quote: null, changed: null },
      note_ids: { rect: `el-${e.id}-r`, text: `el-${e.id}-t` },
      linked: t.linked,
    };
    if (!t.linked) return base;
    return {
      ...base,
      board_id: BOARD,
      frame_id: "frame-a",
      owner_id: OWNER,
      frame: { x: 0, y: 0, width: 1800, height: 1400 },
      zone: { x: 40, y: 300, width: 1300, height: 420 },
      after_index: "a2",
      nearby: [],
      prev: null,
      prev_deleted: null,
      prev_on_frame: null,
    };
  }

  call(fn: string, a: unknown[]): unknown {
    this.calls.push({ fn, args: a });
    switch (fn) {
      case "elemental_bot_settings_get":
        return this.settings;
      case FN.remove: {
        const e = this.getEntry(a[1] as string);
        const t = this.teams.get(e.teamId)!;
        if (e.removed) return { ...this.json(e), already: true, was_counted: false, team_total: this.counted(t), lit: t.lit };
        const was = e.counted;
        e.removed = true;
        e.counted = false;
        if (this.counted(t) === 0) t.lit = false;
        return { ...this.json(e), already: false, was_counted: was, team_total: this.counted(t), lit: t.lit };
      }
      case FN.review: {
        const e = this.getEntry(a[1] as string);
        const already = e.reviewed;
        e.reviewed = true;
        return { ...this.json(e), already };
      }
      case FN.testerAdd: {
        const [, , slot, who, tried] = a as [string, string, number, string, string];
        const t = this.bySlot(slot);
        if (/\d{9,}/.test(`${who} ${tried}`)) throw new ElementalError("pii", "tried");
        const counted = this.counted(t) < Number(this.settings.tester_cap);
        const first = counted && !t.lit;
        const e = this.entry(t, { source: "staff", who, tried, counted, canvas: t.linked ? "pending" : "none" });
        return {
          ...this.json(e),
          first_counted: first,
          team_total: this.counted(t),
          edition_total: this.counted(t),
          cap: this.settings.tester_cap,
          canvas_linked: t.linked,
          repeated: false,
        };
      }
      case "elemental_bot_canvas_target":
        return this.target(a[1] as string);
      case "elemental_bot_canvas_write": {
        const e = this.getEntry(a[1] as string);
        if (this.failWrites.has(e.id)) {
          e.canvas = "failed";
          return { ok: false, status: "failed", reason: "merge_error", ids: null, dropped: [], present: null };
        }
        e.canvas = "written";
        return { ok: true, status: "written", reason: null, ids: [], dropped: [], present: true };
      }
      case "elemental_bot_canvas_tombstone": {
        const e = this.getEntry(a[1] as string);
        e.canvas = "tombstoned";
        return { ok: true, status: "tombstoned", reason: null, ids: [], dropped: [], present: false };
      }
      case FN.totals:
        return {
          edition: a[0],
          day: "2026-12-04",
          helped: 12,
          helped_today: 5,
          checked_in: 3,
          teams_total: 4,
          top_element: "fire",
          levels: { water: 2, earth: 0, air: 1, fire: 9, aether: 0 },
          deltas: { water: 0, earth: 0, air: 1, fire: 4, aether: 0 },
          teams: { water: 1, earth: 0, air: 1, fire: 2, aether: 0 },
        };
      case FN.link: {
        const [, , who, reg, pos] = a as [string, string, string, string | null, number | null];
        if (reg === null) {
          // A student on a live team cannot become staff (SQL el:staff_teamed).
          if (who === user(60)) throw new ElementalError("staff_teamed", who);
          return { member_id: randomUUID(), edition: "elemental-2026", edition_kind: "event", already: false, is_staff: true };
        }
        if (this.settings.edition_kind !== "event") throw new ElementalError("wrong_edition");
        if (reg !== REG) throw new ElementalError("registration_not_found");
        if (pos === 2) throw new ElementalError("member_linked", user(99));
        return { member_id: randomUUID(), edition: "elemental-2026", edition_kind: "event", already: who === user(50), is_staff: false };
      }
      case FN.canvasOverride: {
        const [, , slot, board, frame] = a as [string, string, number, string, string];
        const t = this.bySlot(slot);
        if (frame === "taken") throw new ElementalError("frame_linked");
        const already = t.linked;
        t.linked = true;
        for (const e of this.entries.values()) if (e.teamId === t.id && !e.removed) e.canvas = "pending";
        return { team_id: t.id, slot: t.slot, board_id: board, frame_id: frame, already, replaced: null, via: "staff" };
      }
      case FN.teamGet: {
        const t = this.teams.get(a[1] as string);
        return t ? { team_id: t.id, slot: t.slot, element: t.element, status: "active", channel_id: t.channelId, member_ids: [] } : null;
      }
      case FN.whois:
        if (a[2] === user(9)) return { claimed: false };
        return {
          claimed: true,
          is_staff: false,
          registration_id: REG,
          position: 3,
          element_pick: "fire",
          team_slot: 12,
          claimed_at: "2026-12-04T10:00:00Z",
          ...this.whoisExtra,
        };
      case FN.cleanup: {
        if (this.settings.edition_kind !== "rehearsal") throw new ElementalError("not_rehearsal");
        if (a[2] !== this.settings.edition) throw new ElementalError("bad_confirm");
        const teams = [...this.teams.values()].filter((t) => t.live);
        for (const t of teams) t.live = false;
        for (const e of this.entries.values()) e.counted = false;
        return { edition: this.settings.edition, teams: teams.map((t) => ({ team_id: t.id, slot: t.slot, channel_id: t.channelId })) };
      }
      default:
        throw new Error(`unexpected ${fn}`);
    }
  }

  rows(fn: string, a: unknown[]): unknown[] {
    this.calls.push({ fn, args: a });
    switch (fn) {
      case FN.sample: {
        const [, , n, element] = a as [string, string, number, string | null];
        return [...this.entries.values()]
          .filter((e) => !e.removed && !e.reviewed)
          .map((e) => ({ e, t: this.teams.get(e.teamId)! }))
          .filter(({ t }) => t.live && (element === null || t.element === element))
          .slice(0, n)
          .map(({ e, t }) => ({
            entry_id: e.id,
            team_id: t.id,
            slot: t.slot,
            element: t.element,
            project_name: t.name,
            who: e.who,
            tried: e.tried,
            quote: null,
            changed: null,
            counted: e.counted,
            created_at: "2026-12-04T12:00:00Z",
          }));
      }
      // As SQL: writes for live linked teams not yet written; tombstones for removed notes that may show.
      case "elemental_bot_canvas_pending":
        return [...this.entries.values()]
          .sort((x, y) => x.createdAt - y.createdAt)
          .map((e) => ({ e, t: this.teams.get(e.teamId)! }))
          .filter(
            ({ e, t }) =>
              (!e.removed && ["none", "pending", "failed"].includes(e.canvas) && t.live && t.linked) ||
              (e.removed && ["written", "pending", "failed"].includes(e.canvas))
          )
          .map(({ e, t }) => ({ entry_id: e.id, team_id: t.id, slot: t.slot, action: e.removed ? "tombstone" : "write", canvas_status: e.canvas }));
      case FN.testCodes: {
        if (this.settings.edition_kind !== "rehearsal") throw new ElementalError("not_rehearsal");
        const n = a[2] as number;
        return Array.from({ length: n }, (_, k) => ({ code: `TEST${String(k).padStart(4, "2").replace(/[01]/g, "2")}` }));
      }
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
// A fake Discord REST (no network).
// ---------------------------------------------------------------------------

let nextId = BigInt("710000000000000000");
const snow = () => String(++nextId);

function fakeRest() {
  const log: { method: string; route: string; body?: unknown }[] = [];
  const rest = {
    get: jest.fn(async (route: string) => {
      log.push({ method: "get", route });
      return route.includes("/pins") ? { items: [] } : { threads: [] };
    }),
    post: jest.fn(async (route: string, o?: { body?: unknown }) => {
      log.push({ method: "post", route, body: o?.body });
      return { id: snow() };
    }),
    put: jest.fn(async (route: string) => {
      log.push({ method: "put", route });
      return undefined;
    }),
    patch: jest.fn(async (route: string, o?: { body?: unknown }) => {
      log.push({ method: "patch", route, body: o?.body });
      return {};
    }),
    delete: jest.fn(async (route: string) => {
      log.push({ method: "delete", route });
      return undefined;
    }),
  };
  return { rest, log };
}

function setup(kind: Kind = "event") {
  const db = new FakeDb(kind);
  const api = db.api();
  const discord = fakeRest();
  const rt: ElementalRuntime = {
    client: { rest: discord.rest, user: { id: BOT } } as unknown as Client,
    api,
    env: { guildIds: [GUILD], databaseUrl: "postgresql://stub", cardUrl: null, cardSecret: null },
    settings: createSettingsCache(api),
    queues: {
      channels: createKeyedQueue("channels", { sleep: async () => undefined, onRetry: () => undefined }),
      canvas: createKeyedQueue("canvas", { sleep: async () => undefined, onRetry: () => undefined }),
    },
    events: createEvents(),
    connected: () => true,
  };
  return { db, rt, discord };
}

// ---------------------------------------------------------------------------
// A minimal Discord interaction: a slash command, a button or a modal submit.
// ---------------------------------------------------------------------------

interface Opts {
  user?: string;
  roles?: string[];
  sub?: string;
  options?: Record<string, unknown>;
  customId?: string;
  fields?: Record<string, string>;
}

type Sent = { how: string; payload: unknown }[];

function interaction(kind: "command" | "button" | "modal", o: Opts = {}) {
  const sent: Sent = [];
  const opt = o.options ?? {};
  const i: Record<string, unknown> = {
    guildId: GUILD,
    channelId: START,
    user: { id: o.user ?? STAFFER },
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
    isModalSubmit: () => kind === "modal",
    // Buttons sit on a message (the mirror post), so their forms submit from it.
    isFromMessage: () => kind === "modal",
    fields: { getTextInputValue: (id: string) => o.fields?.[id] ?? "" },
    options: {
      getSubcommand: () => o.sub ?? null,
      getString: (name: string) => (typeof opt[name] === "string" ? opt[name] : null),
      getInteger: (name: string) => (typeof opt[name] === "number" ? opt[name] : null),
      getUser: (name: string) => (opt[name] as { id: string; bot?: boolean } | undefined) ?? null,
    },
    showModal: jest.fn(async (m: unknown) => {
      i.replied = true;
      sent.push({ how: "showModal", payload: (m as { toJSON(): unknown }).toJSON() });
    }),
    deferReply: jest.fn(async (p: unknown) => {
      i.deferred = true;
      sent.push({ how: "deferReply", payload: p });
    }),
    deferUpdate: jest.fn(async () => {
      i.deferred = true;
      sent.push({ how: "deferUpdate", payload: null });
    }),
    reply: jest.fn(async (p: unknown) => {
      i.replied = true;
      sent.push({ how: "reply", payload: p });
    }),
    editReply: jest.fn(async (p: unknown) => {
      sent.push({ how: "editReply", payload: p });
    }),
    followUp: jest.fn(async (p: unknown) => {
      sent.push({ how: "followUp", payload: p });
    }),
    deleteReply: jest.fn(async () => undefined),
  };
  return { i: i as never, sent };
}

const reg = buildRegistry([feature]);
const text = (p: unknown) => (typeof p === "string" ? p : String((p as { content?: string })?.content ?? ""));
const answers = (sent: Sent) => sent.filter((s) => !["deferReply", "deferUpdate", "showModal"].includes(s.how));
const last = (sent: Sent) => text(answers(sent).at(-1)?.payload);
const all = (sent: Sent) => answers(sent).map((s) => text(s.payload)).join("\n");
const isEphemeral = (p: unknown) => ((p as { flags?: number })?.flags ?? 0) & MessageFlags.Ephemeral;
/** Only the person saw it: an ephemeral defer or reply, or an ephemeral follow-up after an update ack. */
const privately = (sent: Sent) => {
  const ack = sent.find((s) => s.how === "deferReply" || s.how === "reply" || s.how === "deferUpdate");
  if (!ack) return false;
  if (ack.how === "deferUpdate") return answers(sent).every((s) => s.how === "followUp" && isEphemeral(s.payload));
  return Boolean(isEphemeral(ack.payload));
};

async function settle(rt: ElementalRuntime) {
  await rt.queues.channels.idle();
  await rt.queues.canvas.idle();
}

async function el(rt: ElementalRuntime, sub: string, options: Record<string, unknown> = {}, o: Omit<Opts, "sub" | "options"> = {}) {
  const made = interaction("command", { ...o, sub, options });
  await handleElementalInteraction(rt, made.i, reg);
  await settle(rt);
  return made;
}

async function click(rt: ElementalRuntime, customId: string, o: Omit<Opts, "customId"> = {}) {
  const made = interaction("button", { ...o, customId });
  await handleElementalInteraction(rt, made.i, reg);
  await settle(rt);
  return made;
}

async function submit(rt: ElementalRuntime, customId: string, fields: Record<string, string>, o: Omit<Opts, "customId" | "fields"> = {}) {
  const made = interaction("modal", { ...o, customId, fields });
  await handleElementalInteraction(rt, made.i, reg);
  await settle(rt);
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
// Registration and gates
// ---------------------------------------------------------------------------

const GATES: Record<string, readonly string[]> = {
  [SUB.testerAdd]: TESTER_GATE,
  [SUB.sample]: TESTER_GATE,
  [SUB.resync]: HOST_ONLY,
  [SUB.totals]: HOST_ONLY,
  [SUB.link]: HOST_ONLY,
  [SUB.canvasLink]: HOST_ONLY,
  [SUB.whois]: WHOIS_GATE,
  [SUB.testCodes]: HOST_ONLY,
  [SUB.cleanup]: HOST_ONLY,
};

describe("registration", () => {
  test("nine /el tools and the mirror buttons, in the real registry next to every other feature", () => {
    const elCmd = registry().commands.find((c) => c.name === "el")!;
    const names = (elCmd.options ?? []).map((o) => o.name);
    expect(names.length).toBeLessThanOrEqual(MAX_SUBCOMMANDS);
    for (const sub of Object.values(SUB)) {
      expect(names).toContain(sub);
      expect(registry().commandHandlers.get(`el ${sub}`)?.gate).toEqual(GATES[sub]);
    }
    for (const action of Object.values(ACTIONS)) expect(registry().actions.get(action)?.gate).toEqual(TESTER_GATE);
    // Hidden by default; every tool checks roles itself anyway.
    expect(elCmd.default_member_permissions).toBe(PermissionFlagsBits.ManageGuild.toString());
  });

  test("no gate lists Judge", () => {
    for (const h of [...Object.values(feature.commandHandlers ?? {}), ...Object.values(feature.actions ?? {})]) {
      expect(h.gate).toBeDefined();
      expect(h.gate).not.toContain("judge");
    }
  });

  test("descriptions fit Discord's 100 characters; slots 1-200", () => {
    for (const sub of feature.staffSubcommands ?? []) {
      expect(sub.description.length).toBeLessThanOrEqual(100);
      for (const o of sub.options ?? []) {
        expect(o.description.length).toBeLessThanOrEqual(100);
        if (o.name === "slot") expect(o).toMatchObject({ type: ApplicationCommandOptionType.Integer, min_value: 1, max_value: 200 });
      }
    }
  });
});

describe("every tool refuses a role it does not allow, privately, before any database call", () => {
  const cmd: [string, Record<string, unknown>][] = [
    [SUB.testerAdd, { slot: 12 }],
    [SUB.sample, { n: 3 }],
    [SUB.resync, {}],
    [SUB.totals, {}],
    [SUB.link, { user: { id: user(1) }, registration: REG, position: 1 }],
    [SUB.canvasLink, { slot: 12, url: `https://passionseed.org/whiteboard/${BOARD}?focus=frame-a` }],
    [SUB.whois, { user: { id: user(1) } }],
    [SUB.testCodes, { n: 5 }],
    [SUB.cleanup, { confirm: "elemental-dryrun" }],
  ];

  const refusedRoles = (sub: string): string[][] => {
    const roles: string[][] = [[ROLE.judge], [ROLE.paid], [], [ROLE.judge, ROLE.paid]];
    const gate = GATES[sub];
    if (!gate.includes("helper")) roles.push([ROLE.helper]);
    if (!gate.includes("safety")) roles.push([ROLE.safety]);
    roles.push([ROLE.mentor]);
    return roles;
  };

  test.each(cmd)("/el %s", async (sub, options) => {
    for (const roles of refusedRoles(sub)) {
      const { db, rt } = setup("rehearsal");
      const { sent } = await el(rt, sub, options, { roles });
      expect(last(sent)).toBe(COMMON.staffOnly);
      expect(db.fns()).toEqual([]);
      expect(sent.some((s) => s.how === "showModal")).toBe(false);
      expect(privately(sent)).toBe(true);
    }
  });

  test.each([ACTIONS.remove, ACTIONS.review, ACTIONS.testerFix])("the %s button", async (action) => {
    for (const roles of [[ROLE.judge], [ROLE.mentor], [ROLE.safety], [ROLE.paid]]) {
      const { db, rt } = setup();
      const t = db.team("fire", 12);
      const e = db.entry(t);
      const { sent } = await click(rt, `el|${action}|${action === ACTIONS.testerFix ? 12 : e.id}`, { roles });
      expect(last(sent)).toBe(COMMON.staffOnly);
      expect(privately(sent)).toBe(true);
      expect(db.fns()).toEqual([]);
      expect(e).toMatchObject({ removed: false, reviewed: false, counted: true });
    }
  });

  test.each([ACTIONS.removeReason, ACTIONS.testerAdd])("the %s form submit", async (action) => {
    const { db, rt } = setup();
    const t = db.team("fire", 12);
    const e = db.entry(t);
    const { sent } = await submit(rt, `el|${action}|${action === ACTIONS.testerAdd ? 12 : e.id}`, { reason: "dup", who: "a friend", tried: "x" }, { roles: [ROLE.judge] });
    expect(last(sent)).toBe(COMMON.staffOnly);
    expect(privately(sent)).toBe(true);
    expect(db.fns()).toEqual([]);
  });

  test("Helper may use the tester tools; Safety may use whois", async () => {
    const { db, rt } = setup();
    db.team("fire", 12);
    const sample = await el(rt, SUB.sample, {}, { roles: [ROLE.helper] });
    expect(last(sample.sent)).toBe(STAFF.sampleNone(null));
    const who = await el(rt, SUB.whois, { user: { id: user(1) } }, { roles: [ROLE.safety] });
    expect(all(who.sent)).toContain(REG);
  });
});

// ---------------------------------------------------------------------------
// Remove and Reviewed
// ---------------------------------------------------------------------------

describe("Remove", () => {
  test("the button opens the reason form; nothing is written yet", async () => {
    const { db, rt } = setup();
    const e = db.entry(db.team("fire", 12));
    const { sent } = await click(rt, `el|rm|${e.id}`, { roles: [ROLE.helper] });
    const modal = sent.find((s) => s.how === "showModal")!.payload as { custom_id: string };
    expect(modal.custom_id).toBe(`el|${ACTIONS.removeReason}|${e.id}`);
    expect(db.fns()).toEqual([]);
  });

  test("un-counts the entry, edits the mirror post, and tombstones the canvas note", async () => {
    const { db, rt } = setup();
    const t = db.team("fire", 12, { linked: true });
    const e = db.entry(t, { canvas: "written" });
    const { sent } = await submit(rt, `el|${ACTIONS.removeReason}|${e.id}`, { reason: "not a real test" }, { roles: [ROLE.helper] });

    expect(e).toMatchObject({ removed: true, counted: false, canvas: "tombstoned" });
    expect(t.lit).toBe(false);
    expect(db.fns()).toEqual([FN.remove, "elemental_bot_canvas_target", "elemental_bot_canvas_tombstone"]);
    expect(db.calls.find((c) => c.fn === FN.remove)!.args).toEqual([GUILD, e.id, STAFFER, "not a real test"]);
    expect(db.calls.find((c) => c.fn === "elemental_bot_canvas_tombstone")!.args).toEqual([GUILD, e.id, STAFFER]);

    // The post the button sat on is redrawn (deferUpdate, then editReply) with Remove disabled.
    expect(sent[0].how).toBe("deferUpdate");
    const edit = sent.find((s) => s.how === "editReply")!.payload as { content: string; components: { toJSON(): { components: { disabled?: boolean }[] } }[] };
    expect(edit.content).toContain(TESTER.mirrorRemoved);
    expect(edit.components[0].toJSON().components.every((b) => b.disabled)).toBe(true);
    // A private line for the staff member.
    const note = sent.find((s) => s.how === "followUp")!;
    expect(isEphemeral(note.payload)).toBeTruthy();
    expect(text(note.payload)).toBe([STAFF.removed({ slot: 12, total: 0, cap: 10, wasCounted: true, lit: false }), STAFF.tombstoned].join("\n"));
  });

  test("the team's next entry counts again after a removal", async () => {
    const { db, rt } = setup();
    const t = db.team("water", 3);
    const entries = Array.from({ length: 10 }, () => db.entry(t));
    db.entry(t, { counted: false });
    await submit(rt, `el|${ACTIONS.removeReason}|${entries[0].id}`, {}, { roles: [ROLE.host] });
    expect(db.counted(t)).toBe(9);
    const { sent } = await submit(rt, `el|${ACTIONS.testerAdd}|3`, { who: "a parent", tried: "the sign-up page" }, { roles: [ROLE.helper] });
    expect(all(sent)).toContain(TESTER.counted(10, 10));
  });

  test("a reason with a contact is refused before any call and never echoed", async () => {
    const { db, rt } = setup();
    const e = db.entry(db.team("fire", 12));
    const { sent } = await submit(rt, `el|${ACTIONS.removeReason}|${e.id}`, { reason: "call 0812345678" }, { roles: [ROLE.host] });
    expect(last(sent)).toBe(STAFF.reasonPii);
    expect(all(sent)).not.toContain("0812345678");
    expect(db.fns()).toEqual([]);
    expect(e.removed).toBe(false);
  });

  test("a second removal says so and changes nothing", async () => {
    const { db, rt } = setup();
    const e = db.entry(db.team("fire", 12), { removed: true, counted: false });
    const { sent } = await submit(rt, `el|${ACTIONS.removeReason}|${e.id}`, {}, { roles: [ROLE.host] });
    expect(text(sent.find((s) => s.how === "followUp")!.payload)).toContain(STAFF.alreadyRemoved);
  });

  test("an unknown entry gets its own line", async () => {
    const { rt } = setup();
    const { sent } = await submit(rt, `el|${ACTIONS.removeReason}|${randomUUID()}`, {}, { roles: [ROLE.host] });
    expect(last(sent)).toBe(STAFF.entryNotFound);
  });
});

describe("Reviewed and /el sample", () => {
  test("Reviewed marks the entry and redraws the post", async () => {
    const { db, rt } = setup();
    const e = db.entry(db.team("air", 30));
    const { sent } = await click(rt, `el|rv|${e.id}`, { roles: [ROLE.helper] });
    expect(e.reviewed).toBe(true);
    expect(sent[0].how).toBe("deferUpdate");
    expect(text(sent.find((s) => s.how === "editReply")!.payload)).toContain(TESTER.mirrorReviewed);
  });

  test("sample returns only unreviewed, not removed entries, one private message each with both buttons", async () => {
    const { db, rt } = setup();
    const fire = db.team("fire", 12);
    const water = db.team("water", 3);
    const open = [db.entry(fire, { tried: "open one" }), db.entry(water, { tried: "open two" })];
    db.entry(fire, { reviewed: true, tried: "seen" });
    db.entry(fire, { removed: true, counted: false, tried: "gone" });

    const { sent } = await el(rt, SUB.sample, { n: 10 }, { roles: [ROLE.helper] });
    expect(db.calls.find((c) => c.fn === FN.sample)!.args).toEqual([GUILD, STAFFER, 10, null]);
    expect(last(sent.slice(0, 2))).toBe(STAFF.sampleHeader(2, null));
    const posts = sent.filter((s) => s.how === "followUp");
    expect(posts).toHaveLength(2);
    for (const p of posts) expect(isEphemeral(p.payload)).toBeTruthy();
    const shown = posts.map((p) => text(p.payload)).join("\n");
    expect(shown).toContain("open one");
    expect(shown).toContain("open two");
    expect(shown).not.toContain("seen");
    expect(shown).not.toContain("gone");
    const ids = posts.flatMap((p) =>
      ((p.payload as { components: { toJSON(): { components: { custom_id: string }[] } }[] }).components[0].toJSON().components).map((b) => b.custom_id)
    );
    expect(ids).toEqual(open.flatMap((e) => [`el|rm|${e.id}`, `el|rv|${e.id}`]));

    // Reviewing one takes it out of the next sample.
    await click(rt, `el|rv|${open[0].id}`, { roles: [ROLE.helper] });
    const again = await el(rt, SUB.sample, { n: 10, element: "fire" }, { roles: [ROLE.helper] });
    expect(last(again.sent)).toBe(STAFF.sampleNone("fire"));
  });

  test("an unknown element is refused before the call", async () => {
    const { db, rt } = setup();
    const { sent } = await el(rt, SUB.sample, { element: "metal" }, { roles: [ROLE.helper] });
    expect(last(sent)).toBe("ธาตุไม่ถูกต้อง");
    expect(db.fns()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// /el tester-add
// ---------------------------------------------------------------------------

describe("/el tester-add", () => {
  test("opens the /tester form for that plot", async () => {
    const { db, rt } = setup();
    db.team("fire", 12);
    const { sent } = await el(rt, SUB.testerAdd, { slot: 12 }, { roles: [ROLE.helper] });
    const modal = sent.find((s) => s.how === "showModal")!.payload as { custom_id: string; title: string };
    expect(modal.custom_id).toBe(`el|${ACTIONS.testerAdd}|12`);
    expect(modal.title).toBe(STAFF.testerAddTitle(12));
    expect(db.fns()).toEqual([]);
  });

  test("counts like a normal entry: n/cap, the mirror (marked staff), the first-entry bell, and a not-counted 11th", async () => {
    const { db, rt, discord } = setup();
    const t = db.team("fire", 12);
    const firsts: ElementalEventMap["tester.first"][] = [];
    rt.events.on("tester.first", (p) => void firsts.push(p));

    const first = await submit(rt, `el|${ACTIONS.testerAdd}|12`, { who: "a parent", tried: "the sign-up page" }, { roles: [ROLE.helper] });
    expect(db.calls.find((c) => c.fn === FN.testerAdd)!.args).toEqual([GUILD, STAFFER, 12, "a parent", "the sign-up page", null, null]);
    expect(last(first.sent)).toBe([STAFF.testerAdded(12), TESTER.counted(1, 10), TESTER.canvasNotLinked].join("\n"));
    expect(isEphemeral(first.sent[0].payload)).toBeTruthy();
    expect(firsts).toHaveLength(1);
    expect(firsts[0]).toMatchObject({ guildId: GUILD, teamId: t.id });
    const mirror = discord.log.filter((l) => l.method === "post" && l.route.endsWith("/messages"));
    expect(mirror).toHaveLength(1);
    expect(String((mirror[0].body as { content: string }).content)).toContain(TESTER.mirrorStaffSource);
    expect(String((mirror[0].body as { content: string }).content)).not.toContain(STAFFER);

    for (let k = 2; k <= 10; k++) await submit(rt, `el|${ACTIONS.testerAdd}|12`, { who: "a friend", tried: `try ${k}` }, { roles: [ROLE.helper] });
    expect(db.counted(t)).toBe(10);
    const eleventh = await submit(rt, `el|${ACTIONS.testerAdd}|12`, { who: "a friend", tried: "one more" }, { roles: [ROLE.helper] });
    expect(all(eleventh.sent)).toContain(TESTER.notCounted(10));
    expect(firsts).toHaveLength(1);
  });

  test("a linked team's note is written on the canvas", async () => {
    const { db, rt } = setup();
    db.team("fire", 12, { linked: true });
    const { sent } = await submit(rt, `el|${ACTIONS.testerAdd}|12`, { who: "a parent", tried: "the map" }, { roles: [ROLE.host] });
    expect(db.fns()).toContain("elemental_bot_canvas_write");
    expect(last(sent)).toBe([STAFF.testerAdded(12), TESTER.counted(1, 10), TESTER.canvasWritten].join("\n"));
  });

  test("a contact is refused before any call, the text kept for the fix button and never echoed", async () => {
    const { db, rt } = setup();
    db.team("fire", 12);
    const values = { who: "a parent", tried: "mail me at someone@example.com" };
    const { sent } = await submit(rt, `el|${ACTIONS.testerAdd}|12`, values, { roles: [ROLE.helper] });
    expect(last(sent)).toBe(STAFF.fieldPii(TESTER.fieldNames.tried));
    expect(all(sent)).not.toContain("example.com");
    expect(db.fns()).toEqual([]);

    const fix = await click(rt, `el|${ACTIONS.testerFix}|12`, { roles: [ROLE.helper] });
    const modal = JSON.stringify(fix.sent.find((s) => s.how === "showModal")!.payload);
    expect(modal).toContain("someone@example.com");
    expect(modal).toContain(`el|${ACTIONS.testerAdd}|12`);
  });

  test("SQL's own field refusal and an empty plot get their lines", async () => {
    const { db, rt } = setup();
    db.team("fire", 12);
    const pii = await submit(rt, `el|${ACTIONS.testerAdd}|12`, { who: "a parent", tried: "id 123456789012" }, { roles: [ROLE.helper] });
    expect(last(pii.sent)).toBe(STAFF.fieldPii(TESTER.fieldNames.tried));
    const none = await submit(rt, `el|${ACTIONS.testerAdd}|99`, { who: "a parent", tried: "the map" }, { roles: [ROLE.helper] });
    expect(last(none.sent)).toBe("ไม่พบทีมที่ยังเล่นอยู่ในแปลงนี้");
  });
});

// ---------------------------------------------------------------------------
// /el resync
// ---------------------------------------------------------------------------

describe("/el resync", () => {
  test("shouldRetry: writes that failed, never ran or were left pending; removed notes still showing", () => {
    expect(shouldRetry({ action: "write", canvas_status: "failed" })).toBe(true);
    expect(shouldRetry({ action: "write", canvas_status: "none" })).toBe(true);
    expect(shouldRetry({ action: "write", canvas_status: "pending" })).toBe(true);
    expect(shouldRetry({ action: "write", canvas_status: "written" })).toBe(false);
    expect(shouldRetry({ action: "tombstone", canvas_status: "failed" })).toBe(true);
    expect(shouldRetry({ action: "tombstone", canvas_status: "written" })).toBe(true);
    expect(shouldRetry({ action: "tombstone", canvas_status: "pending" })).toBe(true);
  });

  test("retries failed, none and stuck pending notes; written notes are left alone", async () => {
    const { db, rt } = setup();
    const t = db.team("fire", 12, { linked: true });
    const failed = db.entry(t, { canvas: "failed" });
    const none = db.entry(t, { canvas: "none" });
    const written = db.entry(t, { canvas: "written" });
    const pending = db.entry(t, { canvas: "pending" });
    const stuck = db.entry(t, { canvas: "failed" });
    const removed = db.entry(t, { canvas: "failed", removed: true, counted: false });
    db.failWrites.add(stuck.id);

    const { sent } = await el(rt, SUB.resync);
    const touched = db.calls.filter((c) => c.fn === "elemental_bot_canvas_write").map((c) => c.args[1]);
    expect(touched.sort()).toEqual([failed.id, none.id, pending.id, stuck.id].sort());
    expect(db.calls.filter((c) => c.fn === "elemental_bot_canvas_tombstone").map((c) => c.args[1])).toEqual([removed.id]);
    expect(db.calls.some((c) => c.args[1] === written.id)).toBe(false);
    expect([failed.canvas, none.canvas, written.canvas, pending.canvas, removed.canvas]).toEqual(["written", "written", "written", "written", "tombstoned"]);
    expect(last(sent)).toBe(STAFF.resyncDone({ written: 3, tombstoned: 1, failed: 1, skipped: 0 }));
  });

  test("after a canvas link, the listener writes that team's pending notes only", async () => {
    const { db, rt } = setup();
    const t = db.team("fire", 12, { linked: true });
    const other = db.team("water", 3, { linked: true });
    const mine = [db.entry(t, { canvas: "pending" }), db.entry(t, { canvas: "none" })];
    const theirs = db.entry(other, { canvas: "pending" });
    const removed = db.entry(t, { canvas: "written", removed: true, counted: false });
    await feature.events!["canvas.linked"]!(
      { guildId: GUILD, edition: "elemental-2026", teamId: t.id, slot: 12, boardId: BOARD, frameId: "frame-a", replaced: null, via: "staff" },
      rt
    );
    expect(mine.map((e) => e.canvas)).toEqual(["written", "written"]);
    expect(theirs.canvas).toBe("pending");
    expect(removed.canvas).toBe("written");
  });

  test("nothing left: says so", async () => {
    const { db, rt } = setup();
    db.entry(db.team("fire", 12, { linked: true }), { canvas: "written" });
    const { sent } = await el(rt, SUB.resync);
    expect(last(sent)).toBe(STAFF.resyncNone);
  });
});

// ---------------------------------------------------------------------------
// /el totals, /el link, /el canvas-link, /el whois
// ---------------------------------------------------------------------------

describe("/el totals", () => {
  test("reads the guild's edition and shows each element", async () => {
    const { db, rt } = setup();
    const { sent } = await el(rt, SUB.totals);
    expect(db.calls.find((c) => c.fn === FN.totals)!.args).toEqual(["elemental-2026"]);
    const out = last(sent);
    expect(out).toContain(STAFF.totalsHelped(12, 5));
    expect(out).toContain(STAFF.totalsCheckedIn(3, 4));
    expect(out).toContain(STAFF.totalsElement({ element: "fire", level: 9, delta: 4, teams: 2 }));
    expect(isEphemeral(sent[0].payload)).toBeTruthy();
  });
});

describe("/el link", () => {
  test("links a registration seat and adds the Paid role", async () => {
    const { db, rt, discord } = setup();
    const { sent } = await el(rt, SUB.link, { user: { id: user(1) }, registration: REG.toUpperCase(), position: 1 });
    expect(db.calls.find((c) => c.fn === FN.link)!.args).toEqual([GUILD, STAFFER, user(1), REG, 1]);
    expect(discord.log).toContainEqual({ method: "put", route: Routes.guildMemberRole(GUILD, user(1), ROLE.paid) });
    expect(last(sent)).toBe([STAFF.linked({ userId: user(1), registrationId: REG, position: 1, already: false }), STAFF.paidAdded].join("\n"));
  });

  test("with neither registration nor position: a staff account, no Paid role", async () => {
    const { db, rt, discord } = setup();
    const { sent } = await el(rt, SUB.link, { user: { id: user(2) } });
    expect(db.calls.find((c) => c.fn === FN.link)!.args).toEqual([GUILD, STAFFER, user(2), null, null]);
    expect(discord.log.filter((l) => l.method === "put")).toEqual([]);
    expect(last(sent)).toBe(STAFF.linkedStaff(user(2)));
  });

  test("a student on a live team is not made staff: SQL refuses, the reply names them and says what to do", async () => {
    const { rt } = setup();
    const { sent } = await el(rt, SUB.link, { user: { id: user(60) } });
    expect(last(sent)).toBe(staffErrorText("staff_teamed", user(60)));
    expect(last(sent)).toContain(`<@${user(60)}>`);
    expect(last(sent)).toContain("/el team-archive");
  });

  test("refusals: one without the other, a bad id, a seat already taken, a rehearsal guild", async () => {
    const { db, rt } = setup();
    expect(last((await el(rt, SUB.link, { user: { id: user(1) }, registration: REG })).sent)).toBe(STAFF.linkNeedsBoth);
    expect(last((await el(rt, SUB.link, { user: { id: user(1) }, registration: "not-a-uuid-at-all-not-a-uuid-at-all1", position: 1 })).sent)).toBe(
      STAFF.linkBadRegistration
    );
    expect(last((await el(rt, SUB.link, { user: { id: BOT, bot: true }, registration: REG, position: 1 })).sent)).toBe("บัญชีผู้ใช้ไม่ถูกต้อง");
    expect(db.fns()).toEqual([]);
    expect(last((await el(rt, SUB.link, { user: { id: user(1) }, registration: REG, position: 2 })).sent)).toBe(`ที่นั่งนี้ผูกกับ <@${user(99)}> อยู่แล้ว`);

    const rehearsal = setup("rehearsal");
    expect(last((await el(rehearsal.rt, SUB.link, { user: { id: user(1) }, registration: REG, position: 1 })).sent)).toContain("ไม่ใช่กิจกรรมจริง");
  });
});

describe("/el canvas-link", () => {
  test("overrides the link, pins it in the team's channel, and tells the canvas writer (via staff)", async () => {
    const { db, rt, discord } = setup();
    const t = db.team("fire", 12);
    const e = db.entry(t);
    const linked: ElementalEventMap["canvas.linked"][] = [];
    rt.events.on("canvas.linked", (p) => void linked.push(p));

    const { sent } = await el(rt, SUB.canvasLink, { slot: 12, url: `passionseed.org/whiteboard/${BOARD.toUpperCase()}?focus=frame-a` });
    expect(db.calls.find((c) => c.fn === FN.canvasOverride)!.args).toEqual([GUILD, STAFFER, 12, BOARD, "frame-a"]);
    expect(e.canvas).toBe("pending");
    const pin = discord.log.find((l) => l.method === "post" && l.route === Routes.channelMessages(t.channelId!))!;
    expect(String((pin.body as { content: string }).content)).toContain(`https://passionseed.org/whiteboard/${BOARD}?focus=frame-a`);
    expect(discord.log).toContainEqual({ method: "put", route: expect.stringContaining(`/channels/${t.channelId}/messages/pins/`) });
    expect(last(sent)).toContain(STAFF.canvasLinked(12));
    expect(last(sent)).toContain(STAFF.pinLine.pinned);
    expect(linked).toEqual([
      { guildId: GUILD, edition: "elemental-2026", teamId: t.id, slot: 12, boardId: BOARD, frameId: "frame-a", replaced: null, via: "staff" },
    ]);

    // Again: already linked, no second event.
    const again = await el(rt, SUB.canvasLink, { slot: 12, url: `https://passionseed.org/whiteboard/${BOARD}?focus=frame-a` });
    expect(last(again.sent)).toContain(STAFF.canvasAlready);
    expect(linked).toHaveLength(1);
  });

  test("a bad link never reaches the database; SQL refusals get their own line", async () => {
    const { db, rt } = setup();
    db.team("fire", 12);
    expect(last((await el(rt, SUB.canvasLink, { slot: 12, url: `https://passionseed.org/whiteboard/${BOARD}` })).sent)).toBe(CANVAS.url.missing_focus);
    expect(last((await el(rt, SUB.canvasLink, { slot: 12, url: "https://example.com/x" })).sent)).toBe(CANVAS.url.host);
    expect(db.fns()).toEqual([]);
    expect(last((await el(rt, SUB.canvasLink, { slot: 12, url: `https://passionseed.org/whiteboard/${BOARD}?focus=taken` })).sent)).toContain("ทีมอื่น");
    expect(last((await el(rt, SUB.canvasLink, { slot: 40, url: `https://passionseed.org/whiteboard/${BOARD}?focus=frame-b` })).sent)).toBe(
      "ไม่พบทีมที่ยังเล่นอยู่ในแปลงนี้"
    );
  });

  test("canvas.linked's payload type is the one E17 declares", () => {
    // Keeps this file importing features/canvas (the module augmentation lives there).
    expect(canvasFeature.name).toBe("canvas");
  });
});

describe("/el whois", () => {
  const NAME = "Fixture Student";
  const SCHOOL = "Fixture School";
  const PHONE = "0899999999";

  test("shows the registration id and position only: never a name, school or phone, whatever SQL returns", async () => {
    const { db, rt } = setup();
    db.whoisExtra = { full_name: NAME, name: NAME, school: SCHOOL, phone: PHONE, parent_phone: PHONE, parent_name: NAME };
    const { sent } = await el(rt, SUB.whois, { user: { id: user(1) } }, { roles: [ROLE.safety] });
    const out = all(sent);
    expect(out).toBe(STAFF.whois({ userId: user(1), registrationId: REG, position: 3 }));
    for (const secret of [NAME, SCHOOL, PHONE, "Fixture", "fire", "12"]) expect(out.split(REG).join("")).not.toContain(secret);
    expect(isEphemeral(sent[0].payload)).toBeTruthy();
    expect(db.calls.find((c) => c.fn === FN.whois)!.args).toEqual([GUILD, STAFFER, user(1)]);
  });

  test("unclaimed, staff and rehearsal accounts", () => {
    expect(whoisText(user(1), { claimed: false })).toBe(STAFF.whoisNotClaimed(user(1)));
    expect(whoisText(user(1), null)).toBe(STAFF.whoisNotClaimed(user(1)));
    expect(whoisText(user(1), { claimed: true, is_staff: true, registration_id: null })).toBe(STAFF.whoisStaff(user(1)));
    expect(whoisText(user(1), { claimed: true, is_staff: false, registration_id: null })).toBe(STAFF.whoisRehearsal(user(1)));
  });
});

// ---------------------------------------------------------------------------
// Rehearsal only: /el test-codes and /el dryrun-cleanup
// ---------------------------------------------------------------------------

describe("/el test-codes", () => {
  test("refused in the real guild before any database call", async () => {
    const { db, rt } = setup("event");
    const { sent } = await el(rt, SUB.testCodes, { n: 40 });
    expect(last(sent)).toBe(STAFF.rehearsalOnly);
    expect(db.fns()).toEqual([]);
  });

  test("in the rehearsal guild: n codes, privately, in code blocks under Discord's cap", async () => {
    const { db, rt } = setup("rehearsal");
    const { sent } = await el(rt, SUB.testCodes, { n: 200 });
    expect(db.calls.find((c) => c.fn === FN.testCodes)!.args).toEqual([GUILD, STAFFER, 200]);
    const msgs = answers(sent).map((s) => text(s.payload));
    expect(msgs[0]).toContain(STAFF.codesHead(200, "elemental-dryrun"));
    for (const m of msgs) expect(m.length).toBeLessThanOrEqual(2000);
    expect(msgs.join("\n").match(/^TEST\d{4}$/gm)).toHaveLength(200);
    for (const s of sent.filter((x) => x.how === "followUp")) expect(isEphemeral(s.payload)).toBeTruthy();
  });
});

describe("/el dryrun-cleanup", () => {
  test("refused in the real guild, even with the right confirm, before any database call", async () => {
    const { db, rt, discord } = setup("event");
    db.team("fire", 12);
    for (const confirm of ["elemental-2026", "elemental-dryrun"]) {
      const { sent } = await el(rt, SUB.cleanup, { confirm });
      expect(last(sent)).toBe(STAFF.rehearsalOnly);
    }
    expect(db.fns()).toEqual([]);
    expect(discord.log.filter((l) => l.method === "delete")).toEqual([]);
  });

  test("refused with the wrong confirm", async () => {
    const { db, rt, discord } = setup("rehearsal");
    const t = db.team("fire", 12);
    for (const confirm of ["yes", "elemental-2026", "ELEMENTAL-DRYRUN"]) {
      const { sent } = await el(rt, SUB.cleanup, { confirm });
      expect(last(sent)).toBe(STAFF.cleanupBadConfirm("elemental-dryrun"));
    }
    expect(db.fns()).toEqual([]);
    expect(t.live).toBe(true);
    expect(discord.log.filter((l) => l.method === "delete")).toEqual([]);
  });

  test("with the edition typed: archives every team and deletes only their channels", async () => {
    const { db, rt, discord } = setup("rehearsal");
    const a = db.team("fire", 12);
    const b = db.team("water", 3);
    db.team("air", 30, { channelId: null });
    // A team row pointing at a shared channel must never get it deleted.
    db.team("earth", 20, { channelId: MIRROR });
    db.entry(a);
    // The first channel is already gone (404): counted as deleted.
    discord.rest.delete.mockImplementationOnce(async (route: string) => {
      discord.log.push({ method: "delete", route });
      throw Object.assign(new Error("Unknown Channel"), { status: 404 });
    });

    const { sent } = await el(rt, SUB.cleanup, { confirm: "elemental-dryrun" });
    expect(db.calls.find((c) => c.fn === FN.cleanup)!.args).toEqual([GUILD, STAFFER, "elemental-dryrun"]);
    expect([...db.teams.values()].every((t) => !t.live)).toBe(true);
    const deleted = discord.log.filter((l) => l.method === "delete").map((l) => l.route);
    expect(deleted.sort()).toEqual([Routes.channel(a.channelId!), Routes.channel(b.channelId!)].sort());
    expect(last(sent)).toBe(STAFF.cleanupDone({ teams: 4, deleted: 2, failed: 0 }));
  });

  test("a channel that cannot be deleted is named, since a second run no longer lists it", async () => {
    const { db, rt, discord } = setup("rehearsal");
    const a = db.team("fire", 12);
    const b = db.team("water", 3);
    discord.rest.delete.mockImplementation(async (route: string) => {
      discord.log.push({ method: "delete", route });
      if (route === Routes.channel(b.channelId!)) throw Object.assign(new Error("Missing Permissions"), { status: 403 });
    });

    const { sent } = await el(rt, SUB.cleanup, { confirm: "elemental-dryrun" });
    expect(last(sent)).toBe(STAFF.cleanupDone({ teams: 2, deleted: 1, failed: 1, failedIds: [b.channelId!] }));
    expect(last(sent)).toContain(`<#${b.channelId}>`);
    expect(last(sent)).not.toContain(`<#${a.channelId}>`);
  });
});
