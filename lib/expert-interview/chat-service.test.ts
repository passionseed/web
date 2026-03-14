jest.mock("ai", () => ({
  generateObject: jest.fn(),
  generateText: jest.fn(),
}));

jest.mock("@/lib/ai/modelRegistry", () => ({
  getModel: jest.fn(() => "mock-model"),
}));

jest.mock("@/lib/expert-interview/sanitizer", () => ({
  sanitizeExpertInput: jest.fn((value: string) => value),
}));

const chatService = require("@/lib/expert-interview/chat-service") as {
  getFirstQuestion: () => { id: string; text: string };
  getInterviewQuestions?: () => Array<{ id: string; text: string }>;
  getTotalQuestions: () => number;
  normalizeQuestBlueprint?: (questBlueprint?: {
    studentGoal?: string;
    fitSignals?: string[];
    misfitSignals?: string[];
    mustExperience?: string[];
    mustUnderstand?: string[];
    learningObjectives?: Array<{
      day?: number;
      title: string;
      objective: string;
      studentDecisionQuestion: string;
    }>;
  }) => {
    learningObjectives: Array<{
      day: number;
      title: string;
      objective: string;
      studentDecisionQuestion: string;
    }>;
  };
};

describe("expert interview question set", () => {
  it("covers identity, mundane reality, hidden difficulty, fit, and try-before-commit signals", () => {
    expect(chatService.getTotalQuestions()).toBe(8);

    const firstQuestion = chatService.getFirstQuestion();
    expect(firstQuestion.text.toLowerCase()).toContain("role");

    expect(typeof chatService.getInterviewQuestions).toBe("function");

    const prompts = chatService.getInterviewQuestions!().map((question) => question.text.toLowerCase());

    expect(prompts.some((prompt) => prompt.includes("boring") || prompt.includes("mundane"))).toBe(true);
    expect(prompts.some((prompt) => prompt.includes("outsiders") || prompt.includes("misunderstand"))).toBe(true);
    expect(prompts.some((prompt) => prompt.includes("energized") || prompt.includes("drain"))).toBe(true);
    expect(prompts.some((prompt) => prompt.includes("30 minutes") || prompt.includes("try"))).toBe(true);
  });

  it("normalizes partial quest blueprints into a stable 5-day arc", () => {
    expect(typeof chatService.normalizeQuestBlueprint).toBe("function");

    const normalized = chatService.normalizeQuestBlueprint!({
      studentGoal: "Help students try the real work.",
      learningObjectives: [
        {
          title: "See the real work",
          objective: "Compare fantasy with reality.",
          studentDecisionQuestion: "Do I still want this?",
        },
        {
          title: "Do the mundane core",
          objective: "Try the boring but necessary work.",
          studentDecisionQuestion: "Can I handle the baseline?",
        },
        {
          title: "Face the hard part",
          objective: "Work through ambiguity.",
          studentDecisionQuestion: "How do I react to friction?",
        },
        {
          title: "Practice judgment",
          objective: "Make a tradeoff.",
          studentDecisionQuestion: "Do I like this type of decision?",
        },
      ],
    });

    expect(normalized.learningObjectives).toHaveLength(5);
    expect(normalized.learningObjectives[4].day).toBe(5);
    expect(normalized.learningObjectives[4].title.toLowerCase()).toContain("decide");
  });
});
