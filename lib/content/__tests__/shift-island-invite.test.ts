import { formatThaiDate } from "@/lib/content/shift-cohort";
import {
  LETTER_CHAPTERS,
  PROLOGUE,
  PROLOGUE_SAMPLE_TAG,
  SEAL,
  SHORE,
  TICKET,
  festivalLine,
} from "@/lib/content/shift-island-invite";

const BEFORE = new Date("2026-11-11T05:00:00Z");
const KICKOFF = new Date("2026-11-14T02:00:00Z");
const RUNNING = new Date("2026-11-20T05:00:00Z");
const AFTER = new Date("2026-11-29T05:00:00Z");

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

describe("shift island invite copy", () => {
  it("prologue has 4 to 5 lines and ends on the bottle", () => {
    expect(PROLOGUE.length).toBeGreaterThanOrEqual(4);
    expect(PROLOGUE.length).toBeLessThanOrEqual(5);
    expect(PROLOGUE[PROLOGUE.length - 1]).toContain("ขวด");
  });

  it("no em dashes or น้องๆ anywhere", () => {
    const all = [
      ...strings(PROLOGUE),
      PROLOGUE_SAMPLE_TAG,
      ...strings(SHORE),
      ...strings(LETTER_CHAPTERS),
      ...strings(SEAL),
      ...strings(TICKET),
      ...[BEFORE, KICKOFF, RUNNING, AFTER].map((d) => festivalLine(d)),
    ];
    for (const s of all) {
      expect(s).not.toContain("—");
      expect(s).not.toContain("น้องๆ");
    }
  });

  it("has the alumni-board way in and the pending Discord line", () => {
    expect(SEAL.alumniHint).toBe("เคยผ่าน SHIFT แล้ว? ยืนยันตัวที่บอร์ดศิษย์เก่าก่อน แล้วกลับมาตอบรับ");
    expect(SEAL.alumniCta).toBe("ไปบอร์ดศิษย์เก่า");
    expect(TICKET.pendingDiscord).toBe(
      "ทีมจะยืนยันว่าเราผ่าน SHIFT แล้ว จากนั้นส่งลิงก์ห้องเกาะให้ในกลุ่มรุ่น",
    );
  });

  it("festivalLine before kickoff counts days", () => {
    expect(festivalLine(BEFORE)).toContain("อีก 3 วัน");
  });

  it("festivalLine on kickoff day says today", () => {
    expect(festivalLine(KICKOFF)).toContain("วันนี้");
  });

  it("festivalLine while running names the last day", () => {
    expect(festivalLine(RUNNING)).toContain(formatThaiDate("2026-11-28", false));
  });

  it("festivalLine after the season keeps the trees", () => {
    expect(festivalLine(AFTER)).toContain("ต้นไม้ทุกต้นยังอยู่บนเกาะ");
  });
});
