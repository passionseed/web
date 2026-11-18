import { ROUND_GIFTS_PER_DAY } from "@/lib/shift-island/rounds-rules";
import { ISLAND_STAGES } from "@/lib/content/shift-island";
import { PRE_STAGE, STAGE_NAMES } from "@/components/shift/island/copy";

// The bot's TREE buttons (bot/src/quests/island/copy.ts). Not imported: that file pulls in discord.js.
const BOT_TREE = { btnSeed: "🌰 เลือกเมล็ด", btnClose: "🔍 ดูต้นไม้ใกล้ๆ", btnGift: "🎁 เปิดของขวัญ", btnWardrobe: "👗 ลุคของต้นไม้" };
import {
  CAMPFIRE_ROUND,
  GUIDE_ALL,
  GUIDE_CAMPFIRE,
  GUIDE_CLOSEUP,
  GUIDE_GROWTH,
  GUIDE_PRIVACY,
  GUIDE_ROOTS,
  GUIDE_SEED,
  GUIDE_STAGE_NAMES,
  GUIDE_SECTIONS,
  GUIDE_STAGE_COUNT,
  ROOTS_RULE,
} from "@/lib/content/shift-island-guide";

/** Sample arguments for the copy functions (stage and level numbers). */
const SAMPLE = 3;

/** Every user-facing string in the guide's copy, with a path for the failure message. */
function strings(value: unknown, path: string): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value === "function") {
    const out = (value as (n: number) => unknown)(SAMPLE);
    return typeof out === "string" ? [[`${path}()`, out]] : [];
  }
  if (Array.isArray(value)) return value.flatMap((item, i) => strings(item, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => strings(item, `${path}.${key}`));
  }
  return [];
}

const ALL = strings(GUIDE_ALL, "GUIDE");

