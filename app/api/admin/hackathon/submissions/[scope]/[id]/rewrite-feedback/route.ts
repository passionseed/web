import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createClient } from "@/utils/supabase/server";
import { getModel } from "@/lib/ai/modelRegistry";

export const maxDuration = 30;

const AI_MODEL = "MiniMax-M2.7-highspeed";

const STYLE_PROMPTS: Record<string, string> = {
  concise:
    "Rewrite this feedback to be MORE CONCISE. Cut filler, remove redundancy, keep only the most impactful points. Aim for ~50% shorter while preserving all key insights and the same tone.",
  kind:
    "Rewrite this feedback to be MORE KIND and encouraging. Use warmer language, lead with genuine praise, soften critiques with empathy. The student should feel supported and motivated.",
  actionable:
    "Rewrite this feedback to be MORE ACTIONABLE. Replace vague suggestions with specific, concrete next steps. Each point should answer 'what exactly should I do right now?'",
  all:
    "Rewrite this feedback to be MORE CONCISE, MORE KIND, and MORE ACTIONABLE all at once. Cut filler, use warm encouraging language, and make every suggestion a specific concrete action.",
};

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  return roles?.length ? user : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scope: string; id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  await params; // validate route params exist

  const body = await req.json().catch(() => ({}));
  const feedback = typeof body?.feedback === "string" ? body.feedback.trim() : "";
  const style = typeof body?.style === "string" ? body.style : null;
  const status = typeof body?.status === "string" ? body.status : null;
  const score = body?.score ?? null;

  if (!feedback) return NextResponse.json({ error: "No feedback to rewrite" }, { status: 400 });
  const stylePrompt = style ? STYLE_PROMPTS[style] : null;
  if (!stylePrompt) return NextResponse.json({ error: "Invalid style" }, { status: 400 });

  const prompt = [
    "You are rewriting hackathon mentor feedback for a student submission.",
    "",
    "=== LANGUAGE ===",
    "Match the original feedback language. Thai script → Thai. Otherwise English.",
    "",
    `=== CURRENT STATUS: ${status ?? "unknown"} | SCORE: ${score ?? "n/a"} ===`,
    "",
    "=== ORIGINAL FEEDBACK ===",
    feedback,
    "",
    `=== TASK ===`,
    stylePrompt,
    "",
    "=== RULES ===",
    "- Keep the same grading decision (pass/revise). Do NOT change the assessment.",
    "- Preserve all specific references to the student's work.",
    "- Output ONLY the rewritten feedback text. No JSON, no markdown fences, no preamble.",
  ].join("\n");

  try {
    const result = streamText({
      model: getModel(AI_MODEL),
      prompt,
      temperature: 0.6,
      maxOutputTokens: 1500,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => {
          try { controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n")); } catch {}
        };
        try {
          let accumulated = "";
          for await (const part of result.fullStream) {
            if (part.type === "text-delta") {
              const delta = (part as any).text ?? "";
              accumulated += delta;
              send({ type: "delta", delta });
            }
          }
          send({ type: "done", feedback: accumulated.trim() });
        } catch (err: any) {
          send({ type: "error", message: err?.message ?? "Rewrite failed" });
        } finally {
          try { controller.close(); } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Rewrite failed", message: err?.message }, { status: 500 });
  }
}
