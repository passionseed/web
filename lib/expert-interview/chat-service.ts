import { generateObject } from "ai";
import { getModel } from "@/lib/ai/modelRegistry";
import { normalizeQuestBlueprint } from "@/lib/expert-interview/quest-blueprint";
import { z } from "zod";
import type { ChatMessage, ExtractedCareerData, InterviewQuestion } from "@/types/expert-interview";
import { sanitizeExpertInput } from "./sanitizer";

const TOTAL_QUESTIONS = 8;

const INTERVIEW_QUESTIONS: Array<{ id: string; prompt: string }> = [
  {
    id: "field_role",
    prompt:
      "Hi! I want to turn your real experience into a useful career exploration for students. What field do you work in, what is your role, and what part of the field do you specialize in?",
  },
  {
    id: "reality_check",
    prompt:
      "What do outsiders think your job looks like, and what actually fills most of your week? Walk me through the real work, not the polished version.",
  },
  {
    id: "mundane_core",
    prompt:
      "What part of the job is important but boring, repetitive, or easy to underestimate? What do people have to be willing to do regularly if they want to succeed here?",
  },
  {
    id: "hard_part",
    prompt:
      "What is the hardest part of the job, or the judgment call that separates a beginner from a real practitioner? Give me a concrete example if you can.",
  },
  {
    id: "rewarding_work",
    prompt:
      "What makes the work worth it for you? Which moments feel meaningful enough that they balance out the hard parts?",
  },
  {
    id: "fit_signals",
    prompt:
      "What kind of student would feel energized in this career, and what kind of student would probably feel drained fast?",
  },
  {
    id: "skills",
    prompt:
      "What skills are essential for this work, and which ones took you the longest to develop in real life?",
  },
  {
    id: "entry_path",
    prompt:
      "How did you get into this field, what would you tell your 18-year-old self, and what is one honest 30-minute task a student should try before deciding whether this path is for them?",
  },
];

const extractedDataSchema = z.object({
  field: z.string(),
  role: z.string(),
  industry: z.string().optional(),
  dailyTasks: z.array(z.string()),
  challenges: z.array(z.string()),
  rewards: z.array(z.string()),
  misconceptions: z.array(z.string()),
  skills: z.object({
    technical: z.array(z.string()),
    soft: z.array(z.string()),
    hardToDevelop: z.array(z.string()),
  }),
  advice: z.string(),
  entryPath: z.object({
    education: z.string().optional(),
    firstJob: z.string().optional(),
    keySteps: z.array(z.string()),
    alternatives: z.array(z.string()).optional(),
  }),
  experienceLevel: z.string(),
  yearsInField: z.number(),
  expertIdentity: z
    .object({
      specialization: z.string().optional(),
      workContext: z.string().optional(),
      credibilityMarkers: z.array(z.string()).default([]),
    })
    .optional(),
  careerTruths: z
    .object({
      mostImportant: z.array(z.string()).default([]),
      mundaneButRequired: z.array(z.string()).default([]),
      beginnersUnderestimate: z.array(z.string()).default([]),
      hiddenChallenges: z.array(z.string()).default([]),
      rewardingMoments: z.array(z.string()).default([]),
      noviceToExpertShifts: z.array(z.string()).default([]),
    })
    .optional(),
  questBlueprint: z
    .object({
      studentGoal: z.string().optional(),
      fitSignals: z.array(z.string()).default([]),
      misfitSignals: z.array(z.string()).default([]),
      mustExperience: z.array(z.string()).default([]),
      mustUnderstand: z.array(z.string()).default([]),
      learningObjectives: z
        .array(
          z.object({
            day: z.number().int().min(1).max(5),
            title: z.string(),
            objective: z.string(),
            studentDecisionQuestion: z.string(),
          }),
        )
        .max(5)
        .optional(),
    })
    .optional(),
});

