/**
 * @jest-environment node
 */
import { AttachmentBuilder, ChannelType, DiscordAPIError, MessageFlags, MessagePayload, type Client } from "discord.js";

import { QuestDbError, QuestError, type QuestApi } from "../api";
import { questCommands } from "../commands";
import { T } from "../copy";
import { digestView } from "../digest";
import { DIGEST } from "../digestCopy";
import { LIVE } from "../island/copy";
import {
  NEWS_GIF,
  NEWS_PNG,
  NEWS_SCHEMA,
  cardSignature,
  downloadPicture,
  drawNewsPicture,
  momentOf,
  newsEdit,
  newsFor,
  newsView,
  normalizeNews,
  normalizePostedNews,
  removesText,
  startNewsPost,
  totalsLines,
  type NewsAi,
  type NewsData,
  type NewsPost,
  type NewsTotals,
} from "../news";
import { NEWS, PEOPLE_FLOOR } from "../newsCopy";
import { renderView } from "../view";
import { bodyText, customIds, mediaUrls, viewText } from "../test-helpers/view";

const GUILD = "100000000000000001";
const NEWS_CH = "200000000000000020";
const ROOM = "200000000000000002";
const OTHER_CH = "200000000000000099";
const BOT_ID = "300000000000000001";
const DAY = "2026-11-18";
const WEB = "https://www.passionseed.org/shift/island";
const V2 = MessageFlags.IsComponentsV2;

function totals(over: Partial<NewsTotals> = {}): NewsTotals {
  return { checked_in: 12, approved: 5, grew: 3, rounds: 8, demo: { day: "2026-11-28", days: 10 }, ...over };
}

const NO_AI: NewsAi = { kind: "day", entries: [] };
const AI: NewsAi = {
  kind: "day",
  entries: [
    { slot: 2, name: "เกมฝึกภาษา", summary: "ทีมทดสอบต้นแบบกับผู้ใช้ 5 คน" },
    { slot: 5, name: "ร้านขนม", summary: "ทีมส่งเควสต์คุยกับลูกค้าจริง" },
  ],
};

function news(over: Partial<NewsData> = {}): NewsData {
  return { day: DAY, channel_id: NEWS_CH, coworking_channel_id: ROOM, totals: totals(), ai: NO_AI, ...over };
}

/** The card as the bot renders it for sending, with the picture attached when asked. */
function card(d: NewsData, o: { picture?: string | false; webUrl?: string | null; guildId?: string } = {}) {
  const picture = o.picture === undefined ? NEWS_GIF : o.picture;
  const view = newsView(d, { picture, webUrl: o.webUrl === undefined ? WEB : o.webUrl, guildId: o.guildId ?? GUILD });
  const files = picture ? [new AttachmentBuilder(Buffer.from("gif"), { name: picture, description: NEWS.pictureAlt })] : [];
  return renderView({ ...view, files }, { ephemeral: false });
}

const savedEnv = { island: process.env.SHIFT_ISLAND_URL, site: process.env.NEXT_PUBLIC_SITE_URL };