describe("shift island guide copy", () => {
  it("collects the copy", () => {
    expect(ALL.length).toBeGreaterThan(40);
  });

  it.each([
    ["an em dash", /—/],
    ["น้อง", /น้อง/],
    ["ปลูก (say ลงแปลง)", /ปลูก/],
    ["ลูก", /ลูก(?!ค้า)/],
    ["เด็ก", /เด็ก/],
    ["streak wording", /streak|สตรีค|ติดต่อกัน/i],
    ["a price", /฿|บาท/],
  ])("has no %s", (_label, pattern) => {
    expect(ALL.filter(([, text]) => pattern.test(text))).toEqual([]);
  });

  it("names no coin amount", () => {
    // Coin amounts are DRAFT in shift-island-economy.ts and shown by /coins.
    expect(ALL.filter(([, text]) => /\d+\s*(?:Passioncoin|coin|เหรียญ)/i.test(text))).toEqual([]);
  });

  it("counts stages from ISLAND_STAGES, without the empty plot", () => {
    expect(GUIDE_STAGE_COUNT).toBe(ISLAND_STAGES.length - 1);
    expect(GUIDE_GROWTH.lines[0]).toContain(String(GUIDE_STAGE_COUNT));
  });

  it("states the round and roots rules", () => {
    expect(CAMPFIRE_ROUND.focusMinutes + CAMPFIRE_ROUND.restMinutes).toBe(30);
    expect(GUIDE_ROOTS.lines.join(" ")).toContain(String(ROOTS_RULE.perDay));
    expect(GUIDE_ROOTS.levelsTitle).toContain(String(ROOTS_RULE.levels));
  });

  it("points to reachable reflection entries and distinguishes private notes from help", () => {
    expect(ALL.some(([, text]) => text.includes("/progress"))).toBe(false);
    expect(GUIDE_ROOTS.lines.join(" ")).toContain("/island");
    expect(GUIDE_ROOTS.lines.join(" ")).toContain("✍️ ได้เรียนรู้อะไร");
    expect(GUIDE_ROOTS.lines.join(" ")).toContain("✍️ ปิดรอบ");
    const privacy = GUIDE_CAMPFIRE.privacy.join(" ");
    expect(privacy).toContain("เป็นส่วนตัว");
    // The reflection flow offers no team sharing, so the guide must not promise it.
    expect(privacy).not.toContain("แชร์กับทีม");
    // The real help button (🙋, T.btnSendBlocker in the bot), not the ownership checklist's 🆘.
    expect(privacy).toContain("🙋");
  });

  it("explains the campfire call and the evening guest truthfully: once per team, never who sat there", () => {
    const campfire = GUIDE_CAMPFIRE.lines.join(" ");
    expect(campfire).toContain("ห้องข่าวเกาะ");
    expect(campfire).toContain("ทีมละครั้ง");
    expect(campfire).toContain("มากี่คนก็ลุ้นเท่ากัน");
    expect(campfire).not.toMatch(/พลาด|ยังไม่ได้/);
    const privacy = GUIDE_PRIVACY.lines.join(" ");
    expect(privacy).toContain("ไม่เก็บว่าใครในทีมนั่ง");
    expect(privacy).toContain("ลบทันทีเมื่อคุณออก");
  });

  it("says who counts for the guest (anyone at the fire during its rest), that the count of teams shows, and that the call pauses in SHIFT weeks", () => {
    const campfire = GUIDE_CAMPFIRE.lines.join(" ");
    expect(campfire).toContain("19:25 ถึง 19:30");
    expect(campfire).not.toContain("ตอนแขกมาถึง");
    expect(campfire).toContain("กี่ทีม");
    expect(campfire).toContain("เว้นสัปดาห์ที่มีรอบ SHIFT");
    // The database keeps which teams sat there, never who or when.
    expect(GUIDE_PRIVACY.lines.join(" ")).toContain("ไม่เก็บว่าใครในทีมนั่งหรือนั่งตอนไหน");
  });

  it("keeps SHIFT weeks out of its promises: no guest then, and voice time is recorded for that round's students", () => {
    // The bot pauses the call and the guest while a SHIFT round is in session (bot/src/quests/call.ts cohortWeek).
    const guest = GUIDE_CAMPFIRE.lines.find((line) => line.includes("19:25 ถึง 19:30"));
    expect(guest).toContain("เว้นสัปดาห์ที่มีรอบ SHIFT");
    // shift-voice records voice time in every channel for that round's students, the campfire included.
    const minutes = GUIDE_CAMPFIRE.privacy.find((line) => line.includes("กี่นาที"));
    expect(minutes).toContain("สัปดาห์ที่มีรอบ SHIFT");
    expect(minutes).toContain("บันทึกเวลาในห้องเสียง");
  });

  it("never promises more privacy than the guest's drop keeps", () => {
    const privacy = GUIDE_PRIVACY.lines.join(" ");
    // A team of one: the team's result is that student's, until the next day.
    expect(privacy).not.toContain("เก็บแค่ว่าทีมไหนได้ลุ้น");
    expect(privacy).toContain("ถ้าทีมมีคุณคนเดียว");
    // A won look is a gift that stays with the team, with its date.
    expect(privacy).toContain("พร้อมวันที่ได้");
    // A picked look shows on a shown team's tree: the bot only never announces which team.
    const campfire = GUIDE_CAMPFIRE.lines.join(" ");
    expect(campfire).not.toContain("ไม่มีใครเห็นว่าทีมไหนได้");
    expect(campfire).toContain("ไม่ประกาศว่าทีมไหนได้");
  });

  it("lists the stages as the game names them, with the seed before stage 1", () => {
    expect([...GUIDE_STAGE_NAMES]).toEqual([PRE_STAGE, ...STAGE_NAMES.slice(1)]);
  });

  it("explains the seed, the close-up, gifts and the wardrobe with the bot's button names", () => {
    expect(GUIDE_SEED.steps.map((s) => s.label)).toContain(BOT_TREE.btnSeed);
    const seed = GUIDE_SEED.lines.join(" ");
    expect(seed).toContain("พี่เลี้ยง");
    const closeup = GUIDE_CLOSEUP.steps.map((s) => s.label);
    expect(closeup).toEqual(expect.arrayContaining([BOT_TREE.btnClose, BOT_TREE.btnGift, BOT_TREE.btnWardrobe]));
    expect(BOT_TREE.btnClose).toContain("🔍");
    const text = GUIDE_CLOSEUP.lines.join(" ");
    expect(text).toContain("ปิดรอบ");
    expect(text).toContain("ครั้งแรก");
    expect(text).toContain("1 จากไม่เกิน 3");
    // Never "everyone sees it": a plot that does not show its name shows no look to others.
    expect(text).not.toContain("ทุกคนเห็น");
    expect(text).toContain(`ไม่เกิน ${ROUND_GIFTS_PER_DAY} ชิ้นต่อวัน`);
    expect(GUIDE_SEED.seeds).toHaveLength(4);
  });

  it("lists nine sections in order with unique anchors", () => {
    expect(GUIDE_SECTIONS.map((s) => s.id)).toEqual([
      "island",
      "seed",
      "growth",
      "roots",
      "closeup",
      "campfire",
      "coins",
      "start",
      "privacy",
    ]);
  });
});
