/**
 * @jest-environment node
 */
import fs from "node:fs";
import path from "node:path";

import { MessageFlags, type Client } from "discord.js";

import type { QuestApi } from "../api";
import { T, renderOutbox } from "../copy";
import type { IslandPlot } from "../island/render";
import { deliver, outboxView, type Claimed } from "../outbox";
import { LIMITS, NO_MENTIONS, TONE_COLORS, renderView, setCommandIds } from "../ui";
import { accentColor, bodyText, cardsOf, componentCount, mediaUrls, textLength, viewText } from "../test-helpers/view";

const MIGRATIONS = path.join(__dirname, "..", "..", "..", "..", "supabase", "migrations");

/** Every kind the database queues, plus the ones the bot itself knows about. */
function queuedKinds(): string[] {
  const sql = fs
    .readdirSync(MIGRATIONS)
    .filter((f) => f.includes("shift_quest"))
    .map((f) => fs.readFileSync(path.join(MIGRATIONS, f), "utf8"))
    .join("\n");
  const kinds = new Set<string>(["celebration", "recognition", "intention", "nudge", "reminder", "island_weekly"]);
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
        const post = renderOutbox(
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
    expect(bodyText(nudge)).toBe(`### ${T.dmNudgeTitle}\n${T.dmNudge}\n-# ${T.dmNoReplies}`);
    expect(bodyText(nudge)).toContain("/inbox ในเซิร์ฟเวอร์");
    expect(bodyText(nudge)).not.toContain("</inbox:");

    userSend.mockClear();
    await deliver(client, fakeApi(), claimed({ kind: "reminder", params: { open_quests: 2 }, channel_id: null, dm_user_id: "111" }));
    const reminder = bodyText(sentPayload(userSend));
    expect(reminder).toBe(
      "### ⏰ ถึงเวลาที่คุณตั้งไว้แล้ว\nมีเควสต์เปิดอยู่ **2** อัน\nเริ่มด้วย /work start ในเซิร์ฟเวอร์ได้เลย\n-# ปิดการเตือนได้ที่ /settings\n-# บอทนี้ไม่อ่านหรือตอบข้อความส่วนตัว"
    );
    expect(renderOutbox("reminder", { open_quests: 0 }, null, null)!.body).toBe("เริ่มด้วย /work start ในเซิร์ฟเวอร์ได้เลย");
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
