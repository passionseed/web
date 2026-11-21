/**
 * @jest-environment node
 */
import { ApplicationCommandOptionType, MessageFlags, Routes, type Client } from "discord.js";

import { ELEMENT_LABELS, atBangkok } from "../../../../lib/elemental/core/index";
import { CARD_HEIGHT, CARD_WIDTH } from "../../../../lib/elemental/island/card";
import { SECTOR_ORDER, candidateSlots } from "../../../../lib/elemental/island/sectors";
import type { ElementalApi } from "../api";
import type { ElementalRuntime, RepliableInteraction } from "../context";
import { COMMON } from "../copy/common";
import { SCHEDULE } from "../copy/schedule";
import {
  CARD_OVERRIDE,
  GROUP_KIND,
  MISSED_KIND,
  PART_KIND,
  POST_NOW,
  createScheduler,
  feature,
  messageLink,
  type FetchLike,
  type Scheduler,
} from "../features/schedule";
import { createRuntime, handleElementalInteraction } from "../index";
import { MAX_LEGEND_MESSAGES, MESSAGE_LIMIT, buildLegend, legendRows, oneLine } from "../legend";
import { registry } from "../registry";

// Fixture ids only: no real guild, user, role or channel.
const GUILD = "100000000000000001";
const REHEARSAL = "100000000000000002";
const HOST_USER = "200000000000000001";
const OTHER_USER = "200000000000000002";
const ROLE = { host: "300000000000000001", helper: "300000000000000002", judge: "300000000000000004" };
const CHANNEL = {
  start_here: "400000000000000001",
  news: "400000000000000002",
  mirror: "400000000000000003",
  reports: "400000000000000004",
  campfire: "400000000000000005",
};
const R_CHANNEL = {
  start_here: "410000000000000001",
  news: "410000000000000002",
  mirror: "410000000000000003",
  campfire: "410000000000000005",
};
const OVERRIDE_MESSAGE = "700000000000000099";
const EVENT_DAY = "2026-12-04";
const NEXT_DAY = "2026-12-05";
const REHEARSAL_DAY = "2026-12-02";

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
/** A tiny stand-in for an image a server returned (signature plus marker bytes). */
const WEB_PNG = Buffer.concat([PNG_SIG, Buffer.from("web-card")]);
const OVERRIDE_PNG = Buffer.concat([PNG_SIG, Buffer.from("hand-drawn")]);

const ENV = { guildIds: [GUILD, REHEARSAL], databaseUrl: "postgresql://stub:stub@127.0.0.1:5432/postgres", cardUrl: null, cardSecret: null };

type Schedule = Record<string, Record<string, string>>;

const EVENT_SCHEDULE: Schedule = {
  [EVENT_DAY]: { opening_at: "19:00", call_at: "19:55", card_at: "20:30" },
  [NEXT_DAY]: { call_at: "19:55", card_at: "20:30" },
};

function settingsRow(guildId: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  const rehearsal = guildId === REHEARSAL;
  return {
    guild_id: guildId,
    edition: rehearsal ? "elemental-dryrun" : "elemental-2026",
    edition_kind: rehearsal ? "rehearsal" : "event",
    role_ids: ROLE,
    channel_ids: rehearsal ? R_CHANNEL : CHANNEL,
    schedule: rehearsal ? { [REHEARSAL_DAY]: { call_at: "20:55", card_at: "21:00" } } : EVENT_SCHEDULE,
    healing_enabled: false,
    heal_per_team: 3,
    heal_steps: 5,
    card_override: null,
    ...over,
  };
}

/** Live teams, as elemental_bot_island_state returns them (no Discord ids). */
function islandRows(n: number, name: (k: number) => string = (k) => `Project ${k + 1}`) {
  const taken: number[] = [];
  return Array.from({ length: n }, (_, k) => {
    const element = SECTOR_ORDER[k % 5];
    const slot = candidateSlots(element, taken)[0];
    taken.push(slot);
    return { team_id: `00000000-0000-4000-8000-${String(k).padStart(12, "0")}`, slot, element, project_name: name(k), status: "active", counted: k % 9, lit: k % 2 === 0, badges: k % 3 ? ["lesson"] : [] };
  });
}

const TOTALS = {
  edition: "elemental-2026",
  day: EVENT_DAY,
  helped: 1234,
  helped_today: 56,
  checked_in: 27,
  teams_total: 30,
  top_element: "fire",
  levels: { water: 120, earth: 80, air: 45, fire: 300, aether: 0 },
  deltas: { water: 1, earth: 0, air: 0, fire: 9, aether: 0 },
  teams: { water: 6, earth: 6, air: 6, fire: 6, aether: 6 },
};

