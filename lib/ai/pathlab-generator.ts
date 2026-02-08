import { generateObject } from "ai";
import { getModel } from "@/lib/ai/modelRegistry";
import {
  pathLabDayRegenerateSchema,
  pathLabGeneratorDraftSchema,
  pathLabNodeRegenerateSchema,
  type PathLabDayRegenerateInput,
  type PathLabGeneratorDraftInput,
  type PathLabGeneratorRequestInput,
  type PathLabNodeRegenerateInput,
} from "@/lib/ai/pathlab-generator-schema";
import {
  buildDayRegeneratePrompt,
  buildNodeRegeneratePrompt,
  buildPathLabDraftPrompt,
  buildPathLabSystemPrompt,
  isUnsafePathLabPrompt,
} from "@/lib/ai/pathlab-generator-prompts";

function cleanText(input: string | null | undefined, fallback = ""): string {
  const value = (input || "").replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "").trim();
  return value || fallback;
}

function cleanOptionalText(input: string | null | undefined): string | null {
  const value = cleanText(input);
  return value || null;
}

function cleanUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;
  if (/^javascript:/i.test(value)) return null;
  return value;
}

function sanitizeDraft(draft: PathLabGeneratorDraftInput): PathLabGeneratorDraftInput {
  return {
    ...draft,
    seed: {
      ...draft.seed,
      title: cleanText(draft.seed.title, "Generated PathLab"),
      slogan: cleanText(draft.seed.slogan, "Explore by doing"),
      description: cleanText(draft.seed.description, ""),
      category_name: cleanText(draft.seed.category_name, "PathLab"),
    },
    days: draft.days.map((day) => ({
      ...day,
      title: cleanOptionalText(day.title),
      context_text: cleanText(day.context_text, `Day ${day.day_number}`),
      reflection_prompts: day.reflection_prompts
        .map((prompt) => cleanText(prompt))
        .filter(Boolean),
      node_keys: day.node_keys.map((key) => key.trim()).filter(Boolean),
    })),
    nodes: draft.nodes.map((node) => ({
      ...node,
      key: node.key.trim(),
      title: cleanText(node.title, "Untitled node"),
      instructions: cleanText(node.instructions, "Follow the task steps and reflect on what you discover."),
      content: node.content.map((content) => ({
        ...content,
        title: cleanOptionalText(content.title),
        body: cleanOptionalText(content.body),
        url: cleanUrl(content.url),
      })),
      assessment: {
        ...node.assessment,
        prompt: cleanOptionalText(node.assessment.prompt),
        checklist_items: (node.assessment.checklist_items || [])
          .map((item) => cleanText(item))
          .filter(Boolean),
        quiz_questions: (node.assessment.quiz_questions || []).map((question) => ({
          ...question,
          question_text: cleanText(question.question_text, "Choose the best answer."),
          options: question.options
            .map((option) => ({
              option: cleanText(option.option, "A"),
              text: cleanText(option.text, "Option"),
            }))
            .filter((option) => option.option && option.text),
        })),
      },
    })),
    edges: draft.edges
      .map((edge) => ({
        source_key: edge.source_key.trim(),
        destination_key: edge.destination_key.trim(),
      }))
      .filter((edge) => edge.source_key && edge.destination_key),
  };
}

export async function generatePathLabDraft(
  input: PathLabGeneratorRequestInput,
): Promise<PathLabGeneratorDraftInput> {
  if (isUnsafePathLabPrompt({ topic: input.topic, constraints: input.constraints })) {
    throw new Error("Topic or constraints are not allowed for safety reasons");
  }

  const { object } = await generateObject({
    model: getModel("google/gemini-2.5-flash"),
    system: buildPathLabSystemPrompt(),
    schema: pathLabGeneratorDraftSchema,
    prompt: buildPathLabDraftPrompt(input),
    temperature: 0.2,
  });

  const parsed = pathLabGeneratorDraftSchema.parse(object);
  return sanitizeDraft(parsed);
}

export async function regeneratePathLabDay(
  input: PathLabGeneratorRequestInput & {
    dayNumber: number;
    nodeTitles: string[];
  },
): Promise<PathLabDayRegenerateInput> {
  const { object } = await generateObject({
    model: getModel("google/gemini-2.5-flash"),
    system: buildPathLabSystemPrompt(),
    schema: pathLabDayRegenerateSchema,
    prompt: buildDayRegeneratePrompt({
      topic: input.topic,
      audience: input.audience,
      difficulty: input.difficulty,
      tone: input.tone,
      dayNumber: input.dayNumber,
      totalDays: input.totalDays,
      nodeTitles: input.nodeTitles,
      constraints: input.constraints,
    }),
    temperature: 0.35,
  });

  const parsed = pathLabDayRegenerateSchema.parse(object);
  return {
    title: cleanOptionalText(parsed.title),
    context_text: cleanText(parsed.context_text),
    reflection_prompts: parsed.reflection_prompts
      .map((prompt) => cleanText(prompt))
      .filter(Boolean),
  };
}

export async function regeneratePathLabNode(
  input: PathLabGeneratorRequestInput & {
    nodeTitle: string;
  },
): Promise<PathLabNodeRegenerateInput> {
  const { object } = await generateObject({
    model: getModel("google/gemini-2.5-flash"),
    system: buildPathLabSystemPrompt(),
    schema: pathLabNodeRegenerateSchema,
    prompt: buildNodeRegeneratePrompt({
      topic: input.topic,
      audience: input.audience,
      difficulty: input.difficulty,
      tone: input.tone,
      nodeTitle: input.nodeTitle,
      constraints: input.constraints,
    }),
    temperature: 0.4,
  });

  const parsed = pathLabNodeRegenerateSchema.parse(object);
  return {
    ...parsed,
    title: cleanText(parsed.title, "Untitled node"),
    instructions: cleanText(parsed.instructions),
    content: parsed.content.map((content) => ({
      ...content,
      title: cleanOptionalText(content.title),
      body: cleanOptionalText(content.body),
      url: cleanUrl(content.url),
    })),
    assessment: {
      ...parsed.assessment,
      prompt: cleanOptionalText(parsed.assessment.prompt),
      checklist_items: (parsed.assessment.checklist_items || [])
        .map((item) => cleanText(item))
        .filter(Boolean),
      quiz_questions: (parsed.assessment.quiz_questions || []).map((question) => ({
        ...question,
        question_text: cleanText(question.question_text),
        options: question.options
          .map((option) => ({
            option: cleanText(option.option, "A"),
            text: cleanText(option.text, "Option"),
          }))
          .filter((option) => option.option && option.text),
      })),
    },
  };
}
