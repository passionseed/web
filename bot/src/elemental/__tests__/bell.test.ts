/**
 * @jest-environment node
 */
import { Routes, type Client } from "discord.js";

import { ELEMENT_LABELS } from "../../../../lib/elemental/core/index";
import { healthFor } from "../../../../lib/elemental/island/healing";
import { renderIsland } from "../../../../lib/elemental/island/render";
import { buildElementalScene, type ElementalPlotInput } from "../../../../lib/elemental/island/scene";
import { ElementalError, type ElementalApi } from "../api";
import type { ElementalEventMap, ElementalRuntime } from "../context";
import { BELL } from "../copy/bell";
import { BELL_KIND, RETRY_DELAYS_MS, bellFor, bellNonce, feature, standingTarget, type Bell } from "../features/bell";
import { healthSettings, healthTotalsOfPlots } from "../features/schedule";
import { createRuntime } from "../index";
import { registry } from "../registry";

// Fixture ids only: no real guild, user, channel or school. Entry text is general words.
const GUILD = "100000000000000001";
const OTHER_GUILD = "100000000000000002";
const NEWS = "400000000000000002";
const LOGGER = "200000000000000001";
const FIRE_TEAM = "00000000-0000-4000-8000-00000000f001";
const WATER_TEAM = "00000000-0000-4000-8000-00000000a001";
const ARCHIVED_TEAM = "00000000-0000-4000-8000-00000000c001";
const ENTRY = "00000000-0000-4000-8000-0000000e0001";
const ENTRY_2 = "00000000-0000-4000-8000-0000000e0002";
const WATER_ENTRY = "00000000-0000-4000-8000-0000000e0003";
const ARCHIVED_ENTRY = "00000000-0000-4000-8000-0000000e0004";
const MISSING_ENTRY = "00000000-0000-4000-8000-0000000e0099";

const ENV = { guildIds: [GUILD], databaseUrl: "postgresql://stub:stub@127.0.0.1:5432/postgres", cardUrl: null, cardSecret: null };

const FIELDS = {
  who: "a cousin in a lower grade",
  tried: "looked for the quiz button",
  quote: "where is the start",
  changed: "moved the start button up",
};

interface Team {
  id: string;
  slot: number;
  element: string;
  project_name: string;
  status: "active" | "channel_pending" | "archived";
  lit: boolean;
}

interface Entry {
  id: string;
  team: string;
  removed: boolean;
}

interface PostRow {
  status: "claimed" | "sent" | "failed";
  messageId: string | null;
}

