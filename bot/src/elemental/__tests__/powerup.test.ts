/**
 * @jest-environment node
 */
import { randomUUID } from "node:crypto";

import { ApplicationCommandOptionType, ChannelType, MessageFlags, PermissionFlagsBits, type Client } from "discord.js";

import { bangkokDay } from "../../../../lib/elemental/core";
import { ElementalError, type ElementalApi } from "../api";
import { createEvents, createSettingsCache, type ElementalRuntime } from "../context";
import { COMMON } from "../copy/common";
import { POWERUP } from "../copy/powerup";
import { handleElementalInteraction } from "../index";
import { createKeyedQueue } from "../queue";
import { buildRegistry, registry } from "../registry";
import { BADGE_KIND, MAX_LISTED, SUB, feature, powerupRef, powerupSummary, voiceMemberIds } from "../features/powerup";

// ---------------------------------------------------------------------------
// Fixtures: made-up snowflakes only, no names.
// ---------------------------------------------------------------------------

const GUILD = "100000000000000001";
const OTHER_GUILD = "100000000000000002";
const BOT = "190000000000000001";
const HOST = "210000000000000001";
const HELPER = "210000000000000002";
const VOICE = "600000000000000001";
const OTHER_VOICE = "600000000000000002";
const TEXT = "600000000000000003";
const ROLE = {
  host: "300000000000000001",
  helper: "300000000000000002",
  mentor: "300000000000000003",
  judge: "300000000000000004",
  safety: "300000000000000005",
  paid: "300000000000000006",
};

const user = (n: number) => `2000000000000${String(n).padStart(5, "0")}`;

// ---------------------------------------------------------------------------
// A fake of the two elemental_bot_* functions this tool calls, mirroring E09:
// member_get returns {team: live team jsonb | null}; award_badge inserts
// (team, kind, ref) once and refuses a team that is not live.
// ---------------------------------------------------------------------------

interface FakeTeam {
  id: string;
  slot: number;
  status: "active" | "channel_pending" | "archived";
}

class FakeDb {
  settings: Record<string, unknown> = { guild_id: GUILD, edition: "elemental-dryrun", edition_kind: "rehearsal", roles: ROLE };
  claimed = new Set<string>();
  teamOf = new Map<string, string>();
  teams = new Map<string, FakeTeam>();
  badges = new Set<string>();
  calls: { fn: string; args: unknown[] }[] = [];
  /** Archive this team right after its member lookup (a race with /el team-archive). */
  archiveAfterLookup: string | null = null;

  team(slot: number, people: string[], status: FakeTeam["status"] = "active"): FakeTeam {
    const t: FakeTeam = { id: randomUUID(), slot, status };
    this.teams.set(t.id, t);
    for (const p of people) {
      this.claimed.add(p);
      this.teamOf.set(p, t.id);
    }
    return t;
  }

  live(t: FakeTeam | undefined): t is FakeTeam {
    return Boolean(t && t.status !== "archived");
  }

  call(fn: string, args: unknown[]): unknown {
    this.calls.push({ fn, args });
    switch (fn) {
      case "elemental_bot_settings_get":
        return this.settings;
      case "elemental_bot_member_get": {
        const who = args[1] as string;
        if (!this.claimed.has(who)) return null;
        const t = this.teams.get(this.teamOf.get(who) ?? "");
        const team = this.live(t)
          ? {
              team_id: t.id,
              slot: t.slot,
              status: t.status,
              member_ids: [...this.teamOf].filter(([, id]) => id === t.id).map(([u]) => u),
            }
          : null;
        if (t && this.archiveAfterLookup === t.id) t.status = "archived";
        return { member_id: randomUUID(), already: true, is_staff: false, element_pick: null, team };
      }
      case "elemental_bot_award_badge": {
        const [, teamId, kind, ref] = args as [string, string, string, string];
        if (!this.live(this.teams.get(teamId))) throw new ElementalError("team_not_found");
        const key = `${teamId}|${kind}|${ref}`;
        const awarded = !this.badges.has(key);
        this.badges.add(key);
        return { team_id: teamId, kind, ref, awarded };
      }
      default:
        throw new Error(`unexpected ${fn}`);
    }
  }

  api(): ElementalApi {
    return {
      call: (async (fn: string, ...args: unknown[]) => this.call(fn, args)) as ElementalApi["call"],
      rows: (async (fn: string) => {
        throw new Error(`unexpected ${fn}`);
      }) as ElementalApi["rows"],
    };
  }

