import { ISLAND_STAGES } from "@/lib/content/shift-island";
import {
  CAMPFIRE_ROUND,
  GUIDE_ALL,
  GUIDE_CAMPFIRE,
  GUIDE_GROWTH,
  GUIDE_ROOTS,
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
    expect(GUIDE_CAMPFIRE.privacy.join(" ")).toContain("เป็นส่วนตัวตั้งแต่แรก");
    expect(GUIDE_CAMPFIRE.privacy.join(" ")).toContain("แชร์กับทีม");
    expect(GUIDE_CAMPFIRE.privacy.join(" ")).toContain("🆘");
  });

  it("lists seven sections in order with unique anchors", () => {
    expect(GUIDE_SECTIONS.map((s) => s.id)).toEqual([
      "island",
      "growth",
      "roots",
      "campfire",
      "coins",
      "start",
      "privacy",
    ]);
  });
});
