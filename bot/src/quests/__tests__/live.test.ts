/**
 * @jest-environment node
 */
import { EventEmitter } from "node:events";

import { AttachmentBuilder, ButtonStyle, ChannelType, DiscordAPIError, Events, MessageFlags, type Client } from "discord.js";

import { QuestDbError, type QuestApi } from "../api";
import { bkkDate } from "../copy";
import { LIVE } from "../island/copy";
import type { IslandPlot } from "../island/render";
import { parseCid } from "../ids";
import {
  LIVE_PNG,
  LIVE_SCHEMA,
  PANEL_TARGETS,
  liveFor,
  liveSignature,
  liveView,
  panelId,
  startLivePost,
  type LivePostData,
} from "../live";
import { ACTION_HANDLERS, registerShiftQuests } from "..";
import { LIMITS, TONE_COLORS, renderView } from "../ui";
import { accentColor, bodyText, cardsOf, componentCount, customIds, mediaUrls, textLength, viewText } from "../test-helpers/view";
import { createRolePool } from "../../pg";

jest.mock("../../pg", () => ({ createRolePool: jest.fn() }));

const GUILD = "100000000000000001";
const LIVE_CH = "200000000000000010";
const NEW_CH = "200000000000000011";
const ROOM = "200000000000000002";
const SUGGEST = "200000000000000003";
const BOT = "400000000000000001";
const SOMEONE = "400000000000000002";
const WEB = "https://www.passionseed.org/shift/island";
const NOW = Date.UTC(2027, 3, 15, 5, 0, 0);

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function plot(slot: number, name: string | null = null, over: Partial<IslandPlot> = {}): IslandPlot {
  return { slot, stage: name ? 3 : 0, visitor: false, key: false, helper: false, lantern: false, name, mine: false, plain: !name, ...over };
}

function data(over: Partial<LivePostData> = {}): LivePostData {
  return {
    channel_id: LIVE_CH,
    message_id: null,
    coworking_channel_id: ROOM,
    plots: [plot(1, "เกม"), plot(2), plot(3, "ร้านขนม")],
    goal: { milestone: 3, target: 10, count: 3, reached: false, deadline: "2027-05-01" },
    season: { name: "Season 1", demo_day: "2027-05-15", days_to_demo: 30 },
    trees: 3,
    approved: 9,
    campfire: { live: true, count: 2 },
    ...over,
  };
}

/** The card as it would be sent, with a picture attached when asked. */
function card(d: LivePostData, o: { webUrl?: string | null; picture?: boolean; guildId?: string } = {}) {
  const picture = o.picture ?? true;
  const view = liveView(d, { nowMs: NOW, guildId: o.guildId ?? GUILD, webUrl: o.webUrl === undefined ? WEB : o.webUrl, picture });
  const files = picture ? [new AttachmentBuilder(Buffer.from("png"), { name: LIVE_PNG })] : [];
  return renderView({ ...view, files }, { ephemeral: false });
}

/** The panel's custom ids, in order: the same on every live card, whatever else it shows. */
const PANEL_IDS = ["sq|lp|me", "sq|lp|quests", "sq|lp|checkin", "sq|lp|help", "sq|lp|rewards", "sq|lp|how"];

interface SeenButton {
  label: string;
  style: number;
  id?: string;
  url?: string;
}

/** The card's action rows, each as its buttons in order. */
function rowsOf(payload: unknown): SeenButton[][] {
  const rows: SeenButton[][] = [];
  const walk = (c: Record<string, unknown>) => {
    if (c.type === 1) {
      rows.push(
        (c.components as Record<string, unknown>[]).map((b) => ({
          label: String(b.label),
          style: Number(b.style),
          ...(b.custom_id ? { id: String(b.custom_id) } : {}),
          ...(b.url ? { url: String(b.url) } : {}),
        }))
      );
      return;
    }
    for (const child of (c.components as Record<string, unknown>[] | undefined) ?? []) walk(child);
  };
  for (const c of cardsOf(payload)) walk(c as Record<string, unknown>);
  return rows;
}

