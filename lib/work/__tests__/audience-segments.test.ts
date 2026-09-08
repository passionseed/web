import {
  AUDIENCE_SEGMENTS,
  buildDmReply,
  FUNNEL_CONVERSION_STEPS,
  SDT_NEEDS,
  WORKSHEETS,
  getSegmentByKeyword,
  getWorksheetForSegment,
  projectFunnelLift,
  projectPaidFromLeads,
} from "../audience-segments";

describe("audience segmentation", () => {
  it("splits the whole inbound audience with unique keywords", () => {
    const totalShare = AUDIENCE_SEGMENTS.reduce((total, segment) => total + segment.share, 0);
    const keywords = AUDIENCE_SEGMENTS.map((segment) => segment.keyword);

    expect(totalShare).toBe(100);
    expect(new Set(keywords).size).toBe(keywords.length);
    expect(getSegmentByKeyword("port")?.id).toBe("collector");
  });

  it("covers every self-determination need across the segment set", () => {
    const needs = new Set(AUDIENCE_SEGMENTS.map((segment) => segment.starvedNeed));

    expect(needs.size).toBe(SDT_NEEDS.length);
    expect(AUDIENCE_SEGMENTS.every((segment) => segment.guardrail.length > 0)).toBe(true);
  });

  it("gives every segment one usable worksheet that matches its starved need", () => {
    expect(WORKSHEETS).toHaveLength(AUDIENCE_SEGMENTS.length);

    AUDIENCE_SEGMENTS.forEach((segment) => {
      const worksheet = getWorksheetForSegment(segment.id);

      expect(worksheet).toBeDefined();
      expect(worksheet?.need).toBe(segment.starvedNeed);
      expect(worksheet?.keyword).toBe(segment.keyword);
      expect(worksheet?.prompts.length).toBeGreaterThanOrEqual(5);
      expect(worksheet?.sendBack.length).toBeGreaterThan(0);
    });
  });

  it("numbers worksheet prompts in order", () => {
    WORKSHEETS.forEach((worksheet) => {
      expect(worksheet.prompts.map((prompt) => prompt.n)).toEqual(
        worksheet.prompts.map((_, index) => index + 1)
      );
    });
  });
});

describe("funnel lift projection", () => {
  it("projects at least a 10x lift from the segmented worksheet chain", () => {
    const projection = projectFunnelLift();

    expect(projection.totalLift).toBeGreaterThanOrEqual(10);
    expect(projection.targetRate).toBeGreaterThan(projection.baselineRate);
  });

  it("claims no credit for a better close rate", () => {
    const closeStep = projectFunnelLift().steps.find((step) => step.id === "paid");

    expect(closeStep?.heldFlat).toBe(true);
    expect(closeStep?.lift).toBe(1);
  });

  it("never lets a target fall below its measured baseline", () => {
    FUNNEL_CONVERSION_STEPS.forEach((step) => {
      expect(step.target).toBeGreaterThanOrEqual(step.baseline);
      expect(step.target).toBeLessThanOrEqual(1);
    });
  });

  it("converts a lead volume into paid conversations", () => {
    const { baselineRate, targetRate } = projectFunnelLift();

    expect(projectPaidFromLeads(326, baselineRate)).toBeLessThan(
      projectPaidFromLeads(326, targetRate)
    );
  });
});

describe("dm reply", () => {
  it("puts the free worksheet link and the return ask in the first reply", () => {
    const segment = AUDIENCE_SEGMENTS[0];
    const reply = buildDmReply(segment, "https://passionseed.co");
    const worksheet = getWorksheetForSegment(segment.id);

    expect(reply).toContain(`https://passionseed.co/worksheet/${segment.worksheetSlug}`);
    expect(reply).toContain(worksheet!.output);
    expect(reply).toContain(worksheet!.sendBack);
  });

  it("builds a reply for every segment", () => {
    AUDIENCE_SEGMENTS.forEach((segment) => {
      expect(() => buildDmReply(segment)).not.toThrow();
    });
  });
});
