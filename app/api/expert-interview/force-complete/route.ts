import { NextRequest, NextResponse } from "next/server";
import { extractCareerData } from "@/lib/expert-interview/chat-service";
import type { ChatMessage } from "@/types/expert-interview";

/**
 * DEBUG ENDPOINT: Force complete a stuck interview session
 * This should be removed or protected in production
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationHistory } = body;

    if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      return NextResponse.json(
        { error: "Invalid conversation history" },
        { status: 400 }
      );
    }

    // Extract career data from the conversation
    const extractedData = await extractCareerData(conversationHistory as ChatMessage[]);

    return NextResponse.json({
      isComplete: true,
      extractedData,
      progress: { current: 8, total: 8 },
    });
  } catch (error) {
    console.error("[force-complete] failed", error);
    return NextResponse.json(
      { error: "Failed to force complete interview" },
      { status: 500 }
    );
  }
}
