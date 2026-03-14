import { generateText, generateObject } from "ai";
import { getModel } from "@/lib/ai/modelRegistry";
import { z } from "zod";
import type { ChatMessage, ExtractedCareerData, InterviewQuestion } from "@/types/expert-interview";
import { sanitizeExpertInput } from "./sanitizer";

const TOTAL_QUESTIONS = 8;

const INTERVIEW_QUESTIONS: Array<{ id: string; prompt: string }> = [
  {
    id: "field_role",
    prompt:
      "Hi! I'm here to learn about your career so I can help young people explore it. What field do you work in, and what's your current role?",
  },
  {
    id: "daily_tasks",
    prompt:
      "Walk me through a typical day. What are the main things you actually do at work?",
  },
  {
    id: "challenges",
    prompt:
      "What are the hardest parts of your job? What challenges do you face regularly?",
  },
  {
    id: "rewards",
    prompt:
      "What makes the hard work worth it? What do you find most rewarding about what you do?",
  },
  {
    id: "misconceptions",
    prompt:
      "What do people get wrong about your job? What surprises them when they learn what you actually do?",
  },
  {
    id: "skills",
    prompt:
      "What skills are essential for your work? Which ones took you the longest to develop?",
  },
  {
    id: "advice",
    prompt:
      "If you could go back and tell your 18-year-old self something about this career path, what would you say?",
  },
  {
    id: "entry_path",
    prompt:
      "How did you get into this field? What was your path from school to where you are now?",
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
});

export function getFirstQuestion(): InterviewQuestion {
  return { id: INTERVIEW_QUESTIONS[0].id, text: INTERVIEW_QUESTIONS[0].prompt };
}

export function getTotalQuestions(): number {
  return TOTAL_QUESTIONS;
}

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
  
  const evaluation = await evaluateAndRespond(
    sanitized,
    currentTopicPrompt,
    nextQuestionDef?.prompt,
    updatedHistory
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

async function evaluateAndRespond(
  lastAnswer: string,
  currentTopicPrompt: string,
  nextTopicPrompt: string | undefined,
  history: ChatMessage[]
): Promise<{ isTopicCovered: boolean; interviewerResponse: string }> {
  try {
    const { object } = await generateObject({
      model: getModel("gemini-2.5-flash"),
      schema: decisionSchema,
      system: [
        "You are a warm, curious interviewer helping young people understand careers.",
        "Your job is to evaluate if the expert has provided enough depth on the current topic.",
        "If their answer is too short, generic, or lacks concrete examples, choose isTopicCovered=false and ask a specific follow-up question to dig deeper.",
        "If they gave a great, detailed answer, choose isTopicCovered=true and smoothly transition to the NEXT topic.",
        "Keep your response conversational and concise (1-2 sentences max).",
        "Do not repeat what the expert said back to them.",
      ].join(" "),
      prompt: [
        `Current Topic we are discussing: "${currentTopicPrompt}"`,
        `Expert's last response: "${lastAnswer}"`,
        nextTopicPrompt ? `Next topic we need to ask about eventually: "${nextTopicPrompt}"` : `This is the final topic of the interview.`,
        "Evaluate the response and generate what the interviewer should say next.",
      ].join("\n"),
    });
    return object;
  } catch {
    // Fallback: assume covered and move to next, or just prompt next question
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
      "Extract structured career data from this interview transcript.",
      "Be specific and concrete. Avoid vague generalizations.",
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
  };
}
