import { generateObject } from "ai";
import { getModel } from "@/lib/ai/modelRegistry";
import { normalizeQuestBlueprint } from "@/lib/expert-interview/quest-blueprint";
import { z } from "zod";
import type { ChatMessage, ExtractedCareerData, InterviewQuestion } from "@/types/expert-interview";
import { sanitizeExpertInput } from "./sanitizer";

const TOTAL_QUESTIONS = 8;

const INTERVIEW_QUESTIONS_EN: Array<{ id: string; prompt: string }> = [
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

const INTERVIEW_QUESTIONS_TH: Array<{ id: string; prompt: string }> = [
  {
    id: "field_role",
    prompt:
      "สวัสดีครับ! ผมอยากเปลี่ยนประสบการณ์จริงของคุณให้กลายเป็นแนวทางสำรวจอาชีพที่มีประโยชน์สำหรับนักเรียน คุณทำงานในสายงานอะไร มีตำแหน่งอะไร และเชี่ยวชาญด้านไหนในสายงานนั้น?",
  },
  {
    id: "reality_check",
    prompt:
      "คนภายนอกมักคิดว่างานของคุณเป็นอย่างไร แล้วในความเป็นจริงสัปดาห์ทำงานของคุณเต็มไปด้วยอะไรบ้าง? ช่วยเล่าให้ฟังถึงงานจริงๆ ไม่ใช่เวอร์ชันที่ฟังดูดี",
  },
  {
    id: "mundane_core",
    prompt:
      "ส่วนไหนของงานที่สำคัญแต่น่าเบื่อ ซ้ำซาก หรือมักถูกมองข้าม? คนที่อยากประสบความสำเร็จในสายนี้ต้องยอมทำอะไรเป็นประจำ?",
  },
  {
    id: "hard_part",
    prompt:
      "ส่วนที่ยากที่สุดของงานคืออะไร หรือการตัดสินใจแบบไหนที่แยกมือใหม่ออกจากคนที่เชี่ยวชาญจริงๆ? ยกตัวอย่างที่เป็นรูปธรรมได้เลย",
  },
  {
    id: "rewarding_work",
    prompt:
      "อะไรทำให้งานนี้คุ้มค่าสำหรับคุณ? ช่วงไหนที่รู้สึกมีความหมายพอที่จะชดเชยกับส่วนที่ยาก?",
  },
  {
    id: "fit_signals",
    prompt:
      "นักเรียนแบบไหนที่จะรู้สึกมีพลังงานในอาชีพนี้ แล้วนักเรียนแบบไหนที่อาจรู้สึกเหนื่อยใจเร็ว?",
  },
  {
    id: "skills",
    prompt:
      "ทักษะอะไรที่จำเป็นสำหรับงานนี้ แล้วทักษะไหนที่ใช้เวลานานที่สุดในการพัฒนาในชีวิตจริง?",
  },
  {
    id: "entry_path",
    prompt:
      "คุณเข้าสู่สายงานนี้ได้อย่างไร ถ้าย้อนเวลาไปบอกตัวเองตอนอายุ 18 จะบอกว่าอะไร แล้วมีงาน 30 นาทีที่ซื่อสัตย์อะไรที่นักเรียนควรลองทำก่อนตัดสินใจว่าเส้นทางนี้เหมาะกับตัวเองหรือเปล่า?",
  },
];

const INTERVIEW_QUESTIONS = INTERVIEW_QUESTIONS_EN;

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

export function getFirstQuestion(language?: string): InterviewQuestion {
  const questions = language === "th" ? INTERVIEW_QUESTIONS_TH : INTERVIEW_QUESTIONS_EN;
  return { id: questions[0].id, text: questions[0].prompt };
}

export function getTotalQuestions(): number {
  return TOTAL_QUESTIONS;
}

export function getInterviewQuestions(language?: string): InterviewQuestion[] {
  const questions = language === "th" ? INTERVIEW_QUESTIONS_TH : INTERVIEW_QUESTIONS_EN;
  return questions.map((question) => ({
    id: question.id,
    text: question.prompt,
  }));
}

export { normalizeQuestBlueprint };

const MAX_FOLLOWUPS_PER_QUESTION = 2;

export async function processInterviewMessage(
  message: string,
  currentQuestionId: string | null,
  conversationHistory: ChatMessage[],
  language?: string
): Promise<{
  nextQuestion?: InterviewQuestion;
  progress: { current: number; total: number };
  isComplete: boolean;
  extractedData?: ExtractedCareerData;
}> {
  const sanitized = sanitizeExpertInput(message);
  const isThai = language === "th";
  const questions = isThai ? INTERVIEW_QUESTIONS_TH : INTERVIEW_QUESTIONS_EN;

  const updatedHistory: ChatMessage[] = [
    ...conversationHistory,
    { role: "user", content: sanitized, timestamp: new Date().toISOString() },
  ];

  const questionIndex = questions.findIndex((q) => q.id === currentQuestionId);
  const isLastQuestion = questionIndex === questions.length - 1;

  if (questionIndex < 0) {
    const extractedData = await extractCareerData(updatedHistory);
    return {
      progress: { current: TOTAL_QUESTIONS, total: TOTAL_QUESTIONS },
      isComplete: true,
      extractedData,
    };
  }

  const currentTopicPrompt = questions[questionIndex].prompt;
  const nextQuestionDef = isLastQuestion ? null : questions[questionIndex + 1];

  // Count how many follow-ups have already been asked for this question
  // by counting consecutive assistant messages with the same questionId
  const followupCount = countFollowupsForQuestion(conversationHistory, currentTopicPrompt);
  const mustAdvance = followupCount >= MAX_FOLLOWUPS_PER_QUESTION;

  const evaluation = await evaluateAndRespond(
    sanitized,
    currentTopicPrompt,
    nextQuestionDef?.prompt,
    updatedHistory,
    mustAdvance,
    isThai
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
  mustAdvance: boolean,
  isThai: boolean = false
): Promise<{ isTopicCovered: boolean; interviewerResponse: string }> {
  if (mustAdvance) {
    return {
      isTopicCovered: true,
      interviewerResponse: nextTopicPrompt || (isThai
        ? "ขอบคุณมากครับ นั่นทำให้เห็นภาพชัดเจนมาก เป็นอันว่าเราได้คุยกันครบทุกเรื่องแล้ว!"
        : "Thank you, that gives me a clear picture. That wraps up our conversation!"
      ),
    };
  }

  // Build a summary of what the expert has shared so far on this topic
  // by including recent conversation turns (last 6 messages for context)
  const recentExchanges = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Expert" : "Interviewer"}: ${m.content}`)
    .join("\n");

  const languageInstruction = isThai
    ? "IMPORTANT: You MUST respond in Thai (ภาษาไทย). All your responses must be in Thai."
    : "Respond in English.";

  try {
    const { object } = await generateObject({
      model: getModel("gemini-2.5-flash"),
      schema: decisionSchema,
      system: [
        "You are a warm, curious interviewer helping young people understand careers.",
        languageInstruction,
        "Evaluate whether the expert has provided ENOUGH CUMULATIVE information across ALL their responses on the current topic — not just the latest message.",
        "Accept conceptual, process-based, or principle-based answers as valid — you do NOT need a specific story or named example every time.",
        "If the combined answers give a student a genuine understanding of the challenge, mindset, or skill involved, choose isTopicCovered=true.",
        "Only choose isTopicCovered=false if there is a genuinely important angle completely missing that would change how a student understands this career.",
        "IMPORTANT: If you need to probe further, vary your angle. Do NOT ask for 'a specific example' or 'concrete example' if that was already asked. Instead pick a DIFFERENT angle such as: what surprises people, what beginners get wrong, what the feeling of that moment is like, what you wish you had known, how you think about it differently now, or what you would tell yourself at the start.",
        "Never repeat the same type of follow-up question twice in a row.",
        "Keep your response conversational and concise (1-2 sentences max).",
        "Do not repeat what the expert said back to them.",
      ].join(" "),
      prompt: [
        `Current Topic: "${currentTopicPrompt}"`,
        "",
        "Conversation so far on this topic (read ALL of it before evaluating):",
        recentExchanges,
        "",
        nextTopicPrompt ? `Next topic to move to if this one is covered: "${nextTopicPrompt}"` : `This is the final topic.`,
        "Has the expert cumulatively shared enough? If yes, transition. If no, ask a DIFFERENT type of follow-up than what was already asked.",
      ].join("\n"),
    });
    return object;
  } catch {
    // Fallback: assume covered and move to next
    return {
      isTopicCovered: true,
      interviewerResponse: nextTopicPrompt || (isThai
        ? "ขอบคุณมากที่แบ่งปัน นั่นเป็นการสัมภาษณ์ที่ครบถ้วนแล้ว!"
        : "Thank you for sharing that! That concludes our interview."
      ),
    };
  }
}

async function extractCareerData(conversationHistory: ChatMessage[]): Promise<ExtractedCareerData> {
  const transcript = conversationHistory
    .map((m) => `${m.role === "user" ? "Expert" : "Interviewer"}: ${m.content}`)
    .join("\n\n");

  try {
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
  } catch (error) {
    console.error("[extractCareerData] failed", error);
    // Return minimal valid data so the interview can still complete
    return {
      field: "",
      role: "",
      dailyTasks: [],
      challenges: [],
      rewards: [],
      misconceptions: [],
      skills: { technical: [], soft: [], hardToDevelop: [] },
      advice: "",
      entryPath: { keySteps: [] },
      experienceLevel: "unknown",
      yearsInField: 0,
    };
  }
}
