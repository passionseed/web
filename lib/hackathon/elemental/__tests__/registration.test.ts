import {
  elementalPriceBaht,
  elementalRegistrationOpen,
  normalizeSource,
  registrationSchema,
} from "../registration";

const adult = { fullName: "Somchai Jaidee", age: 21, school: "Chula" };
const minor = { fullName: "Mali Suk", age: 16, school: "Triam Udom" };
const base = {
  contactEmail: "a@example.com",
  contactPhone: "081-234-5678",
  noRefundAck: true as const,
};

describe("elementalPriceBaht", () => {
  it("charges 199 alone and 149 a person for 2 or more", () => {
    expect(elementalPriceBaht(1)).toBe(199);
    expect(elementalPriceBaht(2)).toBe(298);
    expect(elementalPriceBaht(5)).toBe(745);
    expect(elementalPriceBaht(0)).toBe(0);
  });

  it("charges the group price to one person who creates or joins a team", () => {
    expect(elementalPriceBaht(1, true)).toBe(149);
  });
});

describe("registrationSchema team modes", () => {
  it("defaults to solo", () => {
    expect(registrationSchema.parse({ ...base, members: [adult] }).teamMode).toBe("solo");
  });

  it("needs a team name to create a team", () => {
    expect(registrationSchema.safeParse({ ...base, members: [adult], teamMode: "create" }).success).toBe(false);
    expect(
      registrationSchema.safeParse({ ...base, members: [adult], teamMode: "create", teamName: "Fire" }).success,
    ).toBe(true);
  });

  it("needs a well-formed invite code to join a team", () => {
    expect(registrationSchema.safeParse({ ...base, members: [adult], teamMode: "join" }).success).toBe(false);
    expect(
      registrationSchema.safeParse({ ...base, members: [adult], teamMode: "join", inviteCode: "not-a-code" }).success,
    ).toBe(false);
    expect(
      registrationSchema.safeParse({ ...base, members: [adult], teamMode: "join", inviteCode: "0123456789ab" }).success,
    ).toBe(true);
  });
});

describe("elementalRegistrationOpen", () => {
  it("is open through the end of Fri 4 Dec, Bangkok time", () => {
    expect(elementalRegistrationOpen(new Date("2026-12-04T23:59:00+07:00"))).toBe(true);
    expect(elementalRegistrationOpen(new Date("2026-12-05T00:00:01+07:00"))).toBe(false);
  });
});

describe("registrationSchema", () => {
  it("accepts an adult alone and cleans the phone number", () => {
    const r = registrationSchema.parse({ ...base, members: [adult] });
    expect(r.contactPhone).toBe("0812345678");
  });

  it("requires a parent's name, phone and consent for anyone under 20", () => {
    expect(registrationSchema.safeParse({ ...base, members: [minor] }).success).toBe(false);
    const ok = registrationSchema.safeParse({
      ...base,
      members: [{ ...minor, parentName: "Mom", parentPhone: "0899999999", parentConsent: true }],
    });
    expect(ok.success).toBe(true);
  });

  it("requires the no-refund tick", () => {
    expect(registrationSchema.safeParse({ ...base, noRefundAck: false, members: [adult] }).success).toBe(false);
  });

  it("caps a group at 5", () => {
    expect(registrationSchema.safeParse({ ...base, members: Array(6).fill(adult) }).success).toBe(false);
  });
});

describe("normalizeSource", () => {
  it("keeps safe characters only", () => {
    expect(normalizeSource(" IG-Story ")).toBe("ig-story");
    expect(normalizeSource("<script>")).toBe("script");
    expect(normalizeSource("")).toBeUndefined();
  });
});

describe("registrationSchema heardFrom", () => {
  it("accepts each listed answer", () => {
    for (const heardFrom of ["passion_seed", "next_decade", "doodee_future", "contester", "camp_hub", "other"]) {
      expect(registrationSchema.safeParse({ ...base, members: [adult], heardFrom }).success).toBe(true);
    }
  });

  it("rejects an answer that is not listed", () => {
    expect(registrationSchema.safeParse({ ...base, members: [adult], heardFrom: "tiktok" }).success).toBe(false);
  });

  it("still accepts a sign-up without it (older cached forms)", () => {
    expect(registrationSchema.safeParse({ ...base, members: [adult] }).success).toBe(true);
  });
});

describe("registrationSchema buddy mode", () => {
  it("needs a well-formed pass code", () => {
    expect(registrationSchema.safeParse({ ...base, members: [adult], teamMode: "buddy" }).success).toBe(false);
    expect(
      registrationSchema.safeParse({ ...base, members: [adult], teamMode: "buddy", passCode: "x" }).success,
    ).toBe(false);
    expect(
      registrationSchema.safeParse({ ...base, members: [adult], teamMode: "buddy", passCode: "0123456789ab" }).success,
    ).toBe(true);
  });

  it("is for exactly one person", () => {
    expect(
      registrationSchema.safeParse({ ...base, members: [adult, adult], teamMode: "buddy", passCode: "0123456789ab" })
        .success,
    ).toBe(false);
  });

  it("turns an unknown owe into boba", () => {
    const r = registrationSchema.parse({
      ...base,
      members: [adult],
      teamMode: "buddy",
      passCode: "0123456789ab",
      buddyOwe: "gold",
    });
    expect(r.buddyOwe).toBe("boba");
  });
});
