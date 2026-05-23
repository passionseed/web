import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getModel } from "@/lib/ai/modelRegistry";
import { buildPhase3GradingPrompt } from "@/lib/hackathon/phase3-grading";
import { parseModelGrade, runDualGrade } from "@/lib/hackathon/dual-grade";

export const maxDuration = 60;

const PRIMARY_MODEL = "gemini-2.5-flash";
const SECONDARY_MODEL = "gemini-flash-lite-latest";
const MODEL_TIMEOUT_MS = 60_000;

function getHackathonServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const { id } = await params;
  const serviceClient = getHackathonServiceClient();

  const { data: row } = await serviceClient
    .from("hackathon_phase3_midphase_synthesis")
    .select("*")
    .eq("id", id)
    .single();

  if (!row) return NextResponse.json({ error: "Midphase not found" }, { status: 404 });

  const prompt = buildPhase3GradingPrompt({
    entityType: "midphase",
    entityData: row as Record<string, unknown>,
  });

  return NextResponse.json({ model: `${PRIMARY_MODEL} + ${SECONDARY_MODEL}`, prompt });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  const { id } = await params;
  const serviceClient = getHackathonServiceClient();

  const { data: row } = await serviceClient
    .from("hackathon_phase3_midphase_synthesis")
    .select("*")
    .eq("id", id)
    .single();

  if (!row) return NextResponse.json({ error: "Midphase not found" }, { status: 404 });

  const prompt = buildPhase3GradingPrompt({
    entityType: "midphase",
    entityData: row as Record<string, unknown>,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let alive = true;
      const send = (obj: unknown) => {
        if (!alive) return;
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n")); } catch { alive = false; }
      };

      const [kimiRaw, minimaxRaw] = await Promise.all([
        withTimeout(runModelStream({ modelName: PRIMARY_MODEL, prompt, send, label: "Kimi" }), MODEL_TIMEOUT_MS, "Kimi"),
        withTimeout(runModelStream({ modelName: SECONDARY_MODEL, prompt, send, label: "MiniMax" }), MODEL_TIMEOUT_MS, "MiniMax"),
      ]);

      const kimiGrade = kimiRaw ? parseModelGrade(kimiRaw) : null;
      const minimaxGrade = minimaxRaw ? parseModelGrade(minimaxRaw) : null;
      if (kimiGrade) kimiGrade.model = PRIMARY_MODEL;
      if (minimaxGrade) minimaxGrade.model = SECONDARY_MODEL;

      const outcome = runDualGrade(kimiGrade, minimaxGrade, { pointsPossible: 100 });
      if (outcome.error || !outcome.draft) {
        send({ type: "error", message: "AI grading failed." });
        try { controller.close(); } catch {}
        return;
      }

      // Return score to UI only — admin must submit review to persist
      const score = outcome.draft.score_awarded ?? 0;
      send({
        type: "done",
        score,
        feedback: outcome.draft.feedback,
        reasoning: outcome.draft.reasoning,
        consensus: outcome.draft.consensus,
      });
      try { controller.close(); } catch {}
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

async function runModelStream(opts: { modelName: string; prompt: string; send: (obj: unknown) => void; label: string }) {
  const { modelName, prompt, send, label } = opts;
  let accumulated = "";
  try {
    const result = streamText({ model: getModel(modelName), prompt, temperature: 0.5, maxOutputTokens: 3000 });
    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        const delta = (part as { text?: string }).text ?? "";
        accumulated += delta;
        send({ type: "thinking", delta, model: label });
      }
    }
    return accumulated;
  } catch (err: unknown) {
    send({ type: "error", message: `${label} failed: ${(err as { message?: string }).message ?? String(err)}`, model: label });
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => { console.error(`${label} timed out`); resolve(null); }, ms)),
  ]);
}
