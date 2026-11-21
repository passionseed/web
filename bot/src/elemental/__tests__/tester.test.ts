/**
 * @jest-environment node
 */
import fs from "node:fs";
import path from "node:path";

import { ChannelType, InteractionContextType, MessageFlags, Routes, type Client } from "discord.js";

import piiCases from "../../../../lib/elemental/core/pii-cases.json";
import { isValidIndex, noteIds, type Note } from "../../../../lib/elemental/canvas";
import { ElementalDbError, ElementalError, type ElementalApi } from "../api";
import { AUTO_ATTEMPTS, planNote, resyncPending, writeNote, type CanvasTarget } from "../canvasWrite";
import type { ElementalRuntime, RepliableInteraction } from "../context";
import { COMMON } from "../copy/common";
import { TESTER, noteText } from "../copy/tester";
import { ACTIONS, EDIT_WINDOW_MS, FIELDS, feature, mirrorContent, testerMemory } from "../features/tester";
import { createRuntime, handleElementalInteraction } from "../index";
import { createKeyedQueue } from "../queue";
import { registry } from "../registry";

// ---------------------------------------------------------------------------
// Fixtures: made-up snowflakes and ids only, no names, no real guild.
// ---------------------------------------------------------------------------

const GUILD = "100000000000000001";
const USER = "200000000000000001";
const TEAMMATE = "200000000000000002";
const OUTSIDER = "200000000000000099";
const ROLE = {
  host: "300000000000000001",
  helper: "300000000000000002",
  mentor: "300000000000000003",
  judge: "300000000000000004",
  safety: "300000000000000005",
  paid: "300000000000000006",
};
const MIRROR = "400000000000000003";
const FIRE_CAT = "500000000000000040";
const WATER_CAT = "500000000000000010";
const OTHER_CAT = "500000000000000099";
const FIRE_CHANNEL = "400000000000000071";
const WATER_CHANNEL = "400000000000000072";
const GENERAL = "400000000000000009";
const FIRE_THREAD = "600000000000000001";
const WATER_THREAD = "600000000000000002";
const NEW_THREAD = "600000000000000009";
const BOARD = "00000000-0000-4000-8000-0000000000f1";
const OWNER = "00000000-0000-4000-8000-0000000000a0";
const FIRE_TEAM = "00000000-0000-4000-8000-00000000f001";
const WATER_TEAM = "00000000-0000-4000-8000-00000000a001";

const ENV = { guildIds: [GUILD], databaseUrl: "postgresql://stub:stub@127.0.0.1:5432/postgres", cardUrl: null, cardSecret: null };

// General words only, as a student might write them.
const GOOD = {
  who: "a friend from another class",
  tried: "opened the map and looked for the canteen",
  quote: "the buttons are small",
  changed: "made the buttons bigger",
};

function rawSettings(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    guild_id: GUILD,
    edition: "elemental-2026",
    edition_kind: "event",
    roles: ROLE,
    channels: { mirror: MIRROR },
    element_categories: { fire: [FIRE_CAT], water: [WATER_CAT] },
    tester_cap: 10,
    ...over,
  };
}

interface Team {
  id: string;
  slot: number;
  element: string;
  project_name: string;
  members: string[];
  lit: boolean;
}

interface Entry {
  id: string;
  team: Team;
  logger: string;
  who: string;
  tried: string;
  quote: string | null;
  changed: string | null;
  counted: boolean;
  removed: boolean;
  created_at: string;
  edited_at: string | null;
  canvas_status: string;
}

interface FakeDbOptions {
  settings?: Record<string, unknown> | null;
  linked?: boolean;
  /** Called before canvas_target answers (a gate for timing tests). */
  beforeTarget?: () => Promise<void> | void;
  write?: (args: unknown[], board: Map<string, Record<string, unknown>>) => unknown;
  testerAdd?: (args: unknown[]) => unknown;
  testerEdit?: (args: unknown[]) => unknown;
  pending?: unknown[];
}

const ZONE = { x: 40, y: 300, width: 1300, height: 420 };
const FRAME = { x: 0, y: 0, width: 1800, height: 1400 };