  fns(): string[] {
    return this.calls.map((c) => c.fn).filter((fn) => fn !== "elemental_bot_settings_get");
  }
}

// ---------------------------------------------------------------------------
// A fake gateway cache: guilds.cache.get(id).voiceStates.cache.
// ---------------------------------------------------------------------------

interface FakeVoiceState {
  id: string;
  channelId: string | null;
  member?: { user: { bot: boolean } } | null;
}

function fakeClient(states: FakeVoiceState[], o: { guildCached?: boolean } = {}) {
  const voice = new Map(states.map((s) => [s.id, s]));
  const guild = { voiceStates: { cache: voice } };
  return {
    user: { id: BOT },
    guilds: { cache: { get: (id: string) => (o.guildCached !== false && id === GUILD ? guild : undefined) } },
  };
}

const inVoice = (ids: string[], channelId = VOICE): FakeVoiceState[] => ids.map((id) => ({ id, channelId, member: { user: { bot: false } } }));

function setup(states: FakeVoiceState[] = [], o: { guildCached?: boolean; connected?: boolean } = {}) {
  const db = new FakeDb();
  const api = db.api();
  const client = fakeClient(states, o);
  const rt: ElementalRuntime = {
    client: client as unknown as Client,
    api,
    env: { guildIds: [GUILD], databaseUrl: "postgresql://stub", cardUrl: null, cardSecret: null },
    settings: createSettingsCache(api),
    queues: {
      channels: createKeyedQueue("channels", { sleep: async () => undefined }),
      canvas: createKeyedQueue("canvas", { sleep: async () => undefined }),
    },
    events: createEvents(),
    connected: () => o.connected !== false,
  };
  return { db, rt, client };
}

// ---------------------------------------------------------------------------
// A minimal /el badge-powerup interaction.
// ---------------------------------------------------------------------------

interface Opts {
  user?: string;
  roles?: string[];
  voice?: { id: string; type: ChannelType };
  session?: string;
}

function interaction(o: Opts = {}) {
  const sent: { how: string; payload: unknown }[] = [];
  const i: Record<string, unknown> = {
    guildId: GUILD,
    channelId: TEXT,
    user: { id: o.user ?? HOST },
    member: { roles: o.roles ?? [ROLE.host] },
    commandName: "el",
    deferred: false,
    replied: false,
    inGuild: () => true,
    isAutocomplete: () => false,
    isChatInputCommand: () => true,
    isMessageComponent: () => false,
    isModalSubmit: () => false,
    options: {
      getSubcommand: () => SUB,
      getChannel: () => o.voice ?? { id: VOICE, type: ChannelType.GuildVoice },
      getString: (name: string) => (name === "session" ? (o.session ?? null) : null),
    },
    deferReply: jest.fn(async (p: unknown) => {
      i.deferred = true;
      sent.push({ how: "deferReply", payload: p });
    }),
    reply: jest.fn(async (p: unknown) => {
      i.replied = true;
      sent.push({ how: "reply", payload: p });
    }),
    editReply: jest.fn(async (p: unknown) => {
      i.replied = true;
      sent.push({ how: "editReply", payload: p });
    }),
    followUp: jest.fn(async (p: unknown) => sent.push({ how: "followUp", payload: p })),
    deleteReply: jest.fn(async () => undefined),
  };
  return { i: i as never, sent };
}

const reg = buildRegistry([feature]);
const text = (p: unknown) => (typeof p === "string" ? p : String((p as { content?: string })?.content ?? ""));
const last = (sent: { how: string; payload: unknown }[]) => text(sent.filter((s) => s.how !== "deferReply").at(-1)?.payload);

async function run(rt: ElementalRuntime, o: Opts = {}) {
  const made = interaction(o);
  await handleElementalInteraction(rt, made.i, reg);
  return made;
}

