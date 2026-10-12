import { shiftFeedbackSchema } from "./feedback";

const valid = {
  round: 1,
  nickname: "มิว",
  satisfaction: 4,
  canDoNow: "ปล่อยเว็บขึ้นจริงได้",
  confidence: 3,
  ownership: 5,
  ownDecision: "ตัดหน้า login ทิ้ง",
  motivation: "wanted_to",
  mostValuable: "ได้คุยกับคนใช้จริง",
  changeNext: "ไม่มี",
  priceFit: "about_right",
  payer: "parents",
  recommend: 9,
  nextSteps: ["help_run", "project_club"],
  quoteMode: "anonymous",
  consent: true,
};

describe("shiftFeedbackSchema", () => {
  it("accepts a complete answer", () => {
    expect(shiftFeedbackSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects scores outside the scale", () => {
    expect(shiftFeedbackSchema.safeParse({ ...valid, satisfaction: 6 }).success).toBe(false);
    expect(shiftFeedbackSchema.safeParse({ ...valid, recommend: 11 }).success).toBe(false);
  });

  it("requires at least one next step", () => {
    expect(shiftFeedbackSchema.safeParse({ ...valid, nextSteps: [] }).success).toBe(false);
  });

  it("does not allow 'not now' with another next step", () => {
    const result = shiftFeedbackSchema.safeParse({ ...valid, nextSteps: ["not_now", "help_run"] });
    expect(result.success).toBe(false);
  });

  it("asks for a name only when the student wants to be credited", () => {
    expect(shiftFeedbackSchema.safeParse({ ...valid, quoteMode: "named" }).success).toBe(false);
    const named = shiftFeedbackSchema.safeParse({ ...valid, quoteMode: "named", quoteName: "มิว ม.5" });
    expect(named.success && named.data.quoteName).toBe("มิว ม.5");
  });

  it("requires PDPA consent", () => {
    expect(shiftFeedbackSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });

  it("accepts 0 as a recommendation score", () => {
    expect(shiftFeedbackSchema.safeParse({ ...valid, recommend: 0 }).success).toBe(true);
  });
});
