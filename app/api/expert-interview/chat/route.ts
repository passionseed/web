import { NextRequest, NextResponse } from "next/server";
import { processInterviewMessage } from "@/lib/expert-interview/chat-service";
import { z } from "zod";
import type { ChatMessage } from "@/types/expert-interview";

const requestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(3000),
  currentQuestionId: z.string().nullable().optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        timestamp: z.string().optional(),
      })
    )
    .max(40)
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

    const { message, currentQuestionId, conversationHistory } = parsed.data;

    const result = await processInterviewMessage(
      message,
      currentQuestionId ?? null,
      conversationHistory as ChatMessage[]
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[expert-interview/chat] failed", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