let errorSpy: jest.SpyInstance;
beforeEach(() => {
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errorSpy.mockRestore());

// ---------------------------------------------------------------------------
// Registration and gate
// ---------------------------------------------------------------------------

describe("registration", () => {
  test("/el badge-powerup sits in the real /el, Host only, ephemeral, voice or stage channels only", () => {
    const el = registry().commands.find((c) => c.name === "el")!;
    const sub = (el.options ?? []).find((o) => o.name === SUB) as { options?: { name: string; type: number; channel_types?: number[]; description: string }[] };
    expect(sub).toBeDefined();
    expect(el.default_member_permissions).toBe(PermissionFlagsBits.ManageGuild.toString());
    const handler = registry().commandHandlers.get(`el ${SUB}`)!;
    expect(handler.gate).toEqual(["host"]);
    expect(handler.ack ?? "ephemeral").toBe("ephemeral");
    const voice = sub.options!.find((o) => o.name === "voice")!;
    expect(voice.type).toBe(ApplicationCommandOptionType.Channel);
    expect(voice.channel_types).toEqual([ChannelType.GuildVoice, ChannelType.GuildStageVoice]);
    for (const s of feature.staffSubcommands ?? []) {
      expect(s.description.length).toBeLessThanOrEqual(100);
      for (const o of s.options ?? []) expect(o.description.length).toBeLessThanOrEqual(100);
    }
  });

  test("a Helper, Judge, Safety or student is refused before any database call", async () => {
    for (const roles of [[ROLE.helper], [ROLE.judge], [ROLE.mentor, ROLE.safety], [ROLE.paid]]) {
      const { db, rt } = setup(inVoice([user(1), user(2)]));
      db.team(1, [user(1), user(2)]);
      const { sent } = await run(rt, { user: HELPER, roles });
      expect(sent[0]).toEqual({ how: "deferReply", payload: { flags: MessageFlags.Ephemeral } });
      expect(last(sent)).toBe(COMMON.staffOnly);
      expect(db.fns()).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// The snapshot and the badge
// ---------------------------------------------------------------------------

describe("/el badge-powerup", () => {
  test("two members of one team give one badge, written once for the team", async () => {
    const { db, rt } = setup(inVoice([user(1), user(2)]));
    const t = db.team(7, [user(1), user(2), user(3)]);
    const { sent } = await run(rt);

    const awards = db.calls.filter((c) => c.fn === "elemental_bot_award_badge");
    expect(awards).toHaveLength(1);
    expect(awards[0].args).toEqual([GUILD, t.id, BADGE_KIND, bangkokDay(), HOST]);
    expect(db.badges.size).toBe(1);
    // The teammate already seen is not looked up again.
    expect(db.calls.filter((c) => c.fn === "elemental_bot_member_get")).toHaveLength(1);
    expect(last(sent)).toContain(POWERUP.summary({ awarded: 1, already: 0, ref: bangkokDay() }));
    expect(last(sent)).toContain(POWERUP.awardedSlots([7]));
  });

  test("people on no team, unclaimed people, bots, the bot itself and other channels are ignored", async () => {
    const states: FakeVoiceState[] = [
      ...inVoice([user(1), user(4), user(5)]),
      { id: user(6), channelId: VOICE, member: { user: { bot: true } } },
      { id: BOT, channelId: VOICE, member: null },
      ...inVoice([user(2)], OTHER_VOICE),
      { id: user(3), channelId: null },
    ];
    const { db, rt } = setup(states);
    const a = db.team(3, [user(1)]);
    const b = db.team(9, [user(2), user(3)]);
    db.claimed.add(user(4)); // claimed but on no team
    // user(5) never claimed
    db.team(11, [user(6)]);

    const { sent } = await run(rt);
    const awarded = db.calls.filter((c) => c.fn === "elemental_bot_award_badge").map((c) => c.args[1]);
    expect(awarded).toEqual([a.id]);
    expect(awarded).not.toContain(b.id);
    const looked = db.calls.filter((c) => c.fn === "elemental_bot_member_get").map((c) => c.args[1]);
    expect(looked.sort()).toEqual([user(1), user(4), user(5)].sort());
    expect(last(sent)).toContain(POWERUP.notOnTeam(2));
  });

  test("a re-run of the same round is idempotent; a new session label is a new round", async () => {
    const { db, rt } = setup(inVoice([user(1), user(2), user(3)]));
    db.team(1, [user(1), user(2)]);
    db.team(2, [user(3)]);

    const first = await run(rt);
    expect(last(first.sent)).toContain(POWERUP.summary({ awarded: 2, already: 0, ref: bangkokDay() }));
    const second = await run(rt);
    expect(db.badges.size).toBe(2);
    expect(last(second.sent)).toContain(POWERUP.summary({ awarded: 0, already: 2, ref: bangkokDay() }));
    expect(last(second.sent)).not.toContain(POWERUP.awardedSlots([1]));

    const third = await run(rt, { session: " Round-2 " });
    expect(db.badges.size).toBe(4);
    expect(last(third.sent)).toContain(POWERUP.summary({ awarded: 2, already: 0, ref: `${bangkokDay()}:round-2` }));
  });

  test("no per-user row is written: the only write is one badge per team, and it carries no member id", async () => {
    const ids = [user(1), user(2), user(3), user(4), user(5)];
    const { db, rt } = setup(inVoice(ids));
    db.team(4, [user(1), user(2), user(3)]);
    db.team(5, [user(4), user(5)]);
    await run(rt);
    await run(rt);

    const fns = new Set(db.fns());
    expect([...fns].sort()).toEqual(["elemental_bot_award_badge", "elemental_bot_member_get"]);
    for (const c of db.calls.filter((x) => x.fn === "elemental_bot_award_badge")) {
      const [, , , ref, actor] = c.args as string[];
      expect(actor).toBe(HOST);
      for (const id of ids) expect(ref).not.toContain(id);
    }
    // One badge row per team, not per person, however often it runs.
    expect(db.badges.size).toBe(2);
  });

  test("a team archived between the lookup and the award is skipped, not an error", async () => {
    const { db, rt } = setup(inVoice([user(1), user(2)]));
    const gone = db.team(1, [user(1)]);
    db.team(2, [user(2)]);
    db.archiveAfterLookup = gone.id;
    const { sent } = await run(rt);
    expect(db.badges.size).toBe(1);
    expect(last(sent)).toContain(POWERUP.skipped(1));
  });

  test("an empty channel, an uncached guild, a reconnecting bot, a text channel or a bad label award nothing", async () => {
    const cases: [ReturnType<typeof setup>, Opts, string][] = [
      [setup([]), {}, POWERUP.empty],
      [setup(inVoice([user(1)]), { guildCached: false }), {}, POWERUP.voiceUnknown],
      [setup(inVoice([user(1)]), { connected: false }), {}, POWERUP.voiceUnknown],
      [setup(inVoice([user(1)])), { voice: { id: TEXT, type: ChannelType.GuildText } }, POWERUP.notVoice],
      [setup(inVoice([user(1)])), { session: "round two!" }, POWERUP.badSession],
    ];
    for (const [{ db, rt }, opts, expected] of cases) {
      db.team(1, [user(1), user(2)]);
      const { sent } = await run(rt, opts);
      expect(last(sent)).toBe(expected);
      expect(db.fns()).toEqual([]);
    }
  });

  test("a database refusal other than team_not_found is a generic error line", async () => {
    const { db, rt } = setup(inVoice([user(1)]));
    db.team(1, [user(1)]);
    const original = db.call.bind(db);
    db.call = (fn, args) => {
      if (fn === "elemental_bot_award_badge") throw new ElementalError("bad_kind");
      return original(fn, args);
    };
    const { sent } = await run(rt);
    expect(last(sent)).toBe(COMMON.failed);
  });
});

// ---------------------------------------------------------------------------
// Pure parts
// ---------------------------------------------------------------------------

describe("helpers", () => {
  test("powerupRef: the day, or day:label; bad labels refused", () => {
    expect(powerupRef("2026-12-05", null)).toBe("2026-12-05");
    expect(powerupRef("2026-12-05", "  ")).toBe("2026-12-05");
    expect(powerupRef("2026-12-05", "2")).toBe("2026-12-05:2");
    expect(powerupRef("2026-12-05", "Evening_1")).toBe("2026-12-05:evening_1");
    expect(powerupRef("2026-12-05", "a b")).toBeNull();
    expect(powerupRef("2026-12-05", "-x")).toBeNull();
    expect(powerupRef("2026-12-05", "x".repeat(41))).toBeNull();
    // Fits the badge ref's 100-character limit.
    expect(powerupRef("2026-12-05", "x".repeat(40))!.length).toBeLessThanOrEqual(100);
  });

  test("voiceMemberIds reads one channel of one guild from the cache", () => {
    const client = fakeClient([...inVoice([user(1), user(2)]), ...inVoice([user(3)], OTHER_VOICE)]);
    expect(voiceMemberIds(client, GUILD, VOICE)).toEqual([user(1), user(2)]);
    expect(voiceMemberIds(client, GUILD, OTHER_VOICE)).toEqual([user(3)]);
    expect(voiceMemberIds(client, OTHER_GUILD, VOICE)).toBeNull();
  });

  test("powerupSummary lists plot numbers only, capped", () => {
    const teams = Array.from({ length: MAX_LISTED + 5 }, (_, n) => ({ teamId: randomUUID(), slot: n + 1, awarded: true }));
    const out = powerupSummary({ teams, notOnTeam: 0, skipped: 0 }, "2026-12-05");
    expect(out).toContain(POWERUP.more(5));
    expect(out.length).toBeLessThan(2000);
    expect(out).not.toMatch(/\d{17,20}/);
  });
});
