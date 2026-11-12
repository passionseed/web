import { CHECKIN_QUESTIONS, templateById, TEMPLATES } from "./templates";

describe("whiteboard templates", () => {
  it("every template builds elements", () => {
    for (const t of TEMPLATES) expect(t.build().length).toBeGreaterThan(0);
  });

  it("the team check-in asks one get-to-know-you question and ends with the feed", () => {
    const texts = templateById("checkin")!
      .build()
      .flatMap((el) => [(el as { text?: string }).text, (el as { label?: { text: string } }).label?.text])
      .filter((t): t is string => Boolean(t));
    expect(texts.filter((t) => CHECKIN_QUESTIONS.includes(t))).toHaveLength(1);
    expect(texts.some((t) => t.includes("ติดอะไรอยู่"))).toBe(true);
    expect(texts.some((t) => t.includes("โพสต์ในฟีด"))).toBe(true);
    expect(texts.join(" ")).not.toContain("—");
  });
});
