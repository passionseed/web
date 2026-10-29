import { shiftApplicationSchema } from "@/lib/shift/application";
import {
  applicantNeedsParent,
  blocksPaidAdmission,
  parentConsentState,
  type ParentConsentRow,
} from "@/lib/shift/parentConsent";
import { buildShiftParentEmail, plainName } from "@/lib/shift/parentEmail";

// 29 Oct 2026, noon in Bangkok.
const NOW = Date.parse("2026-10-29T05:00:00Z");

const row = (overrides: Partial<ParentConsentRow> = {}): ParentConsentRow => ({
  birth_date: "2010-05-01",
  consent_notice_version: "2026-10-29",
  parent_consented_at: null,
  parent_declined_at: null,
  parent_withdrawn_at: null,
  ...overrides,
});

describe("applicantNeedsParent", () => {
  test("turns false on the 20th birthday in Thailand", () => {
    expect(applicantNeedsParent("2006-10-30", NOW)).toBe(true);
    expect(applicantNeedsParent("2006-10-29", NOW)).toBe(false);
  });

  test("an empty or invalid birth date counts as a minor", () => {
    expect(applicantNeedsParent("", NOW)).toBe(true);
    expect(applicantNeedsParent("2010-02-30", NOW)).toBe(true);
    expect(applicantNeedsParent(null, NOW)).toBe(true);
  });
});

describe("parentConsentState", () => {
  test.each<[string, Partial<ParentConsentRow>, string, boolean]>([
    ["a minor still waiting", {}, "waiting", true],
    ["an agreed parent", { parent_consented_at: "2026-10-28T00:00:00Z" }, "agreed", false],
    ["a declined parent", { parent_declined_at: "2026-10-28T00:00:00Z" }, "declined", true],
    [
      "a withdrawn parent",
      { parent_consented_at: "2026-10-28T00:00:00Z", parent_withdrawn_at: "2026-10-29T00:00:00Z" },
      "withdrawn",
      true,
    ],
    ["an applicant aged 20+", { birth_date: "2005-01-01" }, "not_needed", false],
    ["a row from before the consent flow", { consent_notice_version: null, birth_date: null }, "legacy", false],
    [
      "a legacy row whose parent answered a copied link",
      { consent_notice_version: null, birth_date: null, parent_consented_at: "2026-10-28T00:00:00Z" },
      "agreed",
      false,
    ],
  ])("%s", (_label, overrides, state, blocked) => {
    const result = parentConsentState(row(overrides), NOW);
    expect(result).toBe(state);
    expect(blocksPaidAdmission(result)).toBe(blocked);
  });
});

describe("shiftApplicationSchema parent fields", () => {
  const base = {
    fullName: "Test Applicant",
    nickname: "Test",
    grade: "m5",
    birthDate: "2010-05-01",
    problem: "A problem that is long enough to pass the schema check",
    availability: "all_days",
    igHandle: "test_ig",
    parentEmail: "parent@example.invalid",
    parentContact: "test parent contact",
    consent: true,
    foundVia: "instagram",
  };

  test("under 20 needs a valid parent email and a phone or LINE", () => {
    const missing = shiftApplicationSchema.safeParse({ ...base, parentEmail: "", parentContact: "" });
    expect(missing.success).toBe(false);
    const paths = missing.success ? [] : missing.error.issues.map((issue) => issue.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["parentEmail", "parentContact"]));

    expect(shiftApplicationSchema.safeParse({ ...base, parentEmail: "not-an-email" }).success).toBe(false);
    expect(shiftApplicationSchema.safeParse(base).success).toBe(true);
  });

  test("20 or older keeps no parent details", () => {
    const parsed = shiftApplicationSchema.parse({ ...base, birthDate: "2005-01-01" });
    expect(parsed.parentEmail).toBeNull();
    expect(parsed.parentContact).toBeNull();
  });

  test("a birth date is required", () => {
    const parsed = shiftApplicationSchema.safeParse({ ...base, birthDate: "" });
    expect(parsed.success).toBe(false);
  });
});

describe("buildShiftParentEmail", () => {
  test("strips markup from what the applicant typed and carries the parent link", () => {
    const email = buildShiftParentEmail({
      nickname: "<b>Test</b>",
      fullName: "Test Applicant",
      cohort: { name: "SHIFT[3]", startDate: "2026-11-02", endDate: "2026-11-08", sessionTime: "19:00", priceBaht: 690 },
      url: "https://example.invalid/shift/parent/test-token",
    });
    expect(email.html).not.toContain("<b>Test</b>");
    expect(email.html).toContain("Test Applicant (bTestb)");
    expect(email.html).toContain("https://example.invalid/shift/parent/test-token");
    expect(email.subject).toContain("SHIFT[3]");
    expect(email.subject).not.toContain("Test");
  });

  test("names lose anything an email client could turn into a link", () => {
    expect(plainName("แพร visit evil.example/login")).toBe("แพร visit evilexamplelogin");
    expect(plainName("Mary-Jane O'Neil")).toBe("Mary-Jane O'Neil");
    expect(plainName("น้ำใส")).toBe("น้ำใส");
  });
});
