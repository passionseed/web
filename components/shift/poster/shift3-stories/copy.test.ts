import { lintText } from "@/lib/marketing/copyRules";
import { SHIFT_COHORT_3, type ShiftCohort } from "@/lib/content/shift-cohort";

import { POLL_OPTIONS, shift3StoryCopy, storySheetStrings } from "./copy";

describe("SHIFT[3] story copy", () => {
  const copy = shift3StoryCopy();
  const sheet = storySheetStrings(copy);

  it("passes the marketing copy rules on every sheet string", () => {
    const hits = sheet.flatMap((text, i) => lintText(text, `story string ${i}`, "story"));
    expect(hits).toEqual([]);
  });

  it("never shows a seats-left count or an anchor price", () => {
    for (const text of sheet) {
      expect(text).not.toMatch(/เหลือ\s*\d+\s*(ที่|คน)|seats? left/i);
      expect(text).not.toMatch(/~~|ราคาเต็ม|ปกติ/);
    }
  });

  it("takes dates, prices and times from the cohort, not literals", () => {
    const moved: ShiftCohort = {
      ...SHIFT_COHORT_3,
      priceBaht: 850,
      seats: 24,
      startDate: "2026-12-07",
      endDate: "2026-12-13",
      applyDeadline: "2026-12-05",
      sessionTime: "18:30–20:30",
      schedule: SHIFT_COHORT_3.schedule.map((d, i) => ({ ...d, date: `2026-12-${String(7 + i).padStart(2, "0")}` })),
    };
    const all = JSON.stringify(shift3StoryCopy(moved));
    for (const old of ["9 พ.ย.", "15 พ.ย.", "7 พ.ย.", "6 พ.ย.", "690", "590", "19:00", "30 คน"]) {
      expect(all).not.toContain(old);
    }
    for (const fresh of ["7 ธ.ค.", "13 ธ.ค.", "5 ธ.ค.", "4 ธ.ค.", "฿850", "฿750", "18:30", "24 คน"]) {
      expect(all).toContain(fresh);
    }
  });

  it("answers the poll options in the poll's order", () => {
    expect(copy.answer.rows.map((r) => r.block)).toEqual([...POLL_OPTIONS]);
  });

  it("keeps the apply link off the Day 1 sheet (applications are closed)", () => {
    expect(JSON.stringify(copy.day1)).not.toMatch(/shift\/apply|สมัคร/);
  });
});
