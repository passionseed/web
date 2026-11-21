/**
 * @jest-environment node
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { InteractionContextType, MessageFlags, type Client } from "discord.js";

import { upsertGuildCommands, type CommandRest } from "../../commands";
import { loadEnv } from "../../env";
import { ElementalDbError, ElementalError, createElementalApi, type ElementalApi } from "../api";
import {
  normalizeSettings,
  runWithAck,
  type ElementalFeature,
  type ElementalRuntime,
  type RepliableInteraction,
} from "../context";
import { COMMON } from "../copy/common";
import { ELEMENTAL_EXCLUSIVE, parseElementalEnv } from "../env";
import { startHeartbeat } from "../heartbeat";
import { cid, parseCid } from "../ids";
import { createRuntime, handleElementalInteraction, registerElementalCommands, settingsPing, startFeatures } from "../index";
import { createKeyedQueue, rateLimitDelay, retryDelay, withRetry } from "../queue";
import { FEATURES, MAX_SUBCOMMANDS, buildRegistry } from "../registry";
import { allowed, elementOf, requirePaid, requireRole, GateError } from "../roles";

const GUILD = "100000000000000001";
const REHEARSAL = "100000000000000002";
const OTHER_GUILD = "100000000000000099";
const USER = "200000000000000001";
const DB_URL = "postgresql://elemental_bot.stubref:stub@127.0.0.1:5432/postgres";

const ROLE = {
  host: "300000000000000001",
  helper: "300000000000000002",
  mentor: "300000000000000003",
  judge: "300000000000000004",
  safety: "300000000000000005",
  paid: "300000000000000006",
  water: "300000000000000010",
  fire: "300000000000000013",
};

function rawSettings(guildId = GUILD): Record<string, unknown> {
  return {
    guild_id: guildId,
    edition: guildId === REHEARSAL ? "elemental-dryrun" : "elemental-2026",
    edition_kind: guildId === REHEARSAL ? "rehearsal" : "event",
    roles: ROLE,
    channels: { start_here: "400000000000000001", reports: "400000000000000004" },
    element_categories: { fire: ["500000000000000001", "500000000000000002"] },
    schedule: { "2026-12-04": { opening_at: "19:00", call_at: "19:55", card_at: "20:30" } },
    tester_cap: 10,
  };
}

const ENV = { guildIds: [GUILD, REHEARSAL], databaseUrl: DB_URL, cardUrl: null, cardSecret: null };

function fakeApi(impl: (fn: string, ...args: unknown[]) => unknown = (fn, guildId) => (fn === "elemental_bot_settings_get" ? rawSettings(guildId as string) : null)) {
  const calls: string[] = [];
  const api: ElementalApi = {
    call: jest.fn(async (fn: string, ...args: unknown[]) => {
      calls.push(fn);
      return (await impl(fn, ...args)) as never;
    }) as ElementalApi["call"],
    rows: jest.fn(async () => []) as ElementalApi["rows"],
  };
  return { api, calls };
}

function runtime(api: ElementalApi): ElementalRuntime {
  return createRuntime({ client: {} as Client, api, env: ENV });
}

type Kind = "command" | "button" | "modal" | "autocomplete";

/** A minimal Discord interaction: records what the bot sent and in which order. */
function interaction(kind: Kind, over: Record<string, unknown> = {}, log: string[] = []) {
  const sent: unknown[] = [];
  const i: Record<string, unknown> = {
    guildId: GUILD,
    channelId: "600000000000000001",
    user: { id: USER },
    member: { roles: [] as string[] },
    commandName: "join",
    customId: "el|x",
    deferred: false,
    replied: false,
    inGuild: () => i.guildId !== null,
    isAutocomplete: () => kind === "autocomplete",
    isChatInputCommand: () => kind === "command",
    isMessageComponent: () => kind === "button",
    isButton: () => kind === "button",
    isModalSubmit: () => kind === "modal",
    isFromMessage: () => false,
    options: { getSubcommand: () => null },
    deferReply: jest.fn(async (opts: unknown) => {
      log.push("deferReply");
      i.deferred = true;
      sent.push({ deferReply: opts });
    }),
    deferUpdate: jest.fn(async () => {
      log.push("deferUpdate");
      i.deferred = true;
    }),
    reply: jest.fn(async (p: unknown) => {
      log.push("reply");
      i.replied = true;
      sent.push(p);
    }),
    editReply: jest.fn(async (p: unknown) => {
      log.push("editReply");
      sent.push(p);
    }),
    followUp: jest.fn(async (p: unknown) => {
      log.push("followUp");
      sent.push(p);
    }),
    respond: jest.fn(async () => undefined),
    ...over,
  };
  return { i: i as unknown as RepliableInteraction & Record<string, jest.Mock>, sent, log };
}

