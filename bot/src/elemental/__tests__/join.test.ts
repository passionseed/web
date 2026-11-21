/**
 * @jest-environment node
 */
import { MessageFlags, Routes, type Client } from "discord.js";

import { ElementalError, type ElementalApi } from "../api";
import type { ElementalRuntime } from "../context";
import { COMMON } from "../copy/common";
import { JOIN } from "../copy/join";
import { CLAIM_FN, SET_ELEMENT_FN, feature, normalizeCode, pickerMessage } from "../features/join";
import { createRuntime, handleElementalInteraction } from "../index";
import { FEATURES, buildRegistry } from "../registry";

// Fixture ids only: no real guild, channel, role or person.
const GUILD = "100000000000000001";
const REHEARSAL = "100000000000000002";
const START_HERE = "400000000000000001";
const MIRROR = "400000000000000003";
const OTHER_CHANNEL = "400000000000000009";
const USER_A = "200000000000000001";
const USER_B = "200000000000000002";
const HOST = "200000000000000090";

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
} as const;

const EDITION: Record<string, { key: string; kind: "event" | "rehearsal" }> = {
  [GUILD]: { key: "elemental-2026", kind: "event" },
  [REHEARSAL]: { key: "elemental-dryrun", kind: "rehearsal" },
};

function rawSettings(guildId: string): Record<string, unknown> | null {
  const edition = EDITION[guildId];
  if (!edition) return null;
  return {
    guild_id: guildId,
    edition: edition.key,
    edition_kind: edition.kind,
    roles: ROLE,
    channels: { start_here: START_HERE, mirror: MIRROR, reports: "400000000000000004" },
  };
}

interface Code {
  edition: string;
  kind: "member" | "rehearsal";
  /** The registration behind a member code. */
  event?: string;
  status?: "paid" | "cancelled";
  usedBy?: string;
}

/**
 * A small stand-in for the elemental_bot_* functions /join and the picker
 * call, with the refusals of the core migration (elemental_bot_claim,
 * elemental_bot_set_element, elemental_bot_member_get).
 */
function fakeDb() {
  const codes = new Map<string, Code>([
    ["ABCDEFGH", { edition: "elemental-2026", kind: "member", event: "elemental-2026", status: "paid" }],
    ["BCDEFGHJ", { edition: "elemental-2026", kind: "member", event: "elemental-2026", status: "paid" }],
    ["CDEFGHJK", { edition: "elemental-2026", kind: "member", event: "elemental-2026", status: "paid", usedBy: "200000000000000077" }],
    ["DEFGHJKL", { edition: "elemental-2026", kind: "member", event: "elemental-2026", status: "cancelled" }],
    ["EFGHJKLM", { edition: "elemental-2026", kind: "member", event: "another-event", status: "paid" }],
    ["REHEARS2", { edition: "elemental-dryrun", kind: "rehearsal" }],
  ]);
  const members = new Map<string, { element_pick: string | null; onTeam: boolean; is_staff: boolean }>();
  const calls: { fn: string; args: unknown[] }[] = [];
  const state = { dropped: false };

  function fail(code: string): never {
    throw new ElementalError(code);
  }

  function memberJson(edition: { key: string; kind: string }, user: string, already: boolean) {
    const m = members.get(`${edition.key}:${user}`)!;
    return {
      member_id: `m-${user}`,
      edition: edition.key,
      edition_kind: edition.kind,
      already,
      is_staff: m.is_staff,
      element_pick: m.element_pick,
      team: null,
    };
  }

  const impl = (fn: string, ...args: unknown[]): unknown => {
    calls.push({ fn, args });
    const guildId = args[0] as string;
    if (fn === "elemental_bot_settings_get") return rawSettings(guildId);
    const edition = (!state.dropped && EDITION[guildId]) || fail("unknown_guild");
    if (fn === CLAIM_FN) {
      const [, rawCode, user] = args as string[];
      const code = String(rawCode).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const claim = codes.get(code) ?? fail("unknown_code");
      if (claim.edition !== edition.key) fail("wrong_edition");
      const key = `${edition.key}:${user}`;
      if (claim.usedBy) {
        if (claim.usedBy === user && members.has(key)) return memberJson(edition, user, true);
        fail("code_used");
      }
      if (members.has(key)) fail("already_claimed");
      if (claim.kind === "member") {
        if (claim.event !== "elemental-2026") fail("wrong_event");
        if (claim.status !== "paid") fail("not_paid");
      } else if (edition.kind !== "rehearsal") {
        fail("wrong_edition");
      }
      members.set(key, { element_pick: null, onTeam: false, is_staff: false });
      claim.usedBy = user;
      return memberJson(edition, user, false);
    }
    if (fn === SET_ELEMENT_FN) {
      const [, user, element] = args as string[];
      const m = members.get(`${edition.key}:${user}`) ?? fail("not_claimed");
      if (m.onTeam) fail("on_team");
      const previous = m.element_pick;
      m.element_pick = element;
      return { element, previous };
    }
    if (fn === "elemental_bot_member_get") {
      const user = args[1] as string;
      return members.has(`${edition.key}:${user}`) ? memberJson(edition, user, true) : null;
    }
    throw new Error(`unexpected ${fn}`);
  };

  const api: ElementalApi = {
    call: (async (fn: string, ...args: unknown[]) => impl(fn, ...args)) as ElementalApi["call"],
    rows: (async () => []) as ElementalApi["rows"],
  };
  return { api, calls, members, state, claimCalls: () => calls.filter((c) => c.fn === CLAIM_FN) };
}

