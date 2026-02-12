import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { getModel } from "@/lib/ai/modelRegistry";
import { isUnsafePathLabPrompt } from "@/lib/ai/pathlab-generator-prompts";
import { buildChatSystemPrompt } from "@/lib/ai/pathlab-chat-prompts";
import {
  extractParamsFromMessage,
  formatParamsSummary,
  getMissingParams,
  hasAllRequiredParams,
  type ConversationParams,
} from "@/lib/pathlab/conversation-flow";
import { hasAdminOrInstructorRole, requireAuth } from "../generate/_auth";

interface ChatRequest {
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage: string;
  generationParams?: ConversationParams;
  existingMap?: {
    id: string;
    title: string;
    description: string | null;
    nodes: Array<{
      id: string;
      title: string;
      description: string | null;
      day: number | null;
    }>;
    edges: Array<{
      source: string;
      target: string;
    }>;
  };
}

interface ChatResponse {
  message: string;
  updatedParams: ConversationParams;
  allParamsComplete: boolean;
  missingParams: string[];
  readyToGenerate: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireAuth();
    if (error || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const roleAllowed = await hasAdminOrInstructorRole(supabase, user.id);
    if (!roleAllowed) {
      return NextResponse.json(
        { error: "Forbidden - admin or instructor role required" },
        { status: 403 },
      );
    }

    const body: ChatRequest = await request.json();
    const { conversationHistory, userMessage, generationParams = {}, existingMap } = body;

    // Extract parameters from user message
    const updatedParams = extractParamsFromMessage(userMessage, generationParams);

    // Check if we have all required params
    const allParamsComplete = hasAllRequiredParams(updatedParams);
    const missingParams = getMissingParams(updatedParams);

    // Build conversation context
    const messages = [
      ...conversationHistory,
      { role: "user" as const, content: userMessage },
    ];

    // Create system prompt with current state
    const systemPrompt = buildChatSystemPrompt({
      accumulatedParams: updatedParams,
      missingParams: missingParams.map((p) => p.label),
      existingMap,
    });

    // Safety check if topic/constraints are available
    if (updatedParams.topic || updatedParams.constraints) {
      if (
        isUnsafePathLabPrompt({
          topic: updatedParams.topic || "",
          constraints: updatedParams.constraints,
        })
      ) {
        return NextResponse.json(
          {
            error: "Topic or constraints are blocked by safety policy",
          },
          { status: 400 },
        );
      }
    }

    // Generate AI response
    const result = await generateText({
      model: getModel("google/gemini-3-flash"),
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
    });

    const aiMessage = result.text;
    const readyToGenerate = aiMessage.includes("READY_TO_GENERATE");

    if (readyToGenerate) {
      console.info("[pathlab.chat] AI signaled ready to generate", {
        userId: user.id,
        params: updatedParams,
      });
    }

    const response: ChatResponse = {
      message: aiMessage,
      updatedParams,
      allParamsComplete,
      missingParams: missingParams.map((p) => p.key),
      readyToGenerate,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[pathlab.chat] failed", error);
    return NextResponse.json(
      {
        error: error?.message || "Failed to process chat message",
      },
      { status: 500 },
    );
  }
}
