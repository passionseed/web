import { NextRequest, NextResponse } from "next/server";
import { processInterviewMessage } from "@/lib/expert-interview/chat-service";
import { checkRateLimit } from "@/lib/expert-interview/rate-limiter";
import { hasValidSession } from "@/lib/expert-interview/session-token";
import { z } from "zod";
import type { ChatMessage, InterviewType } from "@/types/expert-interview";

// An 8-question interview with follow-ups needs far fewer turns than this.
const MAX_MESSAGES_PER_SESSION_HOUR = 60;

const requestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(3000),
  currentQuestionId: z.string().nullable().optional(),
  language: z.enum(["en", "th"]).optional().default("en"),
  interviewType: z.enum(["expert", "student"]).optional().default("expert"),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        timestamp: z.string().optional(),
      })
    )
    .max(100)
    .default([]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, message, currentQuestionId, conversationHistory, language, interviewType } = parsed.data;

    if (!hasValidSession(request, sessionId)) {
      return NextResponse.json({ error: "Interview session expired. Please start again." }, { status: 401 });
    }
    const limit = await checkRateLimit(`chat:${sessionId}`, MAX_MESSAGES_PER_SESSION_HOUR);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const result = await processInterviewMessage(
      message,
      currentQuestionId ?? null,
      conversationHistory as ChatMessage[],
      language,
      interviewType as InterviewType
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[expert-interview/chat] failed", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