export function getFirstQuestion(): InterviewQuestion {
  return { id: INTERVIEW_QUESTIONS[0].id, text: INTERVIEW_QUESTIONS[0].prompt };
}

export function getTotalQuestions(): number {
  return TOTAL_QUESTIONS;
}

export function getInterviewQuestions(): InterviewQuestion[] {
  return INTERVIEW_QUESTIONS.map((question) => ({
    id: question.id,
    text: question.prompt,
  }));
}

export { normalizeQuestBlueprint };

const MAX_FOLLOWUPS_PER_QUESTION = 2;

export async function processInterviewMessage(
  message: string,
  currentQuestionId: string | null,
  conversationHistory: ChatMessage[]
): Promise<{
  nextQuestion?: InterviewQuestion;
  progress: { current: number; total: number };
  isComplete: boolean;
  extractedData?: ExtractedCareerData;
}> {
  const sanitized = sanitizeExpertInput(message);

  const updatedHistory: ChatMessage[] = [
    ...conversationHistory,
    { role: "user", content: sanitized, timestamp: new Date().toISOString() },
  ];

  const questionIndex = INTERVIEW_QUESTIONS.findIndex((q) => q.id === currentQuestionId);
  const isLastQuestion = questionIndex === INTERVIEW_QUESTIONS.length - 1;

  if (questionIndex < 0) {
    const extractedData = await extractCareerData(updatedHistory);
    return {
      progress: { current: TOTAL_QUESTIONS, total: TOTAL_QUESTIONS },
      isComplete: true,
      extractedData,
    };
  }

  const currentTopicPrompt = INTERVIEW_QUESTIONS[questionIndex].prompt;
  const nextQuestionDef = isLastQuestion ? null : INTERVIEW_QUESTIONS[questionIndex + 1];

  // Count how many follow-ups have already been asked for this question
  // by counting consecutive assistant messages with the same questionId
  const followupCount = countFollowupsForQuestion(conversationHistory, currentTopicPrompt);
  const mustAdvance = followupCount >= MAX_FOLLOWUPS_PER_QUESTION;

  const evaluation = await evaluateAndRespond(
    sanitized,
    currentTopicPrompt,
    nextQuestionDef?.prompt,
    updatedHistory,
    mustAdvance
  );

  if (evaluation.isTopicCovered) {
    if (isLastQuestion) {
      // The last topic is sufficiently covered, conclude the interview.
      const extractedData = await extractCareerData(updatedHistory);
      return {
        progress: { current: TOTAL_QUESTIONS, total: TOTAL_QUESTIONS },
        isComplete: true,
        extractedData,
      };
    } else {
      // Move to the next question
      return {
        nextQuestion: { id: nextQuestionDef!.id, text: evaluation.interviewerResponse },
        progress: { current: questionIndex + 2, total: TOTAL_QUESTIONS },
        isComplete: false,
      };
    }
  } else {
    // Dig deeper into the current question, don't advance the index
    return {
      nextQuestion: { id: INTERVIEW_QUESTIONS[questionIndex].id, text: evaluation.interviewerResponse },
      progress: { current: questionIndex + 1, total: TOTAL_QUESTIONS },
      isComplete: false,
    };
  }
}

const decisionSchema = z.object({
  isTopicCovered: z.boolean().describe("True if the expert has provided enough specific, concrete details for the current topic. False if their answer is too brief, vague, or misses the core point."),
  interviewerResponse: z.string().describe("What the interviewer should say next. If isTopicCovered is true, write a natural transition to the NEXT topic. If false, write a probing follow-up question to dig deeper into the CURRENT topic.")
});

function countFollowupsForQuestion(history: ChatMessage[], currentQuestionPrompt: string): number {
  // Find where the current question was first asked (last assistant message containing the question)
  let questionStartIdx = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "assistant" && history[i].content.includes(currentQuestionPrompt.slice(0, 40))) {
      questionStartIdx = i;
      break;
    }
  }
  if (questionStartIdx < 0) return 0;
  // Count assistant messages after the question was introduced (those are follow-ups)
  return history.slice(questionStartIdx + 1).filter((m) => m.role === "assistant").length;
}

