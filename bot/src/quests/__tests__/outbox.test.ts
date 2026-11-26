/**
 * @jest-environment node
 */
import fs from "node:fs";
import path from "node:path";

import { MessageFlags, type Client } from "discord.js";

import { MAIN_TITLES, makeBoard } from "@/components/shift/island/__fixtures__/board";
import type { QuestBoard } from "@/lib/supabase/shift-quests/types";

import type { QuestApi } from "../api";
import { AWAY_DM, NUDGE_DM, T, TREE_GREW, renderOutbox } from "../copy";
import { DIGEST } from "../digestCopy";
import { STAGE_NAMES } from "../island/copy";
import { NEWS } from "../newsCopy";
import type { IslandPlot } from "../island/render";
import {
  PING_NAMED_TEAMS,
  TREE_GREW_REACTIONS,
  awayNext,
  awayRows,
  deliver,
  outboxView,
  renderDelivery,
  renderTreeGrew,
  treeGrewParams,
  type Claimed,
} from "../outbox";
import { LIMITS, NO_MENTIONS, TONE_COLORS, renderView, setCommandIds } from "../ui";
import { accentColor, bodyText, cardsOf, componentCount, customIds, mediaUrls, textLength, viewText } from "../test-helpers/view";

const MIGRATIONS = path.join(__dirname, "..", "..", "..", "..", "supabase", "migrations");

