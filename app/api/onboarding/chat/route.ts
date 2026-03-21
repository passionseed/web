import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/modelRegistry";
import { deriveOutputs } from "@/lib/onboarding/derive";
import {
  isAssessmentComplete,
  type AssessmentExtractionResult,
  type CollectedData,
} from "@/types/onboarding";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const SYSTEM_PROMPT = `You are a warm, concise career advisor helping a student understand their situation.
Your goal is to naturally extract 6 signals through conversation (2-4 turns max):
- stage: one of exploring/choosing/applying_soon/urgent
- target_clarity: one of none/field_only/specific
- primary_blocker: one of dont_know/low_profile/financial/family_pressure/application_process
- confidence: one of low/medium/high
- career_direction: one of no_idea/some_ideas/clear_goal
- commitment_signal: one of browsing/researching/preparing

After each user message, respond conversationally. Do NOT list these fields or make it feel like a form.
If confidence is unclear after 2 turns, ask: "On a scale of low, medium, or high - how confident do you feel about your direction right now?"

At the end of your response, append a JSON block wrapped in <extract></extract> tags:
<extract>{"stage":null,"target_clarity":null,"primary_blocker":null,"confidence":null,"career_direction":null,"commitment_signal":null}</extract>
Fill in only fields you can confidently infer. Use null for uncertain fields.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  collected_data: CollectedData;
  interests?: string[];
}

function parseExtraction(text: string): AssessmentExtractionResult {
  const match = text.match(/<extract>([\s\S]*?)<\/extract>/);
  if (!match) {
    return {};
  }

  try {
    return JSON.parse(match[1]) as AssessmentExtractionResult;
  } catch {
    return {};
  }
}

function cleanResponse(text: string): string {
  return text.replace(/<extract>[\s\S]*?<\/extract>/, "").trim();
}

const EXTRACT_TAG = "<extract>";
const EXTRACT_GUARD_CHARS = EXTRACT_TAG.length - 1;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ChatRequestBody;
    const { messages, collected_data, interests = [] } = body;

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const interestContext = interests.length
      ? `The student is interested in: ${interests.join(", ")}.`
      : "";

    const result = streamText({
      model: getModel("gpt-5-mini-2025-08-07"),
      system: [SYSTEM_PROMPT, interestContext].filter(Boolean).join("\n\n"),
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let fullText = "";
        let visibleBuffer = "";
        let extractionStarted = false;

        const writePacket = (packet: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(packet)}\n`));
        };

        try {
          for await (const chunk of result.textStream) {
            fullText += chunk;

            if (extractionStarted) {
              continue;
            }

            visibleBuffer += chunk;
            const extractIndex = visibleBuffer.indexOf(EXTRACT_TAG);

            if (extractIndex >= 0) {
              const visibleText = visibleBuffer.slice(0, extractIndex);
              if (visibleText) {
                writePacket({ type: "delta", delta: visibleText });
              }
              visibleBuffer = "";
              extractionStarted = true;
              continue;
            }

            if (visibleBuffer.length > EXTRACT_GUARD_CHARS) {
              const safeChunk = visibleBuffer.slice(0, -EXTRACT_GUARD_CHARS);
              if (safeChunk) {
                writePacket({ type: "delta", delta: safeChunk });
              }
              visibleBuffer = visibleBuffer.slice(-EXTRACT_GUARD_CHARS);
            }
          }

          if (!extractionStarted && visibleBuffer) {
            writePacket({ type: "delta", delta: visibleBuffer });
          }

          const extraction = parseExtraction(fullText);
          const message = cleanResponse(fullText);
          const updatedData: CollectedData = {
            ...collected_data,
            ...Object.fromEntries(
              Object.entries(extraction).filter(([, value]) => value !== null)
            ),
          };

          if (isAssessmentComplete(updatedData)) {
            Object.assign(
              updatedData,
              deriveOutputs({
                stage: updatedData.stage,
                target_clarity: updatedData.target_clarity,
                primary_blocker: updatedData.primary_blocker,
                confidence: updatedData.confidence,
                career_direction: updatedData.career_direction,
                commitment_signal: updatedData.commitment_signal,
              })
            );
          }

          const chatHistory = [
            ...messages,
            { role: "assistant" as const, content: message },
          ];
          const admin = createAdminClient();
          const { error: upsertError } = await admin
            .from("onboarding_state")
            .upsert(
              {
                user_id: user.id,
                current_step: "assessment",
                chat_history: chatHistory,
                collected_data: updatedData,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            );

          if (upsertError) {
            console.error(
              "[onboarding/chat] failed to persist state",
              upsertError
            );
            writePacket({ type: "error", error: "Database error" });
            controller.close();
            return;
          }

          writePacket({
            type: "done",
            message,
            collected_data: updatedData,
            assessment_complete: isAssessmentComplete(updatedData),
          });
          controller.close();
        } catch (error: any) {
          console.error("[onboarding/chat] failed", error);
          writePacket({
            type: "error",
            error: error?.message || "AI error",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error: any) {
    console.error("[onboarding/chat] failed", error);
    return NextResponse.json(
      {
        error: error?.message || "AI error",
      },
      { status: 500 }
    );
  }
}