interface PostRow {
  status: "claimed" | "sent" | "failed";
  claimedAt: number;
}

/** In-memory elemental_bot_* functions with the SQL claim semantics (edition-scoped, lease takeover). */
function fakeDb(clock: { now: number }, opts: { teams?: number; names?: (k: number) => string } = {}) {
  const settings = new Map<string, Record<string, unknown>>([
    [GUILD, settingsRow(GUILD)],
    [REHEARSAL, settingsRow(REHEARSAL)],
  ]);
  const posts = new Map<string, PostRow>();
  const calls: { fn: string; args: unknown[] }[] = [];
  const rows = islandRows(opts.teams ?? 30, opts.names);
  const edition = (guild: unknown) => String(settings.get(String(guild))?.edition);
  const impl = (fn: string, args: unknown[]): unknown => {
    switch (fn) {
      case "elemental_bot_settings_get":
        return settings.get(String(args[0])) ?? null;
      case "elemental_bot_settings_set": {
        const row = settings.get(String(args[0]))!;
        settings.set(String(args[0]), { ...row, ...(args[2] as Record<string, unknown>) });
        return settings.get(String(args[0]));
      }
      case "elemental_bot_island_state":
        return rows;
      case "elemental_bot_totals":
        return { ...TOTALS, edition: args[0], day: args[1] };
      case "elemental_bot_post_claim": {
        const key = `${edition(args[0])}|${args[1]}|${args[2]}`;
        const lease = args[3] as number | null;
        const row = posts.get(key);
        const stale = row?.status === "claimed" && lease !== null && row.claimedAt < clock.now - lease * 1000;
        if (!row || row.status === "failed" || stale) {
          posts.set(key, { status: "claimed", claimedAt: clock.now });
          return true;
        }
        return false;
      }
      case "elemental_bot_post_mark": {
        const key = `${edition(args[0])}|${args[1]}|${args[2]}`;
        const row = posts.get(key);
        if (row?.status !== "claimed") return false;
        row.status = args[3] as "sent" | "failed";
        return true;
      }
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
  return { api, calls, posts, settings, rows };
}

interface Sent {
  channelId: string;
  body: { content?: string; allowed_mentions?: unknown; nonce?: string; enforce_nonce?: boolean; attachments?: unknown[] };
  files: { name: string; data: Buffer; contentType?: string }[];
}

let messageSeq = 0;

/**
 * Discord REST only: posts are recorded, a channel can be made to fail. Like
 * Discord, an enforced nonce is unique per author (the one bot) across every
 * channel and guild: a repeat returns the first message and posts nothing.
 */
function fakeDiscord() {
  const sent: Sent[] = [];
  const failing = new Set<string>();
  const nonces = new Map<string, string>();
  const createDM = jest.fn();
  const post = jest.fn(async (route: string, opts: { body: Sent["body"]; files?: Sent["files"] }) => {
    const channelId = route.split("/")[2];
    if (failing.has(channelId)) throw Object.assign(new Error("Internal Server Error"), { status: 500 });
    const nonce = opts.body.enforce_nonce ? opts.body.nonce : undefined;
    if (nonce && nonces.has(nonce)) return { id: nonces.get(nonce) };
    sent.push({ channelId, body: opts.body, files: opts.files ?? [] });
    messageSeq += 1;
    const id = `7${String(messageSeq).padStart(17, "0")}`;
    if (nonce) nonces.set(nonce, id);
    return { id };
  });
  const get = jest.fn(async (route: string) => {
    if (route === Routes.channelMessage(CHANNEL.mirror, OVERRIDE_MESSAGE)) {
      return { attachments: [{ url: "https://cdn.discordapp.com/attachments/1/2/override.png?ex=fresh", content_type: "image/png" }] };
    }
    throw Object.assign(new Error("Unknown Message"), { status: 404 });
  });
  const client = { rest: { post, get }, users: { createDM } } as unknown as Client;
  return { client, sent, failing, post, get, createDM };
}

function pngResponse(bytes: Buffer, type = "image/png"): Response {
  return new Response(new Uint8Array(bytes), { status: 200, headers: { "content-type": type, "content-length": String(bytes.length) } });
}

function setup(opts: { teams?: number; names?: (k: number) => string; env?: Partial<typeof ENV> & { cardUrl?: string | null; cardSecret?: string | null }; fetch?: FetchLike } = {}) {
  const clock = { now: atBangkok(EVENT_DAY, "18:00").getTime() };
  const db = fakeDb(clock, opts);
  const discord = fakeDiscord();
  const fetchFn: jest.Mock = jest.fn(opts.fetch ?? (async () => new Response("nope", { status: 500 })));
  function runtime(): ElementalRuntime {
    return createRuntime({ client: discord.client, api: db.api, env: { ...ENV, ...opts.env } as typeof ENV });
  }
  const rt = runtime();
  const scheduler = (r: ElementalRuntime = rt): Scheduler =>
    createScheduler(r, { now: () => clock.now, sleep: async () => undefined, fetch: fetchFn as unknown as FetchLike });
  const at = (day: string, time: string, seconds = 0) => {
    clock.now = atBangkok(day, time).getTime() + seconds * 1000;
  };
  return { clock, at, rt, runtime, scheduler, fetchFn, ...db, ...discord };
}

function pngSize(data: Buffer): { width: number; height: number } {
  expect(data.subarray(0, 8).equals(PNG_SIG)).toBe(true);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

const inChannel = (sent: Sent[], channelId: string) => sent.filter((s) => s.channelId === channelId);
const cards = (sent: Sent[]) => sent.filter((s) => s.files.some((f) => f.name.startsWith("card.")));

let errorSpy: jest.SpyInstance;
beforeEach(() => {
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => errorSpy.mockRestore());

describe("the 20:30 card", () => {
  test("20:29:59 sends nothing; 20:30 sends the card once; later polls do not repeat it", async () => {
    const s = setup();
    const poller = s.scheduler();
    s.at(EVENT_DAY, "20:29", 59);
    // Opening and call are due earlier; only look at the card here.
    await poller.tick();
    expect(cards(s.sent)).toHaveLength(0);

    s.at(EVENT_DAY, "20:30");
    await poller.tick();
    expect(cards(s.sent)).toHaveLength(1);

    for (const sec of [30, 60, 600]) {
      s.at(EVENT_DAY, "20:30", sec);
      await poller.tick();
    }
    expect(cards(s.sent)).toHaveLength(1);
    const card = cards(s.sent)[0];
    expect(card.channelId).toBe(CHANNEL.news);
    expect(pngSize(card.files[0].data)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
    expect(card.body.allowed_mentions).toEqual({ parse: [] });
    expect(card.body.enforce_nonce).toBe(true);
    expect(card.body.nonce!.length).toBeLessThanOrEqual(25);
  });

  test("13:30Z is 20:30 Bangkok", async () => {
    const s = setup();
    const poller = s.scheduler();
    s.clock.now = Date.UTC(2026, 11, 4, 13, 29, 59);
    await poller.tick();
    expect(cards(s.sent)).toHaveLength(0);
    s.clock.now = Date.UTC(2026, 11, 4, 13, 30, 0);
    await poller.tick();
    expect(cards(s.sent)).toHaveLength(1);
  });

  test("the caption carries the totals as text (helped, check-ins, top element, levels)", async () => {
    const s = setup();
    s.at(EVENT_DAY, "20:30");
    await s.scheduler().tick();
    const caption = cards(s.sent)[0].body.content!;
    expect(caption).toContain("1234");
    expect(caption).toContain("+56");
    expect(caption).toContain("27");
    expect(caption).toContain(ELEMENT_LABELS.fire.th);
    expect(caption).toContain("300");
    expect(s.calls.find((c) => c.fn === "elemental_bot_totals")?.args).toEqual(["elemental-2026", EVENT_DAY]);
  });

  test("a restart at 20:31 does not post the card again, and no missed note follows", async () => {
    const s = setup();
    s.at(EVENT_DAY, "20:30");
    await s.scheduler().tick();
    expect(cards(s.sent)).toHaveLength(1);

    const restarted = s.scheduler(s.runtime());
    for (const time of ["20:31", "20:45", "20:50"]) {
      s.at(EVENT_DAY, time);
      await restarted.tick();
    }
    expect(cards(s.sent)).toHaveLength(1);
    expect(inChannel(s.sent, CHANNEL.mirror)).toHaveLength(0);
  });

  test("two pollers at 20:30 post once", async () => {
    const s = setup();
    const a = s.scheduler();
    const b = s.scheduler(s.runtime());
    s.at(EVENT_DAY, "20:30");
    await Promise.all([a.tick(), b.tick(), a.tick(), b.tick()]);
    expect(cards(s.sent)).toHaveLength(1);
    // Every scheduled message of the evening went exactly once.
    const nonces = s.sent.map((m) => m.body.nonce);
    expect(new Set(nonces).size).toBe(nonces.length);
  });

  test("a day not in the schedule is silent", async () => {
    const s = setup();
    const poller = s.scheduler();
    for (const time of ["19:00", "19:55", "20:30", "21:00"]) {
      s.at("2026-12-10", time);
      await poller.tick();
    }
    expect(s.sent).toHaveLength(0);
    expect(s.calls.filter((c) => c.fn !== "elemental_bot_settings_get")).toHaveLength(0);
  });

  test("the rehearsal guild and the real guild follow their own schedules", async () => {
    const s = setup();
    const poller = s.scheduler();
    s.at(REHEARSAL_DAY, "20:30");
    await poller.tick();
    expect(s.sent).toHaveLength(0);

    s.at(REHEARSAL_DAY, "21:00");
    await poller.tick();
    expect(cards(s.sent)).toHaveLength(1);
    expect(cards(s.sent)[0].channelId).toBe(R_CHANNEL.news);
    expect(s.sent.every((m) => (Object.values(R_CHANNEL) as string[]).includes(m.channelId))).toBe(true);
    expect(s.calls.find((c) => c.fn === "elemental_bot_totals")?.args).toEqual(["elemental-dryrun", REHEARSAL_DAY]);

    s.at(EVENT_DAY, "20:30");
    await poller.tick();
    expect(cards(inChannel(s.sent, CHANNEL.news))).toHaveLength(1);
    expect(cards(s.sent)).toHaveLength(2);
  });

  test("the real and rehearsal guilds both post when their schedules share a day and time", async () => {
    const s = setup();
    s.settings.set(REHEARSAL, settingsRow(REHEARSAL, { schedule: EVENT_SCHEDULE }));
    const poller = s.scheduler();
    for (const time of ["19:00", "19:55", "20:30"]) {
      s.at(EVENT_DAY, time);
      await poller.tick();
    }
    expect(cards(inChannel(s.sent, CHANNEL.news))).toHaveLength(1);
    expect(cards(inChannel(s.sent, R_CHANNEL.news))).toHaveLength(1);
    expect(inChannel(s.sent, CHANNEL.campfire).length).toBe(inChannel(s.sent, R_CHANNEL.campfire).length);
    expect(inChannel(s.sent, R_CHANNEL.news)).toHaveLength(3);
    for (const m of s.sent) expect(m.body.nonce!.length).toBeLessThanOrEqual(25);
  });

  test("changing card_at moves the post", async () => {
    const s = setup();
    const poller = s.scheduler();
    s.settings.set(GUILD, settingsRow(GUILD, { schedule: { [EVENT_DAY]: { call_at: "19:55", card_at: "21:00" } } }));
    s.rt.settings.invalidate(GUILD);
    s.at(EVENT_DAY, "20:30");
    await poller.tick();
    expect(cards(s.sent)).toHaveLength(0);
    s.at(EVENT_DAY, "20:59", 59);
    await poller.tick();
    expect(cards(s.sent)).toHaveLength(0);
    s.at(EVENT_DAY, "21:00");
    await poller.tick();
    expect(cards(s.sent)).toHaveLength(1);
  });
});

describe("card sources", () => {
  const webEnv = { cardUrl: "https://card.example.test/api/elemental/card", cardSecret: "test-secret" };

  test("the web card is used when ELEMENTAL_CARD_URL answers a PNG: secret header, edition and day, a timeout signal", async () => {
    const s = setup({ env: webEnv, fetch: async () => pngResponse(WEB_PNG) });
    s.at(EVENT_DAY, "20:30");
    await s.scheduler().tick();
    expect(cards(s.sent)[0].files[0].data.equals(WEB_PNG)).toBe(true);
    const [url, init] = s.fetchFn.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe("https://card.example.test/api/elemental/card?edition=elemental-2026&day=2026-12-04");
    expect((init.headers as Record<string, string>)["x-elemental-card-secret"]).toBe("test-secret");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  test("a failed web card falls back to the pixel card", async () => {
    for (const answer of [
      async () => new Response("down", { status: 503 }),
      async () => {
        throw Object.assign(new Error("timed out"), { name: "TimeoutError" });
      },
      async () => pngResponse(Buffer.from("<html>"), "text/html"),
    ]) {
      const s = setup({ env: webEnv, fetch: answer });
      s.at(EVENT_DAY, "20:30");
      await s.scheduler().tick();
      expect(s.fetchFn).toHaveBeenCalled();
      expect(pngSize(cards(s.sent)[0].files[0].data)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
    }
  });

  test("no card URL: the pixel card, and nothing is fetched", async () => {
    const s = setup();
    s.at(EVENT_DAY, "20:30");
    await s.scheduler().tick();
    expect(s.fetchFn).not.toHaveBeenCalled();
    expect(pngSize(cards(s.sent)[0].files[0].data)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
  });

  test("the override applies to its day only (card and opening), re-reading the kept message for a fresh link", async () => {
    const s = setup({ fetch: async () => pngResponse(OVERRIDE_PNG) });
    s.settings.set(GUILD, settingsRow(GUILD, { card_override: { day: EVENT_DAY, url: messageLink(GUILD, CHANNEL.mirror, OVERRIDE_MESSAGE) } }));
    const poller = s.scheduler();
    s.at(EVENT_DAY, "19:00");
    await poller.tick();
    const opening = inChannel(s.sent, CHANNEL.news)[0];
    expect(opening.files[0].data.equals(OVERRIDE_PNG)).toBe(true);
    expect(s.get).toHaveBeenCalledWith(Routes.channelMessage(CHANNEL.mirror, OVERRIDE_MESSAGE));
    expect(String(s.fetchFn.mock.calls[0][0])).toContain("ex=fresh");

    s.at(EVENT_DAY, "20:30");
    await poller.tick();
    expect(cards(s.sent)[0].files[0].data.equals(OVERRIDE_PNG)).toBe(true);

    s.at(NEXT_DAY, "20:30");
    await poller.tick();
    const next = cards(s.sent)[1];
    expect(pngSize(next.files[0].data)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
  });
});

describe("opening and campfire call", () => {
  test("opening at 19:00: the news post with the island and the /join and picker steps", async () => {
    const s = setup();
    s.at(EVENT_DAY, "18:59", 59);
    const poller = s.scheduler();
    await poller.tick();
    expect(s.sent).toHaveLength(0);
    s.at(EVENT_DAY, "19:00");
    await poller.tick();
    expect(s.sent).toHaveLength(1);
    const post = s.sent[0];
    expect(post.channelId).toBe(CHANNEL.news);
    expect(post.body.content).toContain("/join");
    expect(post.body.content).toContain(`<#${CHANNEL.start_here}>`);
    expect(pngSize(post.files[0].data)).toEqual({ width: 1600, height: 896 });
  });

  test("call at 19:55: news call with the campfire link; island and legend in the campfire chat", async () => {
    const s = setup();
    const poller = s.scheduler();
    s.at(EVENT_DAY, "19:55");
    await poller.tick();
    const call = inChannel(s.sent, CHANNEL.news).find((m) => m.body.content === SCHEDULE.call(CHANNEL.campfire));
    expect(call).toBeDefined();
    const campfire = inChannel(s.sent, CHANNEL.campfire);
    expect(pngSize(campfire[0].files[0].data)).toEqual({ width: 1600, height: 896 });
    const legend = campfire.slice(1).map((m) => m.body.content).join("\n");
    for (const row of s.rows) {
      expect(legend).toContain(`${String(row.slot).padStart(2, "0")} · ${ELEMENT_LABELS[row.element].th} · ${row.project_name}`);
    }
  });

  test("the call is not sent once the campfire is an hour in", async () => {
    const s = setup();
    s.at(EVENT_DAY, "20:56");
    await s.scheduler().tick();
    expect(inChannel(s.sent, CHANNEL.campfire)).toHaveLength(0);
  });

  test("a campfire message that failed is resent alone; the others are not repeated", async () => {
    const s = setup();
    const poller = s.scheduler();
    s.failing.add(CHANNEL.campfire);
    s.at(EVENT_DAY, "19:55");
    await poller.tick();
    expect(inChannel(s.sent, CHANNEL.news).filter((m) => m.body.content === SCHEDULE.call(CHANNEL.campfire))).toHaveLength(1);
    s.failing.delete(CHANNEL.campfire);
    s.at(EVENT_DAY, "19:55", 30);
    await poller.tick();
    s.at(EVENT_DAY, "19:56");
    await poller.tick();
    expect(inChannel(s.sent, CHANNEL.news).filter((m) => m.body.content === SCHEDULE.call(CHANNEL.campfire))).toHaveLength(1);
    expect(inChannel(s.sent, CHANNEL.campfire).filter((m) => m.files.some((f) => f.name.startsWith("island")))).toHaveLength(1);
  });
});

describe("missed posts", () => {
  test("a post still unsent 15 minutes after its time gives exactly one staff note, across polls and a restart", async () => {
    const s = setup();
    s.failing.add(CHANNEL.news);
    const poller = s.scheduler();
    for (let sec = 0; sec <= 40 * 60; sec += 30) {
      s.at(EVENT_DAY, "20:30", sec);
      await poller.tick();
    }
    const restarted = s.scheduler(s.runtime());
    for (let sec = 41 * 60; sec <= 60 * 60; sec += 30) {
      s.at(EVENT_DAY, "20:30", sec);
      await restarted.tick();
    }
    const notes = inChannel(s.sent, CHANNEL.mirror).filter((m) => m.body.content?.includes(SCHEDULE.postName.card));
    expect(notes).toHaveLength(1);
    expect(notes[0].body.content).toContain(`<@&${ROLE.host}>`);
    expect(notes[0].body.allowed_mentions).toEqual({ parse: [], roles: [ROLE.host] });
    // The post kept being retried after the note.
    const attempts = s.post.mock.calls.filter(([route]) => route === Routes.channelMessages(CHANNEL.news)).length;
    expect(attempts).toBeGreaterThan(20);
    // And once Discord answers again, the card goes, once.
    s.failing.delete(CHANNEL.news);
    s.at(EVENT_DAY, "21:31");
    await restarted.tick();
    s.at(EVENT_DAY, "21:32");
    await restarted.tick();
    expect(cards(s.sent)).toHaveLength(1);
    expect(inChannel(s.sent, CHANNEL.mirror).filter((m) => m.body.content?.includes(SCHEDULE.postName.card))).toHaveLength(1);
  });

  test("no note at 14:59 after the time; the note at 15:00 when the bot was down for the post", async () => {
    const s = setup();
    s.failing.add(CHANNEL.news);
    const poller = s.scheduler();
    s.at(EVENT_DAY, "20:44", 59);
    await poller.tick();
    expect(inChannel(s.sent, CHANNEL.mirror).filter((m) => m.body.content?.includes(SCHEDULE.postName.card))).toHaveLength(0);
    s.at(EVENT_DAY, "20:45");
    await poller.tick();
    expect(inChannel(s.sent, CHANNEL.mirror).filter((m) => m.body.content?.includes(SCHEDULE.postName.card))).toHaveLength(1);
    expect([...s.posts.keys()]).toContain(`elemental-2026|${MISSED_KIND}|card:${EVENT_DAY}`);
  });

  test("a claim left by a crash shortly before the check is taken over once its lease passes: one note, one card", async () => {
    const s = setup();
    // A poller claimed the card at 20:40 (after earlier failures) and died before sending.
    s.at(EVENT_DAY, "20:40");
    s.posts.set(`elemental-2026|${GROUP_KIND.card}|${EVENT_DAY}`, { status: "claimed", claimedAt: s.clock.now });
    const restarted = s.scheduler(s.runtime());
    for (let sec = 60; sec <= 15 * 60; sec += 30) {
      s.at(EVENT_DAY, "20:40", sec);
      await restarted.tick();
    }
    const notes = inChannel(s.sent, CHANNEL.mirror).filter((m) => m.body.content?.includes(SCHEDULE.postName.card));
    expect(notes).toHaveLength(1);
    expect(cards(s.sent)).toHaveLength(1);
    expect(s.posts.get(`elemental-2026|${GROUP_KIND.card}|${EVENT_DAY}`)?.status).toBe("sent");
  });

  test("a post that went on time never gets a note", async () => {
    const s = setup();
    const poller = s.scheduler();
    for (const time of ["19:00", "19:55", "20:30", "20:45", "21:00", "22:00"]) {
      s.at(EVENT_DAY, time);
      await poller.tick();
    }
    expect(inChannel(s.sent, CHANNEL.mirror)).toHaveLength(0);
    expect(s.posts.get(`elemental-2026|${GROUP_KIND.card}|${EVENT_DAY}`)?.status).toBe("sent");
    expect(s.posts.get(`elemental-2026|${PART_KIND.card}|${EVENT_DAY}`)?.status).toBe("sent");
  });
});

describe("the legend", () => {
  test("175 teams: every slot, element and project, no message over 2,000 characters, never an id", () => {
    const names = (k: number) => `${"*_~|`>".repeat(3)}${"x".repeat(30)} ${k} <@${"2".repeat(18)}>`;
    const rows = legendRows(islandRows(175, names));
    expect(rows).toHaveLength(175);
    const legend = buildLegend(rows);
    const texts = legend.kind === "messages" ? legend.messages : [legend.summary, legend.file.data.toString("utf8")];
    if (legend.kind === "messages") {
      expect(legend.messages.length).toBeLessThanOrEqual(MAX_LEGEND_MESSAGES);
      for (const m of legend.messages) expect(m.length).toBeLessThanOrEqual(MESSAGE_LIMIT);
    } else {
      expect(legend.summary.length).toBeLessThanOrEqual(MESSAGE_LIMIT);
    }
    const all = texts.join("\n");
    for (const row of rows) {
      expect(all).toContain(`${String(row.slot).padStart(2, "0")} · ${ELEMENT_LABELS[row.element].th} · `);
    }
    expect(all).not.toMatch(/\d{17,}/);
    expect(all).not.toMatch(/<@/);
  });

  test("175 teams with short names fit in messages of at most 2,000 characters", () => {
    const rows = legendRows(islandRows(175, (k) => `Team project ${k}`));
    const legend = buildLegend(rows);
    expect(legend.kind).toBe("messages");
    if (legend.kind !== "messages") return;
    expect(legend.messages.length).toBeGreaterThan(1);
    for (const m of legend.messages) expect(m.length).toBeLessThanOrEqual(MESSAGE_LIMIT);
    expect(legend.messages.join("\n").split("\n")).toHaveLength(175);
  });

  test("past 6 messages the legend goes as a .txt file", () => {
    const rows = legendRows(islandRows(175, (k) => `${"long project name ".repeat(3)}${k}`.slice(0, 60)));
    const legend = buildLegend(rows);
    expect(legend.kind).toBe("file");
    if (legend.kind !== "file") return;
    expect(legend.file.name).toBe("legend.txt");
    expect(legend.file.data.toString("utf8").trim().split("\n")).toHaveLength(175);
  });

  test("a name is one line, without mention tokens or long digit runs", () => {
    expect(oneLine("a\nb\tc  d")).toBe("a b c d");
    expect(oneLine(`hi <@${"1".repeat(18)}> <#${"3".repeat(19)}>`)).toBe("hi @ @");
    expect(oneLine("x".repeat(80))).toHaveLength(60);
  });

  test("the scheduled call sends the long legend as one file in the campfire chat, every message under 2,000", async () => {
    const s = setup({ teams: 175, names: (k) => `${"long project name ".repeat(3)}${k}`.slice(0, 60) });
    s.at(EVENT_DAY, "19:55");
    await s.scheduler().tick();
    const campfire = inChannel(s.sent, CHANNEL.campfire);
    expect(campfire).toHaveLength(2);
    expect(campfire[1].files[0].name).toBe("legend.txt");
    for (const m of s.sent) expect((m.body.content ?? "").length).toBeLessThanOrEqual(MESSAGE_LIMIT);
  });
});

// ---------------------------------------------------------------------------
// Host tools
// ---------------------------------------------------------------------------

function staffInteraction(sub: string, opts: Record<string, unknown>, roles: string[]) {
  const replies: unknown[] = [];
  const i: Record<string, unknown> = {
    guildId: GUILD,
    channelId: CHANNEL.mirror,
    user: { id: roles.includes(ROLE.host) ? HOST_USER : OTHER_USER },
    member: { roles },
    commandName: "el",
    deferred: false,
    replied: false,
    inGuild: () => true,
    isAutocomplete: () => false,
    isChatInputCommand: () => true,
    isMessageComponent: () => false,
    isModalSubmit: () => false,
    options: {
      getSubcommand: () => sub,
      getString: (name: string) => (opts[name] as string | undefined) ?? null,
      getAttachment: (name: string) => opts[name] ?? null,
    },
    deferReply: jest.fn(async () => {
      i.deferred = true;
    }),
    editReply: jest.fn(async (p: unknown) => {
      i.replied = true;
      replies.push(p);
    }),
    reply: jest.fn(async (p: unknown) => {
      i.replied = true;
      replies.push(p);
    }),
    followUp: jest.fn(async (p: unknown) => replies.push(p)),
    deleteReply: jest.fn(async () => undefined),
  };
  return { i: i as unknown as RepliableInteraction & Record<string, jest.Mock>, replies };
}

const text = (p: unknown) => (typeof p === "string" ? p : (p as { content?: string })?.content ?? "");

describe("/el post-now and /el card-override", () => {
  test("both are /el subcommands for Host only", () => {
    const el = registry().commands.find((c) => c.name === "el")!;
    const subs = (el.options ?? []).map((o) => o.name);
    expect(subs).toEqual(expect.arrayContaining([POST_NOW, CARD_OVERRIDE]));
    const override = feature.staffSubcommands!.find((s) => s.name === CARD_OVERRIDE)!;
    expect(override.options!.map((o) => [o.name, o.type])).toEqual([
      ["image", ApplicationCommandOptionType.Attachment],
      ["day", ApplicationCommandOptionType.String],
    ]);
    expect(registry().commandHandlers.get(`el ${POST_NOW}`)?.gate).toEqual([]);
    expect(registry().commandHandlers.get(`el ${CARD_OVERRIDE}`)?.gate).toEqual([]);
  });

  test("Helper and Judge are refused post-now, ephemerally, and nothing is posted", async () => {
    for (const role of [ROLE.helper, ROLE.judge]) {
      const s = setup();
      s.scheduler();
      const { i, replies } = staffInteraction(POST_NOW, { kind: "card" }, [role]);
      await handleElementalInteraction(s.rt, i as never);
      expect(i.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
      expect(text(replies[0])).toBe(COMMON.staffOnly);
      expect(s.sent).toHaveLength(0);
    }
  });

  test("post-now after a missed card sends it and stops the scheduled retry", async () => {
    const s = setup();
    const poller = s.scheduler();
    s.failing.add(CHANNEL.news);
    s.at(EVENT_DAY, "20:30");
    await poller.tick();
    s.failing.delete(CHANNEL.news);
    s.at(EVENT_DAY, "20:31");
    const { i, replies } = staffInteraction(POST_NOW, { kind: "card" }, [ROLE.host]);
    // The poller had already retried; make it fail so the manual post is the one that lands.
    s.posts.set(`elemental-2026|${GROUP_KIND.card}|${EVENT_DAY}`, { status: "failed", claimedAt: s.clock.now });
    await handleElementalInteraction(s.rt, i as never);
    expect(text(replies[0])).toBe(SCHEDULE.postNowDone(SCHEDULE.postName.card, CHANNEL.news));
    expect(cards(s.sent)).toHaveLength(1);
    s.at(EVENT_DAY, "20:32");
    await poller.tick();
    expect(cards(s.sent)).toHaveLength(1);
  });

  test("post-now legend posts the island and legend in the campfire chat", async () => {
    const s = setup();
    s.scheduler();
    s.at(EVENT_DAY, "19:30");
    const { i, replies } = staffInteraction(POST_NOW, { kind: "legend" }, [ROLE.host]);
    await handleElementalInteraction(s.rt, i as never);
    expect(text(replies[0])).toBe(SCHEDULE.postNowDone(SCHEDULE.postName.legend, CHANNEL.campfire));
    expect(inChannel(s.sent, CHANNEL.campfire).length).toBeGreaterThanOrEqual(2);
    expect(inChannel(s.sent, CHANNEL.news)).toHaveLength(0);
  });

  test("card-override keeps the image in the staff channel and stores that message's link for the day", async () => {
    const s = setup({ fetch: async () => pngResponse(OVERRIDE_PNG) });
    s.scheduler();
    s.at(EVENT_DAY, "12:00");
    const image = { url: "https://cdn.discordapp.com/ephemeral-attachments/1/2/sick.png?ex=1", contentType: "image/png", size: OVERRIDE_PNG.length };
    const { i, replies } = staffInteraction(CARD_OVERRIDE, { image, day: NEXT_DAY }, [ROLE.host]);
    await handleElementalInteraction(s.rt, i as never);
    expect(text(replies[0])).toBe(SCHEDULE.overrideSet(NEXT_DAY));
    const kept = inChannel(s.sent, CHANNEL.mirror)[0];
    expect(kept.files[0].data.equals(OVERRIDE_PNG)).toBe(true);
    const set = s.calls.find((c) => c.fn === "elemental_bot_settings_set")!;
    const patch = set.args[2] as { card_override: { day: string; url: string } };
    expect(set.args.slice(0, 2)).toEqual([GUILD, HOST_USER]);
    expect(patch.card_override.day).toBe(NEXT_DAY);
    expect(patch.card_override.url).toMatch(new RegExp(`^https://discord\\.com/channels/${GUILD}/${CHANNEL.mirror}/\\d{18}$`));
  });

  test("card-override without an image clears it; a bad day or a non-image is refused without a write", async () => {
    const s = setup();
    s.scheduler();
    const clear = staffInteraction(CARD_OVERRIDE, {}, [ROLE.host]);
    await handleElementalInteraction(s.rt, clear.i as never);
    expect(text(clear.replies[0])).toBe(SCHEDULE.overrideCleared);
    expect(s.calls.filter((c) => c.fn === "elemental_bot_settings_set").map((c) => c.args[2])).toEqual([{ card_override: null }]);

    const badDay = staffInteraction(CARD_OVERRIDE, { day: "04/12/2026" }, [ROLE.host]);
    await handleElementalInteraction(s.rt, badDay.i as never);
    expect(text(badDay.replies[0])).toBe(SCHEDULE.overrideBadDay);

    const pdf = staffInteraction(CARD_OVERRIDE, { image: { url: "https://cdn.discordapp.com/x.pdf", contentType: "application/pdf", size: 10 } }, [ROLE.host]);
    await handleElementalInteraction(s.rt, pdf.i as never);
    expect(text(pdf.replies[0])).toBe(SCHEDULE.overrideBadImage);
    expect(s.calls.filter((c) => c.fn === "elemental_bot_settings_set")).toHaveLength(1);
  });

  test("nothing in the schedule ever opens a DM", async () => {
    const s = setup();
    const poller = s.scheduler();
    for (const time of ["19:00", "19:55", "20:30", "20:45"]) {
      s.at(EVENT_DAY, time);
      await poller.tick();
    }
    expect(s.createDM).not.toHaveBeenCalled();
  });
});