function withEnv(vars: Record<string, string | undefined>, run: () => void): void {
  const saved = { ...process.env };
  for (const key of Object.keys(process.env)) {
    if (/^(BOT_MODULES|DISCORD_|SHIFT_|ELEMENTAL_|NEXT_PUBLIC_SUPABASE_URL|SUPABASE_|PSEED_|HACKATHON_OPS_)/.test(key)) delete process.env[key];
  }
  Object.assign(process.env, vars);
  try {
    run();
  } finally {
    process.env = saved;
  }
}

// ---------------------------------------------------------------------------
// Environment and the module guard
// ---------------------------------------------------------------------------

describe("env", () => {
  const SHIFT = {
    DISCORD_BOT_TOKEN: "shared-token",
    DISCORD_SHIFT_GUILD_ID: "700000000000000001",
    SHIFT_VOICE_DATABASE_URL: "postgresql://shift_voice_bot:x@127.0.0.1/postgres",
  };

  test("BOT_MODULES unset: the existing keys and values are unchanged and elemental is null", () => {
    withEnv(SHIFT, () => {
      const env = loadEnv();
      expect(Object.keys(env)).toEqual(["core", "projectseed", "shiftVoice", "shiftQuests", "elemental"]);
      expect(env).toEqual({
        core: { discordToken: "shared-token" },
        projectseed: null,
        shiftVoice: { guildId: "700000000000000001", databaseUrl: SHIFT.SHIFT_VOICE_DATABASE_URL },
        shiftQuests: null,
        elemental: null,
      });
    });
  });

  test.each(["elemental,shift-voice", "elemental,hackathon-ops", "elemental,projectseed", "shift-quests,elemental"])(
    "BOT_MODULES=%s refuses with a clear message",
    (modules) => {
      withEnv({ ...SHIFT, BOT_MODULES: modules, ELEMENTAL_GUILD_IDS: GUILD, ELEMENTAL_DATABASE_URL: DB_URL }, () => {
        expect(() => loadEnv()).toThrow(/elemental runs alone in its own container/);
        const other = modules.split(",").find((m) => m !== "elemental")!;
        expect(() => loadEnv()).toThrow(new RegExp(`Remove ${other}`));
      });
    }
  );

  test("the exclusive list names every module that may not share the process", () => {
    expect([...ELEMENTAL_EXCLUSIVE].sort()).toEqual(["hackathon-ops", "projectseed", "shift-quests", "shift-voice"]);
  });

  test("BOT_MODULES=elemental: own token, guild list, role URL; nothing else loaded", () => {
    withEnv(
      {
        BOT_MODULES: "elemental",
        DISCORD_BOT_TOKEN: "shared-token",
        ELEMENTAL_BOT_TOKEN: "elemental-token",
        ELEMENTAL_GUILD_IDS: ` ${GUILD}, ${REHEARSAL} ,${GUILD}`,
        ELEMENTAL_DATABASE_URL: DB_URL,
      },
      () => {
        const env = loadEnv();
        expect(env.core.discordToken).toBe("elemental-token");
        expect(env.elemental).toEqual({ guildIds: [GUILD, REHEARSAL], databaseUrl: DB_URL, cardUrl: null, cardSecret: null });
        expect(env.shiftVoice).toBeNull();
        expect(env.shiftQuests).toBeNull();
        expect(env.projectseed).toBeNull();
      }
    );
  });

  test("the token falls back to DISCORD_BOT_TOKEN", () => {
    withEnv({ BOT_MODULES: "elemental", DISCORD_BOT_TOKEN: "shared-token", ELEMENTAL_GUILD_IDS: GUILD, ELEMENTAL_DATABASE_URL: DB_URL }, () => {
      expect(loadEnv().core.discordToken).toBe("shared-token");
    });
  });

  test("refuses bad guild ids, an admin database login and a card URL without its secret", () => {
    const base = { ELEMENTAL_GUILD_IDS: GUILD, ELEMENTAL_DATABASE_URL: DB_URL };
    expect(() => parseElementalEnv({ ...base, ELEMENTAL_GUILD_IDS: "my-guild" })).toThrow(/Discord IDs/);
    expect(() => parseElementalEnv({ ...base, ELEMENTAL_GUILD_IDS: " , " })).toThrow(/empty/);
    expect(() => parseElementalEnv({ ...base, ELEMENTAL_DATABASE_URL: "postgresql://postgres:pw@db.example/postgres" })).toThrow(/elemental_bot/);
    expect(() => parseElementalEnv({ ...base, ELEMENTAL_DATABASE_URL: "https://example.org" })).toThrow(/postgresql/);
    expect(() => parseElementalEnv({ ...base, ELEMENTAL_CARD_URL: "https://www.passionseed.org/api/card" })).toThrow(/SECRET/);
    expect(() => parseElementalEnv({ ...base, ELEMENTAL_CARD_URL: "http://example.org/card", ELEMENTAL_CARD_SECRET: "s" })).toThrow(/https/);
    expect(parseElementalEnv({ ...base, ELEMENTAL_CARD_URL: "https://www.passionseed.org/api/card", ELEMENTAL_CARD_SECRET: "s" }).cardUrl).toBe(
      "https://www.passionseed.org/api/card"
    );
    // The password never appears in an error.
    try {
      parseElementalEnv({ ...base, ELEMENTAL_DATABASE_URL: "postgresql://postgres:hunter2@db.example/postgres" });
    } catch (error) {
      expect(String((error as Error).message)).not.toContain("hunter2");
    }
  });
});