/** An in-memory stand-in for the elemental_bot_* functions this feature calls. */
function fakeDb(opts: FakeDbOptions = {}) {
  const calls: { fn: string; args: unknown[] }[] = [];
  const log: string[] = [];
  const teams = new Map<string, Team>([
    [FIRE_CHANNEL, { id: FIRE_TEAM, slot: 7, element: "fire", project_name: "Lantern Map", members: [USER, TEAMMATE], lit: false }],
    [WATER_CHANNEL, { id: WATER_TEAM, slot: 31, element: "water", project_name: "Rain Notes", members: [OUTSIDER], lit: false }],
  ]);
  const entries = new Map<string, Entry>();
  const checkins = new Set<string>();
  const board = new Map<string, Record<string, unknown>>([
    ["frame-a", { id: "frame-a", type: "frame", ...FRAME, index: "a0" }],
    ["zone-test", { id: "zone-test", type: "rectangle", ...ZONE, index: "a1", frameId: "frame-a", customData: { zone: "test" } }],
  ]);
  let seq = 0;
  const linked = opts.linked ?? true;

  const entryJson = (e: Entry) => ({
    id: e.id,
    entry_id: e.id,
    team_id: e.team.id,
    slot: e.team.slot,
    element: e.team.element,
    project_name: e.team.project_name,
    source: "bot",
    who: e.who,
    tried: e.tried,
    quote: e.quote,
    changed: e.changed,
    counted: e.counted,
    created_at: e.created_at,
    edited_at: e.edited_at,
    removed: e.removed,
    reviewed: false,
    canvas_status: e.canvas_status,
  });
  const teamCounted = (t: Team) => [...entries.values()].filter((e) => e.team === t && e.counted && !e.removed).length;

  const impl = async (fn: string, args: unknown[]): Promise<unknown> => {
    switch (fn) {
      case "elemental_bot_settings_get":
        return opts.settings === undefined ? rawSettings() : opts.settings;
      case "elemental_bot_tester_add": {
        if (opts.testerAdd) return opts.testerAdd(args);
        const team = teams.get(String(args[1]));
        if (!team) throw new ElementalError("not_team_channel");
        if (!team.members.includes(String(args[2]))) throw new ElementalError("not_team_member");
        const counted = teamCounted(team) < 10;
        seq += 1;
        const e: Entry = {
          id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
          team,
          logger: String(args[2]),
          who: String(args[3]),
          tried: String(args[4]),
          quote: (args[5] as string | null) ?? null,
          changed: (args[6] as string | null) ?? null,
          counted,
          removed: false,
          created_at: new Date().toISOString(),
          edited_at: null,
          canvas_status: linked ? "pending" : "none",
        };
        entries.set(e.id, e);
        const first = counted && !team.lit;
        if (first) team.lit = true;
        return { ...entryJson(e), first_counted: first, team_total: teamCounted(team), edition_total: 0, cap: 10, canvas_linked: linked, repeated: false };
      }
      case "elemental_bot_tester_edit": {
        if (opts.testerEdit) return opts.testerEdit(args);
        const e = entries.get(String(args[1]));
        if (!e) throw new ElementalError("entry_not_found");
        if (e.logger !== args[2]) throw new ElementalError("not_logger");
        if (Date.now() - Date.parse(e.created_at) > EDIT_WINDOW_MS) throw new ElementalError("edit_closed");
        Object.assign(e, { who: args[3], tried: args[4], quote: args[5] ?? null, changed: args[6] ?? null, edited_at: new Date().toISOString() });
        const rewrite = e.canvas_status !== "none";
        if (rewrite) e.canvas_status = "pending";
        return { ...entryJson(e), rewrite };
      }
      case "elemental_bot_canvas_target": {
        await opts.beforeTarget?.();
        const e = entries.get(String(args[1]));
        if (!e) throw new ElementalError("entry_not_found");
        const ids = noteIds(e.id);
        const base = {
          entry_id: e.id,
          kind: "test",
          source: "tester",
          team_id: e.team.id,
          slot: e.team.slot,
          element: e.team.element,
          project_name: e.team.project_name,
          live: true,
          removed: e.removed,
          canvas_status: e.canvas_status,
          fields: { who: e.who, tried: e.tried, quote: e.quote, changed: e.changed },
          note_ids: ids,
          linked,
        };
        if (!linked) return base;
        const all = [...board.values()];
        const rect = board.get(ids.rect);
        const text = board.get(ids.text);
        const indices = all.map((el) => el.index as string).filter(isValidIndex).sort();
        return {
          ...base,
          board_id: BOARD,
          frame_id: "frame-a",
          owner_id: OWNER,
          frame: FRAME,
          zone: ZONE,
          after_index: indices[indices.length - 1] ?? null,
          nearby: all
            .filter((el) => el.id !== "frame-a" && el.id !== ids.rect && el.id !== ids.text && el.type !== "text")
            .map((el) => ({ id: el.id, type: el.type, x: el.x, y: el.y, width: el.width, height: el.height, isDeleted: false, containerId: null, customData: el.customData ?? {} })),
          prev: rect && text ? [rect, text] : null,
          prev_deleted: rect ? rect.isDeleted === true : null,
          prev_on_frame: rect ? rect.frameId === "frame-a" : null,
        };
      }
      case "elemental_bot_canvas_write": {
        if (opts.write) return opts.write(args, board);
        const els = JSON.parse(String(args[2])) as Record<string, unknown>[];
        for (const el of els) board.set(String(el.id), el);
        const e = entries.get(String(args[1]));
        if (e) e.canvas_status = "written";
        return { ok: true, status: "written", reason: null, ids: els.map((el) => el.id), dropped: [], present: true };
      }
      case "elemental_bot_canvas_tombstone":
        return { ok: true, status: "tombstoned", reason: null, ids: [], dropped: [], present: false };
      case "elemental_bot_checkin": {
        const team = teams.get(String(args[1]));
        if (!team) throw new ElementalError("not_team_channel");
        if (!team.members.includes(String(args[2]))) throw new ElementalError("not_team_member");
        const key = `${team.id}:2026-12-05`;
        const already = checkins.has(key);
        checkins.add(key);
        return { team_id: team.id, slot: team.slot, day: "2026-12-05", already };
      }
      default:
        throw new Error(`unexpected ${fn}`);
    }
  };

  const api: ElementalApi = {
    call: jest.fn(async (fn: string, ...args: unknown[]) => {
      calls.push({ fn, args });
      log.push(fn);
      return (await impl(fn, args)) as never;
    }) as ElementalApi["call"],
    rows: jest.fn(async (fn: string, ...args: unknown[]) => {
      calls.push({ fn, args });
      log.push(fn);
      if (fn === "elemental_bot_canvas_pending") return (opts.pending ?? []) as never;
      throw new Error(`unexpected rows ${fn}`);
    }) as ElementalApi["rows"],
  };
  return { api, calls, log, entries, board, teams };
}

interface ThreadRow {
  id: string;
  parent_id: string;
  name: string;
}