/** Fake Discord REST: member roles per guild and user, posted messages, injectable failures. */
function fakeDiscord() {
  const roles = new Map<string, Set<string>>();
  const posts: { channelId: string; body: Record<string, unknown> }[] = [];
  const ops: string[] = [];
  let failRoles: { status: number } | null = null;

  const route = (r: string) => {
    const m = /^\/guilds\/(\d+)\/members\/(\d+)\/roles\/(\d+)$/.exec(r);
    if (!m) throw new Error(`unexpected route ${r}`);
    return { key: `${m[1]}:${m[2]}`, role: m[3] };
  };
  const held = (guildId: string, userId: string) => {
    const key = `${guildId}:${userId}`;
    if (!roles.has(key)) roles.set(key, new Set());
    return roles.get(key)!;
  };

  const rest = {
    put: jest.fn(async (r: string) => {
      if (failRoles) throw Object.assign(new Error("Missing Permissions"), failRoles);
      const { key, role } = route(r);
      ops.push(`+${role}`);
      const [g, u] = key.split(":");
      held(g, u).add(role);
    }),
    delete: jest.fn(async (r: string) => {
      if (failRoles) throw Object.assign(new Error("Missing Permissions"), failRoles);
      const { key, role } = route(r);
      ops.push(`-${role}`);
      const [g, u] = key.split(":");
      held(g, u).delete(role);
    }),
    post: jest.fn(async (r: string, opts: { body: Record<string, unknown> }) => {
      const m = /^\/channels\/(\d+)\/messages$/.exec(r);
      if (!m) throw new Error(`unexpected route ${r}`);
      posts.push({ channelId: m[1], body: opts.body });
      return { id: "700000000000000001" };
    }),
  };

  return {
    rest,
    posts,
    ops,
    held,
    failRolesWith(status: number | null) {
      failRoles = status === null ? null : { status };
    },
  };
}

const ENV = { guildIds: [GUILD, REHEARSAL], databaseUrl: "postgresql://stub@127.0.0.1:5432/postgres", cardUrl: null, cardSecret: null };
const REG = buildRegistry([feature]);

function setup() {
  const db = fakeDb();
  const discord = fakeDiscord();
  const rt: ElementalRuntime = createRuntime({ client: { rest: discord.rest } as unknown as Client, api: db.api, env: ENV });
  return { db, discord, rt };
}