/** Link button URLs, in order. */
function linkUrls(payload: unknown): string[] {
  const urls: string[] = [];
  const walk = (c: Record<string, unknown>) => {
    if (c.type === 2 && typeof c.url === "string") urls.push(c.url);
    for (const child of (c.components as Record<string, unknown>[] | undefined) ?? []) walk(child);
  };
  for (const c of cardsOf(payload)) walk(c as Record<string, unknown>);
  return urls;
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

describe("liveView", () => {
  it("puts the picture above the title, then the numbers, the consented signs and when it was updated", () => {
    const p = card(data());
    expect(p.flags).toBe(MessageFlags.IsComponentsV2);
    expect(p.allowedMentions).toEqual({ parse: [] });
    expect(accentColor(p)).toBe(TONE_COLORS.island);
    expect(mediaUrls(p)).toEqual([`attachment://${LIVE_PNG}`]);
    expect((cardsOf(p)[0] as { components: { type: number }[] }).components[0].type).toBe(12);
    expect(bodyText(p)).toBe(
      [
        "### 🏝️ เกาะ SHIFT High ตอนนี้",
        "🌳 ต้นไม้บนเกาะ **3** ต้น · ต้นที่โชว์บนเกาะผ่านแล้วรวม **9** ขั้น",
        "🎯 เป้าของเกาะ ▰▰▰▱▱▱▱▱▱▱ **3**/10 โปรเจกต์",
        `🎤 Demo Day ${bkkDate("2027-05-15")} · อีก **30** วัน`,
        "🔥 กองไฟตอนนี้ **2** คน",
        "-# 🪧 ป้ายชื่อบนเกาะ: #1 เกม · #3 ร้านขนม",
        `-# อัปเดตล่าสุด <t:${NOW / 1000}:R> · ${LIVE.marker}`,
      ].join("\n")
    );
    // Two link buttons: the web island and the coworking voice channel. The
    // panel's buttons answer only whoever presses them (handlers/panel.ts).
    expect(linkUrls(p)).toEqual([WEB, `https://discord.com/channels/${GUILD}/${ROOM}`]);
    expect(viewText(p)).toContain("🌐 เปิดเกาะบนเว็บ");
    expect(viewText(p)).toContain("🔥 เข้ากองไฟ");
    expect(customIds(p)).toEqual(PANEL_IDS);
  });

  it("ends with the panel: five personal buttons, then how to play and the links", () => {
    const rows = rowsOf(card(data({ suggest_channel_id: SUGGEST })));
    expect(rows).toEqual([
      [
        { label: "🏝️ ของฉัน", style: ButtonStyle.Primary, id: "sq|lp|me" },
        { label: "📋 งานที่ส่งไว้", style: ButtonStyle.Secondary, id: "sq|lp|quests" },
        { label: "✍️ เช็กอิน", style: ButtonStyle.Secondary, id: "sq|lp|checkin" },
        { label: "🆘 ขอช่วย", style: ButtonStyle.Secondary, id: "sq|lp|help" },
        { label: "🎁 รางวัล", style: ButtonStyle.Secondary, id: "sq|lp|rewards" },
      ],
      [
        { label: "📖 วิธีเล่น", style: ButtonStyle.Secondary, id: "sq|lp|how" },
        { label: "🌐 เปิดเกาะบนเว็บ", style: ButtonStyle.Link, url: WEB },
        { label: "🔥 เข้ากองไฟ", style: ButtonStyle.Link, url: `https://discord.com/channels/${GUILD}/${ROOM}` },
        { label: "💡 เสนอไอเดีย", style: ButtonStyle.Link, url: `https://discord.com/channels/${GUILD}/${SUGGEST}` },
      ],
    ]);
  });

  it("gives every panel button one sq|lp id a handler answers, inside Discord's limits", () => {
    const p = card(data({ suggest_channel_id: SUGGEST }));
    expect(PANEL_TARGETS.map(panelId)).toEqual(PANEL_IDS);
    expect(ACTION_HANDLERS.has("lp")).toBe(true);
    for (const id of customIds(p)) {
      expect(id.length).toBeLessThanOrEqual(100);
      const parsed = parseCid(id);
      expect(parsed?.action).toBe("lp");
      expect(PANEL_TARGETS as readonly string[]).toContain(parsed?.args[0]);
      expect(parsed?.args).toHaveLength(1);
    }
    for (const row of rowsOf(p)) {
      expect(row.length).toBeLessThanOrEqual(5);
      for (const b of row) {
        expect(b.label.length).toBeGreaterThan(0);
        expect(b.label.length).toBeLessThanOrEqual(80);
        expect(b.label).not.toContain("—");
        // A link opens a URL and nothing else; every other button carries a panel id.
        expect(Boolean(b.url) !== Boolean(b.id)).toBe(true);
        if (b.url) expect(b.url).toMatch(/^https:\/\//);
      }
    }
    expect(componentCount(p)).toBeLessThanOrEqual(LIMITS.components);
  });

  it("links the suggestions channel only when the post's data names one", () => {
    const suggest = `https://discord.com/channels/${GUILD}/${SUGGEST}`;
    expect(linkUrls(card(data({ suggest_channel_id: SUGGEST })))).toEqual([WEB, `https://discord.com/channels/${GUILD}/${ROOM}`, suggest]);
    expect(linkUrls(card(data({ suggest_channel_id: SUGGEST, coworking_channel_id: null }), { webUrl: null }))).toEqual([suggest]);
    // What shift_quest_live_post returns today: no suggest id, no link.
    expect(viewText(card(data()))).not.toContain(LIVE.suggest);
    for (const bad of [null, "", "general", "12"]) expect(linkUrls(card(data({ suggest_channel_id: bad })))).not.toContain(suggest);
    expect(linkUrls(card(data({ suggest_channel_id: SUGGEST }), { guildId: "nope" }))).toEqual([WEB]);
  });

  it("names nobody: only consented signs, a campfire count, no mentions and no em dashes", () => {
    const p = card(data({ plots: [plot(1, null), plot(2, "@everyone <@123> ทีม"), plot(4)] }));
    const text = viewText(p);
    expect(text).not.toMatch(/<@\d|@everyone|@here/);
    expect(text).not.toContain("#1");
    expect(text).not.toContain("#4");
    expect(text).toContain("#2 ");
    expect(text).not.toContain("—");
    for (const line of Object.values(LIVE)) if (typeof line === "string") expect(line).not.toContain("—");
  });

  it("shows the confirmed total of the shown trees only, and leaves it out while none is shown", () => {
    expect(bodyText(card(data({ trees: 4, approved: 5 })))).toContain("🌳 ต้นไม้บนเกาะ **4** ต้น · ต้นที่โชว์บนเกาะผ่านแล้วรวม **5** ขั้น\n");
    for (const approved of [0, null]) {
      expect(bodyText(card(data({ trees: 2, approved })))).toContain("🌳 ต้นไม้บนเกาะ **2** ต้น\n");
      expect(bodyText(card(data({ trees: 2, approved })))).not.toContain("ผ่านแล้วรวม");
    }
  });

  it("counts the campfire only while it is live, and leaves it out without a coworking channel", () => {
    expect(bodyText(card(data({ campfire: { live: false, count: 4 } })))).toContain("🔥 กองไฟยังว่าง มานั่งเป็นคนแรกได้");
    expect(bodyText(card(data({ campfire: { live: true, count: 0 } })))).toContain("🔥 กองไฟยังว่าง มานั่งเป็นคนแรกได้");
    const none = card(data({ coworking_channel_id: null }));
    expect(bodyText(none)).not.toContain("🔥");
    expect(linkUrls(none)).toEqual([WEB]);
  });

  it("says Demo Day is today, drops it once past, and marks a reached goal", () => {
    expect(bodyText(card(data({ season: { name: "S", demo_day: "2027-05-15", days_to_demo: 0 } })))).toContain(
      `🎤 Demo Day ${bkkDate("2027-05-15")} · วันนี้!`
    );
    expect(bodyText(card(data({ season: { name: "S", demo_day: "2027-05-15", days_to_demo: -1 } })))).not.toContain("Demo Day");
    expect(bodyText(card(data({ season: null })))).not.toContain("Demo Day");
    const reached = bodyText(card(data({ goal: { milestone: 3, target: 10, count: 12, reached: true, deadline: "2027-05-01" } })));
    expect(reached).toContain("🎯 เป้าของเกาะ ▰▰▰▰▰▰▰▰▰▰ **12**/10 โปรเจกต์ ถึงเป้าแล้ว!");
    expect(bodyText(card(data({ goal: null })))).not.toContain("🎯");
  });

  it("keeps the panel without a web address, a coworking channel or a picture, and falls back to text", () => {
    const p = card(data({ coworking_channel_id: null }), { webUrl: null, picture: false });
    expect(linkUrls(p)).toEqual([]);
    expect(customIds(p)).toEqual(PANEL_IDS);
    expect(rowsOf(p).map((row) => row.length)).toEqual([5, 1]);
    expect(mediaUrls(p)).toEqual([]);
    expect(bodyText(p)).toContain(`-# ${LIVE.pictureFailed}\n-# อัปเดตล่าสุด`);
    // A guild id that is not a snowflake never makes a join link.
    expect(linkUrls(card(data(), { guildId: "nope" }))).toEqual([WEB]);
  });

  it("stays inside Discord's limits with a full island of long names, the marker kept", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const plots = Array.from({ length: 60 }, (_, k) => plot(k + 1, `**${"ก".repeat(60)}**`));
      const p = card(data({ plots }));
      expect(componentCount(p)).toBeLessThanOrEqual(LIMITS.components);
      expect(textLength(p)).toBeLessThanOrEqual(LIMITS.text);
      expect(bodyText(p)).toContain("และอีก 30");
      expect(bodyText(p)).toContain(LIVE.marker);
      expect(customIds(p)).toEqual(PANEL_IDS);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

describe("liveSignature", () => {
  it("changes with what the post shows, and not with where it is or a campfire nobody sees", () => {
    const base = liveSignature(data(), WEB);
    expect(liveSignature(data({ message_id: "500000000000000001" }), WEB)).toBe(base);
    expect(liveSignature(data({ campfire: { live: true, count: 3 } }), WEB)).not.toBe(base);
    expect(liveSignature(data({ plots: [plot(1, "เกม")] }), WEB)).not.toBe(base);
    expect(liveSignature(data({ approved: 10 }), WEB)).not.toBe(base);
    expect(liveSignature(data({ season: { name: "Season 1", demo_day: "2027-05-15", days_to_demo: 29 } }), WEB)).not.toBe(base);
    expect(liveSignature(data(), null)).not.toBe(base);
    expect(liveSignature(data({ suggest_channel_id: SUGGEST }), WEB)).not.toBe(base);
    const idle = liveSignature(data({ campfire: { live: false, count: 3 } }), WEB);
    expect(liveSignature(data({ campfire: { live: false, count: 7 } }), WEB)).toBe(idle);
  });
});

// ---------------------------------------------------------------------------
// The loop, with a fake database and a fake Discord channel
// ---------------------------------------------------------------------------

function unknownMessage(): DiscordAPIError {
  return new DiscordAPIError({ message: "Unknown Message", code: 10008 }, 10008, 404, "PATCH", "/channels/x/messages/y", {});
}

function missingAccess(): DiscordAPIError {
  return new DiscordAPIError({ message: "Missing Access", code: 50001 }, 50001, 403, "GET", "/channels/x/pins", {});
}

function missingPermissions(): DiscordAPIError {
  return new DiscordAPIError({ message: "Missing Permissions", code: 50013 }, 50013, 403, "PATCH", "/channels/x/messages/y", {});
}

interface FakeMessage {
  id: string;
  author: { id: string };
  components: unknown[];
  pinned: boolean;
  pin: jest.Mock;
  delete: jest.Mock;
}

function fakeChannel(id: string) {
  const store = new Map<string, FakeMessage>();
  let next = 1;
  function message(mid: string, author: string, components: unknown[], pinned = false): FakeMessage {
    const m: FakeMessage = {
      id: mid,
      author: { id: author },
      components,
      pinned,
      pin: jest.fn(async () => {
        m.pinned = true;
        return m;
      }),
      delete: jest.fn(async () => {
        store.delete(mid);
      }),
    };
    store.set(mid, m);
    return m;
  }
  const channel = {
    id,
    type: ChannelType.GuildText,
    guildId: GUILD,
    send: jest.fn(async (payload: { components: unknown[] }) => message(`90000000000000000${next++}`, BOT, payload.components)),
    messages: {
      edit: jest.fn(async (mid: string, payload: { components: unknown[] }) => {
        const m = store.get(mid);
        if (!m) throw unknownMessage();
        m.components = payload.components;
        return m;
      }),
      delete: jest.fn(async (mid: string) => {
        if (!store.delete(mid)) throw unknownMessage();
      }),
      fetchPins: jest.fn(async (_options?: unknown) => ({
        hasMore: false,
        items: [...store.values()].filter((m) => m.pinned).map((m) => ({ message: m })),
      })),
    },
  };
  return { channel, store, message };
}

/** shift_quest_live_post and shift_quest_live_mark as the database answers them, compare-and-set included. */
function fakeDb(initial: LivePostData) {
  const db = {
    data: initial,
    stored: { channel: null as string | null, message: null as string | null },
    failMark: false,
    /** Runs inside live_mark before it decides: another process writing first. */
    beforeMark: null as null | (() => void),
    calls: [] as unknown[][],
  };
  const api = {
    call: jest.fn(async (fn: string, ...args: unknown[]) => {
      db.calls.push([fn, ...args]);
      if (fn === "shift_quest_live_post") {
        return { ...db.data, message_id: db.stored.channel === db.data.channel_id ? db.stored.message : null };
      }
      if (fn === "shift_quest_live_mark") {
        if (db.failMark) throw new QuestDbError(fn, "XX000");
        db.beforeMark?.();
        const [ch, id, previous] = args as [string, string | null, string | null];
        if (ch !== db.data.channel_id) return null;
        if (db.stored.channel === ch && db.stored.message !== previous) return db.stored.message;
        db.stored = { channel: ch, message: id };
        return id;
      }
      return null;
    }),
    rows: jest.fn(),
  };
  return { db, api: api as unknown as QuestApi };
}

function world(d: LivePostData = data()) {
  const { db, api } = fakeDb(d);
  const live = fakeChannel(LIVE_CH);
  const moved = fakeChannel(NEW_CH);
  const channels = new Map<string, unknown>([
    [LIVE_CH, live.channel],
    [NEW_CH, moved.channel],
  ]);
  const client = Object.assign(new EventEmitter(), {
    user: { id: BOT },
    channels: {
      fetch: jest.fn(async (id: string) => {
        if (!channels.has(id)) throw missingAccess();
        return channels.get(id);
      }),
    },
  });
  const state = { connected: true };
  const post = startLivePost(client as unknown as Client, api, GUILD, () => state.connected);
  return { db, api, live, moved, channels, client, state, post };
}

type World = ReturnType<typeof world>;

/** A gateway ready, then the 5 second wait before the first edit. */
async function ready(w: World): Promise<void> {
  w.client.emit(Events.ShardReady);
  await jest.advanceTimersByTimeAsync(5_000);
  await flush();
}

async function minutes(n: number): Promise<void> {
  await jest.advanceTimersByTimeAsync(n * 60_000);
  await flush();
}

const marks = (w: World) => w.db.calls.filter((c) => c[0] === "shift_quest_live_mark");

describe("startLivePost", () => {
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  const env = { ...process.env };
  let open: World[] = [];

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["setImmediate"] });
    jest.setSystemTime(NOW);
    process.env.SHIFT_ISLAND_URL = WEB;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    open = [];
  });

  afterEach(async () => {
    for (const w of open) await w.post.stop();
    jest.useRealTimers();
    process.env = { ...env };
    warn.mockRestore();
    error.mockRestore();
  });

  function make(d: LivePostData = data()): World {
    const w = world(d);
    open.push(w);
    return w;
  }

  it("posts once, pins it and records it, pinging nobody", async () => {
    const w = make();
    await ready(w);
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
    const payload = w.live.channel.send.mock.calls[0][0] as unknown as { flags: number; allowedMentions: unknown; files: unknown[] };
    expect(payload.flags).toBe(MessageFlags.IsComponentsV2);
    expect(payload.allowedMentions).toEqual({ parse: [] });
    expect(payload.files).toHaveLength(1);
    expect(mediaUrls(payload)).toEqual([`attachment://${LIVE_PNG}`]);
    expect(bodyText(payload)).toContain(LIVE.marker);
    const sent = [...w.live.store.values()][0];
    expect(sent.pin).toHaveBeenCalledTimes(1);
    expect(marks(w)).toEqual([["shift_quest_live_mark", LIVE_CH, sent.id, null]]);
    expect(w.db.stored).toEqual({ channel: LIVE_CH, message: sent.id });
    // Pinned before it was recorded: a failed write is still found by its pin.
    const call = w.api.call as jest.Mock;
    const markAt = call.mock.calls.findIndex((c) => c[0] === "shift_quest_live_mark");
    expect(sent.pin.mock.invocationCallOrder[0]).toBeLessThan(call.mock.invocationCallOrder[markAt]);
    // It looked for a post of its own first.
    expect(w.live.channel.messages.fetchPins).toHaveBeenCalledTimes(1);
  });

  it("edits the stored post in place and never posts again", async () => {
    const w = make();
    w.live.message("500000000000000001", BOT, []);
    w.db.stored = { channel: LIVE_CH, message: "500000000000000001" };
    await ready(w);
    expect(w.live.channel.send).not.toHaveBeenCalled();
    expect(w.live.channel.messages.fetchPins).not.toHaveBeenCalled();
    expect(w.live.channel.messages.edit).toHaveBeenCalledTimes(1);
    const [id, edit] = w.live.channel.messages.edit.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(id).toBe("500000000000000001");
    expect(edit.attachments).toEqual([]);
    expect(edit.flags).toBe(MessageFlags.IsComponentsV2);
    expect(edit.allowedMentions).toEqual({ parse: [] });
    expect(edit.files as unknown[]).toHaveLength(1);
    expect(customIds(edit)).toEqual(PANEL_IDS);
    expect(marks(w)).toEqual([]);
  });

  it("puts the panel on a post from before it at the first ready after a deploy, then edits only on change", async () => {
    const w = make();
    // The post as the previous release left it: the marker and the two links only.
    const old = renderView(
      { ...liveView(data(), { nowMs: NOW - 60_000, guildId: GUILD, webUrl: WEB, picture: false }), rows: [] },
      { ephemeral: false }
    );
    w.live.message("500000000000000001", BOT, old.components, true);
    w.db.stored = { channel: LIVE_CH, message: "500000000000000001" };
    await ready(w);
    const edits = w.live.channel.messages.edit;
    expect(edits).toHaveBeenCalledTimes(1);
    expect(customIds(edits.mock.calls[0][1])).toEqual(PANEL_IDS);
    expect(customIds({ components: w.live.store.get("500000000000000001")!.components })).toEqual(PANEL_IDS);
    expect(w.live.channel.send).not.toHaveBeenCalled();
    // The panel is not data: nothing changed, so no edit until the 10 minute refresh.
    await minutes(1);
    expect(edits).toHaveBeenCalledTimes(1);
  });

  it("links the suggestions channel as soon as the database's answer names one", async () => {
    const w = make();
    await ready(w);
    const suggest = `https://discord.com/channels/${GUILD}/${SUGGEST}`;
    expect(linkUrls(w.live.channel.send.mock.calls[0][0])).not.toContain(suggest);
    w.db.data = { ...data(), suggest_channel_id: SUGGEST };
    await minutes(1);
    const edits = w.live.channel.messages.edit;
    expect(edits).toHaveBeenCalledTimes(1);
    expect(linkUrls(edits.mock.calls[0][1])).toEqual([WEB, `https://discord.com/channels/${GUILD}/${ROOM}`, suggest]);
    // Anything else in that field is dropped, never sent to Discord.
    w.db.data = { ...data(), suggest_channel_id: "<#123> not an id" } as LivePostData;
    await minutes(1);
    expect(edits).toHaveBeenCalledTimes(2);
    expect(linkUrls(edits.mock.calls[1][1])).toEqual([WEB, `https://discord.com/channels/${GUILD}/${ROOM}`]);
  });

  it("edits again only when something shown changed, or every 10 minutes", async () => {
    const w = make();
    await ready(w);
    const edits = w.live.channel.messages.edit;
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
    await minutes(1);
    await minutes(1);
    expect(edits).not.toHaveBeenCalled();

    // Someone sat down at the campfire: edited within the minute.
    w.db.data = data({ campfire: { live: true, count: 3 } });
    await minutes(1);
    expect(edits).toHaveBeenCalledTimes(1);
    expect(bodyText(edits.mock.calls[0][1])).toContain("🔥 กองไฟตอนนี้ **3** คน");

    // Nothing changes: the next edit is 10 minutes after the last one, with the new time.
    await minutes(9);
    expect(edits).toHaveBeenCalledTimes(1);
    await minutes(1);
    expect(edits).toHaveBeenCalledTimes(2);
    const stamp = (n: number) => Number(/<t:(\d+):R>/.exec(bodyText(edits.mock.calls[n][1]))?.[1]);
    expect(stamp(1) - stamp(0)).toBe(10 * 60);
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
  });

  it("edits on every gateway ready, even with nothing changed", async () => {
    const w = make();
    await ready(w);
    await ready(w);
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
    expect(w.live.channel.messages.edit).toHaveBeenCalledTimes(1);
  });

  it("sends the numbers without a picture when it cannot be drawn, and removes the old one", async () => {
    const w = make(data({ plots: [plot(0, "เกม")] }));
    w.live.message("500000000000000001", BOT, []);
    w.db.stored = { channel: LIVE_CH, message: "500000000000000001" };
    await ready(w);
    const edit = w.live.channel.messages.edit.mock.calls[0][1] as unknown as { files: unknown[]; attachments: unknown[] };
    expect(edit.files).toEqual([]);
    expect(edit.attachments).toEqual([]);
    expect(mediaUrls(edit)).toEqual([]);
    expect(bodyText(edit)).toContain(LIVE.pictureFailed);
    expect(bodyText(edit)).toContain("-# 🪧 ป้ายชื่อบนเกาะ: #0 เกม");
    expect(customIds(edit)).toEqual(PANEL_IDS);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("live island picture skipped"));
  });

  it("sends the numbers without the picture when Discord refuses the picture (no Attach Files), and warns once", async () => {
    const w = make();
    w.live.message("500000000000000001", BOT, []);
    w.db.stored = { channel: LIVE_CH, message: "500000000000000001" };
    const edit = w.live.channel.messages.edit;
    const real = edit.getMockImplementation()!;
    edit.mockImplementation(async (mid: string, payload: { components: unknown[]; files?: unknown[] }) => {
      if (payload.files?.length) throw missingPermissions();
      return real(mid, payload);
    });
    await ready(w);
    expect(edit).toHaveBeenCalledTimes(2);
    const [first, second] = edit.mock.calls.map((c) => c[1] as unknown as { files: unknown[]; attachments: unknown[] });
    expect(first.files).toHaveLength(1);
    expect(second.files).toEqual([]);
    expect(second.attachments).toEqual([]);
    expect(mediaUrls(second)).toEqual([]);
    expect(bodyText(second)).toContain(LIVE.pictureFailed);
    expect(bodyText(second)).toContain(LIVE.marker);
    // The panel goes out with the numbers: only the picture is left behind.
    expect(customIds(first)).toEqual(PANEL_IDS);
    expect(customIds(second)).toEqual(PANEL_IDS);
    expect(w.live.channel.send).not.toHaveBeenCalled();

    // The next edit tries the picture again, falls back again, and does not warn again.
    w.db.data = data({ campfire: { live: true, count: 5 } });
    await minutes(1);
    expect(edit).toHaveBeenCalledTimes(4);
    expect(bodyText(edit.mock.calls[3][1])).toContain("🔥 กองไฟตอนนี้ **5** คน");
    const lines = warn.mock.calls.map((c) => String(c[0])).filter((l) => l.includes("live post"));
    expect(lines).toEqual([
      "[shift-quests] live post: the picture was refused (discord 50013 (403)); sent the numbers only. Give the bot Attach Files in the live channel",
    ]);
  });

  it("posts a new card without the picture when the send with it is refused", async () => {
    const w = make();
    const send = w.live.channel.send;
    const real = send.getMockImplementation()!;
    send.mockImplementation(async (payload: { components: unknown[]; files?: unknown[] }) => {
      if (payload.files?.length) throw missingPermissions();
      return real(payload);
    });
    await ready(w);
    expect(send).toHaveBeenCalledTimes(2);
    expect(w.live.store.size).toBe(1);
    const sent = [...w.live.store.values()][0];
    expect(sent.pin).toHaveBeenCalledTimes(1);
    expect(w.db.stored).toEqual({ channel: LIVE_CH, message: sent.id });
    expect(bodyText(send.mock.calls[1][0])).toContain(LIVE.pictureFailed);
    expect(customIds(send.mock.calls[1][0])).toEqual(PANEL_IDS);
  });

  it("does not blame the picture when the card fails without it too", async () => {
    const w = make();
    w.db.stored = { channel: LIVE_CH, message: "500000000000000001" };
    w.live.message("500000000000000001", BOT, []);
    w.live.channel.messages.edit.mockRejectedValue(missingPermissions());
    await ready(w);
    expect(w.live.channel.messages.edit).toHaveBeenCalledTimes(2);
    expect(w.live.channel.send).not.toHaveBeenCalled();
    const lines = warn.mock.calls.map((c) => String(c[0])).filter((l) => l.includes("live post"));
    expect(lines).toEqual(["[shift-quests] live post: discord 50013 (403); nothing new posted, trying again in a minute"]);

    // A refusal that is not about the picture (missing access) is not retried.
    const v = make();
    v.db.stored = { channel: LIVE_CH, message: "500000000000000001" };
    v.live.message("500000000000000001", BOT, []);
    v.live.channel.messages.edit.mockRejectedValue(missingAccess());
    await ready(v);
    expect(v.live.channel.messages.edit).toHaveBeenCalledTimes(1);
  });

  it("posts and pins a new one when staff deleted the stored post", async () => {
    const w = make();
    w.db.stored = { channel: LIVE_CH, message: "500000000000000001" };
    await ready(w);
    expect(w.live.channel.messages.edit).toHaveBeenCalledTimes(1);
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
    const sent = [...w.live.store.values()][0];
    expect(sent.pin).toHaveBeenCalledTimes(1);
    expect(marks(w)).toEqual([["shift_quest_live_mark", LIVE_CH, sent.id, "500000000000000001"]]);
    expect(w.db.stored.message).toBe(sent.id);
  });

  it("posts nothing on any other Discord error, and says so once", async () => {
    const w = make();
    w.db.stored = { channel: LIVE_CH, message: "500000000000000001" };
    w.live.channel.messages.edit.mockRejectedValue(missingAccess());
    await ready(w);
    await minutes(1);
    await minutes(10);
    expect(w.live.channel.send).not.toHaveBeenCalled();
    expect(marks(w)).toEqual([]);
    const lines = warn.mock.calls.map((c) => String(c[0])).filter((l) => l.includes("live post"));
    expect(lines).toEqual(["[shift-quests] live post: discord 50001 (403); nothing new posted, trying again in a minute"]);

    // Without a stored id, a pin list it cannot read posts nothing either.
    const v = make();
    v.live.channel.messages.fetchPins.mockRejectedValue(missingAccess());
    await ready(v);
    expect(v.live.channel.send).not.toHaveBeenCalled();
  });

  it("adopts its own pinned post with the marker instead of posting again", async () => {
    const w = make();
    const marked = card(data());
    w.live.message("500000000000000007", SOMEONE, marked.components, true);
    w.live.message("500000000000000008", BOT, [], true);
    w.live.message("500000000000000009", BOT, marked.components, true);
    await ready(w);
    expect(w.live.channel.send).not.toHaveBeenCalled();
    expect(marks(w)).toEqual([["shift_quest_live_mark", LIVE_CH, "500000000000000009", null]]);
    expect(w.live.channel.messages.edit.mock.calls.map((c) => c[0])).toEqual(["500000000000000009"]);
    expect(w.db.stored.message).toBe("500000000000000009");
  });

  it("deletes its own new post when another process recorded one first, then edits that one", async () => {
    const w = make();
    w.live.message("500000000000000003", BOT, []);
    w.db.beforeMark = () => {
      w.db.stored = { channel: LIVE_CH, message: "500000000000000003" };
      w.db.beforeMark = null;
    };
    await ready(w);
    const sent = w.live.channel.send.mock.results[0].value as Promise<FakeMessage>;
    const ours = await sent;
    expect(ours.delete).toHaveBeenCalledTimes(1);
    expect(w.live.store.has(ours.id)).toBe(false);
    await minutes(1);
    expect(w.live.channel.messages.edit.mock.calls.map((c) => c[0])).toEqual(["500000000000000003"]);
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
  });

  it("reuses a post it could not record rather than posting again", async () => {
    const w = make();
    w.db.failMark = true;
    await ready(w);
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
    const ours = [...w.live.store.values()][0];
    await minutes(1);
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
    w.db.failMark = false;
    await minutes(1);
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
    expect(w.db.stored).toEqual({ channel: LIVE_CH, message: ours.id });
    expect(w.live.channel.messages.edit.mock.calls.map((c) => c[0])).toEqual([ours.id]);
  });

  it("removes the post it could not record once another one is recorded", async () => {
    const w = make();
    w.db.failMark = true;
    await ready(w);
    const ours = [...w.live.store.values()][0];
    // Another process records its own post meanwhile.
    w.live.message("500000000000000003", BOT, []);
    w.db.stored = { channel: LIVE_CH, message: "500000000000000003" };
    w.db.failMark = false;
    await minutes(1);
    expect(w.live.channel.messages.edit.mock.calls.map((c) => c[0])).toEqual(["500000000000000003"]);
    expect(w.live.channel.messages.delete).toHaveBeenCalledWith(ours.id);
    expect(w.live.store.has(ours.id)).toBe(false);
    expect(w.live.channel.send).toHaveBeenCalledTimes(1);
  });

  it("posts once in a new live channel and leaves the old post alone", async () => {
    const w = make();
    await ready(w);
    const old = [...w.live.store.values()][0];
    w.db.data = data({ channel_id: NEW_CH });
    await minutes(1);
    expect(w.moved.channel.send).toHaveBeenCalledTimes(1);
    expect(w.live.store.has(old.id)).toBe(true);
    expect(w.live.channel.messages.edit).not.toHaveBeenCalled();
    await minutes(1);
    expect(w.moved.channel.send).toHaveBeenCalledTimes(1);
  });

  it("does nothing without a live channel, or while disconnected", async () => {
    const w = make(data({ channel_id: null }));
    await ready(w);
    await minutes(10);
    expect(w.client.channels.fetch).not.toHaveBeenCalled();
    expect(w.live.channel.send).not.toHaveBeenCalled();

    const v = make();
    v.state.connected = false;
    await ready(v);
    await minutes(2);
    expect(v.db.calls).toEqual([]);
  });

  it("refuses a live channel that is not a text channel of this server", async () => {
    const w = make();
    w.channels.set(LIVE_CH, { ...w.live.channel, type: ChannelType.GuildForum });
    await ready(w);
    expect(w.live.channel.send).not.toHaveBeenCalled();
    expect(warn.mock.calls.map((c) => String(c[0])).join("\n")).toContain(`channel ${LIVE_CH} is not a text channel`);
  });

  it("stops: no more edits, and the post stays", async () => {
    const w = make();
    await ready(w);
    await w.post.stop();
    expect(w.client.listenerCount(Events.ShardReady)).toBe(0);
    w.db.data = data({ trees: 9 });
    await minutes(10);
    expect(w.live.channel.messages.edit).not.toHaveBeenCalled();
    expect(w.live.store.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Only on a database that has the live post functions
// ---------------------------------------------------------------------------

describe("live post gate", () => {
  let logs: jest.SpyInstance;

  beforeEach(() => {
    logs = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => logs.mockRestore());

  it("starts from schema 8 and says when it is off", () => {
    const start = jest.fn(() => ({ stop: async () => undefined }));
    expect(LIVE_SCHEMA).toBe(8);
    expect(liveFor(7, start)).toBeNull();
    expect(start).not.toHaveBeenCalled();
    expect(logs).toHaveBeenCalledWith("[shift-quests] live post off (schema 7 < 8)");
    expect(liveFor(8, start)).not.toBeNull();
    expect(liveFor(9, start)).not.toBeNull();
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

  it("registerShiftQuests on schema 7 runs without it; on schema 8 it listens and stops before the pool closes", async () => {
    fakePool(7);
    const older = new EventEmitter();
    const before = await registerShiftQuests(older as unknown as Client, env);
    // The module's own connection flag and the campfire.
    expect(older.listenerCount(Events.ShardReady)).toBe(2);
    expect(logs).toHaveBeenCalledWith("[shift-quests] live post off (schema 7 < 8)");
    await before.stop();

    const log = fakePool(8);
    const client = new EventEmitter();
    const quests = await registerShiftQuests(client as unknown as Client, env);
    expect(client.listenerCount(Events.ShardReady)).toBe(3);
    await quests.stop();
    expect(client.listenerCount(Events.ShardReady)).toBe(1);
    expect(log.at(-1)).toBe("end");
  });
});