/** A Discord client whose only doors out are mocked REST get/post/patch. */
function fakeClient(log: string[], threads: ThreadRow[] = []) {
  let msg = 0;
  const get = jest.fn(async (route: string) => {
    log.push(`get ${route}`);
    if (route === Routes.guildActiveThreads(GUILD)) return { threads, members: [] };
    return { threads: [], members: [], has_more: false };
  });
  const post = jest.fn(async (route: string, _o?: { body?: unknown }) => {
    log.push(`post ${route}`);
    if (route === Routes.threads(MIRROR)) return { id: NEW_THREAD };
    msg += 1;
    return { id: `70000000000000${String(msg).padStart(4, "0")}` };
  });
  const patch = jest.fn(async (route: string, _o?: { body?: unknown }) => {
    log.push(`patch ${route}`);
    return {};
  });
  const createDM = jest.fn();
  const send = jest.fn();
  const client = { rest: { get, post, patch }, users: { createDM, send }, channels: { fetch: jest.fn() } };
  return { client: client as unknown as Client, get, post, patch, createDM, send };
}

type Kind = "command" | "button" | "modal";

/** The fake's spied methods, typed as mocks (RepliableInteraction is a union, so an index signature does not narrow them). */
interface FakeMocks {
  showModal: jest.Mock;
  deferReply: jest.Mock;
  deferUpdate: jest.Mock;
  reply: jest.Mock;
  editReply: jest.Mock;
  followUp: jest.Mock;
  deleteReply: jest.Mock;
}

function interaction(kind: Kind, log: string[], over: Record<string, unknown> = {}) {
  const sent: Record<string, unknown>[] = [];
  const values: Record<string, string> = (over.values as Record<string, string> | undefined) ?? GOOD;
  const i: Record<string, unknown> = {
    guildId: GUILD,
    channelId: FIRE_CHANNEL,
    channel: { parentId: FIRE_CAT },
    user: { id: USER },
    member: { roles: [ROLE.paid] },
    commandName: "tester",
    customId: "el|tsadd",
    deferred: false,
    replied: false,
    inGuild: () => i.guildId !== null,
    isAutocomplete: () => false,
    isChatInputCommand: () => kind === "command",
    isMessageComponent: () => kind === "button",
    isButton: () => kind === "button",
    isModalSubmit: () => kind === "modal",
    isFromMessage: () => false,
    options: { getSubcommand: () => null },
    fields: { getTextInputValue: (id: string) => values[id] ?? "" },
    showModal: jest.fn(async (m: unknown) => {
      i.replied = true;
      log.push("showModal");
      sent.push({ modal: m });
    }),
    deferReply: jest.fn(async (o: unknown) => {
      i.deferred = true;
      log.push("deferReply");
      sent.push({ deferReply: o });
    }),
    deferUpdate: jest.fn(async () => {
      i.deferred = true;
    }),
    reply: jest.fn(async (p: Record<string, unknown>) => {
      i.replied = true;
      log.push("reply");
      sent.push(p);
    }),
    editReply: jest.fn(async (p: Record<string, unknown>) => {
      i.replied = true;
      log.push("editReply");
      sent.push(p);
    }),
    followUp: jest.fn(async (p: Record<string, unknown>) => {
      i.replied = true;
      log.push("followUp");
      sent.push(p);
    }),
    deleteReply: jest.fn(async () => {
      log.push("deleteReply");
    }),
    ...over,
  };
  delete i.values;
  return { i: i as unknown as RepliableInteraction & FakeMocks, sent };
}

function setup(dbOpts: FakeDbOptions = {}, threads: ThreadRow[] = [{ id: FIRE_THREAD, parent_id: MIRROR, name: TESTER.threadName("fire") }]) {
  const db = fakeDb(dbOpts);
  const discord = fakeClient(db.log, threads);
  const rt = createRuntime({ client: discord.client, api: db.api, env: ENV });
  // No real waiting on a retry.
  rt.queues.canvas = createKeyedQueue("canvas", { sleep: async () => undefined, onRetry: () => undefined });
  const run = (kind: Kind, over: Record<string, unknown> = {}) => {
    const made = interaction(kind, db.log, over);
    return { ...made, done: handleElementalInteraction(rt, made.i as never) };
  };
  return { rt, ...db, ...discord, run };
}

function json(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (v && typeof v === "object" && typeof v.toJSON === "function" ? v.toJSON() : v));
}

const fns = (calls: { fn: string }[]) => calls.map((c) => c.fn);
const contents = (sent: Record<string, unknown>[]) => sent.map((p) => p.content).filter((c): c is string => typeof c === "string");
const last = (sent: Record<string, unknown>[]) => contents(sent).at(-1) ?? "";

