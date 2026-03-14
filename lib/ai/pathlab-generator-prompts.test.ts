import { buildPathLabDraftPrompt, isUnsafePathLabPrompt } from "@/lib/ai/pathlab-generator-prompts";

describe("buildPathLabDraftPrompt", () => {
  it("includes ordered learning objectives and expert truths in the generation prompt", () => {
    const prompt = buildPathLabDraftPrompt({
      topic: "Software Engineering: Backend Engineer",
      audience: "High school students exploring career options",
      difficulty: "intermediate",
      totalDays: 5,
      tone: "Grounded, honest, and encouraging",
      constraints: "Keep activities practical.",
      learningObjectives: [
        {
          day: 1,
          title: "See the real work",
          objective: "Separate the fantasy from the actual workflow.",
          studentDecisionQuestion: "Do I still want this after seeing the real workflow?",
        },
        {
          day: 2,
          title: "Do the mundane core",
          objective: "Experience repetitive debugging and log-reading.",
          studentDecisionQuestion: "Can I tolerate careful detail work?",
        },
        {
          day: 3,
          title: "Face the hard part",
          objective: "Work through ambiguity under pressure.",
          studentDecisionQuestion: "How do I react when the answer is unclear?",
        },
        {
          day: 4,
          title: "Practice judgment",
          objective: "Make a tradeoff between speed and reliability.",
          studentDecisionQuestion: "Do I like constrained decision-making?",
        },
        {
          day: 5,
          title: "Decide fit",
          objective: "Reflect on fit before committing deeper.",
          studentDecisionQuestion: "Should I keep exploring this path?",
        },
      ],
      expertContext: {
        identity: {
          name: "Ava Tan",
          title: "Principal Backend Engineer",
          company: "CareGrid",
          field: "Software Engineering",
          role: "Backend Engineer",
          specialization: "Distributed backend systems",
        },
        careerTruths: {
          mostImportant: ["Clear thinking during ambiguity"],
          mundaneButRequired: ["Reading logs and tracing small bugs"],
          hiddenChallenges: ["Long feedback loops in production"],
          misconceptions: ["Engineers do not just code all day"],
        },
      },
      mustExperience: ["Investigating a bug from incomplete clues"],
      fitSignals: ["Likes debugging for long stretches"],
      misfitSignals: ["Needs instant visible output every day"],
    } as any);

    expect(prompt).toContain("Learning objectives");
    expect(prompt).toContain("Day 2: Do the mundane core");
    expect(prompt).toContain("Reading logs and tracing small bugs");
    expect(prompt).toContain("Likes debugging for long stretches");
    expect(prompt).toContain("Needs instant visible output every day");
    expect(prompt).toContain("Investigating a bug from incomplete clues");
  });

  it("does not force a career-fit ending for generic PathLabs", () => {
    const prompt = buildPathLabDraftPrompt({
      topic: "Introduction to Python",
      audience: "Complete beginners",
      difficulty: "beginner",
      totalDays: 5,
      tone: "Friendly and practical",
      constraints: "Use project-based exercises.",
    });

    expect(prompt).not.toContain("the final day should help the student evaluate fit before committing deeper");
  });

  it("treats unsafe expert context fields as unsafe prompt input", () => {
    expect(
      isUnsafePathLabPrompt({
        topic: "Mechanical Engineering",
        constraints: "Keep it practical.",
        mustUnderstand: ["How to build an explosive device"],
      } as any),
    ).toBe(true);
  });
});