// ---------------------------------------------------------------------------
// Database door
// ---------------------------------------------------------------------------

describe("api", () => {
  test("a function outside elemental_bot_* throws before the network", async () => {
    const pool = { query: jest.fn() };
    const api = createElementalApi(pool as never);
    for (const fn of ["shift_quest_session", "elemental_issue_claims", "elemental_bot__internal", "elemental_bot_x; drop table t", "ELEMENTAL_BOT_X", ""]) {
      await expect(api.call(fn)).rejects.toThrow(/Not a callable elemental function/);
      await expect(api.rows(fn)).rejects.toThrow(/Not a callable elemental function/);
    }
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("calls public.<fn> with placeholders and maps raised codes", async () => {
    const pool = {
      query: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ r: { ok: true } }] })
        .mockRejectedValueOnce(Object.assign(new Error("el:island_full"), { code: "P0001" }))
        .mockRejectedValueOnce(Object.assign(new Error("code_used"), { code: "P0001" }))
        .mockRejectedValueOnce(Object.assign(new Error("deadlock detected"), { code: "40P01" }))
        .mockRejectedValueOnce(Object.assign(new Error("relation x does not exist"), { code: "42P01" })),
    };
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const api = createElementalApi(pool as never);
    await expect(api.call("elemental_bot_claim", GUILD, "CODE", USER)).resolves.toEqual({ ok: true });
    expect(pool.query).toHaveBeenCalledWith("select public.elemental_bot_claim($1, $2, $3) as r", [GUILD, "CODE", USER]);
    await expect(api.call("elemental_bot_team_accept")).rejects.toMatchObject({ code: "island_full", fn: "elemental_bot_team_accept" });
    await expect(api.call("elemental_bot_claim")).rejects.toMatchObject({ code: "code_used" });
    await expect(api.call("elemental_bot_claim")).rejects.toMatchObject({ code: "busy" });
    const db: unknown = await api.call("elemental_bot_claim").catch((e: unknown) => e);
    expect(db).toBeInstanceOf(ElementalDbError);
    expect((db as ElementalDbError).sqlstate).toBe("42P01");
    // Logs carry the function name and SQLSTATE, never the message.
    expect(spy.mock.calls.flat().join(" ")).not.toContain("does not exist");
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Custom ids
// ---------------------------------------------------------------------------

describe("custom ids", () => {
  test("round-trip", () => {
    const id = cid("rm", "0b3f6a52-1c43-4f8e-9a0e-0d6f1c2b3a4d", 7, null);
    expect(id).toBe("el|rm|0b3f6a52-1c43-4f8e-9a0e-0d6f1c2b3a4d|7|");
    expect(parseCid(id)).toEqual({ action: "rm", args: ["0b3f6a52-1c43-4f8e-9a0e-0d6f1c2b3a4d", "7", ""] });
    expect(parseCid(cid("pick", "fire"))).toEqual({ action: "pick", args: ["fire"] });
    expect(parseCid(cid("menu"))).toEqual({ action: "menu", args: [] });
  });

  test("refuses separators, long ids and other modules' ids", () => {
    expect(() => cid("rm", "a|b")).toThrow(/separator/);
    expect(() => cid("rm", "x".repeat(100))).toThrow(/too long/);
    expect(() => cid("Bad")).toThrow();
    expect(parseCid("sq|island")).toBeNull();
    expect(parseCid("el|")).toBeNull();
    expect(parseCid("el")).toBeNull();
    expect(parseCid(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe("registration", () => {
  function fakeRest() {
    const calls: { method: string; route: string; body?: unknown }[] = [];
    const rest: CommandRest & { put: jest.Mock } = {
      get: jest.fn(async (route: string) => {
        calls.push({ method: "GET", route });
        return { id: "900000000000000001" };
      }),
      post: jest.fn(async (route: string, options: { body: unknown }) => {
        calls.push({ method: "POST", route, body: options.body });
        return {};
      }),
      put: jest.fn(),
    };
    return { rest, calls };
  }

  const cmd = (name: string) => ({ name, description: name });

  test("one POST per command per guild, never PUT", async () => {
    const { rest, calls } = fakeRest();
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const posts = await upsertGuildCommands(rest, [GUILD, REHEARSAL], [cmd("join"), cmd("team"), cmd("report")], "elemental");
    log.mockRestore();
    expect(posts).toBe(6);
    expect(rest.put).not.toHaveBeenCalled();
    const postCalls = calls.filter((c) => c.method === "POST");
    expect(postCalls).toHaveLength(6);
    for (const c of postCalls) {
      expect(c.route).toMatch(new RegExp(`^/applications/900000000000000001/guilds/(${GUILD}|${REHEARSAL})/commands$`));
      expect(Array.isArray(c.body)).toBe(false);
    }
    expect(postCalls.map((c) => (c.body as { name: string }).name)).toEqual(["join", "team", "report", "join", "team", "report"]);
  });

  test("registerElementalCommands registers the registry's commands by POST (none while every feature is a stub)", async () => {
    const { rest } = fakeRest();
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const posts = await registerElementalCommands("token", [GUILD], rest);
    log.mockRestore();
    expect(posts).toBe(0);
    expect(rest.put).not.toHaveBeenCalled();
  });

  test("the registry merges /el tools from every feature, guild-only, and refuses duplicates", () => {
    const sub = (name: string) => ({ type: 1 as const, name, description: name });
    const a: ElementalFeature = { name: "a", commands: [cmd("join")], staffSubcommands: [sub("totals")] };
    const b: ElementalFeature = { name: "b", commands: [cmd("report")], staffSubcommands: [sub("whois")] };
    const reg = buildRegistry([a, b]);
    expect(reg.commands.map((c) => c.name)).toEqual(["join", "report", "el"]);
    for (const c of reg.commands) expect(c.contexts).toEqual([InteractionContextType.Guild]);
    const el = reg.commands.find((c) => c.name === "el")!;
    expect(el.options?.map((o) => o.name)).toEqual(["totals", "whois"]);
    expect(el.default_member_permissions).toBeDefined();

    expect(() => buildRegistry([a, { name: "c", commands: [cmd("join")] }])).toThrow(/Duplicate elemental command/);
    expect(() => buildRegistry([a, { name: "c", staffSubcommands: [sub("totals")] }])).toThrow(/Duplicate staff tool/);
    expect(() => buildRegistry([{ name: "c", commands: [cmd("el")] }])).toThrow(/staffSubcommands/);
    const run = async () => undefined;
    expect(() =>
      buildRegistry([
        { name: "x", actions: { rm: { run } } },
        { name: "y", actions: { rm: { run } } },
      ])
    ).toThrow(/Duplicate elemental action/);
    const many = Array.from({ length: MAX_SUBCOMMANDS + 1 }, (_, k) => sub(`t${k}`));
    expect(() => buildRegistry([{ name: "z", staffSubcommands: many }])).toThrow(/Discord allows 25/);
  });

  test("the fixed feature list: every stub, in order, each from its own file", () => {
    expect(FEATURES.map((f) => f.name)).toEqual([
      "join",
      "teams",
      "teamops",
      "canvas",
      "tester",
      "staff",
      "schedule",
      "bell",
      "export",
      "handin",
      "powerup",
      "report",
    ]);
    const dir = path.join(__dirname, "..", "features");
    for (const f of FEATURES) expect(fs.existsSync(path.join(dir, `${f.name}.ts`))).toBe(true);
    expect(() => buildRegistry(FEATURES)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Routing, the guild filter and the defer wrapper
// ---------------------------------------------------------------------------

describe("routing", () => {
  test("another guild's interaction is ignored: no ack, no database call", async () => {
    const { api } = fakeApi();
    const rt = runtime(api);
    const run = jest.fn(async () => undefined);
    const reg = buildRegistry([{ name: "t", commandHandlers: { join: { run } }, actions: { pick: { run } } }]);
    for (const kind of ["command", "button", "modal", "autocomplete"] as const) {
      const { i } = interaction(kind, { guildId: OTHER_GUILD, customId: "el|pick|fire" });
      await handleElementalInteraction(rt, i as never, reg);
      expect(i.deferReply).not.toHaveBeenCalled();
      expect(i.reply).not.toHaveBeenCalled();
      expect(i.respond).not.toHaveBeenCalled();
    }
    // A DM (no guild) too.
    const { i: dm } = interaction("command", { guildId: null });
    await handleElementalInteraction(rt, dm as never, reg);
    expect(dm.deferReply).not.toHaveBeenCalled();
    expect(api.call).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  test("both configured guilds are served, each with its own settings", async () => {
    const { api } = fakeApi();
    const rt = runtime(api);
    const seen: string[] = [];
    const reg = buildRegistry([{ name: "t", commandHandlers: { join: { run: async (_i, ctx) => void seen.push(ctx.settings.edition) } } }]);
    await handleElementalInteraction(rt, interaction("command").i as never, reg);
    await handleElementalInteraction(rt, interaction("command", { guildId: REHEARSAL }).i as never, reg);
    expect(seen).toEqual(["elemental-2026", "elemental-dryrun"]);
  });

  test("other modules' custom ids are ignored; ours route with their args", async () => {
    const { api } = fakeApi();
    const rt = runtime(api);
    const run = jest.fn(async () => undefined);
    const reg = buildRegistry([{ name: "t", actions: { pick: { ack: "update", run } } }]);
    const foreign = interaction("button", { customId: "sq|island" });
    await handleElementalInteraction(rt, foreign.i as never, reg);
    expect(foreign.i.deferUpdate).not.toHaveBeenCalled();
    const ours = interaction("button", { customId: "el|pick|fire" });
    await handleElementalInteraction(rt, ours.i as never, reg);
    expect(ours.i.deferUpdate).toHaveBeenCalled();
    expect(run).toHaveBeenCalledWith(ours.i, expect.objectContaining({ guildId: GUILD, userId: USER }), ["fire"]);
  });

  test("a command with no handler yet answers 'not available' ephemerally", async () => {
    const { api } = fakeApi();
    const { i, sent } = interaction("command");
    await handleElementalInteraction(runtime(api), i as never, buildRegistry([]));
    expect(i.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    expect(sent).toContainEqual(expect.objectContaining({ content: COMMON.notAvailable }));
  });
});

describe("defer wrapper", () => {
  afterEach(() => jest.useRealTimers());

  test("defers (ephemeral) before the first database call, even when the database takes 5 s", async () => {
    jest.useFakeTimers({ now: new Date("2026-12-04T13:00:00Z") });
    const order: string[] = [];
    const at: Record<string, number> = {};
    const { api } = fakeApi(async (fn, guildId) => {
      order.push(`db:${fn}`);
      at.db = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      return rawSettings(guildId as string);
    });
    const rt = runtime(api);
    const { i } = interaction("command", {}, order);
    (i.deferReply as jest.Mock).mockImplementation(async () => {
      order.push("deferReply");
      at.defer = Date.now();
      (i as unknown as { deferred: boolean }).deferred = true;
    });
    const start = Date.now();
    const done = runWithAck(rt, i, {}, "/join", async () => {
      order.push("handler");
    });
    // The ack is sent synchronously, before anything is awaited.
    expect(i.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    expect(at.defer - start).toBeLessThan(1_000);
    await jest.advanceTimersByTimeAsync(5_000);
    await done;
    expect(order).toEqual(["deferReply", "db:elemental_bot_settings_get", "handler"]);
    expect(at.db).toBeGreaterThanOrEqual(at.defer);
  });

  test("a modal ack never defers and uses cached settings", async () => {
    const { api } = fakeApi();
    const rt = runtime(api);
    await rt.settings.refresh(GUILD);
    (api.call as jest.Mock).mockClear();
    const { i } = interaction("command");
    const run = jest.fn(async () => undefined);
    await runWithAck(rt, i, { ack: "modal" }, "/tester", run);
    expect(i.deferReply).not.toHaveBeenCalled();
    expect(api.call).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
  });

  test("a guild without settings, a gate refusal and a database error each end in one ephemeral line", async () => {
    const { api } = fakeApi((fn) => (fn === "elemental_bot_settings_get" ? null : null));
    const a = interaction("command");
    await runWithAck(runtime(api), a.i, {}, "/join", async () => undefined);
    expect(a.sent).toContainEqual({ content: COMMON.notSetUp, allowedMentions: { parse: [] } });

    const { api: api2 } = fakeApi();
    const b = interaction("command", { member: { roles: [ROLE.judge] } });
    const run = jest.fn(async () => undefined);
    await runWithAck(runtime(api2), b.i, { gate: ["helper"] }, "/el totals", run);
    expect(run).not.toHaveBeenCalled();
    expect(b.sent).toContainEqual({ content: COMMON.staffOnly, allowedMentions: { parse: [] } });

    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const c = interaction("command");
    await runWithAck(runtime(api2), c.i, {}, "/join", async () => {
      throw new ElementalError("busy");
    });
    expect(c.sent).toContainEqual({ content: COMMON.busy, allowedMentions: { parse: [] } });
    spy.mockRestore();
  });

  test("an 'update' ack on a button sends errors as an ephemeral follow-up, not over the message", async () => {
    const { api } = fakeApi();
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { i } = interaction("button");
    await runWithAck(runtime(api), i, { ack: "update" }, "el|pick", async () => {
      throw new Error("boom");
    });
    spy.mockRestore();
    expect(i.deferUpdate).toHaveBeenCalled();
    expect(i.editReply).not.toHaveBeenCalled();
    expect(i.followUp).toHaveBeenCalledWith(expect.objectContaining({ content: COMMON.failed, flags: MessageFlags.Ephemeral }));
  });
});

// ---------------------------------------------------------------------------
// Settings, roles, events, feature start
// ---------------------------------------------------------------------------

describe("settings and roles", () => {
  test("normalises nested and flat shapes and drops malformed ids", () => {
    const s = normalizeSettings({ ...rawSettings(), roles: { ...ROLE, mentor: "not-an-id" }, news_channel_id: "400000000000000002" }, GUILD)!;
    expect(s.edition).toBe("elemental-2026");
    expect(s.editionKind).toBe("event");
    expect(s.roles.host).toBe(ROLE.host);
    expect(s.roles.mentor).toBeUndefined();
    expect(s.channels).toEqual({ start_here: "400000000000000001", news: "400000000000000002", reports: "400000000000000004" });
    expect(s.elementCategories.fire).toHaveLength(2);
    expect(s.schedule["2026-12-04"].card_at).toBe("20:30");
    expect(s.testerCap).toBe(10);
    expect(s.teamCap).toBe(175);
    expect(normalizeSettings(null, GUILD)).toBeNull();
    expect(normalizeSettings({ roles: {} }, GUILD)).toBeNull();
    expect(normalizeSettings(rawSettings(REHEARSAL), REHEARSAL)!.editionKind).toBe("rehearsal");
  });

  test("Host passes every gate; Judge only where listed; element from roles", () => {
    const settings = normalizeSettings(rawSettings(), GUILD)!;
    expect(allowed([ROLE.host], settings, [])).toBe(true);
    expect(allowed([ROLE.judge], settings, ["helper", "mentor"])).toBe(false);
    expect(allowed([ROLE.judge], settings, ["judge"])).toBe(true);
    expect(allowed([ROLE.helper], settings, ["helper"])).toBe(true);
    expect(() => requireRole({ memberRoleIds: [ROLE.paid], settings }, ["safety"])).toThrow(GateError);
    expect(() => requirePaid({ memberRoleIds: [], settings })).toThrow(COMMON.paidOnly);
    expect(() => requirePaid({ memberRoleIds: [ROLE.judge], settings })).toThrow(GateError);
    expect(() => requirePaid({ memberRoleIds: [ROLE.paid], settings })).not.toThrow();
    expect(elementOf([ROLE.paid, ROLE.fire], settings)).toBe("fire");
    expect(elementOf([ROLE.paid], settings)).toBeNull();
  });

  test("a failing event listener is logged and the others still run", async () => {
    const { api } = fakeApi();
    const rt = runtime(api);
    const got: string[] = [];
    rt.events.on("tester.first", () => {
      throw new Error("x");
    });
    rt.events.on("tester.first", (p) => void got.push(p.teamId));
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    await rt.events.emit("tester.first", { guildId: GUILD, edition: "elemental-2026", teamId: "t1", entryId: "e1" });
    spy.mockRestore();
    expect(got).toEqual(["t1"]);
  });

  test("a feature whose start throws is off alone; feature listeners are wired", async () => {
    const { api } = fakeApi();
    const rt = runtime(api);
    const stop = jest.fn();
    const heard: string[] = [];
    const reg = buildRegistry([
      { name: "broken", start: () => Promise.reject(new Error("no")) },
      { name: "fine", start: () => stop, events: { "tester.first": (p) => void heard.push(p.entryId) } },
    ]);
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const stops = await startFeatures(rt, reg);
    spy.mockRestore();
    expect(stops.map((s) => s.name)).toEqual(["fine"]);
    await rt.events.emit("tester.first", { guildId: GUILD, edition: "e", teamId: "t", entryId: "e9" });
    expect(heard).toEqual(["e9"]);
  });
});

// ---------------------------------------------------------------------------
// Heartbeat
// ---------------------------------------------------------------------------

describe("heartbeat", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "el-health-"));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  test("the file's mtime moves after a successful ping and not after a failed one", async () => {
    const file = path.join(dir, "healthy");
    let clock = new Date("2026-12-04T12:00:00Z");
    let ok = true;
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const hb = startHeartbeat({
      ping: async () => {
        if (!ok) throw new Error("down");
      },
      healthFile: file,
      intervalMs: 3_600_000,
      now: () => clock,
    });
    expect(await hb.beat()).toBe(true);
    const first = fs.statSync(file).mtimeMs;
    expect(first).toBe(clock.getTime());

    clock = new Date("2026-12-04T12:01:00Z");
    expect(await hb.beat()).toBe(true);
    const second = fs.statSync(file).mtimeMs;
    expect(second).toBeGreaterThan(first);

    ok = false;
    clock = new Date("2026-12-04T12:02:00Z");
    expect(await hb.beat()).toBe(false);
    expect(fs.statSync(file).mtimeMs).toBe(second);
    await hb.stop();
    spy.mockRestore();
  });

  test("no touch while the gateway is disconnected", async () => {
    const file = path.join(dir, "healthy");
    const hb = startHeartbeat({ ping: async () => undefined, connected: () => false, healthFile: file, intervalMs: 3_600_000 });
    expect(await hb.beat()).toBe(false);
    expect(fs.existsSync(file)).toBe(false);
    await hb.stop();
  });

  test("the ping reads every guild's settings and fills the cache", async () => {
    const { api, calls } = fakeApi();
    const rt = runtime(api);
    await settingsPing(rt)();
    expect(calls).toEqual(["elemental_bot_settings_get", "elemental_bot_settings_get"]);
    expect(rt.settings.peek(GUILD)?.edition).toBe("elemental-2026");
    expect(rt.settings.peek(REHEARSAL)?.edition).toBe("elemental-dryrun");
  });
});

// ---------------------------------------------------------------------------
// Queues
// ---------------------------------------------------------------------------

describe("queue", () => {
  const rateLimited = (seconds: number) => Object.assign(new Error("You are being rate limited."), { status: 429, rawError: { retry_after: seconds } });

  test("a 429 is retried after its retry_after", async () => {
    const waits: number[] = [];
    let tries = 0;
    const result = await withRetry(
      async () => {
        tries += 1;
        if (tries === 1) throw rateLimited(2.5);
        return "made";
      },
      { sleep: async (ms) => void waits.push(ms), onRetry: () => undefined }
    );
    expect(result).toBe("made");
    expect(tries).toBe(2);
    expect(waits).toHaveLength(1);
    expect(waits[0]).toBeGreaterThanOrEqual(2_500);
    expect(waits[0]).toBeLessThan(3_000);
  });

  test("rate limit shapes: Discord body seconds, RateLimitError ms; a 403 is not retried", () => {
    expect(rateLimitDelay(rateLimited(1.2))).toBe(1_200);
    expect(rateLimitDelay(Object.assign(new Error("rl"), { name: "RateLimitError", retryAfter: 750 }))).toBe(750);
    expect(rateLimitDelay(Object.assign(new Error("x"), { status: 403 }))).toBeNull();
    expect(retryDelay(Object.assign(new Error("x"), { status: 403 }), 1)).toBeNull();
    expect(retryDelay(Object.assign(new Error("x"), { status: 503 }), 2, { baseDelayMs: 100 })).toBe(200);
    expect(retryDelay(rateLimited(1), 6)).toBeNull();
    expect(retryDelay(new ElementalError("island_full"), 1)).toBeNull();
  });

  test("one key runs in order, a failure does not block the next task, keys run side by side", async () => {
    const q = createKeyedQueue("test", { sleep: async () => undefined, onRetry: () => undefined });
    const order: string[] = [];
    let releaseA!: () => void;
    const a = q.run("board-1", async () => {
      await new Promise<void>((resolve) => (releaseA = resolve));
      order.push("a");
    });
    const b = q.run("board-1", async () => {
      order.push("b");
      throw Object.assign(new Error("forbidden"), { status: 403 });
    });
    const c = q.run("board-1", async () => void order.push("c"));
    const other = q.run("board-2", async () => void order.push("other"));
    await other;
    expect(order).toEqual(["other"]);
    expect(q.pending("board-1")).toBe(3);
    releaseA();
    await a;
    await expect(b).rejects.toThrow("forbidden");
    await c;
    expect(order).toEqual(["other", "a", "b", "c"]);
    await q.stop();
    expect(q.pending()).toBe(0);
    await expect(q.run("board-1", async () => 1)).rejects.toThrow(/stopped/);
  });

  test("a burst with injected 429s all completes", async () => {
    const waits: number[] = [];
    const q = createKeyedQueue("burst", { sleep: async (ms) => void waits.push(ms), onRetry: () => undefined });
    const made: number[] = [];
    const tasks = Array.from({ length: 30 }, (_, n) => {
      let first = true;
      return q.run("guild", async () => {
        if (first && n % 3 === 0) {
          first = false;
          throw rateLimited(1);
        }
        made.push(n);
      });
    });
    await Promise.all(tasks);
    expect(made).toEqual(Array.from({ length: 30 }, (_, n) => n));
    expect(waits).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// Safeguarding: the bot never DMs a student
// ---------------------------------------------------------------------------

describe("no direct messages", () => {
  function sources(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sources(full);
      return entry.name.endsWith(".ts") ? [full] : [];
    });
  }

  test("no createDM, user.send or DM channel anywhere in bot/src/elemental", () => {
    const root = path.join(__dirname, "..");
    const files = sources(root);
    expect(files.length).toBeGreaterThan(10);
    const banned = /createDM|\buser\.send\b|\busers\.send\b|\.dmChannel\b|ChannelType\.DM\b|member\.send\b/;
    const offenders = files.filter((file) => banned.test(fs.readFileSync(file, "utf8")));
    expect(offenders.map((f) => path.relative(root, f))).toEqual([]);
  });
});
