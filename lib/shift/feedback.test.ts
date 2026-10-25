import { alumniSessionHint, communitySignupSchema, shiftFeedbackSchema } from "./feedback";

const valid = {
  round: 1,
  nickname: "มิว",
  satisfaction: 4,
  canDoNow: "ปล่อยเว็บขึ้นจริงได้",
  hardestMoment: "วันที่ 4 ไม่มีใครใช้ เลยไปถามคนใช้ใหม่",
  confidence: 3,
  ownership: 5,
  ownDecision: "ตัดหน้า login ทิ้ง",
  motivation: "wanted_to",
  mostValuable: "ได้คุยกับคนใช้จริง",
  changeNext: "ไม่มี",
  priceFit: "about_right",
  payer: "parents",
  recommend: 9,
  continueProject: "own",
  availableDays: ["fri", "sat"],
  nextSteps: ["help_run", "co_host"],
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

  it("requires a project choice and at least one day", () => {
    const { continueProject: _, ...noProject } = valid;
    expect(shiftFeedbackSchema.safeParse(noProject).success).toBe(false);
    expect(shiftFeedbackSchema.safeParse({ ...valid, availableDays: [] }).success).toBe(false);
  });

  it("does not allow 'none' with a day", () => {
    expect(shiftFeedbackSchema.safeParse({ ...valid, availableDays: ["none"] }).success).toBe(true);
    expect(shiftFeedbackSchema.safeParse({ ...valid, availableDays: ["none", "fri"] }).success).toBe(false);
  });

  it("keeps the project note optional", () => {
    const parsed = shiftFeedbackSchema.safeParse({ ...valid, continueProject: "join", continueProjectNote: "  " });
    expect(parsed.success && parsed.data.continueProjectNote).toBeNull();
  });

  it("asks for a name only when the student wants to be credited", () => {
    expect(shiftFeedbackSchema.safeParse({ ...valid, quoteMode: "named" }).success).toBe(false);
    const named = shiftFeedbackSchema.safeParse({ ...valid, quoteMode: "named", quoteName: "มิว ม.5" });
    expect(named.success && named.data.quoteName).toBe("มิว ม.5");
  });

  it("asks for the hardest moment", () => {
    expect(shiftFeedbackSchema.safeParse({ ...valid, hardestMoment: "" }).success).toBe(false);
  });

  it("leaves the community sign-up to step 2", () => {
    const parsed = shiftFeedbackSchema.safeParse({ ...valid, communitySignup: "pay_250" });
    expect(parsed.success && "communitySignup" in parsed.data).toBe(false);
  });
});

describe("communitySignupSchema", () => {
  const id = "3f1c2a4e-8b7d-4c2a-9e1f-5a6b7c8d9e0f";

  it("accepts a way in for a saved row", () => {
    expect(communitySignupSchema.safeParse({ id, communitySignup: "free_video" }).success).toBe(true);
    expect(communitySignupSchema.safeParse({ id, communitySignup: "pay_250" }).success).toBe(true);
  });

  it("rejects unknown choices, the retired ฿690 answer, and bad ids", () => {
    expect(communitySignupSchema.safeParse({ id, communitySignup: "maybe" }).success).toBe(false);
    expect(communitySignupSchema.safeParse({ id, communitySignup: "join" }).success).toBe(false);
    expect(communitySignupSchema.safeParse({ id: "1", communitySignup: "pay_250" }).success).toBe(false);
  });

  it("requires PDPA consent", () => {
    expect(shiftFeedbackSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });

  it("accepts 0 as a recommendation score", () => {
    expect(shiftFeedbackSchema.safeParse({ ...valid, recommend: 0 }).success).toBe(true);
  });
});

describe("alumniSessionHint", () => {
  it("names the day, time and first session until it has passed", () => {
    const before = alumniSessionHint(new Date("2026-10-15T12:00:00+07:00"));
    expect(before).toContain("ทุกวันเสาร์ 19:00–21:00 น.");
    expect(before).toContain("รอบแรก ส. 17 ต.ค.");
    expect(alumniSessionHint(new Date("2026-10-18T09:00:00+07:00"))).not.toContain("รอบแรก");
  });
});