/** In-memory elemental_bot_* functions with the SQL semantics the bell relies on. */
function fakeDb(opts: { news?: string | null } = {}) {
  const settings = new Map<string, Record<string, unknown>>([
    [
      GUILD,
      {
        guild_id: GUILD,
        edition: "elemental-2026",
        edition_kind: "event",
        channel_ids: opts.news === null ? {} : { news: opts.news ?? NEWS },
        healing_enabled: false,
      },
    ],
  ]);
  const teams = new Map<string, Team>([
    [FIRE_TEAM, { id: FIRE_TEAM, slot: 7, element: "fire", project_name: "Canteen Map", status: "active", lit: true }],
    [WATER_TEAM, { id: WATER_TEAM, slot: 3, element: "water", project_name: "Bus Board", status: "active", lit: true }],
    [ARCHIVED_TEAM, { id: ARCHIVED_TEAM, slot: 12, element: "air", project_name: "Gone", status: "archived", lit: false }],
  ]);
  const entries = new Map<string, Entry>([
    [ENTRY, { id: ENTRY, team: FIRE_TEAM, removed: false }],
    [ENTRY_2, { id: ENTRY_2, team: FIRE_TEAM, removed: false }],
    [WATER_ENTRY, { id: WATER_ENTRY, team: WATER_TEAM, removed: false }],
    [ARCHIVED_ENTRY, { id: ARCHIVED_ENTRY, team: ARCHIVED_TEAM, removed: false }],
  ]);
  const posts = new Map<string, PostRow>();
  const calls: { fn: string; args: unknown[] }[] = [];
  const failNext = new Set<string>();
  const live = (t: Team) => t.status === "active" || t.status === "channel_pending";

  const impl = (fn: string, args: unknown[]): unknown => {
    if (failNext.has(fn)) {
      failNext.delete(fn);
      throw Object.assign(new Error("connection reset"), { code: "ECONNRESET" });
    }
    switch (fn) {
      case "elemental_bot_settings_get":
        return settings.get(String(args[0])) ?? null;
      case "elemental_bot_post_claim": {
        const key = `${args[1]}|${args[2]}`;
        const row = posts.get(key);
        if (!row || row.status === "failed") {
          posts.set(key, { status: "claimed", messageId: null });
          return true;
        }
        return false;
      }
      case "elemental_bot_post_mark": {
        const row = posts.get(`${args[1]}|${args[2]}`);
        if (row?.status !== "claimed") return false;
        row.status = args[3] as PostRow["status"];
        row.messageId = row.status === "sent" ? ((args[4] as string | null) ?? null) : null;
        return true;
      }
      case "elemental_bot_canvas_target": {
        const entry = entries.get(String(args[1]));
        if (!entry) throw new ElementalError("entry_not_found");
        const team = teams.get(entry.team)!;
        // As SQL builds it: the entry's fields come back too, and must never reach the post.
        return {
          entry_id: entry.id,
          kind: "test",
          source: "tester",
          team_id: team.id,
          slot: team.slot,
          element: team.element,
          project_name: team.project_name,
          live: live(team),
          removed: entry.removed,
          canvas_status: "none",
          fields: FIELDS,
          note_ids: { rect: "el-a", text: "el-b" },
          linked: false,
        };
      }
      case "elemental_bot_island_state":
        return [...teams.values()]
          .filter(live)
          .sort((a, b) => a.slot - b.slot)
          .map((t) => ({
            team_id: t.id,
            slot: t.slot,
            element: t.element,
            project_name: t.project_name,
            status: t.status,
            counted: [...entries.values()].filter((e) => e.team === t.id && !e.removed).length,
            lit: t.lit,
            badges: [],
          }));
      default:
        throw new Error(`unexpected ${fn}`);
    }
  };
  const api: ElementalApi = {
    call: jest.fn(async (fn: string, ...args: unknown[]) => {
      calls.push({ fn, args });
      return impl(fn, args) as never;
    }) as ElementalApi["call"],
    rows: jest.fn(async (fn: string, ...args: unknown[]) => {
      calls.push({ fn, args });
      return impl(fn, args) as never;
    }) as ElementalApi["rows"],
  };
  return { api, calls, posts, teams, entries, settings, failNext };
}

interface Sent {
  channelId: string;
  body: { content?: string; allowed_mentions?: unknown; nonce?: string; enforce_nonce?: boolean; attachments?: { description?: string }[] };
  files: { name: string; data: Buffer; contentType?: string }[];
}

let messageSeq = 0;

/** Discord REST: records posts; an enforced nonce repeat returns the first message (as Discord does). */
function fakeDiscord() {
  const sent: Sent[] = [];
  let failures = 0;
  const nonces = new Map<string, string>();
  const createDM = jest.fn();
  const post = jest.fn(async (route: string, opts: { body: Sent["body"]; files?: Sent["files"] }) => {
    if (failures > 0) {
      failures -= 1;
      throw Object.assign(new Error("Internal Server Error"), { status: 500 });
    }
    const nonce = opts.body.enforce_nonce ? opts.body.nonce : undefined;
    if (nonce && nonces.has(nonce)) return { id: nonces.get(nonce) };
    sent.push({ channelId: route.split("/")[2], body: opts.body, files: opts.files ?? [] });
    messageSeq += 1;
    const id = `7${String(messageSeq).padStart(17, "0")}`;
    if (nonce) nonces.set(nonce, id);
    return { id };
  });
  const client = { rest: { post }, users: { createDM } } as unknown as Client;
  return {
    client,
    sent,
    post,
    createDM,
    failFor(n: number) {
      failures = n;
    },
  };
}