async function evaluateAndRespond(
  lastAnswer: string,
  currentTopicPrompt: string,
  nextTopicPrompt: string | undefined,
  history: ChatMessage[],
  mustAdvance: boolean
): Promise<{ isTopicCovered: boolean; interviewerResponse: string }> {
  if (mustAdvance) {
    return {
      isTopicCovered: true,
      interviewerResponse: nextTopicPrompt || "Thank you, that gives me a clear picture. That wraps up our conversation!",
    };
  }

  // Build a summary of what the expert has shared so far on this topic
  // by including recent conversation turns (last 6 messages for context)
  const recentExchanges = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Expert" : "Interviewer"}: ${m.content}`)
    .join("\n");

  try {
    const { object } = await generateObject({
      model: getModel("gemini-2.5-flash"),
      schema: decisionSchema,
      system: [
        "You are a warm, curious interviewer helping young people understand careers.",
        "Your job is to evaluate if the expert has provided ENOUGH CUMULATIVE information on the current topic across all their responses — not just the latest message.",
        "Consider ALL the information they have shared so far in the conversation when judging if the topic is covered.",
        "If the combined information across their responses gives a student a clear picture of the field, role, and specialization, choose isTopicCovered=true.",
        "Only choose isTopicCovered=false if there is still a meaningful gap that would genuinely help a student understand this career better.",
        "Prefer follow-up questions that reveal hidden realities, boring-but-important work, difficult judgment calls, or signals of fit and misfit.",
        "If the topic is sufficiently covered, choose isTopicCovered=true and smoothly transition to the NEXT topic.",
        "Keep your response conversational and concise (1-2 sentences max).",
        "Do not repeat what the expert said back to them.",
      ].join(" "),
      prompt: [
        `Current Topic: "${currentTopicPrompt}"`,
        "",
        "Recent conversation (evaluate the CUMULATIVE information provided, not just the last message):",
        recentExchanges,
        "",
        nextTopicPrompt ? `Next topic to transition to if covered: "${nextTopicPrompt}"` : `This is the final topic of the interview.`,
        "Has the expert collectively provided enough on this topic? Evaluate and respond.",
      ].join("\n"),
    });
    return object;
  } catch {
    // Fallback: assume covered and move to next
    return {
      isTopicCovered: true,
      interviewerResponse: nextTopicPrompt || "Thank you for sharing that! That concludes our interview.",
    };
  }
}

async function extractCareerData(conversationHistory: ChatMessage[]): Promise<ExtractedCareerData> {
  const transcript = conversationHistory
    .map((m) => `${m.role === "user" ? "Expert" : "Interviewer"}: ${m.content}`)
    .join("\n\n");

  const { object } = await generateObject({
    model: getModel("gemini-2.5-flash"),
    schema: extractedDataSchema,
    prompt: [
      "Extract structured career data and a career exploration blueprint from this interview transcript.",
      "Be specific, concrete, and grounded in what the expert actually said.",
      "Avoid generic advice. Prefer hidden realities, real tradeoffs, mundane work, and fit/misfit signals.",
      "Return exactly 5 learning objectives that help a student decide whether to keep exploring this path.",
      "If a field is not mentioned, provide a reasonable inference or leave empty arrays.",
      "",
      "Transcript:",
      transcript,
    ].join("\n"),
    temperature: 0.1,
  });

  return {
    ...object,
    industry: object.industry,
    entryPath: {
      ...object.entryPath,
      alternatives: object.entryPath.alternatives,
    },
    expertIdentity: object.expertIdentity,
    careerTruths: object.careerTruths,
    questBlueprint: normalizeQuestBlueprint(object.questBlueprint),
  };
}