/** Every kind the database queues, plus the ones the bot itself knows about. */
function queuedKinds(): string[] {
  const sql = fs
    .readdirSync(MIGRATIONS)
    .filter((f) => f.includes("shift_quest"))
    .map((f) => fs.readFileSync(path.join(MIGRATIONS, f), "utf8"))
    .join("\n");
  // The DMs the database queues itself (nudge, reminder and, from schema 23, away), plus the posts it shares.
  const kinds = new Set<string>(["celebration", "recognition", "intention", "nudge", "reminder", "away", "island_weekly"]);
  for (const match of sql.matchAll(/shift_quest__post\(\s*[^,]+,\s*'[a-z]+',\s*'([a-z_]+)'\s*,/g)) kinds.add(match[1]);
  return [...kinds];
}

function plot(slot: number, name: string | null = null): IslandPlot {
  return { slot, stage: slot % 8, visitor: false, key: false, helper: false, lantern: false, name, mine: false };
}

function fakeClient() {
  const channelSend = jest.fn(async (_payload: unknown) => ({ id: "post-1" }));
  const userSend = jest.fn(async (_payload: unknown) => ({ id: "dm-1" }));
  const client = {
    users: { fetch: jest.fn(async () => ({ send: userSend })) },
    channels: { fetch: jest.fn(async () => ({ isSendable: () => true, send: channelSend })) },
  };
  return { client: client as unknown as Client, channelSend, userSend };
}

function fakeApi(map: unknown = { plots: [], season: null }): QuestApi {
  return {
    call: jest.fn(async (fn: string) => (fn === "shift_quest_island_post_map" ? map : null)),
    rows: jest.fn(),
  } as unknown as QuestApi;
}

function claimed(over: Partial<Claimed>): Claimed {
  return {
    id: "o-1",
    kind: "review_needed",
    params: {},
    channel_id: "900",
    dm_user_id: null,
    member_user_id: null,
    peer_user_id: null,
    attempts: 0,
    ...over,
  };
}

/** What a Discord client was asked to send. */
function sentPayload(send: jest.Mock): { flags: number; allowedMentions: unknown; files: unknown[]; components: unknown[] } {
  expect(send).toHaveBeenCalledTimes(1);
  return send.mock.calls[0][0];
}

afterEach(() => setCommandIds(new Map()));

describe("outbox cards", () => {
  it("renders every kind the database queues as one heading-first card within Discord's limits", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const long = "ก".repeat(2000);
      for (const kind of queuedKinds()) {
        const post = renderDelivery(
          kind,
          { title: long, summary: long, body: long, item: long, revision: 2, goal_count: 3, goal_target: 10, open_quests: 2 },
          "111",
          "222"
        );
        expect([kind, post === null]).toEqual([kind, false]);
        const card = renderView(outboxView(kind, post!), { ephemeral: false });
        expect([kind, card.flags]).toEqual([kind, MessageFlags.IsComponentsV2]);
        expect([kind, bodyText(card).startsWith(`### ${post!.title}\n`) || bodyText(card) === `### ${post!.title}`]).toEqual([kind, true]);
        expect(componentCount(card)).toBeLessThanOrEqual(LIMITS.components);
        expect(textLength(card)).toBeLessThanOrEqual(LIMITS.text);
        // No em dashes (house copy rule).
        expect([kind, viewText(card).includes("—")]).toEqual([kind, false]);
      }
      // Student text is capped before it reaches the card, so nothing had to be trimmed.
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("colours staff notices, celebrations and the island differently", () => {
    const tone = (kind: string) => accentColor(renderView(outboxView(kind, renderOutbox(kind, { title: "t", body: "b" }, "1", "2")!)));
    expect(tone("review_needed")).toBe(TONE_COLORS.staff);
    expect(tone("data_request")).toBe(TONE_COLORS.staff);
    expect(tone("celebration")).toBe(TONE_COLORS.success);
    expect(tone("island_weekly")).toBe(TONE_COLORS.island);
    expect(tone("nudge")).toBe(TONE_COLORS.neutral);
  });

  it("puts the facts in the body and where to act in the fine print", () => {
    const review = renderView(outboxView("review_needed", renderOutbox("review_needed", { title: "ร้านขนม", revision: 2 }, null, null)!));
    expect(bodyText(review)).toBe("### 📝 งานรอรีวิว\n**ร้านขนม** · ครั้งที่ 2\n-# เปิดด้วย /review queue");
    const appeal = renderOutbox("review_needed", { title: "ร้านขนม", revision: 2, appeal: true }, null, null)!;
    expect(appeal.title).toBe("📝 อุทธรณ์ใหม่");
    const erasure = renderView(outboxView("data_request", renderOutbox("data_request", { kind: "erasure" }, null, null)!));
    expect(bodyText(erasure)).toBe("### 🔒 คำขอลบข้อมูลใหม่\n-# ดูที่ /admin data");
    const ownership = renderOutbox("help_mentors", { source: "ownership", item: "access" }, "111", null)!;
    expect(ownership.title).toBe("🔑 ติดเรื่องความเป็นเจ้าของงาน");
    expect(ownership.body).toBe("<@111> · เข้าถึงงานได้เอง");
    expect(ownership.mentionUserIds).toEqual(["111"]);
  });

  it("quotes student words and keeps them from shouting, hiding links or pinging", () => {
    const post = renderOutbox(
      "celebration",
      { title: "# เกม", body: "# ตัวใหญ่\n[กดตรงนี้](https://evil.example)\n@everyone มาดู" },
      "111",
      null
    )!;
    const text = bodyText(renderView(outboxView("celebration", post), { ephemeral: false }));
    expect(text).toContain("<@111> ผ่านเควสต์ **\\# เกม**");
    expect(text).toContain("> \\# ตัวใหญ่");
    expect(text).toContain("> \\[กดตรงนี้](https://evil.example)");
    expect(text).not.toContain("@everyone");
    // Only the heading is a heading.
    expect(text.split("\n").filter((line) => /^(> )?#{1,3} /.test(line))).toEqual(["### 🎉 แชร์ความสำเร็จ"]);
    expect(renderOutbox("recognition", { body: "ขอบคุณที่ช่วยทดสอบ" }, "111", "222")!.body).toBe("<@111> ขอบคุณ <@222>\n> ขอบคุณที่ช่วยทดสอบ");
  });

  it("the missed-night note (schema 20): the day, what to check, staff colours, nobody pinged", () => {
    expect(queuedKinds()).toContain("news_missed");
    const post = renderOutbox("news_missed", { day: "2026-11-18" }, null, null)!;
    expect(post.mentionUserIds).toEqual([]);
    const card = renderView(outboxView("news_missed", post), { ephemeral: false });
    expect(bodyText(card)).toBe(
      [
        "### ⚠️ ข่าวเกาะคืนนี้ยังไม่ได้โพสต์",
        "ถึง 4 ทุ่มครึ่งแล้ว การ์ดข่าวเกาะวันที่ 18 พ.ย. 2569 ยังไม่ขึ้นในห้องข่าวเกาะ",
        "เช็กสิทธิ์ของบอทในห้องข่าวเกาะ: ดูห้อง และส่งข้อความ ถ้าครบแล้ว บอทอาจออฟไลน์ช่วง 2 ทุ่ม แจ้งคนดูแลบอทให้ดู log คำว่า nightly island news",
        "-# แก้ก่อนเที่ยงคืน บอทอาจยังโพสต์การ์ดฉบับนี้ได้ ถ้าไม่ทัน การ์ดคืนถัดไปจะโพสต์ 2 ทุ่มเมื่อแก้แล้ว",
      ].join("\n")
    );
    expect(accentColor(card)).toBe(TONE_COLORS.staff);
    expect(viewText(card)).not.toMatch(/[—–]/);
    // The bot retries a failed card until midnight: never "nothing more tonight", never a relative "tomorrow"
    // (staff often read it the next morning), never a command that cannot show why (/admin island).
    expect(viewText(card)).not.toMatch(/พรุ่งนี้|ลองใหม่เอง|ไม่เริ่มการ์ดใหม่|\/admin island/);
    // Only the permissions that stop a post: without Attach Files the card goes out without its picture.
    expect(viewText(card)).not.toMatch(/แนบไฟล์|อ่านประวัติข้อความ/);
    // Never the card's issue line or the digest's: the bot finds its own card of the day by those.
    expect(viewText(card)).not.toContain(NEWS.dayLine("2026-11-18"));
    expect(viewText(card)).not.toContain(DIGEST.dayLine("2026-11-18"));
    // A missing or odd day still reads right.
    for (const day of [undefined, null, "18/11/2026", 42]) {
      expect(renderOutbox("news_missed", { day }, null, null)!.body.split("\n")[0]).toBe(
        "ถึง 4 ทุ่มครึ่งแล้ว การ์ดข่าวเกาะคืนนี้ ยังไม่ขึ้นในห้องข่าวเกาะ"
      );
    }
  });

  it("shows the island goal as a short bar, full only once reached", () => {
    const goal = (count: number, target: number) => renderOutbox("island_weekly", { goal_count: count, goal_target: target }, null, null)!.body;
    expect(goal(3, 10)).toBe("🎯 เป้าหมายของเกาะ ▰▰▰▱▱▱▱▱▱▱ **3**/10 โปรเจกต์");
    expect(goal(2, 5)).toBe("🎯 เป้าหมายของเกาะ ▰▰▱▱▱ **2**/5 โปรเจกต์");
    expect(goal(29, 30)).toContain("▰▰▰▰▰▰▰▰▰▱ **29**/30");
    expect(goal(12, 10)).toContain("▰▰▰▰▰▰▰▰▰▰ **12**/10");
    expect(renderOutbox("island_weekly", {}, null, null)!.body).toBe("");
  });
});

describe("deliver", () => {
  it("posts to a channel as a Components V2 card that pings only the people it is about", async () => {
    const { client, channelSend, userSend } = fakeClient();
    const id = await deliver(client, fakeApi(), claimed({ kind: "help_community", params: { summary: "ติดเรื่อง API" }, member_user_id: "111" }));
    expect(id).toBe("post-1");
    expect(userSend).not.toHaveBeenCalled();
    const payload = sentPayload(channelSend);
    expect(payload.flags).toBe(MessageFlags.IsComponentsV2);
    expect(payload.allowedMentions).toEqual({ users: ["111"], parse: [] });
    expect(Object.keys(payload)).not.toContain("content");
    expect(cardsOf(payload)).toHaveLength(1);
    expect(bodyText(payload)).toBe("### 🙋 ขอความช่วยเหลือ\n<@111>\n> ติดเรื่อง API\n-# ใครช่วยได้ ตอบในห้องนี้ได้เลย");
  });

  it("makes commands clickable in channel posts once their IDs are loaded", async () => {
    setCommandIds(new Map([["review queue", "777"]]));
    const { client, channelSend } = fakeClient();
    await deliver(client, fakeApi(), claimed({ params: { title: "ร้านขนม", revision: 1 } }));
    expect(bodyText(sentPayload(channelSend))).toContain("-# เปิดด้วย </review queue:777>");
  });

  it("sends DM nudges as small cards that ping nobody and name commands as plain text", async () => {
    setCommandIds(new Map([["inbox", "555"], ["work start", "666"], ["settings", "888"]]));
    const { client, channelSend, userSend } = fakeClient();
    await deliver(client, fakeApi(), claimed({ kind: "nudge", channel_id: null, dm_user_id: "111" }));
    const nudge = sentPayload(userSend);
    expect(channelSend).not.toHaveBeenCalled();
    expect(nudge.flags).toBe(MessageFlags.IsComponentsV2);
    expect(nudge.allowedMentions).toEqual(NO_MENTIONS);
    expect(bodyText(nudge)).toBe(`### ${T.dmNudgeTitle}\n${T.dmNudge}\n-# ${NUDGE_DM.off}\n-# ${T.dmNoReplies}`);
    // Content-free: it points at the island (the link button, when there is an address) and names nothing.
    expect(T.dmNudgeTitle).toContain("บนเกาะ");
    expect(bodyText(nudge)).not.toContain("</inbox:");

    userSend.mockClear();
    await deliver(client, fakeApi(), claimed({ kind: "reminder", params: { open_quests: 2 }, channel_id: null, dm_user_id: "111" }));
    const reminder = bodyText(sentPayload(userSend));
    expect(reminder).toBe(
      "### ⏰ ถึงเวลาที่คุณตั้งไว้แล้ว\nมีเควสต์เปิดอยู่ **2** อัน\nเปิดเกาะแล้วเริ่มจากการ์ดด้านล่างได้เลย\n-# ปิดการเตือนได้ที่ /settings\n-# บอทนี้ไม่อ่านหรือตอบข้อความส่วนตัว"
    );
    expect(renderOutbox("reminder", { open_quests: 0 }, null, null)!.body).toBe("เปิดเกาะแล้วเริ่มจากการ์ดด้านล่างได้เลย");
  });

  it("puts the weekly island picture above the heading and the consented names below", async () => {
    const plots = [plot(3, "ร้าน [ลิงก์](https://x.example)"), plot(1, "เกม"), plot(2), ...Array.from({ length: 32 }, (_, k) => plot(k + 4, `ทีม${k + 4}`))];
    const { client, channelSend } = fakeClient();
    await deliver(client, fakeApi({ plots, season: null }), claimed({ kind: "island_weekly", params: { goal_count: 3, goal_target: 10 } }));
    const payload = sentPayload(channelSend);
    expect(payload.flags).toBe(MessageFlags.IsComponentsV2);
    expect(payload.allowedMentions).toEqual({ users: [], parse: [] });
    expect(payload.files).toHaveLength(1);
    expect(mediaUrls(payload)).toEqual(["attachment://shift-island.png"]);
    const card = cardsOf(payload)[0] as { components: { type: number }[] };
    expect(card.components[0].type).toBe(12);
    const text = bodyText(payload);
    expect(text.startsWith("### 🏝️ เกาะ SHIFT High สัปดาห์นี้\n🎯 เป้าหมายของเกาะ ▰▰▰▱▱▱▱▱▱▱ **3**/10 โปรเจกต์\n-# 🪧 ป้ายชื่อบนเกาะ: #1 เกม · #3 ร้าน \\[ลิงก์](https://x.example) · #4 ทีม4")).toBe(true);
    // 34 named plots (#1, #3, #4 to #35): 30 shown in slot order, the rest counted.
    expect(text).toContain("#31 ทีม31 · และอีก 4");
    expect(text).not.toContain("#32 ");
    expect(componentCount(payload)).toBeLessThanOrEqual(LIMITS.components);
  });

  it("sends the missed-night note to the channel the database resolved (the staff channel), pinging nobody", async () => {
    const { client, channelSend, userSend } = fakeClient();
    const api = fakeApi();
    const id = await deliver(client, api, claimed({ kind: "news_missed", params: { day: "2026-11-18" }, channel_id: "901" }));
    expect(id).toBe("post-1");
    expect(client.channels.fetch).toHaveBeenCalledWith("901");
    expect(userSend).not.toHaveBeenCalled();
    const payload = sentPayload(channelSend);
    expect(payload.allowedMentions).toEqual({ users: [], parse: [] });
    expect(payload.files).toEqual([]);
    expect(bodyText(payload)).toContain("การ์ดข่าวเกาะวันที่ 18 พ.ย. 2569");
    // Nothing is read at send time: the day is all it needs.
    expect(api.call).not.toHaveBeenCalled();
  });

  it("still posts the weekly island text when the picture cannot be drawn", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const { client, channelSend } = fakeClient();
      await deliver(client, fakeApi({ plots: [plot(0, "เกม")], season: null }), claimed({ kind: "island_weekly", params: {} }));
      const payload = sentPayload(channelSend);
      expect(payload.files).toEqual([]);
      expect(mediaUrls(payload)).toEqual([]);
      expect(bodyText(payload)).toBe("### 🏝️ เกาะ SHIFT High สัปดาห์นี้\n-# 🪧 ป้ายชื่อบนเกาะ: #0 เกม");
      expect(error).toHaveBeenCalledWith(expect.stringContaining("island picture skipped"));
    } finally {
      error.mockRestore();
    }
  });

  it("fails an unknown kind permanently without sending anything", async () => {
    const { client, channelSend, userSend } = fakeClient();
    await expect(deliver(client, fakeApi(), claimed({ kind: "mystery" }))).rejects.toMatchObject({ permanent: true });
    expect(channelSend).not.toHaveBeenCalled();
    expect(userSend).not.toHaveBeenCalled();
  });
});

describe("tree_grew: the celebrate post when a mentor's approval grows a tree", () => {
  // Synthetic ids and a made-up team.
  const A = "100000000000000001";
  const B = "100000000000000002";
  const PROJECT = "11111111-1111-4111-8111-111111111111";
  const QUEST = "22222222-2222-4222-8222-222222222222";
  const queued = { project_id: PROJECT, instance_id: QUEST, milestone: 3, stage: 3 };
  const named = { slot: 4, title: "ได้พันธมิตรคนแรก", name: "ร้านขนมปังของเรา", team_user_ids: [A, B] };
  const mystery = { slot: 4, title: "ได้พันธมิตรคนแรก", name: null, team_user_ids: [] };
  const WEB = "https://island.example/shift/island";
  const savedIsland = process.env.SHIFT_ISLAND_URL;

  function treeApi(read: unknown): QuestApi {
    return { call: jest.fn(async (fn: string) => (fn === "shift_quest_tree_post" ? read : null)), rows: jest.fn() } as unknown as QuestApi;
  }

  function reactingClient(react: jest.Mock = jest.fn(async () => undefined)) {
    const channelSend = jest.fn(async (_payload: unknown) => ({ id: "post-1", react }));
    const client = { users: { fetch: jest.fn() }, channels: { fetch: jest.fn(async () => ({ isSendable: () => true, send: channelSend })) } };
    return { client: client as unknown as Client, channelSend, react };
  }

  /** Link buttons' URLs in a sent card. */
  function linkUrls(payload: unknown): string[] {
    const urls: string[] = [];
    const visit = (c: { url?: string; components?: unknown[] }) => {
      if (typeof c.url === "string") urls.push(c.url);
      for (const child of c.components ?? []) visit(child as { url?: string; components?: unknown[] });
    };
    for (const card of cardsOf(payload)) visit(card as { url?: string; components?: unknown[] });
    return urls;
  }

  beforeEach(() => {
    process.env.SHIFT_ISLAND_URL = WEB;
  });
  afterEach(() => {
    if (savedIsland === undefined) delete process.env.SHIFT_ISLAND_URL;
    else process.env.SHIFT_ISLAND_URL = savedIsland;
  });

  it("names a team that shows its name, says which main quest and the new stage, and pings its members", () => {
    const post = renderTreeGrew({ ...queued, ...named });
    expect(post.title).toBe("🎉 ต้นไม้โตอีกขั้น");
    expect(post.body).toBe(
      [
        "**ร้านขนมปังของเรา** · แปลง #4",
        "ผ่านเควสต์หลักที่ 3 **ได้พันธมิตรคนแรก** แล้ว",
        "🌿 ▰▰▰▱▱▱▱ ต้นอ่อน **3**/7",
        `<@${A}> <@${B}> ยินดีด้วย! ต้นไม้โตขึ้นจากงานที่ทีมลงมือทำจริง`,
      ].join("\n")
    );
    expect(post.note).toBe("");
    expect(post.mentionUserIds).toEqual([A, B]);
  });

  it("calls a team that has not shown its name ทีมปริศนา with its plot, pings nobody and invites it lightly", () => {
    const post = renderTreeGrew({ ...queued, ...mystery, team_user_ids: [A] });
    expect(post.body).toBe(
      [
        "**ทีมปริศนา** · แปลง #4",
        "ผ่านเควสต์หลักที่ 3 **ได้พันธมิตรคนแรก** แล้ว",
        "🌿 ▰▰▰▱▱▱▱ ต้นอ่อน **3**/7",
        "ยินดีด้วย! ต้นไม้โตขึ้นจากงานที่ทีมลงมือทำจริง",
      ].join("\n")
    );
    expect(post.note).toBe(TREE_GREW.showName);
    expect(post.mentionUserIds).toEqual([]);
    expect(post.body).not.toContain("<@");
  });

  it("shows every stage by its name, with the bar full only at 7", () => {
    for (let stage = 1; stage <= 7; stage += 1) {
      const line = renderTreeGrew({ ...queued, ...named, stage }).body.split("\n")[2];
      expect(line).toBe(`${TREE_GREW.stageEmoji[stage]} ${"▰".repeat(stage)}${"▱".repeat(7 - stage)} ${STAGE_NAMES[stage]} **${stage}**/7`);
    }
  });

  it("escapes the team's name and the title, and pings only real Discord ids, once each", () => {
    const post = renderTreeGrew({
      ...queued,
      name: "# ทีม [ลิงก์](https://evil.example) @everyone",
      title: "**ตัวหนา**",
      team_user_ids: [A, A, "<@&123>", "everyone", 42, B],
    });
    const text = bodyText(renderView(outboxView("tree_grew", post), { ephemeral: false }));
    expect(text).toContain("\\# ทีม \\[ลิงก์](https://evil.example) @\u200beveryone");
    expect(text).toContain("**\\*\\*ตัวหนา\\*\\***");
    expect(text.split("\n").filter((line) => /^(> )?#{1,3} /.test(line))).toEqual(["### 🎉 ต้นไม้โตอีกขั้น"]);
    expect(post.mentionUserIds).toEqual([A, B]);
  });

  it("still reads well with missing parts", () => {
    const post = renderTreeGrew({ stage: 99, milestone: "x" });
    expect(post.body.split("\n").slice(0, 3)).toEqual(["**ทีมปริศนา**", "ผ่านเควสต์หลักแล้ว", "🟫 ▱▱▱▱▱▱▱ ที่ดินว่าง **0**/7"]);
  });

  it("puts a space before แล้ว only after a quest number or a title", () => {
    expect(TREE_GREW.quest(3, "ได้พันธมิตรคนแรก")).toBe("ผ่านเควสต์หลักที่ 3 **ได้พันธมิตรคนแรก** แล้ว");
    expect(TREE_GREW.quest(3, null)).toBe("ผ่านเควสต์หลักที่ 3 แล้ว");
    expect(TREE_GREW.quest(null, "ได้พันธมิตรคนแรก")).toBe("ผ่านเควสต์หลัก **ได้พันธมิตรคนแรก** แล้ว");
    // Neither: no stray space before แล้ว.
    expect(TREE_GREW.quest(null, null)).toBe("ผ่านเควสต์หลักแล้ว");
    expect(TREE_GREW.quest(0, "")).toBe("ผ่านเควสต์หลักแล้ว");
  });

  it("keeps the house copy rules: no em dash, no น้องๆ, no 'not passed' or 'needs more', no mentor words", () => {
    const words = [renderTreeGrew({ ...queued, ...named }), renderTreeGrew({ ...queued, ...mystery })]
      .map((p) => [p.title, p.body, p.note].join("\n"))
      .join("\n");
    for (const banned of ["—", "น้องๆ", "น้อง ๆ", "ยังไม่ผ่าน", "ขอข้อมูลเพิ่ม", "ความเห็น", "feedback"]) {
      expect([banned, words.includes(banned)]).toEqual([banned, false]);
    }
  });

  it("reads the plot, title, name and members when it sends, keeping the members only for a named team", async () => {
    const api = treeApi(named);
    const params = await treeGrewParams(api, queued);
    expect(api.call).toHaveBeenCalledWith("shift_quest_tree_post", PROJECT, QUEST);
    expect(params).toEqual({ ...queued, ...named });
    expect((await treeGrewParams(treeApi(named), queued, false)).team_user_ids).toEqual([]);
    expect((await treeGrewParams(treeApi({ ...mystery, team_user_ids: [A] }), queued)).team_user_ids).toEqual([]);
    expect(PING_NAMED_TEAMS).toBe(true);
  });

  it("posts the card with the island link, pings only the team, and adds its own 🎉 and 🌱", async () => {
    const { client, channelSend, react } = reactingClient();
    const id = await deliver(client, treeApi(named), claimed({ kind: "tree_grew", params: queued }));
    expect(id).toBe("post-1");
    const payload = sentPayload(channelSend);
    expect(payload.flags).toBe(MessageFlags.IsComponentsV2);
    expect(payload.allowedMentions).toEqual({ users: [A, B], parse: [] });
    expect(accentColor(payload)).toBe(TONE_COLORS.success);
    expect(bodyText(payload).startsWith("### 🎉 ต้นไม้โตอีกขั้น\n**ร้านขนมปังของเรา** · แปลง #4\n")).toBe(true);
    expect(linkUrls(payload)).toEqual([WEB]);
    expect(react.mock.calls.map((c) => c[0])).toEqual([...TREE_GREW_REACTIONS]);
    expect(TREE_GREW_REACTIONS).toEqual(["🎉", "🌱"]);
  });

  it("pings nobody for a mystery team and leaves the link out when the island has no address", async () => {
    delete process.env.SHIFT_ISLAND_URL;
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    try {
      const { client, channelSend } = reactingClient();
      await deliver(client, treeApi(mystery), claimed({ kind: "tree_grew", params: queued }));
      const payload = sentPayload(channelSend);
      expect(payload.allowedMentions).toEqual({ users: [], parse: [] });
      expect(bodyText(payload)).toContain("**ทีมปริศนา** · แปลง #4");
      expect(bodyText(payload)).toContain(`-# ${TREE_GREW.showName}`);
      expect(linkUrls(payload)).toEqual([]);
    } finally {
      if (site !== undefined) process.env.NEXT_PUBLIC_SITE_URL = site;
    }
  });

  it("never fails a sent post because a reaction failed (a retry would cheer twice)", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const react = jest.fn(async () => {
        throw new Error("Missing Permissions");
      });
      const { client } = reactingClient(react);
      await expect(deliver(client, treeApi(named), claimed({ kind: "tree_grew", params: queued }))).resolves.toBe("post-1");
      expect(react).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalledWith("[shift-quests] reactions skipped: Missing Permissions");
    } finally {
      error.mockRestore();
    }
  });

  it("fails permanently, sending nothing, when the project is gone", async () => {
    const { client, channelSend } = reactingClient();
    await expect(deliver(client, treeApi(null), claimed({ kind: "tree_grew", params: queued }))).rejects.toMatchObject({ permanent: true });
    expect(channelSend).not.toHaveBeenCalled();
  });

  it("is not a kind the plain renderer knows, so nothing renders it without the send-time read", () => {
    expect(renderOutbox("tree_grew", queued, null, null)).toBeNull();
    expect(renderDelivery("tree_grew", queued, null, null)?.title).toBe(TREE_GREW.title);
  });
});

describe("away: the come-back DM (schema 23)", () => {
  const WEB = "https://island.example/shift/island";
  const SAVED = { island: process.env.SHIFT_ISLAND_URL, site: process.env.NEXT_PUBLIC_SITE_URL };
  /** Words the come-back DM never says: guilt, counting, a day, a question, talking down (AGENTS.md, the island's rules). */
  const BANNED = ["ยังไม่ได้", "พลาด", "เมื่อวาน", "หายไป", "สตรีค", "ติดต่อกัน", "ไหม", "ทำไม", "น้องๆ", "น้อง ๆ", "เด็กๆ", "พรุ่งนี้", "—", "–"];

  type ButtonJson = { type: number; style?: number; url?: string; custom_id?: string; label?: string; components?: ButtonJson[] };

  /** The card's action rows, each as its buttons' JSON. */
  function rowsOf(payload: unknown): ButtonJson[][] {
    const card = cardsOf(payload)[0] as unknown as ButtonJson;
    return (card.components ?? []).filter((c) => c.type === 1).map((row) => row.components ?? []);
  }

  async function sendAway(params: Record<string, unknown> = {}) {
    const { client, channelSend, userSend } = fakeClient();
    const api = fakeApi();
    const id = await deliver(client, api, claimed({ kind: "away", params, channel_id: null, dm_user_id: "111", member_user_id: "111" }));
    return { id, api, client, channelSend, userSend };
  }

  beforeEach(() => {
    process.env.SHIFT_ISLAND_URL = WEB;
  });
  afterEach(() => {
    if (SAVED.island === undefined) delete process.env.SHIFT_ISLAND_URL;
    else process.env.SHIFT_ISLAND_URL = SAVED.island;
    if (SAVED.site === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = SAVED.site;
  });

  it("is a title, one line, why it came and the no-replies line, the same for everyone", () => {
    const post = renderOutbox("away", {}, "111", null)!;
    expect(post).toEqual({
      title: AWAY_DM.title,
      body: AWAY_DM.body,
      note: `${AWAY_DM.why}\n${T.dmNoReplies}`,
      mentionUserIds: [],
    });
    // One line of body; nothing the database might pass ever reaches it.
    expect(post.body.split("\n")).toHaveLength(1);
    expect(renderOutbox("away", { title: "ร้านขนม", days: 9, name: "ทีม", open_quests: 3 }, "111", "222")).toEqual(post);
    expect(renderDelivery("away", {}, null, null)).toEqual(post);
  });

  it("sends a DM card whose only row is the island's link button: no interaction, nobody pinged", async () => {
    // Loaded command ids never turn /settings into a mention in a DM (the commands are guild-only).
    setCommandIds(new Map([["settings", "888"]]));
    const { id, api, client, channelSend, userSend } = await sendAway();
    expect(id).toBe("dm-1");
    expect(channelSend).not.toHaveBeenCalled();
    expect(client.users.fetch).toHaveBeenCalledWith("111");
    // One read at send time: the student's own board, for the next quest (here it fails, so the plain line).
    expect((api.call as jest.Mock).mock.calls).toEqual([["shift_quest_board", "111"]]);
    const payload = sentPayload(userSend);
    expect(payload.flags).toBe(MessageFlags.IsComponentsV2);
    expect(payload.allowedMentions).toEqual(NO_MENTIONS);
    expect(payload.files).toEqual([]);
    expect(cardsOf(payload)).toHaveLength(1);
    expect(accentColor(payload)).toBe(TONE_COLORS.island);
    expect(bodyText(payload)).toBe(`### ${AWAY_DM.title}\n${AWAY_DM.body}\n-# ${AWAY_DM.why}\n-# ${T.dmNoReplies}`);
    expect(bodyText(payload)).toContain("/settings ในเซิร์ฟเวอร์");
    expect(bodyText(payload)).not.toContain("</settings:");
    const rows = rowsOf(payload);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual([{ type: 2, style: 5, url: WEB, label: "🌐 เปิดเกาะบนเว็บ" }]);
    // Link buttons only: no custom id anywhere, so there is nothing to press that reaches the bot.
    expect(customIds(payload)).toEqual([]);
    expect(componentCount(payload)).toBeLessThanOrEqual(LIMITS.components);
  });

  it("asks nothing, counts nothing and carries no guilt", async () => {
    const { userSend } = await sendAway({ days: 9 });
    const text = viewText(sentPayload(userSend));
    const words = [AWAY_DM.title, AWAY_DM.body, AWAY_DM.why, text].join("\n");
    // No question mark (Thai or Latin), no digits (Arabic or Thai): never a day count, a date or a number of anything.
    expect(words).not.toMatch(/[?？]/);
    expect(words).not.toMatch(/[0-9๐-๙]/);
    for (const banned of BANNED) expect([banned, words.includes(banned)]).toEqual([banned, false]);
  });

  it("fails permanently, sending nothing, when the island has no address: a DM must point somewhere", async () => {
    delete process.env.SHIFT_ISLAND_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(() => awayRows()).toThrow("no island address");
    const { client, channelSend, userSend } = fakeClient();
    await expect(
      deliver(client, fakeApi(), claimed({ kind: "away", channel_id: null, dm_user_id: "111" }))
    ).rejects.toMatchObject({ permanent: true, message: "no island address" });
    expect(client.users.fetch).not.toHaveBeenCalled();
    expect(userSend).not.toHaveBeenCalled();
    expect(channelSend).not.toHaveBeenCalled();
  });

  it("is never posted to a channel, even if one is given", async () => {
    const { client, channelSend, userSend } = fakeClient();
    await expect(deliver(client, fakeApi(), claimed({ kind: "away", channel_id: "900", dm_user_id: null }))).rejects.toMatchObject({
      permanent: true,
    });
    expect(client.channels.fetch).not.toHaveBeenCalled();
    expect(channelSend).not.toHaveBeenCalled();
    expect(userSend).not.toHaveBeenCalled();
  });

  it("gives every other DM the island's link too, and sends it without one when the island has no address", async () => {
    const link = [{ type: 2, style: 5, url: WEB, label: "🌐 เปิดเกาะบนเว็บ" }];
    for (const kind of ["nudge", "reminder"]) {
      const { client, userSend } = fakeClient();
      await deliver(client, fakeApi(), claimed({ kind, params: { open_quests: 1 }, channel_id: null, dm_user_id: "111" }));
      expect([kind, rowsOf(sentPayload(userSend))]).toEqual([kind, [link]]);
      expect(customIds(sentPayload(userSend))).toEqual([]);
    }
    delete process.env.SHIFT_ISLAND_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const { client, userSend } = fakeClient();
    await deliver(client, fakeApi(), claimed({ kind: "nudge", channel_id: null, dm_user_id: "111" }));
    expect(rowsOf(sentPayload(userSend))).toEqual([]);
  });
});

describe("schema 24: DMs that say what happened", () => {
  const WEB = "https://island.example/shift/island";
  const SAVED = process.env.SHIFT_ISLAND_URL;
  beforeEach(() => {
    process.env.SHIFT_ISLAND_URL = WEB;
  });
  afterEach(() => {
    if (SAVED === undefined) delete process.env.SHIFT_ISLAND_URL;
    else process.env.SHIFT_ISLAND_URL = SAVED;
  });

  /** No quest open: every in-flight, mine and side quest cleared, so main 1 is the one to start. */
  function freshBoard(): QuestBoard {
    const b = makeBoard();
    return {
      ...b,
      main: b.main.map((m) => ({ ...m, in_flight: null, mine: null, done: m.milestone === 3 })),
      side: [],
      proposed: [],
    };
  }

  it("the come-back DM names the open quest to carry on, read from the student's own board at send time", async () => {
    const board = makeBoard();
    expect(awayNext(board)).toEqual({ next: "ฟังเสียงจริงอีก 5 คน", begin: false });
    const api = { call: jest.fn(async () => board), rows: jest.fn() } as unknown as QuestApi;
    const { client, userSend } = fakeClient();
    await deliver(client, api, claimed({ kind: "away", channel_id: null, dm_user_id: "111" }));
    expect((api.call as jest.Mock).mock.calls).toEqual([["shift_quest_board", "111"]]);
    const body = bodyText(sentPayload(userSend));
    expect(body).toBe(`### ${AWAY_DM.title}\n${AWAY_DM.carryOn("ฟังเสียงจริงอีก 5 คน")}\n-# ${AWAY_DM.why}\n-# ${T.dmNoReplies}`);
  });

  it("with nothing open, names the first main quest to start; all done, the plain line", () => {
    expect(awayNext(freshBoard())).toEqual({ next: MAIN_TITLES[0], begin: true });
    expect(renderOutbox("away", { next: MAIN_TITLES[0], begin: true }, null, null)!.body).toBe(AWAY_DM.begin(MAIN_TITLES[0]));
    const done = freshBoard();
    done.main = done.main.map((m) => ({ ...m, done: true }));
    expect(awayNext(done)).toBeNull();
  });

  it("the update DM says which quest passed, grew the tree, or needs more, and never carries the mentor's words", () => {
    const feedback = "ลองเล่าให้ชัดขึ้นว่าใครใช้";
    const approved = renderOutbox("nudge", { notice: "review_approved", title: "เจอคนจริงคนแรก", milestone: 1, feedback }, null, null)!;
    expect(approved.title).toBe(NUDGE_DM.approvedTitle);
    expect(approved.body).toBe(NUDGE_DM.approved("เจอคนจริงคนแรก", true));
    expect(approved.body).toContain("ต้นไม้ของทีมโตขึ้น");
    const side = renderOutbox("nudge", { notice: "review_approved", title: "ฟังเสียงจริง" }, null, null)!;
    expect(side.body).not.toContain("ต้นไม้");
    const more = renderOutbox("nudge", { notice: "review_clarification", title: "เจอคนจริงคนแรก", feedback }, null, null)!;
    expect(more.body).toBe(NUDGE_DM.clarification("เจอคนจริงคนแรก"));
    const declined = renderOutbox("nudge", { notice: "review_declined", title: "เจอคนจริงคนแรก", note: feedback }, null, null)!;
    expect(declined.body).toBe(NUDGE_DM.declined("เจอคนจริงคนแรก"));
    for (const post of [approved, side, more, declined]) {
      expect(JSON.stringify(post)).not.toContain(feedback);
      expect(post.note).toBe(`${NUDGE_DM.off}\n${T.dmNoReplies}`);
    }
    const invite = renderOutbox("nudge", { notice: "project_invite", from: "มิ้นต์", project_name: "ร้านขนม" }, null, null)!;
    expect(invite.body).toBe(NUDGE_DM.invite("มิ้นต์", "ร้านขนม"));
  });

  it("an older row, an unknown notice, or a missing title is the plain line; markdown in a title is escaped", () => {
    for (const params of [{}, { notice: "award_issued", title: "x" }, { notice: "review_approved" }, { notice: "project_invite", from: "a" }]) {
      const post = renderOutbox("nudge", params, null, null)!;
      expect([params, post.title, post.body]).toEqual([params, T.dmNudgeTitle, T.dmNudge]);
    }
    expect(renderOutbox("nudge", { notice: "review_approved", title: "**x**" }, null, null)!.body).not.toContain("****x");
  });

  it("no DM line uses a dash, น้องๆ, or a question", () => {
    const words = [
      ...Object.values(NUDGE_DM).map((v) => (typeof v === "function" ? (v as (...a: string[]) => string)("ชื่อ", "ชื่อ") : v)),
      AWAY_DM.carryOn("ชื่อ"),
      AWAY_DM.begin("ชื่อ"),
      AWAY_DM.why,
    ].join("\n");
    expect(words).not.toMatch(/[—–?？]/);
    expect(words).not.toContain("น้องๆ");
    expect(words).not.toContain("ไหม");
  });
});
