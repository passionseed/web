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
});

describe("elementalRegistrationOpen", () => {
  it("is open through the end of Thu 3 Dec, Bangkok time", () => {
    expect(elementalRegistrationOpen(new Date("2026-12-03T23:59:00+07:00"))).toBe(true);
    expect(elementalRegistrationOpen(new Date("2026-12-04T00:00:01+07:00"))).toBe(false);
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