beforeEach(() => {
  process.env.SHIFT_ISLAND_URL = WEB;
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
  jest.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  for (const [key, value] of [
    ["SHIFT_ISLAND_URL", savedEnv.island],
    ["NEXT_PUBLIC_SITE_URL", savedEnv.site],
  ] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

// ---------------------------------------------------------------------------
// The database's answers
// ---------------------------------------------------------------------------

describe("normalizeNews", () => {
  it("keeps a valid answer, coercing totals to whole non-negative numbers and the AI lines to plot order", () => {
    const d = normalizeNews({
      day: DAY,
      channel_id: NEWS_CH,
      coworking_channel_id: "not-a-snowflake",
      totals: { checked_in: "7", approved: -2, grew: 2.7, rounds: null, demo: { day: "2026-11-28", days: 10 } },
      ai: {
        kind: "week",
        entries: [
          { slot: 5, name: " ร้านขนม ", summary: "ทีมส่งเควสต์" },
          { slot: 2, name: "เกม", summary: "ทีมทดสอบ" },
          { slot: 0, name: "x", summary: "y" },
          "junk",
        ],
      },
    });
    expect(d).toEqual({
      day: DAY,
      channel_id: NEWS_CH,
      coworking_channel_id: null,
      totals: { checked_in: 7, approved: 0, grew: 2, rounds: 0, demo: { day: "2026-11-28", days: 10 } },
      ai: {
        kind: "week",
        entries: [
          { slot: 2, name: "เกม", summary: "ทีมทดสอบ" },
          { slot: 5, name: "ร้านขนม", summary: "ทีมส่งเควสต์" },
        ],
      },
    });
  });

  it("takes an answer with no AI lines and no Demo Day (most nights)", () => {
    const d = normalizeNews({ day: DAY, channel_id: NEWS_CH, totals: { checked_in: 0 }, ai: { kind: "day", entries: [] } });
    expect(d?.ai).toEqual(NO_AI);
    expect(d?.totals).toEqual({ checked_in: 0, approved: 0, grew: 0, rounds: 0, demo: null });
  });

  it.each([
    ["null", null],
    ["a bad day", { ...news(), day: "tonight" }],
    ["a channel that is not a snowflake", { ...news(), channel_id: "#island-news" }],
    ["an array", [news()]],
  ])("is null for %s", (_label, raw) => {
    expect(normalizeNews(raw)).toBeNull();
  });

  it("drops a malformed Demo Day", () => {
    for (const demo of [{ day: "soon", days: 3 }, { day: "2026-11-28", days: -1 }, { day: "2026-11-28", days: 1.5 }, "x"]) {
      expect(normalizeNews({ ...news(), totals: { ...totals(), demo } })?.totals.demo).toBeNull();
    }
  });

  it("reads the posted cards, each with its message id", () => {
    const rows = normalizePostedNews([
      { ...news(), message_id: "900000000000000001" },
      { ...news(), message_id: "nope" },
      { ...news({ day: "x" }), message_id: "900000000000000002" },
    ]);
    expect(rows.map((r) => r.message_id)).toEqual(["900000000000000001"]);
    expect(normalizePostedNews(null)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

describe("newsView: the totals and the small-number floor", () => {
  it("shows a busy night with every number", () => {
    expect(totalsLines(totals())).toEqual([
      "👣 แวะมาเช็กอิน **12** คน",
      "✅ พี่เลี้ยงผ่านงาน **5** เควสต์ · 🌱 ต้นไม้โตขึ้น **3** ขั้น",
      "🔥 ตั้งเป้าทำงานรอบกองไฟ **8** รอบ",
    ]);
  });

  it("leaves 0 lines out, and shows the quiet line when nothing happened", () => {
    expect(totalsLines(totals({ approved: 0, grew: 0 }))).toEqual([NEWS.checkedIn(12), NEWS.rounds(8)]);
    expect(totalsLines(totals({ checked_in: 0, approved: 0, grew: 0, rounds: 0 }))).toEqual([NEWS.quiet]);
    const body = bodyText(card(news({ totals: totals({ checked_in: 0, approved: 0, grew: 0, rounds: 0, demo: null }) })));
    expect(body).toContain(NEWS.quiet);
    expect(body).not.toMatch(/👣|✅|🌱|🔥 ตั้งเป้า/);
  });

  it("shows people counts of 1 or 2 without a number, and 3 with it", () => {
    expect(PEOPLE_FLOOR).toBe(3);
    for (const n of [1, 2]) {
      const lines = totalsLines(totals({ checked_in: n, rounds: n, approved: 0, grew: 0 }));
      expect(lines).toEqual(["👣 มีเพื่อนแวะมาเช็กอินแล้ว", "🔥 มีคนมาตั้งเป้าทำงานที่กองไฟ"]);
      expect(lines.join("\n")).not.toMatch(/\d/);
    }
    expect(totalsLines(totals({ checked_in: 3, rounds: 3, approved: 0, grew: 0 }))).toEqual([
      "👣 แวะมาเช็กอิน **3** คน",
      "🔥 ตั้งเป้าทำงานรอบกองไฟ **3** รอบ",
    ]);
  });

  it("always shows approvals and stages grown with their exact number", () => {
    expect(totalsLines(totals({ checked_in: 0, rounds: 0, approved: 1, grew: 1 }))).toEqual([
      "✅ พี่เลี้ยงผ่านงาน **1** เควสต์ · 🌱 ต้นไม้โตขึ้น **1** ขั้น",
    ]);
    expect(totalsLines(totals({ checked_in: 0, rounds: 0, approved: 2, grew: 0 }))).toEqual(["✅ พี่เลี้ยงผ่านงาน **2** เควสต์"]);
  });

  it("never shows minutes or time for the campfire", () => {
    for (const n of [1, 2, 3, 40]) expect(NEWS.rounds(n)).not.toMatch(/นาที|ชั่วโมง|ชม\.|เวลา|min/);
    expect(bodyText(card(news()))).not.toMatch(/นาที|ชั่วโมง|ชม\./);
  });
});

describe("newsView: the rest of the card", () => {
  it("is one V2 card: picture above the title, totals, Demo Day, a lore line and the fine print with the issue line", () => {
    const p = card(news());
    expect(p.flags).toBe(V2);
    expect(p.allowedMentions).toEqual({ parse: [] });
    expect(mediaUrls(p)).toEqual([`attachment://${NEWS_GIF}`]);
    const body = bodyText(p);
    expect(body.startsWith(`### ${NEWS.title}\n👣 แวะมาเช็กอิน **12** คน`)).toBe(true);
    expect(body).toContain(LIVE.demo("2026-11-28", 10));
    expect(body).toContain(momentOf(DAY));
    expect(body).toContain(`-# ${NEWS.fine} · ${NEWS.dayLine(DAY)}`);
    expect(NEWS.dayLine(DAY)).toBe("ฉบับ 18 พ.ย. 2569");
    expect(body).not.toContain(NEWS.pictureFailed);
    expect(body).not.toContain(NEWS.aiHeading);
  });

  it("leaves the Demo Day line out without an active season", () => {
    expect(bodyText(card(news({ totals: totals({ demo: null }) })))).not.toContain("Demo Day");
  });

  it("says when the picture could not be drawn", () => {
    const p = card(news(), { picture: false });
    expect(mediaUrls(p)).toEqual([]);
    expect(bodyText(p)).toContain(NEWS.pictureFailed);
  });

  it("keeps the same lore line for the same day, and walks through all seven over a week", () => {
    expect(momentOf(DAY)).toBe(momentOf(DAY));
    expect(bodyText(card(news()))).toBe(bodyText(card(news())));
    const week = Array.from({ length: 7 }, (_, k) => momentOf(`2026-11-${String(18 + k).padStart(2, "0")}`));
    expect(new Set(week).size).toBe(7);
    expect(NEWS.moments).toContain(momentOf("not a day"));
  });

  it("adds the AI section only when a team can be featured: heading, lines and the AI fine print", () => {
    const body = bodyText(card(news({ ai: AI })));
    expect(body).toContain(`**${NEWS.aiHeading}**`);
    expect(body).toContain("แปลง 2 เกมฝึกภาษา: ทีมทดสอบต้นแบบกับผู้ใช้ 5 คน\nแปลง 5 ร้านขนม: ทีมส่งเควสต์คุยกับลูกค้าจริง");
    expect(body).toContain(DIGEST.fine);
    // The totals always stay on an AI night.
    expect(body).toContain("👣 แวะมาเช็กอิน **12** คน");
    expect(bodyText(card(news()))).not.toContain(DIGEST.fine);
  });

  it("uses the week heading only for the Sunday recap with lines", () => {
    expect(bodyText(card(news({ ai: { ...AI, kind: "week" } })))).toContain(NEWS.weekHeading);
    expect(bodyText(card(news({ ai: { kind: "week", entries: [] } })))).not.toContain(NEWS.weekHeading);
  });

  it("has link buttons only: the web island, and the campfire when a coworking channel is set", () => {
    const p = card(news());
    expect(customIds(p)).toEqual([]);
    expect(viewText(p)).toContain("เปิดเกาะบนเว็บ");
    expect(viewText(p)).toContain(LIVE.join);
    expect(JSON.stringify(p.components)).toContain(`https://discord.com/channels/${GUILD}/${ROOM}`);
    const bare = card(news({ coworking_channel_id: null }), { webUrl: null });
    expect(viewText(bare)).not.toContain("เปิดเกาะบนเว็บ");
    expect(viewText(bare)).not.toContain(LIVE.join);
    expect(viewText(card(news(), { guildId: "" }))).not.toContain(LIVE.join);
  });

  it("never pings, even with mentions in a team's name or summary", () => {
    const p = card(news({ ai: { kind: "day", entries: [{ slot: 1, name: "@everyone", summary: "<@123456789012345678> ทีมทดสอบ @here" }] } }));
    expect(p.allowedMentions).toEqual({ parse: [] });
    expect(bodyText(p)).not.toMatch(/(^|[^​])@(everyone|here)|<@\d/);
  });

  it("stays inside Discord's limits with many teams", () => {
    const entries = Array.from({ length: 40 }, (_, i) => ({ slot: i + 1, name: `ทีม ${i + 1}`, summary: "ก".repeat(290) }));
    const body = bodyText(card(news({ ai: { kind: "day", entries } })));
    expect(body.length).toBeLessThanOrEqual(4000);
    expect(body).toContain("และอีก");
    expect(body).toContain(NEWS.dayLine(DAY));
  });

  it("never carries the digest's day marker, and a digest post never carries the card's", () => {
    const newsJson = JSON.stringify(card(news({ ai: AI })).components);
    expect(newsJson).not.toContain(DIGEST.dayLine(DAY));
    const digestJson = JSON.stringify(
      renderView(digestView({ day: DAY, kind: "day", channel_id: NEWS_CH, entries: AI.entries }, WEB), { ephemeral: false }).components
    );
    expect(digestJson).not.toContain(NEWS.dayLine(DAY));
  });
});

describe("the card's Thai copy (DRAFT)", () => {
  const status = questCommands()
    .find((c) => c.name === "admin")
    ?.options?.find((o) => o.name === "channel") as { options?: { name: string; choices?: { name: string; value: string }[] }[] };
  const choice = status.options?.find((o) => o.name === "kind")?.choices?.find((c) => c.value === "news")?.name ?? "";
  const strings = [
    NEWS.title,
    NEWS.checkedIn(1),
    NEWS.checkedIn(12),
    NEWS.approved(1),
    NEWS.grew(1),
    NEWS.rounds(2),
    NEWS.rounds(9),
    NEWS.quiet,
    ...NEWS.moments,
    NEWS.aiHeading,
    NEWS.weekHeading,
    NEWS.fine,
    NEWS.dayLine(DAY),
    NEWS.pictureAlt,
    NEWS.pictureFailed,
    T.adminNewsType,
    T.adminAnnouncementNewsOnly,
    T.adminNewsPrivate,
    T.adminNewsBotPerms,
    T.adminVoiceCoworkingOnly,
    T.adminNewsLine(true),
    T.adminNewsLine(false),
    T.adminDigestToday(3),
    T.adminDigestLine(true, "news"),
    choice,
  ];

  it.each(strings)("%s has no em or en dash and never talks down", (text) => {
    expect(text).not.toMatch(/[—–]/);
    expect(text).not.toMatch(/น้องๆ|น้อง ๆ|เด็กๆ|เด็ก ๆ/);
  });

  it("says 2 ทุ่ม (20:00), never 3 ทุ่ม", () => {
    expect(choice).toContain("2 ทุ่ม");
    for (const text of [NEWS.fine, T.adminNewsLine(true), T.adminDigestLine(true, "news"), choice]) {
      expect(text).toContain("2 ทุ่ม");
    }
    expect(strings.join("\n")).not.toContain("3 ทุ่ม");
  });

  it("never says a check-in grows a tree, and only the approvals line speaks of growth", () => {
    for (const n of [1, 3]) expect(NEWS.checkedIn(n)).not.toMatch(/โต|ต้นไม้|ขั้น/);
    expect(NEWS.quiet).not.toMatch(/โต|พลาด|ขาด/);
  });

  it("labels the AI lines as written by AI", () => {
    expect(NEWS.aiHeading).toContain("AI");
    expect(NEWS.weekHeading).toContain("AI");
  });
});

// ---------------------------------------------------------------------------
// The edit payload: the picture is kept
// ---------------------------------------------------------------------------

describe("newsEdit", () => {
  const view = (picture: string | false) => newsView(news({ ai: AI }), { picture, webUrl: WEB, guildId: GUILD });
  /** A message as discord.js's edit sees it: only its client's options are read while resolving. */
  const target = { client: { options: {} } } as never;

  it("re-attaches the picture's bytes under the same name and replaces the old file (attachments: [])", () => {
    const bytes = Buffer.from("the-posted-gif");
    const file = new AttachmentBuilder(bytes, { name: NEWS_GIF, description: NEWS.pictureAlt });
    const edit = newsEdit(view(NEWS_GIF), [file]);
    expect(edit.files).toEqual([file]);
    expect(edit.attachments).toEqual([]);
    expect(edit.flags).toBe(V2);
    expect(edit.allowedMentions).toEqual({ parse: [] });
    expect("content" in edit).toBe(false);
    expect(mediaUrls(edit)).toEqual([`attachment://${NEWS_GIF}`]);
    expect(bodyText(edit)).toContain("แปลง 5 ร้านขนม");
    expect(bodyText(edit)).not.toContain(NEWS.pictureFailed);
  });

  it("resolves (as discord.js sends it) to the one re-uploaded picture, so the card never loses it", async () => {
    const bytes = Buffer.from("the-posted-gif");
    const edit = newsEdit(view(NEWS_GIF), [new AttachmentBuilder(bytes, { name: NEWS_GIF, description: NEWS.pictureAlt })]);
    const payload = new MessagePayload(target, edit).resolveBody();
    await payload.resolveFiles();
    const body = payload.body as { attachments?: { id: string; description?: string }[] };
    expect(body.attachments).toEqual([expect.objectContaining({ id: "0", description: NEWS.pictureAlt })]);
    expect(payload.files?.map((f) => f.name)).toEqual([NEWS_GIF]);
    expect(Buffer.from(payload.files![0].data as Buffer).equals(bytes)).toBe(true);
    expect(JSON.stringify(body)).toContain(`attachment://${NEWS_GIF}`);
  });

  it("without a picture sends no file and says so", async () => {
    const edit = newsEdit(view(false), []);
    expect(edit.files).toEqual([]);
    expect(edit.attachments).toEqual([]);
    expect(mediaUrls(edit)).toEqual([]);
    expect(bodyText(edit)).toContain(NEWS.pictureFailed);
    const payload = new MessagePayload(target, edit).resolveBody();
    expect((payload.body as { attachments?: unknown[] }).attachments).toEqual([]);
  });

  it("tells a take-down (a line goes) from an edit that only adds", () => {
    const before = card(news({ ai: AI })).components;
    const added = card(news({ ai: { kind: "day", entries: [...AI.entries, { slot: 7, name: "ทีมใหม่", summary: "สรุปใหม่" }] } })).components;
    const taken = card(news({ ai: { kind: "day", entries: [AI.entries[1]] } })).components;
    const off = card(news()).components;
    expect(removesText(before, added)).toBe(false);
    expect(removesText(before, taken)).toBe(true);
    expect(removesText(before, off)).toBe(true);
    expect(removesText(off, before)).toBe(false);
  });

  it("compares what a card shows (text and links), not its picture", () => {
    expect(cardSignature(card(news()).components)).toBe(cardSignature(renderView(newsView(news(), { picture: NEWS_GIF, webUrl: WEB, guildId: GUILD })).components));
    expect(cardSignature(card(news()).components)).not.toBe(cardSignature(card(news(), { picture: false }).components));
    expect(cardSignature(card(news()).components)).not.toBe(cardSignature(card(news({ coworking_channel_id: null })).components));
  });
});

// ---------------------------------------------------------------------------
// The picture
// ---------------------------------------------------------------------------

describe("drawNewsPicture and downloadPicture", () => {
  const livePost = {
    channel_id: null,
    message_id: null,
    coworking_channel_id: ROOM,
    plots: [
      { slot: 1, stage: 3, visitor: false, key: false, helper: false, lantern: true, name: "เกม", mine: false, plain: false },
      { slot: 2, stage: 0, visitor: false, key: false, helper: false, lantern: false, name: null, mine: false, plain: true },
    ],
    goal: null,
    season: { name: "Season 1", demo_day: "2026-11-28", days_to_demo: 10 },
    trees: 2,
    approved: 3,
    campfire: { live: true, count: 2 },
  };
  const apiAnswering = (answer: unknown) =>
    ({
      call: jest.fn(async (fn: string) => {
        if (fn === "shift_quest_live_post") {
          if (answer instanceof Error) throw answer;
          return answer;
        }
        return null;
      }),
      rows: jest.fn(),
    }) as unknown as QuestApi;

  it("draws tonight's moving island from the live post's outsider view", async () => {
    const files = await drawNewsPicture(apiAnswering(livePost), Date.UTC(2026, 10, 18, 13, 0, 0));
    expect(files.map((f) => f.name)).toEqual([NEWS_GIF]);
    expect(files[0].description).toBe(NEWS.pictureAlt);
    expect((files[0].attachment as Buffer).subarray(0, 6).toString()).toBe("GIF89a");
  }, 30_000);

  it("draws nothing when the live post cannot be read: the card goes without a picture", async () => {
    expect(await drawNewsPicture(apiAnswering(new QuestDbError("shift_quest_live_post", "57014")), Date.now())).toEqual([]);
    expect(await drawNewsPicture(apiAnswering(null), Date.now())).toEqual([]);
  });

  it("downloads a picture back only from Discord's CDN", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch");
    expect(await downloadPicture("https://evil.example/shift-island-news.gif")).toBeNull();
    expect(await downloadPicture("http://cdn.discordapp.com/x.gif")).toBeNull();
    expect(await downloadPicture("not a url")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(new Response(Buffer.from("GIF89a-bytes"), { status: 200 }));
    expect((await downloadPicture("https://cdn.discordapp.com/attachments/1/2/shift-island-news.gif"))?.toString()).toBe("GIF89a-bytes");
    fetchMock.mockResolvedValueOnce(new Response("gone", { status: 404 }));
    expect(await downloadPicture("https://cdn.discordapp.com/attachments/1/2/shift-island-news.gif")).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(await downloadPicture("https://cdn.discordapp.com/attachments/1/2/shift-island-news.gif")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The poster
// ---------------------------------------------------------------------------

describe("newsFor", () => {
  it("starts nothing below schema 19, and says so", () => {
    const start = jest.fn();
    expect(NEWS_SCHEMA).toBe(19);
    expect(newsFor(18, start)).toBeNull();
    expect(start).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("[shift-quests] nightly island news off (schema 18 < 19)");
  });

  it("starts the card from schema 19", () => {
    const started = { poll: jest.fn(), stop: jest.fn() } as unknown as NewsPost;
    expect(newsFor(19, () => started)).toBe(started);
    expect(newsFor(20, () => started)).toBe(started);
  });
});

interface FakeAttachment {
  id: string;
  name: string;
  url: string;
  description: string | null;
}

interface FakeMessage {
  id: string;
  payload: Record<string, unknown>;
  components: unknown[];
  attachments: Map<string, FakeAttachment>;
  author: { id: string };
  delete: jest.Mock;
  edit: jest.Mock;
  crosspost: jest.Mock;
}

/** The attachments a send or an edit leaves on a message, as Discord would: the new files, else nothing when attachments: []. */
function attachmentsOf(payload: Record<string, unknown>, before: Map<string, FakeAttachment>, msgId: string) {
  const files = (payload.files as AttachmentBuilder[] | undefined) ?? undefined;
  if (files === undefined && payload.attachments === undefined) return before;
  const out = new Map<string, FakeAttachment>();
  for (const [k, f] of (files ?? []).entries()) {
    const id = `${msgId}${k}`;
    out.set(id, { id, name: f.name!, url: `https://cdn.discordapp.com/attachments/${NEWS_CH}/${id}/${f.name}`, description: f.description ?? null });
  }
  return out;
}

function fakeChannel(id: string, over: Record<string, unknown> = {}) {
  const sent: FakeMessage[] = [];
  let next = 1;
  const make = (payload: Record<string, unknown>, author = BOT_ID): FakeMessage => {
    const msgId = `90000000000000${String(next++).padStart(4, "0")}`;
    const m: FakeMessage = {
      id: msgId,
      payload,
      // As discord.js gives them back: the components as JSON.
      components: JSON.parse(JSON.stringify(payload.components ?? [])),
      attachments: attachmentsOf(payload, new Map(), msgId),
      author: { id: author },
      delete: jest.fn(async () => undefined),
      crosspost: jest.fn(async () => m),
      edit: jest.fn(async (p: Record<string, unknown>) => {
        m.payload = p;
        m.components = JSON.parse(JSON.stringify(p.components ?? []));
        m.attachments = attachmentsOf(p, m.attachments, `${msgId}e`);
        return m;
      }),
    };
    return m;
  };
  const channel = {
    id,
    type: ChannelType.GuildAnnouncement,
    guildId: GUILD,
    send: jest.fn(async (payload: Record<string, unknown>) => {
      const m = make(payload);
      sent.push(m);
      return m;
    }),
    messages: {
      fetch: jest.fn(async (arg: unknown) => {
        if (typeof arg === "string") {
          const found = sent.find((m) => m.id === arg);
          if (!found) throw new DiscordAPIError({ message: "Unknown Message", code: 10008 }, 10008, 404, "GET", "/x", {});
          return found;
        }
        return new Map(sent.map((m) => [m.id, m]));
      }),
    },
    ...over,
  };
  return { channel, sent, make };
}

/** shift_quest_news_post_next, _claim, _mark and _post_current as the database answers them. */
function fakeDb(answer: NewsData | null) {
  const db = {
    answer,
    stored: null as string | null,
    markError: null as Error | null,
    /** Runs inside news_mark before it decides: another process recording first. */
    beforeMark: null as null | (() => void),
    /** The claim's answer: "new" the first time, then null (claimed). */
    claim: "new" as string | null,
    /** The AI section the posted card should show now; null: as posted. */
    currentAi: null as NewsAi | null,
    calls: [] as unknown[][],
  };
  const call = jest.fn(async (fn: string, ...args: unknown[]) => {
    db.calls.push([fn, ...args]);
    if (fn === "shift_quest_news_post_next") return db.stored ? null : db.answer;
    if (fn === "shift_quest_news_claim") {
      const a = db.claim;
      if (a === "new") db.claim = null;
      return a;
    }
    if (fn === "shift_quest_news_mark") {
      if (db.markError) throw db.markError;
      db.beforeMark?.();
      if (!db.stored) db.stored = args[2] as string;
      return db.stored;
    }
    if (fn === "shift_quest_news_post_current") {
      if (!db.stored || !db.answer) return [];
      return [{ ...db.answer, message_id: db.stored, ai: db.currentAi ?? db.answer.ai }];
    }
    return null;
  });
  return { db, api: { call, rows: jest.fn() } as unknown as QuestApi };
}

const posters: NewsPost[] = [];
const GIF_BYTES = Buffer.from("GIF89a-tonight");

function world(answer: NewsData | null = news(), channels: Record<string, unknown> = {}) {
  const { db, api } = fakeDb(answer);
  const ch = fakeChannel(NEWS_CH);
  const all = new Map<string, unknown>([[NEWS_CH, ch.channel], ...Object.entries(channels)]);
  const client = {
    user: { id: BOT_ID },
    channels: { fetch: jest.fn(async (id: string) => all.get(id) ?? null) },
  };
  const state = { connected: true };
  const draw = jest.fn(async () => [new AttachmentBuilder(GIF_BYTES, { name: NEWS_GIF, description: NEWS.pictureAlt })]);
  const download = jest.fn(async (_url: string): Promise<Buffer | null> => GIF_BYTES);
  const start = () => {
    const p = startNewsPost(client as unknown as Client, api, { guildId: GUILD, connected: () => state.connected, draw, download });
    posters.push(p);
    return p;
  };
  return { db, api, ch, client, state, draw, download, poster: start(), restart: start };
}

const fnCalls = (w: ReturnType<typeof world>, fn: string) => w.db.calls.filter((c) => c[0] === fn);
const idFetches = (w: ReturnType<typeof world>) => w.ch.channel.messages.fetch.mock.calls.filter((c) => typeof c[0] === "string").length;

function missingPermissions(): DiscordAPIError {
  return new DiscordAPIError({ message: "Missing Permissions", code: 50013 }, 50013, 403, "POST", "/channels/x/messages", {});
}

afterEach(async () => {
  while (posters.length) await posters.pop()!.stop();
});

describe("startNewsPost: tonight's card", () => {
  it("claims, sends once with the picture, pings nobody, never crossposts, then records it", async () => {
    const w = world();
    await w.poster.poll();
    expect(fnCalls(w, "shift_quest_news_claim")).toEqual([["shift_quest_news_claim", DAY, NEWS_CH]]);
    expect(w.ch.channel.send).toHaveBeenCalledTimes(1);
    const sent = w.ch.sent[0];
    expect(sent.payload.allowedMentions).toEqual({ parse: [] });
    expect(sent.payload.flags).toBe(V2);
    expect((sent.payload.files as AttachmentBuilder[]).map((f) => f.name)).toEqual([NEWS_GIF]);
    expect(mediaUrls(sent.payload)).toEqual([`attachment://${NEWS_GIF}`]);
    expect(JSON.stringify(sent.components)).toContain(NEWS.dayLine(DAY));
    expect(fnCalls(w, "shift_quest_news_mark")).toEqual([["shift_quest_news_mark", DAY, NEWS_CH, sent.id]]);
    expect(sent.delete).not.toHaveBeenCalled();
    expect(sent.crosspost).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(`[shift-quests] nightly island news posted for ${DAY} (0 AI teams)`);

    // Recorded: later checks send nothing and edit nothing while the card reads the same.
    await w.poster.poll();
    await w.poster.poll();
    expect(w.ch.channel.send).toHaveBeenCalledTimes(1);
    expect(sent.edit).not.toHaveBeenCalled();
    expect(idFetches(w)).toBe(0);
  });

  it("sends nothing when another process holds a fresh claim", async () => {
    const w = world();
    w.db.claim = null;
    await w.poster.poll();
    expect(w.ch.channel.send).not.toHaveBeenCalled();
    expect(w.draw).not.toHaveBeenCalled();
    expect(fnCalls(w, "shift_quest_news_mark")).toEqual([]);
  });

  it("does nothing when the database has nothing to send (before 20:00, or no news channel)", async () => {
    const w = world(null);
    await w.poster.poll();
    expect(w.client.channels.fetch).not.toHaveBeenCalled();
    expect(fnCalls(w, "shift_quest_news_claim")).toEqual([]);
  });

  it("sends the card once more without the picture when Discord refuses it (50013), and records that one", async () => {
    const w = world();
    w.ch.channel.send.mockRejectedValueOnce(missingPermissions());
    await w.poster.poll();
    expect(w.ch.channel.send).toHaveBeenCalledTimes(2);
    const card2 = w.ch.sent[0];
    expect(card2.payload.files).toEqual([]);
    expect(bodyText(card2.payload)).toContain(NEWS.pictureFailed);
    expect(fnCalls(w, "shift_quest_news_mark")).toEqual([["shift_quest_news_mark", DAY, NEWS_CH, card2.id]]);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Give the bot Attach Files in the news channel"));
  });

  it("sends the card without a picture when none could be drawn", async () => {
    const w = world();
    w.draw.mockResolvedValueOnce([]);
    await w.poster.poll();
    expect(w.ch.channel.send).toHaveBeenCalledTimes(1);
    expect(bodyText(w.ch.sent[0].payload)).toContain(NEWS.pictureFailed);
    expect(w.db.stored).toBe(w.ch.sent[0].id);
  });

  it("on a stale claim, adopts its own card by the issue line, never a digest post or someone else's", async () => {
    const w = world();
    // A bot digest post of the same day, and another author's copy of the card: neither counts.
    w.ch.sent.push(
      w.ch.make(renderView(digestView({ day: DAY, kind: "day", channel_id: NEWS_CH, entries: AI.entries }, WEB), { ephemeral: false }) as never)
    );
    w.ch.sent.push(w.ch.make(card(news()) as never, "300000000000000999"));
    const earlier = w.ch.make(card(news()) as never);
    w.ch.sent.push(earlier);
    w.db.claim = "stale";
    await w.poster.poll();
    expect(w.ch.channel.send).not.toHaveBeenCalled();
    expect(w.draw).not.toHaveBeenCalled();
    expect(fnCalls(w, "shift_quest_news_mark")).toEqual([["shift_quest_news_mark", DAY, NEWS_CH, earlier.id]]);
  });

  it("on a stale claim with only a digest post in the channel, sends once", async () => {
    const w = world();
    w.ch.sent.push(
      w.ch.make(renderView(digestView({ day: DAY, kind: "day", channel_id: NEWS_CH, entries: AI.entries }, WEB), { ephemeral: false }) as never)
    );
    w.db.claim = "stale";
    await w.poster.poll();
    expect(w.ch.channel.send).toHaveBeenCalledTimes(1);
    expect(w.db.stored).toBe(w.ch.sent[1].id);
  });

  it("deletes its own card when another process recorded tonight's first", async () => {
    const w = world();
    w.db.beforeMark = () => {
      w.db.stored = "900000000000000777";
    };
    await w.poster.poll();
    expect(w.ch.channel.send).toHaveBeenCalledTimes(1);
    expect(w.ch.sent[0].delete).toHaveBeenCalledTimes(1);
  });

  it("retries a failed mark before anything else, so the night is neither posted twice nor lost", async () => {
    const w = world();
    w.db.markError = new QuestDbError("shift_quest_news_mark", "08006");
    await w.poster.poll();
    expect(w.ch.channel.send).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("SQLSTATE 08006"));
    await w.poster.poll();
    expect(w.ch.channel.send).toHaveBeenCalledTimes(1);
    expect(fnCalls(w, "shift_quest_news_post_next")).toHaveLength(1);
    w.db.markError = null;
    await w.poster.poll();
    expect(w.db.stored).toBe(w.ch.sent[0].id);
    expect(w.ch.sent[0].delete).not.toHaveBeenCalled();
    await w.poster.poll();
    expect(w.ch.channel.send).toHaveBeenCalledTimes(1);
  });

  it("takes its card back when the database refuses the mark", async () => {
    const w = world();
    w.db.markError = new QuestError("bad_input");
    await w.poster.poll();
    expect(w.ch.sent[0].delete).toHaveBeenCalledTimes(1);
  });

  it("does nothing while the gateway is disconnected, or after stop", async () => {
    const w = world();
    w.state.connected = false;
    await w.poster.poll();
    expect(w.db.calls).toEqual([]);
    w.state.connected = true;
    await w.poster.stop();
    await w.poster.poll();
    expect(w.db.calls).toEqual([]);
  });

  it.each([
    ["a channel of another server", { guildId: "100000000000000002" }],
    ["a forum", { type: ChannelType.GuildForum }],
    ["a voice channel", { type: ChannelType.GuildVoice }],
    ["a DM", { type: ChannelType.DM, guildId: undefined }],
  ])("never posts to %s and warns once", async (_label, over) => {
    const other = fakeChannel(OTHER_CH, over);
    const w = world(news({ channel_id: OTHER_CH }), { [OTHER_CH]: other.channel });
    await w.poster.poll();
    await w.poster.poll();
    expect(other.channel.send).not.toHaveBeenCalled();
    expect(fnCalls(w, "shift_quest_news_claim")).toEqual([]);
    expect((console.warn as jest.Mock).mock.calls).toHaveLength(1);
  });

  it("posts to a plain text channel too", async () => {
    const text = fakeChannel(OTHER_CH, { type: ChannelType.GuildText });
    const w = world(news({ channel_id: OTHER_CH }), { [OTHER_CH]: text.channel });
    await w.poster.poll();
    expect(text.channel.send).toHaveBeenCalledTimes(1);
  });
});

describe("startNewsPost: keeping the last 7 days' cards true", () => {
  /** Posts tonight's card (with the picture) and returns it. */
  async function posted(w: ReturnType<typeof world>) {
    await w.poster.poll();
    return w.ch.sent[0];
  }

  it("edits a late AI summary into the same card, re-attaching the picture's own bytes", async () => {
    const w = world();
    const m = await posted(w);
    const url = [...m.attachments.values()][0].url;
    w.db.currentAi = AI;
    await w.poster.poll();
    expect(w.ch.channel.send).toHaveBeenCalledTimes(1);
    expect(m.edit).toHaveBeenCalledTimes(1);
    expect(w.download).toHaveBeenCalledWith(url);
    const edit = m.edit.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(edit).sort()).toEqual(["allowedMentions", "attachments", "components", "files", "flags"]);
    expect(edit.attachments).toEqual([]);
    const files = edit.files as AttachmentBuilder[];
    expect(files.map((f) => f.name)).toEqual([NEWS_GIF]);
    expect(files[0].attachment).toBe(GIF_BYTES);
    expect(mediaUrls(edit)).toEqual([`attachment://${NEWS_GIF}`]);
    expect(bodyText(edit)).toContain("แปลง 2 เกมฝึกภาษา");
    expect(bodyText(edit)).not.toContain(NEWS.pictureFailed);
    expect(edit.allowedMentions).toEqual({ parse: [] });
    // The card still has its picture, and nothing changes on the next check.
    expect([...m.attachments.values()].map((a) => a.name)).toEqual([NEWS_GIF]);
    await w.poster.poll();
    expect(m.edit).toHaveBeenCalledTimes(1);
    expect(m.crosspost).not.toHaveBeenCalled();
  });

  it("takes a hidden team's line out by an edit and keeps the card, its totals and its picture", async () => {
    const w = world(news({ ai: AI }));
    const m = await posted(w);
    w.db.currentAi = { kind: "day", entries: [AI.entries[1]] };
    await w.poster.poll();
    expect(m.edit).toHaveBeenCalledTimes(1);
    const edit = m.edit.mock.calls[0][0] as Record<string, unknown>;
    expect(bodyText(edit)).not.toContain("เกมฝึกภาษา");
    expect(bodyText(edit)).toContain("ร้านขนม");
    expect(bodyText(edit)).toContain("👣 แวะมาเช็กอิน **12** คน");
    expect((edit.files as AttachmentBuilder[]).map((f) => f.name)).toEqual([NEWS_GIF]);
    expect(bodyText(edit)).not.toContain(DIGEST.removed);

    // The AI switched off: the section goes, the card stays (never "taken down").
    w.db.currentAi = NO_AI;
    await w.poster.poll();
    const off = m.edit.mock.calls[1][0] as Record<string, unknown>;
    expect(bodyText(off)).not.toContain(NEWS.aiHeading);
    expect(bodyText(off)).toContain(NEWS.dayLine(DAY));
    expect(bodyText(off)).not.toContain(DIGEST.removed);
  });

  it("drops the picture only for a take-down whose picture cannot be kept", async () => {
    const w = world(news({ ai: AI }));
    const m = await posted(w);
    w.download.mockResolvedValue(null);
    w.db.currentAi = { kind: "day", entries: [AI.entries[1]] };
    await w.poster.poll();
    expect(m.edit).toHaveBeenCalledTimes(1);
    const edit = m.edit.mock.calls[0][0] as Record<string, unknown>;
    expect(edit.files).toEqual([]);
    expect(edit.attachments).toEqual([]);
    expect(mediaUrls(edit)).toEqual([]);
    expect(bodyText(edit)).toContain(NEWS.pictureFailed);
    expect(bodyText(edit)).not.toContain("เกมฝึกภาษา");
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("lost its picture to take a line down"));
  });

  it("holds an edit that only adds while the picture cannot be downloaded, then makes it with the picture", async () => {
    const w = world();
    const m = await posted(w);
    w.download.mockResolvedValueOnce(null);
    w.db.currentAi = AI;
    await w.poster.poll();
    expect(m.edit).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("the edit waits"));
    await w.poster.poll();
    expect(m.edit).toHaveBeenCalledTimes(1);
    expect(((m.edit.mock.calls[0][0] as Record<string, unknown>).files as AttachmentBuilder[]).map((f) => f.name)).toEqual([NEWS_GIF]);
  });

  it("retries a take-down without the picture when Discord refuses the picture (50013)", async () => {
    const w = world(news({ ai: AI }));
    const m = await posted(w);
    m.edit.mockRejectedValueOnce(missingPermissions());
    w.db.currentAi = NO_AI;
    await w.poster.poll();
    expect(m.edit).toHaveBeenCalledTimes(2);
    const second = m.edit.mock.calls[1][0] as Record<string, unknown>;
    expect(second.files).toEqual([]);
    expect(bodyText(second)).not.toContain(NEWS.aiHeading);
  });

  it("never drops the picture for an edit that only adds, even when Discord refuses it", async () => {
    const w = world();
    const m = await posted(w);
    m.edit.mockRejectedValueOnce(missingPermissions());
    w.db.currentAi = AI;
    await w.poster.poll();
    expect(m.edit).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("discord 50013"));
    expect([...m.attachments.values()].map((a) => a.name)).toEqual([NEWS_GIF]);
  });

  it("edits a card that went without a picture with no file at all", async () => {
    const w = world();
    w.draw.mockResolvedValueOnce([]);
    const m = await posted(w);
    w.db.currentAi = AI;
    await w.poster.poll();
    expect(w.download).not.toHaveBeenCalled();
    const edit = m.edit.mock.calls[0][0] as Record<string, unknown>;
    expect(edit.files).toEqual([]);
    expect(edit.attachments).toEqual([]);
    expect(bodyText(edit)).toContain(NEWS.pictureFailed);
  });

  it("after a restart, reads each card once and edits nothing when it already reads the same", async () => {
    const w = world(news({ ai: AI }));
    const m = await posted(w);
    await w.poster.stop();
    const fresh = w.restart();
    await fresh.poll();
    expect(idFetches(w)).toBe(1);
    expect(m.edit).not.toHaveBeenCalled();
    await fresh.poll();
    expect(idFetches(w)).toBe(1);
  });

  it("after a restart, edits a card that reads differently, keeping its picture", async () => {
    const w = world();
    const m = await posted(w);
    await w.poster.stop();
    w.db.currentAi = AI;
    const fresh = w.restart();
    await fresh.poll();
    expect(m.edit).toHaveBeenCalledTimes(1);
    expect(((m.edit.mock.calls[0][0] as Record<string, unknown>).files as AttachmentBuilder[]).map((f) => f.name)).toEqual([NEWS_GIF]);
  });

  it("remembers a card staff deleted (10008) and stops fetching it", async () => {
    const w = world();
    await posted(w);
    w.ch.sent.length = 0;
    w.db.currentAi = AI;
    await w.poster.poll();
    await w.poster.poll();
    expect(idFetches(w)).toBe(1);
  });

  it("keeps the picture's PNG name when the card went with the still picture", async () => {
    const w = world();
    w.draw.mockResolvedValueOnce([new AttachmentBuilder(Buffer.from("png"), { name: NEWS_PNG, description: NEWS.pictureAlt })]);
    const m = await posted(w);
    w.db.currentAi = AI;
    await w.poster.poll();
    const edit = m.edit.mock.calls[0][0] as Record<string, unknown>;
    expect((edit.files as AttachmentBuilder[]).map((f) => f.name)).toEqual([NEWS_PNG]);
    expect(mediaUrls(edit)).toEqual([`attachment://${NEWS_PNG}`]);
  });
});
