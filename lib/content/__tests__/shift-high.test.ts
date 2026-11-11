import { ALUMNI_DEFAULT_DOC } from "@/lib/content/shift-alumni";
import {
  SHIFT_HIGH,
  SHIFT_HIGH_COMMUNITY,
  SHIFT_HIGH_GOALS,
  SHIFT_HIGH_PRIZES,
  shiftHighSessionLine,
} from "@/lib/content/shift-high";

describe("shiftHighSessionLine", () => {
  it("reads the day, time and place from the alumni calendar", () => {
    expect(shiftHighSessionLine(ALUMNI_DEFAULT_DOC.defaults)).toBe(
      "ทุกวันเสาร์ 19:00–21:00 น. ออนไลน์ใน Discord",
    );
  });

  it("follows the calendar when the session moves", () => {
    const moved = { ...ALUMNI_DEFAULT_DOC.defaults, firstDate: "2026-10-16", startTime: "", endTime: "", place: "" };
    expect(shiftHighSessionLine(moved)).toBe("ทุกวันศุกร์");
  });
});

describe("SHIFT High copy", () => {
  const strings = JSON.stringify([SHIFT_HIGH, SHIFT_HIGH_COMMUNITY, SHIFT_HIGH_GOALS, SHIFT_HIGH_PRIZES]);

  it("has no em dashes", () => {
    expect(strings).not.toContain("—");
  });

  it("states no price", () => {
    expect(strings).not.toMatch(/฿|บาท/);
  });
});