type Kind = "command" | "button";

interface Opts {
  guildId?: string;
  channelId?: string | null;
  user?: string;
  /** Role ids the member holds; defaults to what the fake Discord says. */
  roles?: string[];
  code?: string;
  command?: string;
  sub?: string | null;
  customId?: string;
}

/** A minimal Discord interaction that records what the bot sent. */
function interaction(kind: Kind, held: (g: string, u: string) => Set<string>, opts: Opts = {}) {
  const guildId = opts.guildId ?? GUILD;
  const user = opts.user ?? USER_A;
  const sent: { content?: string; flags?: number }[] = [];
  const i: Record<string, unknown> = {
    guildId,
    channelId: opts.channelId === undefined ? START_HERE : opts.channelId,
    user: { id: user },
    member: { roles: opts.roles ?? [...held(guildId, user)] },
    commandName: opts.command ?? "join",
    customId: opts.customId ?? "el|x",
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
      getSubcommand: () => opts.sub ?? null,
      getString: (name: string) => (name === "code" ? (opts.code ?? null) : null),
    },
    deferReply: jest.fn(async (o: { flags?: number }) => {
      i.deferred = true;
      sent.push({ flags: o?.flags });
    }),
    deferUpdate: jest.fn(async () => {
      i.deferred = true;
    }),
    reply: jest.fn(async (p: { content?: string }) => {
      i.replied = true;
      sent.push(p);
    }),
    editReply: jest.fn(async (p: { content?: string }) => {
      i.replied = true;
      sent.push(p);
    }),
    followUp: jest.fn(async (p: { content?: string }) => {
      i.replied = true;
      sent.push(p);
    }),
    deleteReply: jest.fn(async () => undefined),
  };
  const answer = () => sent.filter((s) => s.content !== undefined).map((s) => s.content);
  return { i, sent, answer };
}

