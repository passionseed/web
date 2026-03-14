import { transformExpertDataToPathLabRequest } from "@/lib/expert-interview/pathlab-transformer";

describe("transformExpertDataToPathLabRequest", () => {
  it("builds a 5-day expert blueprint for PathLab generation", () => {
    const expertData = {
      field: "Software Engineering",
      role: "Backend Engineer",
      industry: "Healthtech",
      dailyTasks: ["Review pull requests", "Debug production incidents"],
      challenges: ["Debugging distributed systems", "Balancing speed and reliability"],
      rewards: ["Seeing users trust the product"],
      misconceptions: ["Engineers mostly just write code all day"],
      skills: {
        technical: ["TypeScript", "System design"],
        soft: ["Stakeholder communication", "Prioritization"],
        hardToDevelop: ["Judgment under pressure"],
      },
      advice: "Try the work before you commit years to it.",
      entryPath: {
        education: "Computer science",
        firstJob: "QA automation intern",
        keySteps: ["Internships", "Junior backend role", "Owning production systems"],
        alternatives: ["Bootcamp + apprenticeship"],
      },
      experienceLevel: "senior",
      yearsInField: 9,
      expertIdentity: {
        specialization: "Distributed backend systems",
        workContext: "Cross-functional product team serving hospitals",
        credibilityMarkers: ["Owns incident response", "Mentors junior engineers"],
      },
      careerTruths: {
        mostImportant: ["Clear thinking during ambiguity"],
        mundaneButRequired: ["Reading logs and tracing small bugs"],
        beginnersUnderestimate: ["How much communication is part of the job"],
        hiddenChallenges: ["Long feedback loops in production"],
        rewardingMoments: ["Shipping invisible reliability improvements"],
        noviceToExpertShifts: ["Moving from coding tasks to making tradeoffs"],
      },
      questBlueprint: {
        studentGoal: "Help students feel the real texture of backend engineering.",
        fitSignals: ["Likes debugging for long stretches"],
        misfitSignals: ["Needs instant visible output every day"],
        mustExperience: ["Investigating a bug from incomplete clues"],
        mustUnderstand: ["Most value comes from reliability, not flashy features"],
        learningObjectives: [
          {
            day: 1,
            title: "See the real work",
            objective: "Compare the fantasy of engineering with the actual week-to-week work.",
            studentDecisionQuestion: "Do I still want this after seeing the real workflow?",
          },
          {
            day: 2,
            title: "Do the mundane core",
            objective: "Experience the repetitive but essential debugging baseline.",
            studentDecisionQuestion: "Can I tolerate and even enjoy careful detail work?",
          },
          {
            day: 3,
            title: "Face the hard part",
            objective: "Work through ambiguity and incomplete information under pressure.",
            studentDecisionQuestion: "How do I react when the answer is not obvious?",
          },
          {
            day: 4,
            title: "Practice judgment",
            objective: "Make a real tradeoff between speed and reliability.",
            studentDecisionQuestion: "Do I like making constrained decisions with consequences?",
          },
          {
            day: 5,
            title: "Decide fit",
            objective: "Reflect on energy, fit, and next experiments before committing.",
            studentDecisionQuestion: "Should I keep exploring this path?",
          },
        ],
      },
    } as any;

    const request = transformExpertDataToPathLabRequest(expertData, {
      name: "Ava Tan",
      title: "Principal Backend Engineer",
      company: "CareGrid",
    }) as any;

    expect(request.totalDays).toBe(5);
    expect(request.learningObjectives).toHaveLength(5);
    expect(request.expertContext.identity.name).toBe("Ava Tan");
    expect(request.expertContext.identity.specialization).toBe("Distributed backend systems");
    expect(request.expertContext.careerTruths.mundaneButRequired).toContain(
      "Reading logs and tracing small bugs"
    );
    expect(request.mustExperience).toContain("Investigating a bug from incomplete clues");
    expect(request.fitSignals).toContain("Likes debugging for long stretches");
    expect(request.misfitSignals).toContain("Needs instant visible output every day");
  });
});
