import type { PathLabGeneratorRequest } from "@/types/pathlab-generator";

export const PATHLAB_UNSAFE_TOPIC_PATTERNS = [
  /self[-\s]?harm/i,
  /suicide/i,
  /weapon/i,
  /explosive/i,
  /hate\s*speech/i,
  /porn|sexual\s*content|explicit/i,
  /illegal\s*drug|meth|cocaine|heroin/i,
  /terror/i,
];

export function isUnsafePathLabPrompt(
  input: Pick<
    PathLabGeneratorRequest,
    | "topic"
    | "constraints"
    | "expertContext"
    | "learningObjectives"
    | "fitSignals"
    | "misfitSignals"
    | "mustExperience"
    | "mustUnderstand"
  >,
): boolean {
  const combined = [
    input.topic,
    input.constraints || "",
    input.learningObjectives
      ?.map(
        (objective) =>
          `${objective.title} ${objective.objective} ${objective.studentDecisionQuestion}`,
      )
      .join("\n") || "",
    input.expertContext
      ? [
          input.expertContext.identity.specialization,
          input.expertContext.identity.workContext,
          ...(input.expertContext.identity.credibilityMarkers || []),
          ...(input.expertContext.careerTruths.mostImportant || []),
          ...(input.expertContext.careerTruths.mundaneButRequired || []),
          ...(input.expertContext.careerTruths.beginnersUnderestimate || []),
          ...(input.expertContext.careerTruths.hiddenChallenges || []),
          ...(input.expertContext.careerTruths.rewardingMoments || []),
          ...(input.expertContext.careerTruths.noviceToExpertShifts || []),
          ...(input.expertContext.careerTruths.misconceptions || []),
        ]
          .filter(Boolean)
          .join("\n")
      : "",
    ...(input.fitSignals || []),
    ...(input.misfitSignals || []),
    ...(input.mustExperience || []),
    ...(input.mustUnderstand || []),
  ].join("\n");

  return PATHLAB_UNSAFE_TOPIC_PATTERNS.some((pattern) => pattern.test(combined));
}

export function buildPathLabSystemPrompt(): string {
  return [
    "You generate complete PathLab drafts as strict JSON.",
    "Keep output age-appropriate for the requested audience.",
    "Do not include unsafe, sexual, hateful, violent, or illegal guidance.",
    "Do not output markdown wrappers, explanations, or prose outside JSON.",
    "Every day must have practical action and at least one reflection prompt.",
    "Use the provided learning objectives as the backbone of the 5-day arc when available.",
    "Include both the meaningful and mundane realities of the career when the expert context provides them.",
    "Node graph must be a directed acyclic graph.",
    "Avoid making medical, legal, or guaranteed outcome claims.",
  ].join("\n");
}

