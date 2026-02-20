import { buildPhase1Payload, parseJsonArrayInput, splitCommaList } from "@/components/ps/b2b/phase1-utils";

describe("phase1 utils", () => {
  it("splits comma list into clean lowercased tokens", () => {
    expect(splitCommaList(" Bangkok, thailand , , career ")).toEqual([
      "bangkok",
      "thailand",
      "career",
    ]);
  });

  it("parses valid json arrays and reports invalid json", () => {
    const valid = parseJsonArrayInput<{ name: string }>('[{"name":"A"}]');
    expect(valid.error).toBeUndefined();
    expect(valid.value).toEqual([{ name: "A" }]);

    const invalid = parseJsonArrayInput<{ name: string }>("{bad json}");
    expect(invalid.value).toEqual([]);
    expect(invalid.error).toContain("Invalid JSON");
  });

  it("builds payload with normalized filters", () => {
    const payload = buildPhase1Payload({
      geographiesInput: "Bangkok, Thailand",
      keywordsInput: "college counseling, career readiness",
      minStudentCount: "500",
      minAnnualTuitionUsd: "10000",
      topN: "7",
      includeOutreach: true,
      useAIOutreach: false,
      leads: [{ name: "School", website: "https://school.example.edu" }],
      feedbackEvents: [],
    });

    expect(payload.filters.geographies).toEqual(["bangkok", "thailand"]);
    expect(payload.filters.keywords).toEqual(["college counseling", "career readiness"]);
    expect(payload.topN).toBe(7);
    expect(payload.filters.minStudentCount).toBe(500);
    expect(payload.filters.minAnnualTuitionUsd).toBe(10000);
  });
});
