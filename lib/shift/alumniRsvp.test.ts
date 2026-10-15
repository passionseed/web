import { alumniRsvpSchema, rsvpCountLabel } from "./alumniRsvp";

const valid = { date: "2026-10-17", nickname: " มิว ", cohort: "SHIFT[1]" };

describe("alumniRsvpSchema", () => {
  it("accepts a nickname and a known round, trimmed", () => {
    const parsed = alumniRsvpSchema.safeParse(valid);
    expect(parsed.success && parsed.data.nickname).toBe("มิว");
  });

  it("needs a nickname and a real round", () => {
    expect(alumniRsvpSchema.safeParse({ ...valid, nickname: "  " }).success).toBe(false);
    expect(alumniRsvpSchema.safeParse({ ...valid, cohort: "SHIFT[9]" }).success).toBe(false);
    expect(alumniRsvpSchema.safeParse({ ...valid, date: "17 Oct" }).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(alumniRsvpSchema.safeParse({ ...valid, website: "spam" }).success).toBe(false);
  });
});

describe("rsvpCountLabel", () => {
  it("shows the count, or invites the first one", () => {
    expect(rsvpCountLabel(3)).toBe("ลงชื่อแล้ว 3 คน");
    expect(rsvpCountLabel(0)).toContain("คนแรก");
  });
});
