import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import { journeySteps, thaiDayDate } from "../journey-steps";

describe("thaiDayDate", () => {
  it("puts the Thai weekday before the date", () => {
    expect(thaiDayDate("2026-12-04")).toBe("ศ. 4 ธ.ค.");
    expect(thaiDayDate("2026-12-05")).toBe("ส. 5 ธ.ค.");
    expect(thaiDayDate("2026-12-07")).toBe("จ. 7 ธ.ค.");
  });
});

describe("journeySteps", () => {
  const steps = journeySteps();

  it("is six steps, from picking a problem to handing in", () => {
    expect(steps.map((s) => s.icon)).toEqual(["pick", "signup", "discord", "talk", "build", "submit"]);
  });

  it("gives every step an action, a time and help, with no em dashes", () => {
    for (const s of steps) {
      for (const text of [s.doTh, s.whenTh, s.helpTh]) {
        expect(text.trim()).not.toBe("");
        expect(text).not.toContain("—");
      }
    }
  });

  it("takes every date and time from facts.ts", () => {
    const byIcon = Object.fromEntries(steps.map((s) => [s.icon, s]));
    expect(byIcon.signup.whenTh).toBe(`ภายใน ${thaiDayDate(ELEMENTAL.registrationClosesOn)}`);
    expect(byIcon.discord.whenTh).toBe("ศ. 4 ธ.ค. 19:00");
    expect(byIcon.talk).toMatchObject({ whenTh: "ส. 5 ธ.ค.", helpTh: "เวิร์กช็อปสอนสัมภาษณ์ 10:00" });
    expect(byIcon.build).toMatchObject({ whenTh: "ส. 5 ธ.ค. ถึง อา. 6 ธ.ค.", helpTh: "เวิร์กช็อปพาสร้าง ส. 19:00" });
    expect(byIcon.submit).toMatchObject({ whenTh: "จ. 7 ธ.ค. ก่อน 23:00", helpTh: "เวิร์กช็อปการนำเสนอ อา. 19:00" });
  });

  it("links the first two steps to the board and the sign-up", () => {
    expect(steps.slice(0, 2).map((s) => s.link)).toEqual(["board", "join"]);
    expect(steps.slice(2).every((s) => s.link === undefined)).toBe(true);
  });
});