let errorSpy: jest.SpyInstance;
beforeEach(() => {
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

// ---------------------------------------------------------------------------

describe("registration", () => {
  test("/tester, /tester-edit and /checkin are guild-only commands anyone can see; the mirror buttons are left to E20", () => {
    for (const name of ["tester", "tester-edit", "checkin"]) {
      const cmd = registry().commands.find((c) => c.name === name);
      expect(cmd).toBeDefined();
      expect(cmd!.contexts).toEqual([InteractionContextType.Guild]);
      expect(cmd!.default_member_permissions).toBeUndefined();
      expect(cmd!.description.length).toBeLessThanOrEqual(100);
    }
    expect(feature.staffSubcommands ?? []).toEqual([]);
    expect(Object.keys(feature.actions ?? {})).not.toEqual(expect.arrayContaining(["rm"]));
    expect(Object.keys(feature.actions ?? {})).not.toContain("rv");
  });
});

describe("/tester form", () => {
  test("in a team channel the form opens at once, with the four fields and the no-names line", async () => {
    const { run, calls } = setup();
    const { i, done } = run("command");
    await done;
    expect(i.deferReply).not.toHaveBeenCalled();
    expect(i.showModal).toHaveBeenCalledTimes(1);
    const modal = json(i.showModal.mock.calls[0][0]);
    expect(modal).toContain('"custom_id":"el|tsadd"');
    for (const field of FIELDS) expect(modal).toContain(`"custom_id":"${field}"`);
    expect(modal).toContain(TESTER.modalNote.replace(/"/g, '\\"'));
    expect(fns(calls)).toEqual(["elemental_bot_settings_get"]);
  });

  test("outside the element categories the form never opens", async () => {
    const { run, calls } = setup();
    const { i, done, sent } = run("command", { channelId: GENERAL, channel: { parentId: OTHER_CAT } });
    await done;
    expect(i.showModal).not.toHaveBeenCalled();
    expect(sent).toContainEqual(expect.objectContaining({ content: TESTER.notTeamChannel, flags: MessageFlags.Ephemeral }));
    expect(fns(calls)).toEqual(["elemental_bot_settings_get"]);
  });

  test("someone without the Paid role is told to /join first", async () => {
    const { run } = setup();
    const { i, done, sent } = run("command", { member: { roles: [] } });
    await done;
    expect(i.showModal).not.toHaveBeenCalled();
    expect(contents(sent)).toContain(COMMON.paidOnly);
  });

  test("a submit from a channel that is not a team's is refused by SQL; nothing is posted or written", async () => {
    const { run, calls, post } = setup();
    const { done, sent } = run("modal", { channelId: GENERAL });
    await done;
    expect(last(sent)).toBe(TESTER.notTeamChannel);
    expect(fns(calls)).not.toContain("elemental_bot_canvas_target");
    expect(post).not.toHaveBeenCalled();
  });

  test("someone from another team is refused in this team's channel", async () => {
    const { run, post } = setup();
    const { done, sent } = run("modal", { user: { id: OUTSIDER } });
    await done;
    expect(last(sent)).toBe(TESTER.notTeamMember);
    expect(post).not.toHaveBeenCalled();
  });
});

describe("contacts are refused before any call", () => {
  const refuse = (piiCases as { refuse: { text: string; kind: string }[] }).refuse;

  test.each(refuse.map((c, k) => [c.kind, c.text, FIELDS[k % FIELDS.length]] as const))(
    "%s %j in %s: refused in the bot, field named, text kept",
    async (_kind, text, field) => {
      const { run, calls, get, post, patch } = setup();
      const values = { ...GOOD, [field]: text };
      const { i, done, sent } = run("modal", { values });
      await done;
      // Only the guild's settings were read: no tester call, no canvas, no Discord post.
      expect(fns(calls)).toEqual(["elemental_bot_settings_get"]);
      expect(get).not.toHaveBeenCalled();
      expect(post).not.toHaveBeenCalled();
      expect(patch).not.toHaveBeenCalled();
      expect(i.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
      expect(last(sent)).toBe(TESTER.pii(TESTER.fieldNames[field]));
      expect(json(sent)).not.toContain(JSON.stringify(text).slice(1, -1));
      expect(json(sent)).toContain(`el|${ACTIONS.fix}|new`);
      // The fix button re-opens the form with what was typed.
      const fix = run("button", { customId: `el|${ACTIONS.fix}|new` });
      await fix.done;
      const modal = json(fix.i.showModal.mock.calls[0][0]);
      expect(modal).toContain('"custom_id":"el|tsadd"');
      expect(modal).toContain(JSON.stringify(text.replace(/\s+/g, " ").trim()).slice(1, -1));
      // Logs never carry the text.
      expect(json(errorSpy.mock.calls)).not.toContain(text);
    }
  );

  test.each((piiCases as { pass: { text: string }[] }).pass.map((c) => [c.text]))("%j passes and is logged", async (text) => {
    const { run, calls } = setup();
    // In an optional field, so the empty case is allowed too.
    const { done } = run("modal", { values: { ...GOOD, quote: text } });
    await done;
    expect(fns(calls)).toContain("elemental_bot_tester_add");
  });

  test("an empty required field or one too long is refused before the database, field named", async () => {
    const a = setup();
    const missing = a.run("modal", { values: { ...GOOD, who: "   " } });
    await missing.done;
    expect(last(missing.sent)).toBe(TESTER.missing(TESTER.fieldNames.who));
    const long = a.run("modal", { values: { ...GOOD, quote: "x".repeat(201) } });
    await long.done;
    expect(last(long.sent)).toBe(TESTER.tooLong(TESTER.fieldNames.quote, 200));
    expect(fns(a.calls)).not.toContain("elemental_bot_tester_add");
  });

  test("an SQL pii refusal names its field and keeps the text too", async () => {
    const { run } = setup({
      testerAdd: () => {
        throw new ElementalError("pii", "changed");
      },
    });
    const { done, sent } = run("modal");
    await done;
    expect(last(sent)).toBe(TESTER.pii(TESTER.fieldNames.changed));
    const fix = run("button", { customId: `el|${ACTIONS.fix}|new` });
    await fix.done;
    expect(json(fix.i.showModal.mock.calls[0][0])).toContain(GOOD.changed);
  });
});

describe("the answer, then the canvas", () => {
  test("the reply is sent before the canvas write starts", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { run, log, calls } = setup({ beforeTarget: () => gate });
    const { i, done, sent } = run("modal");
    // Let the handler run until it waits on the canvas.
    for (let k = 0; k < 50 && !i.editReply.mock.calls.length; k++) await new Promise((r) => setImmediate(r));
    expect(i.editReply).toHaveBeenCalledTimes(1);
    expect(contents(sent)[0]).toBe(`${TESTER.counted(1, 10)}\n${TESTER.canvasPending}`);
    expect(fns(calls)).not.toContain("elemental_bot_canvas_write");
    expect(log.indexOf("editReply")).toBeLessThan(log.indexOf("elemental_bot_canvas_target"));
    expect(log.indexOf("elemental_bot_tester_add")).toBeLessThan(log.indexOf("editReply"));
    release();
    await done;
    expect(fns(calls)).toContain("elemental_bot_canvas_write");
    expect(last(sent)).toBe(`${TESTER.counted(1, 10)}\n${TESTER.canvasWritten}`);
    expect(json(sent.at(-1))).toContain(`el|${ACTIONS.edit}|`);
  });

  test("a canvas the write cannot land on edits the failed line in and keeps 'counted'", async () => {
    const { run } = setup({ write: () => ({ ok: false, status: "failed", reason: "frame_gone", ids: [], dropped: [], present: null }) });
    const { done, sent } = run("modal");
    await done;
    expect(last(sent)).toBe(`${TESTER.counted(1, 10)}\n${TESTER.canvasFailed}`);
    expect(contents(sent)).not.toContain(COMMON.failed);
  });

  test("a database failure during the write is the same failed line, never the generic error", async () => {
    const { run } = setup({
      write: () => {
        throw new ElementalDbError("elemental_bot_canvas_write", "XX000");
      },
    });
    const { done, sent } = run("modal");
    await done;
    expect(last(sent)).toBe(`${TESTER.counted(1, 10)}\n${TESTER.canvasFailed}`);
    expect(contents(sent)).not.toContain(COMMON.failed);
  });

  test("an answer that cannot be sent (expired interaction) still leaves the note written and the mirror posted", async () => {
    const { run, calls, post } = setup();
    const expired = jest.fn(async () => {
      throw Object.assign(new Error("Unknown interaction"), { code: 10062 });
    });
    const { done } = run("modal", { editReply: expired });
    await done;
    expect(expired).toHaveBeenCalled();
    expect(fns(calls)).toContain("elemental_bot_canvas_write");
    expect(post).toHaveBeenCalledTimes(1);
  });

  test("a team with no canvas hears so and nothing is written", async () => {
    const { run, calls } = setup({ linked: false });
    const { done, sent } = run("modal");
    await done;
    expect(last(sent)).toBe(`${TESTER.counted(1, 10)}\n${TESTER.canvasNotLinked}`);
    expect(fns(calls)).not.toContain("elemental_bot_canvas_target");
  });

  test("the 11th entry is saved but not counted", async () => {
    const { run } = setup({ linked: false });
    const answers: string[] = [];
    for (let k = 1; k <= 11; k++) {
      const { done, sent } = run("modal", { values: { ...GOOD, tried: `try number ${k}` } });
      await done;
      answers.push(last(sent));
    }
    expect(answers[9]).toContain(TESTER.counted(10, 10));
    expect(answers[10]).toContain(TESTER.notCounted(10));
    expect(answers[10]).not.toContain(TESTER.counted(10, 10));
  });

  test("'tester.first' fires once, on the team's first counted entry", async () => {
    const { rt, run } = setup({ linked: false });
    const heard: unknown[] = [];
    rt.events.on("tester.first", (p) => void heard.push(p));
    for (let k = 1; k <= 3; k++) await run("modal", { values: { ...GOOD, tried: `try ${k}` } }).done;
    expect(heard).toEqual([{ guildId: GUILD, edition: "elemental-2026", teamId: FIRE_TEAM, entryId: "00000000-0000-4000-8000-000000000001" }]);
  });

  test("three entries make three notes in the Test zone with increasing valid indices", async () => {
    const { run, board } = setup();
    for (let k = 1; k <= 3; k++) await run("modal", { values: { ...GOOD, tried: `try ${k}` } }).done;
    const notes = [...board.values()].filter((el) => String(el.id).startsWith("el-"));
    expect(notes).toHaveLength(6);
    const indices = notes.map((n) => String(n.index));
    expect(indices.every(isValidIndex)).toBe(true);
    expect([...indices].sort()).toEqual(indices);
    for (const r of notes.filter((n) => String(n.id).endsWith("-r"))) {
      expect(r.frameId).toBe("frame-a");
      expect(Number(r.x)).toBeGreaterThanOrEqual(ZONE.x);
      expect(Number(r.y)).toBeGreaterThanOrEqual(ZONE.y);
      expect(r.customData).toMatchObject({ card: "test", source: "tester", createdBy: OWNER });
    }
    const text = notes.find((n) => String(n.id).endsWith("-t"))!;
    expect(text.originalText).toBe(noteText({ ...GOOD, tried: "try 1" }));
  });
});

describe("the staff mirror", () => {
  test("goes to the element's thread with plot, project, text and the Remove/Reviewed buttons, never the logger", async () => {
    const { run, post, entries } = setup({ linked: false });
    const { done } = run("modal");
    await done;
    const [entry] = [...entries.values()];
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe(Routes.channelMessages(FIRE_THREAD));
    const body = post.mock.calls[0][1]!.body as Record<string, unknown>;
    const text = json(body);
    expect(text).toContain("07");
    expect(text).toContain("Lantern Map");
    expect(text).toContain(GOOD.tried);
    expect(text).toContain(`el|rm|${entry.id}`);
    expect(text).toContain(`el|rv|${entry.id}`);
    expect(text).not.toContain(USER);
    expect(text).not.toContain("<@");
    expect(body.allowed_mentions).toEqual({ parse: [] });
  });

  test("a missing thread is made once in the mirror channel and reused", async () => {
    const { run, post, get } = setup({ linked: false }, []);
    await Promise.all([run("modal").done, run("modal", { user: { id: TEAMMATE }, values: { ...GOOD, tried: "another try" } }).done]);
    const creates = post.mock.calls.filter((c) => c[0] === Routes.threads(MIRROR));
    expect(creates).toHaveLength(1);
    expect(creates[0][1]!.body).toEqual({ name: TESTER.threadName("fire"), type: ChannelType.PublicThread, auto_archive_duration: 10080 });
    expect(post.mock.calls.filter((c) => c[0] === Routes.channelMessages(NEW_THREAD))).toHaveLength(2);
    expect(get.mock.calls.filter((c) => c[0] === Routes.guildActiveThreads(GUILD))).toHaveLength(1);
  });

  test("each element's entries go to that element's thread", async () => {
    const { run, post } = setup({ linked: false }, [
      { id: FIRE_THREAD, parent_id: MIRROR, name: TESTER.threadName("fire") },
      { id: WATER_THREAD, parent_id: MIRROR, name: TESTER.threadName("water") },
      { id: "600000000000000077", parent_id: "400000000000000777", name: TESTER.threadName("water") },
    ]);
    await run("modal").done;
    await run("modal", { channelId: WATER_CHANNEL, channel: { parentId: WATER_CAT }, user: { id: OUTSIDER } }).done;
    expect(post.mock.calls.map((c) => c[0])).toEqual([Routes.channelMessages(FIRE_THREAD), Routes.channelMessages(WATER_THREAD)]);
    expect(json(post.mock.calls[1][1])).toContain("Rain Notes");
  });

  test("no mirror channel in settings: nothing is posted and the answer is unchanged", async () => {
    const { run, post, get } = setup({ linked: false, settings: rawSettings({ channels: {} }) });
    const { done, sent } = run("modal");
    await done;
    expect(post).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(last(sent)).toBe(`${TESTER.counted(1, 10)}\n${TESTER.canvasNotLinked}`);
  });

  test("a failed mirror post is logged by status only and the answer stands", async () => {
    const { run, post } = setup({ linked: false });
    post.mockRejectedValue(Object.assign(new Error("Missing Access"), { status: 403 }));
    const { done, sent } = run("modal");
    await done;
    expect(last(sent)).toBe(`${TESTER.counted(1, 10)}\n${TESTER.canvasNotLinked}`);
    expect(json(errorSpy.mock.calls)).toContain("mirror post failed: 403");
    expect(json(errorSpy.mock.calls)).not.toContain(GOOD.tried);
  });

  test("mirrorContent shows removed and reviewed states for the staff tools", () => {
    const entry = {
      id: "00000000-0000-4000-8000-000000000001",
      team_id: FIRE_TEAM,
      slot: 7,
      element: "fire",
      project_name: "Lantern **Map**",
      who: GOOD.who,
      tried: GOOD.tried,
      quote: null,
      changed: null,
      counted: true,
    };
    expect(mirrorContent(entry)).toContain(TESTER.mirrorCounted);
    expect(mirrorContent(entry)).toContain("Lantern \\*\\*Map\\*\\*");
    expect(mirrorContent(entry, { removed: true, reviewed: true })).toContain(`${TESTER.mirrorRemoved} · ${TESTER.mirrorReviewed}`);
  });
});

describe("/tester-edit", () => {
  async function logged(dbOpts: FakeDbOptions = {}) {
    const s = setup(dbOpts);
    await s.run("modal").done;
    const [entry] = [...s.entries.values()];
    return { ...s, entry };
  }

  test("opens the form for my latest entry, filled in", async () => {
    const { run, entry } = await logged();
    const { i, done } = run("command", { commandName: "tester-edit" });
    await done;
    const modal = json(i.showModal.mock.calls[0][0]);
    expect(modal).toContain(`"custom_id":"el|${ACTIONS.save}|${entry.id}"`);
    expect(modal).toContain(GOOD.tried);
  });

  test("with no recent entry it says to use the Edit button", async () => {
    const { run } = setup();
    const { i, done, sent } = run("command", { commandName: "tester-edit" });
    await done;
    expect(i.showModal).not.toHaveBeenCalled();
    expect(contents(sent)).toContain(TESTER.noRecent);
  });

  test("more than 10 minutes later it is refused, by the bot and by SQL", async () => {
    const { run, entry, calls } = await logged({ linked: false });
    const later = Date.now() + EDIT_WINDOW_MS + 60_000;
    jest.spyOn(Date, "now").mockReturnValue(later);
    const cmd = run("command", { commandName: "tester-edit" });
    await cmd.done;
    expect(cmd.i.showModal).not.toHaveBeenCalled();
    expect(contents(cmd.sent)).toContain(TESTER.editClosed);

    const save = run("modal", { customId: `el|${ACTIONS.save}|${entry.id}`, values: { ...GOOD, tried: "a later try" } });
    await save.done;
    expect(fns(calls)).toContain("elemental_bot_tester_edit");
    expect(last(save.sent)).toBe(TESTER.editClosed);
    expect(entry.tried).toBe(GOOD.tried);
  });

  test("an edit rewrites the same note one version up, and updates the mirror post in place", async () => {
    const { run, entry, board, calls, patch, post } = await logged();
    const before = board.get(noteIds(entry.id).rect)!;
    const save = run("modal", { customId: `el|${ACTIONS.save}|${entry.id}`, values: { ...GOOD, tried: "found the canteen this time" } });
    await save.done;
    const writes = calls.filter((c) => c.fn === "elemental_bot_canvas_write");
    expect(writes).toHaveLength(2);
    const note = JSON.parse(String(writes[1].args[2])) as Note;
    expect(note.map((el) => el.id)).toEqual([noteIds(entry.id).rect, noteIds(entry.id).text]);
    expect(note.map((el) => el.version)).toEqual([2, 2]);
    expect(note[0].index).toBe(before.index);
    expect(note[1].originalText).toBe(noteText({ ...GOOD, tried: "found the canteen this time" }));
    expect([...board.keys()].filter((k) => k.startsWith("el-"))).toHaveLength(2);
    expect(last(save.sent)).toBe(`${TESTER.edited}\n${TESTER.canvasWritten}`);
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch.mock.calls[0][0]).toMatch(new RegExp(`^/channels/${FIRE_THREAD}/messages/\\d+$`));
    expect(json(patch.mock.calls[0][1])).toContain("found the canteen this time");
    expect(post).toHaveBeenCalledTimes(1);
  });

  test("an edit still rewrites when an older write marked the entry written in the meantime", async () => {
    // The first write read the old text, then landed after the edit and set 'written'.
    let race = false;
    const s = setup({
      beforeTarget: () => {
        if (race) for (const e of s.entries.values()) e.canvas_status = "written";
      },
    });
    await s.run("modal").done;
    const [entry] = [...s.entries.values()];
    race = true;
    const save = s.run("modal", { customId: `el|${ACTIONS.save}|${entry.id}`, values: { ...GOOD, tried: "found the canteen this time" } });
    await save.done;
    const writes = s.calls.filter((c) => c.fn === "elemental_bot_canvas_write");
    expect(writes).toHaveLength(2);
    const note = JSON.parse(String(writes[1].args[2])) as Note;
    expect(note.map((el) => el.version)).toEqual([2, 2]);
    expect(note[1].originalText).toBe(noteText({ ...GOOD, tried: "found the canteen this time" }));
    expect(last(save.sent)).toBe(`${TESTER.edited}\n${TESTER.canvasWritten}`);
  });

  test("contacts in an edit are refused before the call; the fix button re-opens the edit form", async () => {
    const { run, entry, calls } = await logged();
    const save = run("modal", { customId: `el|${ACTIONS.save}|${entry.id}`, values: { ...GOOD, quote: "line id: abc123" } });
    await save.done;
    expect(fns(calls)).not.toContain("elemental_bot_tester_edit");
    expect(last(save.sent)).toBe(TESTER.pii(TESTER.fieldNames.quote));
    const fix = run("button", { customId: `el|${ACTIONS.fix}|${entry.id}` });
    await fix.done;
    const modal = json(fix.i.showModal.mock.calls[0][0]);
    expect(modal).toContain(`el|${ACTIONS.save}|${entry.id}`);
    expect(modal).toContain("line id: abc123");
  });

  test("someone else cannot edit my entry", async () => {
    const { run, entry } = await logged();
    const save = run("modal", { customId: `el|${ACTIONS.save}|${entry.id}`, user: { id: TEAMMATE } });
    await save.done;
    expect(last(save.sent)).toBe(TESTER.notLogger);
  });
});

describe("/checkin", () => {
  test("once per team per day: the second is a private no-op", async () => {
    const { run, calls } = setup();
    const first = run("command", { commandName: "checkin" });
    await first.done;
    expect(first.i.deferReply).toHaveBeenCalledWith({});
    expect(last(first.sent)).toBe(TESTER.checkedIn(7));

    const second = run("command", { commandName: "checkin", user: { id: TEAMMATE } });
    await second.done;
    expect(second.i.deleteReply).toHaveBeenCalled();
    expect(second.i.followUp).toHaveBeenCalledWith(expect.objectContaining({ content: TESTER.alreadyCheckedIn, flags: MessageFlags.Ephemeral }));
    expect(second.i.editReply).not.toHaveBeenCalled();
    expect(calls.filter((c) => c.fn === "elemental_bot_checkin")).toHaveLength(2);
  });

  test("outside a team channel it is refused privately", async () => {
    const { run } = setup();
    const { i, done } = run("command", { commandName: "checkin", channelId: GENERAL });
    await done;
    expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({ content: TESTER.notTeamChannel, flags: MessageFlags.Ephemeral }));
  });
});

describe("canvasWrite", () => {
  function target(over: Partial<CanvasTarget> = {}): CanvasTarget {
    return {
      entry_id: "00000000-0000-4000-8000-000000000001",
      kind: "test",
      source: "tester",
      team_id: FIRE_TEAM,
      slot: 7,
      element: "fire",
      project_name: "Lantern Map",
      live: true,
      removed: false,
      canvas_status: "pending",
      fields: GOOD,
      note_ids: noteIds("00000000-0000-4000-8000-000000000001"),
      linked: true,
      board_id: BOARD,
      frame_id: "frame-a",
      owner_id: OWNER,
      frame: FRAME,
      zone: ZONE,
      after_index: "a5",
      nearby: [],
      prev: null,
      prev_deleted: null,
      prev_on_frame: null,
      ...over,
    };
  }

  test("planNote builds in the zone after the board's last index, and rewrites a saved note in place", () => {
    const fresh = planNote(target(), "hello", 1)!;
    expect(fresh[0].index > "a5").toBe(true);
    expect(fresh[0].version).toBe(1);
    const again = planNote(target({ prev: fresh, prev_on_frame: true, prev_deleted: false }), "hello again", 2)!;
    expect(again.map((el) => el.version)).toEqual([2, 2]);
    expect(again[0].index).toBe(fresh[0].index);
    // Relinked to a new frame: a new note there (SQL raises the version over the old copy).
    const moved = planNote(target({ prev: fresh, prev_on_frame: false }), "hello", 3)!;
    expect(moved[0].version).toBe(1);
    expect(planNote(target({ linked: false }), "x")).toBeNull();
    expect(planNote(target({ zone: null, frame: null }), "x")).toBeNull();
  });

  test("a retried write sends the very same note, never a rebuilt one", async () => {
    const { rt, calls } = setup();
    await setupEntry(rt);
    const writes: string[] = [];
    let fail = true;
    (rt.api.call as jest.Mock).mockImplementation(async (fn: string, ...args: unknown[]) => {
      calls.push({ fn, args });
      if (fn === "elemental_bot_canvas_target") return target({ canvas_status: "pending" });
      if (fn === "elemental_bot_canvas_write") {
        writes.push(String(args[2]));
        if (fail) {
          fail = false;
          throw Object.assign(new Error("reset"), { code: "ECONNRESET" });
        }
        return { ok: true, status: "written", reason: null, ids: [], dropped: [], present: true };
      }
      throw new Error(fn);
    });
    let now = 1_000;
    const outcome = await writeNote(rt, GUILD, "00000000-0000-4000-8000-000000000001", { now: () => (now += 1_000) });
    expect(outcome).toEqual({ ok: true, status: "written", boardId: BOARD });
    expect(writes).toHaveLength(2);
    expect(writes[1]).toBe(writes[0]);
    // One target read to find the board, one inside the queue; none on the retry.
    expect(calls.filter((c) => c.fn === "elemental_bot_canvas_target")).toHaveLength(2);
  });

  test("an entry already written is left alone; a removed one is skipped", async () => {
    const { rt } = setup();
    const written = target({ canvas_status: "written", prev: planNote(target(), "x", 1), prev_on_frame: true, prev_deleted: false });
    (rt.api.call as jest.Mock).mockImplementation(async (fn: string) => (fn === "elemental_bot_canvas_target" ? written : null));
    expect(await writeNote(rt, GUILD, written.entry_id)).toMatchObject({ ok: true, already: true });
    (rt.api.call as jest.Mock).mockImplementation(async (fn: string) => (fn === "elemental_bot_canvas_target" ? target({ removed: true }) : null));
    expect(await writeNote(rt, GUILD, written.entry_id)).toEqual({ ok: false, status: "skipped", reason: "removed" });
  });

  test("resyncPending writes and tombstones what SQL lists, and the sweep gives up after a few failures", async () => {
    const pending = [
      { entry_id: "00000000-0000-4000-8000-000000000001", team_id: FIRE_TEAM, slot: 7, action: "write", canvas_status: "failed" },
      { entry_id: "00000000-0000-4000-8000-000000000002", team_id: FIRE_TEAM, slot: 7, action: "tombstone", canvas_status: "written" },
    ];
    const { rt, calls } = setup({ pending });
    (rt.api.call as jest.Mock).mockImplementation(async (fn: string, ...args: unknown[]) => {
      calls.push({ fn, args });
      if (fn === "elemental_bot_canvas_target") return target({ entry_id: String(args[1]) });
      if (fn === "elemental_bot_canvas_write") return { ok: false, status: "failed", reason: "dropped", ids: [], dropped: [{}], present: null };
      if (fn === "elemental_bot_canvas_tombstone") return { ok: true, status: "tombstoned", reason: null, ids: [], dropped: [], present: false };
      throw new Error(fn);
    });
    expect(await resyncPending(rt, GUILD)).toEqual({ written: 0, tombstoned: 1, failed: 1, skipped: 0 });
    expect(calls.find((c) => c.fn === "elemental_bot_canvas_pending")?.args).toEqual([GUILD, 100]);
    expect(calls.find((c) => c.fn === "elemental_bot_canvas_tombstone")?.args).toEqual([GUILD, pending[1].entry_id, null]);
    for (let k = 1; k < AUTO_ATTEMPTS; k++) await resyncPending(rt, GUILD, { auto: true });
    const auto = await resyncPending(rt, GUILD, { auto: true });
    expect(auto.skipped).toBe(1);
    // Staff /el resync always tries.
    expect((await resyncPending(rt, GUILD, { limit: 9999 })).failed).toBe(1);
    expect(calls.filter((c) => c.fn === "elemental_bot_canvas_pending").at(-1)?.args).toEqual([GUILD, 500]);
  });
});

async function setupEntry(rt: ElementalRuntime) {
  await rt.settings.get(GUILD);
}

describe("no direct messages", () => {
  test("the tester feature, its copy and the canvas writer never open a DM", () => {
    for (const file of ["../features/tester.ts", "../copy/tester.ts", "../canvasWrite.ts"]) {
      const source = fs.readFileSync(path.join(__dirname, file), "utf8");
      expect(source).not.toMatch(/createDM|\buser\.send\b|\busers\.send\b|\.dmChannel\b|ChannelType\.DM\b|member\.send\b/);
    }
  });

  test("memory is per runtime", () => {
    const a = setup();
    const b = setup();
    expect(testerMemory(a.rt).recent).not.toBe(testerMemory(b.rt).recent);
  });
});