function setup(opts: { news?: string | null } = {}) {
  const clock = { now: Date.UTC(2026, 11, 4, 13, 0, 0) };
  const db = fakeDb(opts);
  const discord = fakeDiscord();
  const runtime = (): ElementalRuntime => createRuntime({ client: discord.client, api: db.api, env: ENV });
  const rt = runtime();
  const bellOf = (r: ElementalRuntime = rt): Bell => bellFor(r, { now: () => clock.now, sleep: async () => undefined });
  const bell = bellOf();
  const first = (entryId = ENTRY, teamId = FIRE_TEAM): ElementalEventMap["tester.first"] => ({
    guildId: GUILD,
    edition: "elemental-2026",
    teamId,
    entryId,
  });
  return { clock, rt, runtime, bell, bellOf, first, ...db, ...discord };
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let errorSpy: jest.SpyInstance;
beforeEach(() => {
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errorSpy.mockRestore());

describe("the bell rings once per team", () => {
  test("the first event posts in news; a repeated event posts nothing", async () => {
    const s = setup();
    expect(await s.bell.ring(s.first())).toBe("sent");
    expect(await s.bell.ring(s.first())).toBe("skip");
    expect(s.sent).toHaveLength(1);
    expect(s.sent[0].channelId).toBe(NEWS);
    expect(s.posts.get(`${BELL_KIND}|${FIRE_TEAM}`)).toEqual({ status: "sent", messageId: expect.stringMatching(/^\d{17,20}$/) });
  });

  test("the claim is keyed by team: another entry of the same team (a relight's event) posts nothing once the bell went", async () => {
    const s = setup();
    await s.bell.ring(s.first(ENTRY));
    expect(await s.bell.ring(s.first(ENTRY_2))).toBe("skip");
    expect(s.sent).toHaveLength(1);
  });

  test("two events at once, and two bot processes on one database, post once", async () => {
    const s = setup();
    const other = s.bellOf(s.runtime());
    const results = await Promise.all([s.bell.ring(s.first()), s.bell.ring(s.first()), other.ring(s.first())]);
    expect(results.filter((r) => r === "sent")).toHaveLength(1);
    expect(s.sent).toHaveLength(1);
  });

  test("each team gets its own bell with its own nonce", async () => {
    const s = setup();
    await s.bell.ring(s.first(ENTRY, FIRE_TEAM));
    await s.bell.ring(s.first(WATER_ENTRY, WATER_TEAM));
    expect(s.sent).toHaveLength(2);
    expect(s.sent[0].body.nonce).not.toBe(s.sent[1].body.nonce);
    for (const m of s.sent) {
      expect(m.body.enforce_nonce).toBe(true);
      expect(m.body.nonce!.length).toBeLessThanOrEqual(25);
    }
    expect(bellNonce(GUILD, FIRE_TEAM)).toBe(bellNonce(GUILD, FIRE_TEAM));
    expect(bellNonce(GUILD, FIRE_TEAM)).not.toBe(bellNonce(OTHER_GUILD, FIRE_TEAM));
  });

  test("a failed send releases the claim and is retried later: still exactly one post", async () => {
    const s = setup();
    s.failFor(3); // every try of the first attempt fails
    expect(await s.bell.ring(s.first())).toBe("failed");
    expect(s.sent).toHaveLength(0);
    expect(s.posts.get(`${BELL_KIND}|${FIRE_TEAM}`)?.status).toBe("failed");
    expect(s.bell.pending()).toBe(1);

    // Not due yet.
    s.clock.now += RETRY_DELAYS_MS[0] - 1;
    await s.bell.retryDue();
    expect(s.sent).toHaveLength(0);

    s.clock.now += 1;
    await s.bell.retryDue();
    expect(s.sent).toHaveLength(1);
    expect(s.bell.pending()).toBe(0);

    // The event again, and another retry pass, change nothing.
    expect(await s.bell.ring(s.first())).toBe("skip");
    s.clock.now += RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    await s.bell.retryDue();
    expect(s.sent).toHaveLength(1);
  });

  test("a POST that reached Discord but errored is retried with the same nonce: Discord returns the first message", async () => {
    const s = setup();
    const nonce = bellNonce(GUILD, FIRE_TEAM);
    // Simulate a send that landed, then a lost answer: the nonce is already known to Discord.
    await s.client.rest.post(Routes.channelMessages(NEWS), { body: { content: "x", nonce, enforce_nonce: true } });
    expect(await s.bell.ring(s.first())).toBe("sent");
    expect(s.sent).toHaveLength(1);
  });

  test("a database failure before the claim is retried; retries stop after the last delay", async () => {
    const s = setup();
    s.failNext.add("elemental_bot_post_claim");
    expect(await s.bell.ring(s.first())).toBe("failed");
    expect(s.bell.pending()).toBe(1);
    s.clock.now += RETRY_DELAYS_MS[0];
    await s.bell.retryDue();
    expect(s.sent).toHaveLength(1);

    const t = setup();
    t.failFor(1_000);
    await t.bell.ring(t.first());
    for (const delay of RETRY_DELAYS_MS) {
      t.clock.now += delay;
      await t.bell.retryDue();
    }
    expect(t.sent).toHaveLength(0);
    expect(t.bell.pending()).toBe(0);
  });

  test("no news channel: nothing is claimed or sent, and the bell waits for a retry", async () => {
    const s = setup({ news: null });
    expect(await s.bell.ring(s.first())).toBe("failed");
    expect(s.sent).toHaveLength(0);
    expect(s.posts.size).toBe(0);
    expect(s.bell.pending()).toBe(1);
  });

  test("an event for another edition than the guild's is ignored", async () => {
    const s = setup();
    expect(await s.bell.ring({ ...s.first(), edition: "elemental-dryrun" })).toBe("skip");
    expect(s.sent).toHaveLength(0);
    expect(s.posts.size).toBe(0);
  });

  test("wired through the registry: 'tester.first' emitted twice posts once, and never a DM", async () => {
    const s = setup();
    expect(registry().features).toContain(feature);
    for (const [name, listener] of Object.entries(feature.events ?? {})) {
      s.rt.events.on(name as "tester.first", (p) => (listener as (p: unknown, r: ElementalRuntime) => Promise<void>)(p, s.rt));
    }
    await s.rt.events.emit("tester.first", s.first());
    await s.rt.events.emit("tester.first", s.first());
    expect(s.sent).toHaveLength(1);
    expect(s.createDM).not.toHaveBeenCalled();
  });
});

describe("a removed entry rings nothing", () => {
  test("removed before posting: no post, the claim is released, no retry", async () => {
    const s = setup();
    s.entries.get(ENTRY)!.removed = true;
    expect(await s.bell.ring(s.first())).toBe("removed");
    expect(s.sent).toHaveLength(0);
    expect(s.post).not.toHaveBeenCalled();
    expect(s.posts.get(`${BELL_KIND}|${FIRE_TEAM}`)?.status).toBe("failed");
    expect(s.bell.pending()).toBe(0);
  });

  test("removed between a failed send and its retry: the retry sends nothing", async () => {
    const s = setup();
    s.failFor(3);
    await s.bell.ring(s.first());
    s.entries.get(ENTRY)!.removed = true;
    s.clock.now += RETRY_DELAYS_MS[0];
    await s.bell.retryDue();
    expect(s.sent).toHaveLength(0);
    expect(s.bell.pending()).toBe(0);
  });

  test("after a removal the team's next first entry (the team relit) rings once", async () => {
    const s = setup();
    s.entries.get(ENTRY)!.removed = true;
    await s.bell.ring(s.first(ENTRY));
    expect(s.sent).toHaveLength(0);
    expect(await s.bell.ring(s.first(ENTRY_2))).toBe("sent");
    expect(await s.bell.ring(s.first(ENTRY_2))).toBe("skip");
    expect(s.sent).toHaveLength(1);
  });

  test("an archived team, or an entry the edition does not have, rings nothing", async () => {
    const s = setup();
    expect(await s.bell.ring(s.first(ARCHIVED_ENTRY, ARCHIVED_TEAM))).toBe("removed");
    expect(await s.bell.ring(s.first(MISSING_ENTRY, FIRE_TEAM))).toBe("removed");
    expect(s.sent).toHaveLength(0);
    expect(s.bell.pending()).toBe(0);
  });

  test("standingTarget refuses a removed entry, a dead team, another team or a missing plot", () => {
    const ok = { team_id: FIRE_TEAM, slot: 7, element: "fire", project_name: "Canteen Map", live: true, removed: false };
    expect(standingTarget(ok, FIRE_TEAM)).toEqual({ teamId: FIRE_TEAM, slot: 7, element: "fire", projectName: "Canteen Map" });
    expect(standingTarget({ ...ok, removed: true }, FIRE_TEAM)).toBeNull();
    expect(standingTarget({ ...ok, live: false }, FIRE_TEAM)).toBeNull();
    expect(standingTarget(ok, WATER_TEAM)).toBeNull();
    expect(standingTarget({ ...ok, slot: null }, FIRE_TEAM)).toBeNull();
    expect(standingTarget({ ...ok, element: "metal" }, FIRE_TEAM)).toBeNull();
    expect(standingTarget(null, FIRE_TEAM)).toBeNull();
  });
});

describe("the post", () => {
  test("its text has only the project, the plot number and the element", async () => {
    const s = setup();
    await s.bell.ring(s.first());
    const content = s.sent[0].body.content!;
    expect(content).toBe(BELL.post({ slot: 7, element: "fire", projectName: "Canteen Map" }));

    const [sign, ...rest] = content.split("\n");
    expect(sign).toBe(`07 · ${ELEMENT_LABELS.fire.th} · Canteen Map`);
    // The other line is fixed copy: the same for every team.
    expect(rest.join("\n")).toBe(BELL.post({ slot: 3, element: "water", projectName: "Bus Board" }).split("\n").slice(1).join("\n"));

    // Nothing of the entry, its logger, the team's or entry's ids.
    for (const word of [...Object.values(FIELDS), LOGGER, FIRE_TEAM, ENTRY, "<@", "@everyone"]) {
      expect(content).not.toContain(word);
    }
    expect(s.sent[0].body.allowed_mentions).toEqual({ parse: [] });
  });

  test("a project name cannot ping, show a mention or break the line", async () => {
    const s = setup();
    s.teams.get(FIRE_TEAM)!.project_name = "**Map** <@200000000000000001> @everyone\nline two 123456789012345678";
    await s.bell.ring(s.first());
    const content = s.sent[0].body.content!;
    expect(content.split("\n")[0]).toMatch(/^07 · /);
    expect(content).not.toContain("<@200000000000000001>");
    expect(content).not.toContain("123456789012345678");
    expect(content).toContain("\\*\\*Map\\*\\*");
    expect(content.split("\n")).toHaveLength(2);
    expect(s.sent[0].body.allowed_mentions).toEqual({ parse: [] });
  });

  test("the picture is the landscape island with the team's plot lit", async () => {
    const s = setup();
    // island_state has not caught up with the lantern yet: the bell lights it anyway.
    s.teams.get(FIRE_TEAM)!.lit = false;
    await s.bell.ring(s.first());
    const file = s.sent[0].files[0];
    expect(file.name).toBe("island.png");
    expect(file.data.subarray(0, 8).equals(PNG_SIG)).toBe(true);
    expect(file.data.readUInt32BE(16)).toBeGreaterThan(file.data.readUInt32BE(20)); // landscape
    expect(s.sent[0].body.attachments?.[0]?.description).toBe(BELL.islandAlt(7));

    const settings = (await s.rt.settings.get(GUILD))!;
    const draw = (fireLit: boolean) => {
      const plots: ElementalPlotInput[] = [
        { slot: 3, element: "water", counted: 1, lit: true, badges: 0 },
        { slot: 7, element: "fire", counted: 2, lit: fireLit, badges: 0 },
      ];
      return renderIsland(buildElementalScene(plots), { layout: "landscape", health: healthFor(healthTotalsOfPlots(plots), healthSettings(settings)) }).png;
    };
    expect(file.data.equals(draw(true))).toBe(true);
    expect(file.data.equals(draw(false))).toBe(false);
  });
});
