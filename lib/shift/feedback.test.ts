import { alumniSessionHint, communitySignupOffer, shiftFeedbackSchema } from "./feedback";

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
  continueProject: "own",
  availableDays: ["fri", "sat"],
  nextSteps: ["help_run", "co_host"],
  communitySignup: "join",
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

  it("requires a community sign-up answer", () => {
    const { communitySignup: _, ...noAnswer } = valid;
    expect(shiftFeedbackSchema.safeParse(noAnswer).success).toBe(false);
    expect(shiftFeedbackSchema.safeParse({ ...valid, communitySignup: "maybe" }).success).toBe(false);
    expect(shiftFeedbackSchema.safeParse({ ...valid, communitySignup: "ask_parents" }).success).toBe(true);
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

describe("AfterSHIFT monthly test offer", () => {
  it("quotes the SHIFT[2] alumni test in both the explanation and signup", () => {
    const offer = communitySignupOffer(2);
    expect(offer.price).toBe(250);
    expect(offer.hint).toContain("SHIFT[2]");
    expect(offer.hint).toContain("เดือนละ 250 บาท");
    expect(offer.hint).toContain("ทดสอบรูปแบบและราคา");
    expect(offer.options.find((option) => option.value === "join")?.label).toContain("เดือนละ 250 บาท");
    expect(offer.hint).not.toContain("690");
  });

  it("preserves the offer for other cohorts and the stored answer values", () => {
    for (const round of [0, 1, 3]) {
      expect(communitySignupOffer(round).price).toBe(690);
    }
    expect(communitySignupOffer(2).options.map((option) => option.value)).toEqual(["join", "ask_parents", "not_now"]);
  });
});