async function join(ctx: ReturnType<typeof setup>, code: string, opts: Opts = {}) {
  const it = interaction("command", ctx.discord.held, { code, ...opts });
  await handleElementalInteraction(ctx.rt, it.i as never, REG);
  expect(it.i.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
  return it;
}

async function pick(ctx: ReturnType<typeof setup>, element: string, opts: Opts = {}) {
  const it = interaction("button", ctx.discord.held, { customId: `el|pick|${element}`, ...opts });
  await handleElementalInteraction(ctx.rt, it.i as never, REG);
  expect(it.i.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
  return it;
}

let errorSpy: jest.SpyInstance;
beforeEach(() => {
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errorSpy.mockRestore());

describe("registration", () => {
  test("/join has one required code option; /el picker is a staff tool; the full feature list still builds", () => {
    const join = feature.commands?.find((c) => c.name === "join");
    expect(join?.options).toEqual([expect.objectContaining({ name: "code", required: true, max_length: 32 })]);
    expect(join?.description.length).toBeLessThanOrEqual(100);
    expect(feature.staffSubcommands?.map((s) => s.name)).toEqual(["picker"]);
    expect(REG.commands.map((c) => c.name)).toEqual(["join", "el"]);
    expect(() => buildRegistry(FEATURES)).not.toThrow();
  });

  test("normalizeCode matches the SQL: uppercase, letters and digits only", () => {
    expect(normalizeCode("abcd-efgh")).toBe("ABCDEFGH");
    expect(normalizeCode(" ab cd ef gh ")).toBe("ABCDEFGH");
  });
});

describe("/join code:", () => {
  test("a valid code claims with the guild id and adds exactly the Paid role", async () => {
    const ctx = setup();
    const { answer } = await join(ctx, "abcd-efgh");
    expect(ctx.db.claimCalls()).toEqual([{ fn: CLAIM_FN, args: [GUILD, "ABCDEFGH", USER_A] }]);
    expect(ctx.discord.rest.put).toHaveBeenCalledTimes(1);
    expect(ctx.discord.rest.put).toHaveBeenCalledWith(Routes.guildMemberRole(GUILD, USER_A, ROLE.paid), expect.anything());
    expect([...ctx.discord.held(GUILD, USER_A)]).toEqual([ROLE.paid]);
    expect(ctx.discord.rest.delete).not.toHaveBeenCalled();
    expect(answer()).toEqual([JOIN.joined]);
  });

  test.each([
    ["used by someone else", "CDEFGHJK", JOIN.codeUsed],
    ["cancelled registration", "DEFGHJKL", JOIN.notPaid],
    ["other event's registration", "EFGHJKLM", JOIN.wrongEvent],
    ["unknown", "ZZZZZZZZ", JOIN.unknownCode],
  ])("a code %s adds no role and refuses ephemerally", async (_label, code, text) => {
    const ctx = setup();
    const { answer } = await join(ctx, code);
    expect(ctx.db.claimCalls()).toHaveLength(1);
    expect(ctx.discord.rest.put).not.toHaveBeenCalled();
    expect(ctx.discord.rest.delete).not.toHaveBeenCalled();
    expect(ctx.discord.posts).toEqual([]);
    expect(answer()).toEqual([text]);
  });

  test("something that is not a code never reaches the database", async () => {
    const ctx = setup();
    expect((await join(ctx, "hello")).answer()).toEqual([JOIN.unknownCode]);
    expect(ctx.db.claimCalls()).toEqual([]);
    expect(ctx.discord.rest.put).not.toHaveBeenCalled();
  });

  test("a phone number in the code field is refused as a contact, never echoed, never sent to the database", async () => {
    const ctx = setup();
    const { sent, answer } = await join(ctx, "081 234 5678");
    expect(answer()).toEqual([JOIN.codeLooksLikeContact]);
    expect(JSON.stringify(sent)).not.toContain("5678");
    expect(ctx.db.claimCalls()).toEqual([]);
  });

  test("outside #start-here it is refused before any claim", async () => {
    const ctx = setup();
    const { answer } = await join(ctx, "ABCDEFGH", { channelId: OTHER_CHANNEL });
    expect(answer()).toEqual([JOIN.wrongChannel(START_HERE)]);
    expect(ctx.db.claimCalls()).toEqual([]);
    expect(ctx.discord.rest.put).not.toHaveBeenCalled();
  });

  test("repeat /join by the same user is idempotent: one claim, one role add, a calm answer", async () => {
    const ctx = setup();
    await join(ctx, "ABCDEFGH");
    const second = await join(ctx, "ABCDEFGH");
    expect(second.answer()).toEqual([JOIN.joinedAgain]);
    expect(ctx.db.members.size).toBe(1);
    expect(ctx.discord.rest.put).toHaveBeenCalledTimes(1);
    expect([...ctx.discord.held(GUILD, USER_A)]).toEqual([ROLE.paid]);
  });

  test("a second code for an account that already joined is refused, and a missing Paid role is put back", async () => {
    const ctx = setup();
    await join(ctx, "ABCDEFGH");
    ctx.discord.held(GUILD, USER_A).clear(); // someone removed the role by hand
    const { answer } = await join(ctx, "BCDEFGHJ");
    expect(answer()).toEqual([JOIN.alreadyClaimed]);
    expect([...ctx.discord.held(GUILD, USER_A)]).toEqual([ROLE.paid]);
  });

  test("a rehearsal code is refused in the real guild and works in the rehearsal guild", async () => {
    const ctx = setup();
    const real = await join(ctx, "REHEARS2");
    expect(real.answer()).toEqual([JOIN.wrongEdition]);
    expect(ctx.discord.rest.put).not.toHaveBeenCalled();

    const rehearsal = await join(ctx, "REHEARS2", { guildId: REHEARSAL });
    expect(rehearsal.answer()).toEqual([JOIN.joined]);
    expect([...ctx.discord.held(REHEARSAL, USER_A)]).toEqual([ROLE.paid]);
    expect(ctx.discord.held(GUILD, USER_A).size).toBe(0);
  });

  test("a 403 on the role keeps the claim, answers kindly and posts one staff alert for many students", async () => {
    const ctx = setup();
    ctx.discord.failRolesWith(403);
    const a = await join(ctx, "ABCDEFGH");
    const b = await join(ctx, "BCDEFGHJ", { user: USER_B });
    expect(a.answer()).toEqual([JOIN.rolePending]);
    expect(b.answer()).toEqual([JOIN.rolePending]);
    expect(ctx.db.members.size).toBe(2);
    expect(ctx.discord.rest.put).toHaveBeenCalledTimes(2); // a 403 is not retried
    expect(ctx.discord.posts).toEqual([
      { channelId: MIRROR, body: { content: JOIN.staffRoleForbidden, allowed_mentions: { parse: [] } } },
    ]);
    // The alert never names a student.
    expect(JSON.stringify(ctx.discord.posts)).not.toMatch(new RegExp(`${USER_A}|${USER_B}`));
  });

  test("a settings row removed since the cache loaded answers 'not set up'", async () => {
    const ctx = setup();
    await join(ctx, "hello"); // warms the settings cache
    ctx.db.state.dropped = true;
    expect((await join(ctx, "ABCDEFGH")).answer()).toEqual([COMMON.notSetUp]);
    expect(ctx.discord.rest.put).not.toHaveBeenCalled();
  });
});

describe("element picker", () => {
  test("an unclaimed click is refused and changes no role", async () => {
    const ctx = setup();
    const { answer } = await pick(ctx, "fire");
    expect(answer()).toEqual([JOIN.notClaimed]);
    expect(ctx.discord.rest.put).not.toHaveBeenCalled();
    expect(ctx.discord.rest.delete).not.toHaveBeenCalled();
  });

  test("fire then water leaves only water (and Paid)", async () => {
    const ctx = setup();
    await join(ctx, "ABCDEFGH");
    expect((await pick(ctx, "fire")).answer()).toEqual([JOIN.picked("fire")]);
    expect((await pick(ctx, "water")).answer()).toEqual([JOIN.picked("water")]);
    expect([...ctx.discord.held(GUILD, USER_A)].sort()).toEqual([ROLE.paid, ROLE.water].sort());
    expect(ctx.db.members.get(`elemental-2026:${USER_A}`)?.element_pick).toBe("water");
    expect(ctx.discord.ops).toEqual([`+${ROLE.paid}`, `+${ROLE.fire}`, `+${ROLE.water}`, `-${ROLE.fire}`]);
  });

  test("two quick clicks (fire, water) with the same stale role list leave only water", async () => {
    const ctx = setup();
    await join(ctx, "ABCDEFGH");
    const stale = [...ctx.discord.held(GUILD, USER_A)];
    await Promise.all([pick(ctx, "fire", { roles: stale }), pick(ctx, "water", { roles: stale })]);
    expect([...ctx.discord.held(GUILD, USER_A)].sort()).toEqual([ROLE.paid, ROLE.water].sort());
    expect(ctx.db.members.get(`elemental-2026:${USER_A}`)?.element_pick).toBe("water");
  });

  test("fire, water, fire with a stale role list still ends on fire alone", async () => {
    const ctx = setup();
    await join(ctx, "ABCDEFGH");
    const stale = [...ctx.discord.held(GUILD, USER_A)];
    await pick(ctx, "fire", { roles: stale });
    await pick(ctx, "water", { roles: [...stale, ROLE.fire] });
    await pick(ctx, "fire", { roles: [...stale, ROLE.fire] }); // snapshot from before water landed
    expect([...ctx.discord.held(GUILD, USER_A)].sort()).toEqual([ROLE.paid, ROLE.fire].sort());
  });

  test("a non-403 role failure still tells staff, since the student is told staff know", async () => {
    const ctx = setup();
    await join(ctx, "ABCDEFGH");
    ctx.discord.failRolesWith(404);
    expect((await pick(ctx, "earth")).answer()).toEqual([JOIN.pickRolePending("earth")]);
    expect(ctx.discord.posts).toEqual([
      { channelId: MIRROR, body: { content: JOIN.staffRoleFailed, allowed_mentions: { parse: [] } } },
    ]);
  });

  test("a stray second element role is cleaned up, and picking the held element changes nothing", async () => {
    const ctx = setup();
    await join(ctx, "ABCDEFGH");
    ctx.discord.held(GUILD, USER_A).add(ROLE.fire).add(ROLE.air);
    await pick(ctx, "air");
    expect([...ctx.discord.held(GUILD, USER_A)].sort()).toEqual([ROLE.paid, ROLE.air].sort());
    const before = ctx.discord.ops.length;
    await pick(ctx, "air");
    expect(ctx.discord.ops.length).toBe(before);
  });

  test("on a live team the click is refused and no role changes", async () => {
    const ctx = setup();
    await join(ctx, "ABCDEFGH");
    await pick(ctx, "fire");
    ctx.db.members.get(`elemental-2026:${USER_A}`)!.onTeam = true;
    const before = ctx.discord.ops.length;
    expect((await pick(ctx, "water")).answer()).toEqual([JOIN.onTeam]);
    expect(ctx.discord.ops.length).toBe(before);
  });

  test("a forged element never reaches the database", async () => {
    const ctx = setup();
    await join(ctx, "ABCDEFGH");
    expect((await pick(ctx, "plasma")).answer()).toEqual([COMMON.failed]);
    expect(ctx.db.calls.filter((c) => c.fn === SET_ELEMENT_FN)).toEqual([]);
  });

  test("a 403 on the element role saves the pick, answers kindly and alerts staff once", async () => {
    const ctx = setup();
    await join(ctx, "ABCDEFGH");
    await join(ctx, "BCDEFGHJ", { user: USER_B });
    ctx.discord.failRolesWith(403);
    expect((await pick(ctx, "earth")).answer()).toEqual([JOIN.pickRolePending("earth")]);
    await pick(ctx, "fire", { user: USER_B });
    expect(ctx.db.members.get(`elemental-2026:${USER_A}`)?.element_pick).toBe("earth");
    expect(ctx.discord.posts.filter((p) => p.channelId === MIRROR)).toHaveLength(1);
  });

  test("the picker message has five element buttons with el|pick ids and no mentions", () => {
    const body = pickerMessage();
    const row = (body.components as { components: { custom_id: string }[] }[])[0];
    expect(row.components.map((b) => b.custom_id)).toEqual([
      "el|pick|water",
      "el|pick|earth",
      "el|pick|air",
      "el|pick|fire",
      "el|pick|aether",
    ]);
    expect(body.allowed_mentions).toEqual({ parse: [] });
  });

  test("/el picker: a Host posts it in #start-here; a Judge or a student is refused", async () => {
    const ctx = setup();
    const host = interaction("command", ctx.discord.held, { command: "el", sub: "picker", user: HOST, roles: [ROLE.host], channelId: OTHER_CHANNEL });
    await handleElementalInteraction(ctx.rt, host.i as never, REG);
    expect(ctx.discord.posts).toEqual([{ channelId: START_HERE, body: pickerMessage() }]);
    expect(host.answer()).toEqual([JOIN.pickerPosted(START_HERE)]);

    for (const roles of [[ROLE.judge], [ROLE.paid], [ROLE.helper]]) {
      const other = interaction("command", ctx.discord.held, { command: "el", sub: "picker", user: USER_B, roles });
      await handleElementalInteraction(ctx.rt, other.i as never, REG);
      expect(other.answer()).toEqual([COMMON.staffOnly]);
    }
    expect(ctx.discord.posts).toHaveLength(1);
  });
});
