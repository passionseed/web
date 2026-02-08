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

export function isUnsafePathLabPrompt(input: Pick<PathLabGeneratorRequest, "topic" | "constraints">): boolean {
  const combined = `${input.topic}\n${input.constraints || ""}`;
  return PATHLAB_UNSAFE_TOPIC_PATTERNS.some((pattern) => pattern.test(combined));
}

export function buildPathLabSystemPrompt(): string {
  return [
    "You generate complete PathLab drafts as strict JSON.",
    "Keep output age-appropriate for the requested audience.",
    "Do not include unsafe, sexual, hateful, violent, or illegal guidance.",
    "Do not output markdown wrappers, explanations, or prose outside JSON.",
    "Every day must have practical action and at least one reflection prompt.",
    "Node graph must be a directed acyclic graph.",
    "Avoid making medical, legal, or guaranteed outcome claims.",
  ].join("\n");
}

export function buildPathLabDraftPrompt(input: PathLabGeneratorRequest): string {
  return `Create a full PathLab draft.

Input:
- Topic: ${input.topic}
- Audience: ${input.audience}
- Difficulty: ${input.difficulty}
- Total days: ${input.totalDays}
- Tone: ${input.tone}
- Constraints: ${input.constraints || "None"}

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
