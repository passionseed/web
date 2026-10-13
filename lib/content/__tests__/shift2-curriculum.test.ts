import { parseCurriculumDoc, SHIFT2_DEFAULT_DOC } from "../shift2-curriculum";

describe("parseCurriculumDoc", () => {
  it("accepts the defaults", () => {
    expect(parseCurriculumDoc(JSON.parse(JSON.stringify(SHIFT2_DEFAULT_DOC)))).toEqual(
      SHIFT2_DEFAULT_DOC,
    );
  });

  it("rejects wrong shapes", () => {
    expect(parseCurriculumDoc(null)).toBeNull();
    expect(parseCurriculumDoc({ ...SHIFT2_DEFAULT_DOC, rules: "x" })).toBeNull();
    const badDay = { ...SHIFT2_DEFAULT_DOC.days[0], date: "14 Oct" };
    expect(parseCurriculumDoc({ ...SHIFT2_DEFAULT_DOC, days: [badDay] })).toBeNull();
    const badRow = { ...SHIFT2_DEFAULT_DOC.days[0], schedule: [["19:00", "x"]] };
    expect(parseCurriculumDoc({ ...SHIFT2_DEFAULT_DOC, days: [badRow] })).toBeNull();
  });

  it("drops unknown keys", () => {
    const doc = parseCurriculumDoc({ ...SHIFT2_DEFAULT_DOC, extra: 1 });
    expect(doc && "extra" in doc).toBe(false);
  });
});
