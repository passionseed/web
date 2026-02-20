import { runPhase1Workflow } from "@/lib/ps-b2b/orchestrator";

describe("runPhase1Workflow", () => {
  it("runs phase 1 pipeline end-to-end with manual seed leads", async () => {
    const result = await runPhase1Workflow({
      filters: {
        geographies: ["bangkok"],
        minStudentCount: 500,
        minAnnualTuitionUsd: 10000,
        keywords: ["college counseling", "career readiness"],
      },
      seedLeads: [
        {
          name: "Northbridge International School",
          website: "https://northbridge.example.edu",
          geography: "Bangkok, Thailand",
          studentCount: 1800,
          annualTuitionUsd: 32000,
          notes: "Strong college counseling and career readiness program.",
          tags: ["college counseling", "career readiness", "ai"],
          decisionMakers: [
            {
              fullName: "Jane Carter",
              role: "Director of College Counseling",
              email: "jane.carter@northbridge.example.edu",
            },
          ],
        },
        {
          name: "Smalltown Public School",
          website: "https://smalltown.example.edu",
          geography: "Bangkok, Thailand",
          studentCount: 300,
          annualTuitionUsd: 2000,
          notes: "General curriculum",
          tags: ["arts"],
        },
      ],
      topN: 5,
      includeOutreach: true,
      useAIOutreach: false,
    });

    expect(result.pipelineStats.discoveredCount).toBe(1);
    expect(result.pipelineStats.scoredCount).toBe(1);
    expect(result.topLeads.length).toBe(1);
    expect(result.topLeads[0].outreach?.email).toContain("Would you be open");
  });
});
