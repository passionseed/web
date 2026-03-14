import type { ExtractedLearningObjective, ExtractedQuestBlueprint } from "@/types/expert-interview";

export const DEFAULT_FIVE_DAY_ARC: ExtractedLearningObjective[] = [
  {
    day: 1,
    title: "See the real work",
    objective: "Destroy the fantasy version of the career by showing the actual workflow and expectations.",
    studentDecisionQuestion: "Do I still want this after seeing the real day-to-day work?",
  },
  {
    day: 2,
    title: "Do the mundane core",
    objective: "Experience the repetitive but essential tasks that make the career function in real life.",
    studentDecisionQuestion: "Can I tolerate and maybe enjoy the boring-but-important baseline of this work?",
  },
  {
    day: 3,
    title: "Face the hard part",
    objective: "Confront the ambiguity, friction, or pressure that makes this career difficult.",
    studentDecisionQuestion: "How do I react when the work gets frustrating, slow, or unclear?",
  },
  {
    day: 4,
    title: "Practice judgment",
    objective: "Try the kind of tradeoff or decision-making that separates novices from real practitioners.",
    studentDecisionQuestion: "Do I like the kind of thinking this career demands when there is no perfect answer?",
  },
  {
    day: 5,
    title: "Decide fit",
    objective: "Reflect on energy, fit, and whether to keep exploring before committing deeper.",
    studentDecisionQuestion: "Should I keep exploring this path or try another one first?",
  },
];

export function normalizeQuestBlueprint(
  questBlueprint?: ExtractedQuestBlueprint,
): ExtractedQuestBlueprint {
  const providedObjectives = (questBlueprint?.learningObjectives || []).slice(0, 5);

  const normalizedObjectives = DEFAULT_FIVE_DAY_ARC.map((fallback, index) => {
    const objective = providedObjectives[index];

    if (!objective) {
      return fallback;
    }

    return {
      day: objective.day || fallback.day,
      title: objective.title || fallback.title,
      objective: objective.objective || fallback.objective,
      studentDecisionQuestion:
        objective.studentDecisionQuestion || fallback.studentDecisionQuestion,
    };
  });

  return {
    studentGoal: questBlueprint?.studentGoal,
    fitSignals: questBlueprint?.fitSignals || [],
    misfitSignals: questBlueprint?.misfitSignals || [],
    mustExperience: questBlueprint?.mustExperience || [],
    mustUnderstand: questBlueprint?.mustUnderstand || [],
    learningObjectives: normalizedObjectives,
  };
}