export function buildPathLabDraftPrompt(input: PathLabGeneratorRequest): string {
  const hasCareerExplorationContext = Boolean(
    input.expertContext ||
      input.fitSignals?.length ||
      input.misfitSignals?.length ||
      input.mustExperience?.length ||
      input.mustUnderstand?.length,
  );

  const learningObjectivesSection = input.learningObjectives?.length
    ? [
        "",
        "Learning objectives:",
        ...input.learningObjectives.map(
          (objective) =>
            `- Day ${objective.day}: ${objective.title} — ${objective.objective} Student decision question: ${objective.studentDecisionQuestion}`,
        ),
      ].join("\n")
    : "";

  const expertContextSection = input.expertContext
    ? [
        "",
        "Expert context:",
        `- Expert: ${input.expertContext.identity.name}, ${input.expertContext.identity.title} at ${input.expertContext.identity.company}`,
        `- Field / role: ${input.expertContext.identity.field} / ${input.expertContext.identity.role}`,
        input.expertContext.identity.specialization
          ? `- Specialization: ${input.expertContext.identity.specialization}`
          : null,
        input.expertContext.identity.workContext
          ? `- Work context: ${input.expertContext.identity.workContext}`
          : null,
        input.expertContext.careerTruths.mostImportant?.length
          ? `- Most important: ${input.expertContext.careerTruths.mostImportant.join(", ")}`
          : null,
        input.expertContext.careerTruths.mundaneButRequired?.length
          ? `- Mundane but required: ${input.expertContext.careerTruths.mundaneButRequired.join(", ")}`
          : null,
        input.expertContext.careerTruths.hiddenChallenges?.length
          ? `- Hidden challenges: ${input.expertContext.careerTruths.hiddenChallenges.join(", ")}`
          : null,
        input.expertContext.careerTruths.misconceptions?.length
          ? `- Misconceptions: ${input.expertContext.careerTruths.misconceptions.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const fitSection = hasCareerExplorationContext
    ? [
        "",
        "Fit guidance:",
        `- Fit signals: ${input.fitSignals?.length ? input.fitSignals.join(", ") : "None provided"}`,
        `- Misfit signals: ${input.misfitSignals?.length ? input.misfitSignals.join(", ") : "None provided"}`,
        `- Must experience: ${input.mustExperience?.length ? input.mustExperience.join(", ") : "None provided"}`,
        `- Must understand: ${input.mustUnderstand?.length ? input.mustUnderstand.join(", ") : "None provided"}`,
      ].join("\n")
    : "";

  return `Create a full PathLab draft.

Input:
- Topic: ${input.topic}
- Audience: ${input.audience}
- Difficulty: ${input.difficulty}
- Total days: ${input.totalDays}
- Tone: ${input.tone}
- Constraints: ${input.constraints || "None"}${learningObjectivesSection}${expertContextSection}${fitSection}

Output requirements:
- path.total_days MUST equal ${input.totalDays}
- days length MUST equal ${input.totalDays}
- day_number must be continuous 1..${input.totalDays}
- node keys must be stable slug-like IDs
- edges must reference existing node keys only
- avoid orphan nodes (every node must appear in at least one day)
- ensure node content types only from: text, video, pdf, image, resource_link
- assessment type only from: none, text_answer, quiz, file_upload, checklist
- for quiz: include at least 2 options and one correct option per question
- each day should clearly map to one learning objective when objectives are provided
- include at least one mundane-but-important reality if the expert context contains one
- include at least one difficult or ambiguous moment if the expert context contains one
${hasCareerExplorationContext ? "- the final day should help the student evaluate fit before committing deeper\n" : ""}

Keep writing concise and specific to the audience.`;
}

export function buildDayRegeneratePrompt(params: {
  topic: string;
  audience: string;
  difficulty: string;
  tone: string;
  dayNumber: number;
  totalDays: number;
  nodeTitles: string[];
  constraints?: string;
}): string {
  return `Regenerate one PathLab day context in JSON.

Context:
- Topic: ${params.topic}
- Audience: ${params.audience}
- Difficulty: ${params.difficulty}
- Tone: ${params.tone}
- Day: ${params.dayNumber} of ${params.totalDays}
- Nodes in this day: ${params.nodeTitles.join(", ")}
- Constraints: ${params.constraints || "None"}

Return only JSON with:
- title (optional)
- context_text
- reflection_prompts[] (at least one)

Make the day context actionable and aligned with the listed nodes.`;
}

export function buildNodeRegeneratePrompt(params: {
  topic: string;
  audience: string;
  difficulty: string;
  tone: string;
  nodeTitle: string;
  constraints?: string;
}): string {
  return `Regenerate one PathLab node in JSON.

Context:
- Topic: ${params.topic}
- Audience: ${params.audience}
- Difficulty: ${params.difficulty}
- Tone: ${params.tone}
- Node title: ${params.nodeTitle}
- Constraints: ${params.constraints || "None"}

Return only JSON with:
- title
- instructions
- difficulty (beginner|intermediate|advanced)
- content[] (type in text|video|pdf|image|resource_link)
- assessment object (type in none|text_answer|quiz|file_upload|checklist)

For quiz assessments, include quiz_questions with quality distractors.`;
}
