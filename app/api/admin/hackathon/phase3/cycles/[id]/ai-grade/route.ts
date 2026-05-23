import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getModel } from "@/lib/ai/modelRegistry";
import { buildPhase3GradingPrompt, parseCycleScorecard } from "@/lib/hackathon/phase3-grading";
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id } = await params;
  const serviceClient = getHackathonServiceClient();

  const { data: cycle } = await serviceClient
    .from("hackathon_phase3_cycles")
    .select("*")
    .eq("id", id)
    .single();

  if (!cycle) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  }

  // Fetch test sessions for this cycle
  const { data: steps } = await serviceClient
    .from("hackathon_phase3_cycle_steps")
    .select("*")
    .eq("cycle_id", id)
    .order("created_at", { ascending: true });

  const testSessionIds = (steps ?? [])
    .filter((s: any) => s.step_type === "test_session")
    .map((s: any) => s.id);

  let testSessions: any[] = [];
  if (testSessionIds.length > 0) {
    const { data: ts } = await serviceClient
      .from("hackathon_phase3_test_sessions")
      .select("*")
      .in("cycle_step_id", testSessionIds)
      .order("created_at", { ascending: true });
    testSessions = ts ?? [];
  }

  const prompt = buildPhase3GradingPrompt({
    entityType: "cycle",
    entityData: cycle as Record<string, unknown>,
  });

  return NextResponse.json({
    model: `${PRIMARY_MODEL} + ${SECONDARY_MODEL}`,
    cycle_number: (cycle as any).cycle_number,
    test_sessions_count: testSessions.length,
    prompt,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { id } = await params;
  const serviceClient = getHackathonServiceClient();

  const { data: cycle } = await serviceClient
    .from("hackathon_phase3_cycles")
    .select("*")
    .eq("id", id)
    .single();

  if (!cycle) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  }

  const body = await _req.json().catch(() => ({}));
  const forceReview = body?.regrade === true;

  // Fetch prior scores for context
  const { data: priorScores } = await serviceClient
    .from("hackathon_phase3_score_events")
    .select("*")
    .eq("team_id", (cycle as any).team_id)
    .eq("score_category", "cycle")
    .order("points_awarded", { ascending: false });

  const prompt = buildPhase3GradingPrompt({
    entityType: "cycle",
    entityData: cycle as Record<string, unknown>,
    priorScores: (priorScores ?? []) as any[],
  });

  console.log("[phase3/cycles/ai-grade] POST start", {
    cycleId: id,
    hasKimiKey: Boolean(process.env.KIMI_API_KEY),
    hasMinimaxKey: Boolean(process.env.MINIMAX_API_KEY),
  });

  const missingKeys: string[] = [];
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) missingKeys.push("GOOGLE_GENERATIVE_AI_API_KEY");

  if (missingKeys.length > 0) {
    return NextResponse.json(
      { error: `${missingKeys.join(", ")} is not set on the server.` },
      { status: 500 }
    );
  }

  try {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let clientAlive = true;
        const send = (obj: unknown) => {
          if (!clientAlive) return;
          try {
            controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
          } catch {
            clientAlive = false;
          }
        };

        const kimiResultPromise = runModelStream({
          modelName: PRIMARY_MODEL,
          prompt,
          send,
          label: "Gemini",
        });

        const minimaxResultPromise = runModelStream({
          modelName: SECONDARY_MODEL,
          prompt,
          send,
          label: "Gemini Lite",
        });

        const [kimiRaw, minimaxRaw] = await Promise.all([
          withTimeout(kimiResultPromise, MODEL_TIMEOUT_MS, PRIMARY_MODEL),
          withTimeout(minimaxResultPromise, MODEL_TIMEOUT_MS, SECONDARY_MODEL),
        ]);

        const kimiGrade = kimiRaw ? parseModelGrade(kimiRaw) : null;
        const minimaxGrade = minimaxRaw ? parseModelGrade(minimaxRaw) : null;

        if (kimiGrade) kimiGrade.model = PRIMARY_MODEL;
        if (minimaxGrade) minimaxGrade.model = SECONDARY_MODEL;

        // Phase 3 uses scorecard format, not the standard grade format.
        // Parse the scorecard from the JSON response.
        const kimiScorecard = parsePhase3Scorecard(kimiRaw);
        const minimaxScorecard = parsePhase3Scorecard(minimaxRaw);

        const outcome = runPhase3Consensus(
          kimiScorecard,
          minimaxScorecard,
          kimiGrade,
          minimaxGrade
        );

        if (outcome.error || !outcome.draft) {
          const errorMsg =
            !kimiRaw && !minimaxRaw
              ? "Both AI models failed to respond. Please try again."
              : "AI grading failed. Please try again.";
          send({ type: "error", message: errorMsg });
          try { controller.close(); } catch {}
          return;
        }

        // Return scorecard to UI only — admin must submit review to persist
        send({
          type: "done",
          scorecard: outcome.scorecard,
          feedback: outcome.draft.feedback,
          reasoning: outcome.draft.reasoning,
          auto_approved: outcome.autoApprove,
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
  } catch (error: unknown) {
    console.error("[phase3/cycles/ai-grade] error:", error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: "AI grading failed", message: err?.message ?? String(error) },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Phase 3-specific helpers
// ---------------------------------------------------------------------------

type Phase3Scorecard = {
  hypothesis_quality: number;
  variable_isolation: number;
  behavioral_evidence: number;
  tester_freshness: number;
  synthesis_honesty: number;
  total: number;
};

function parsePhase3Scorecard(raw: string | null): Phase3Scorecard | null {
  if (!raw) return null;

  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1] ?? raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    if (parsed.scorecard && typeof parsed.scorecard === "object") {
      const s = parsed.scorecard;
      const total =
        (s.hypothesis_quality ?? 0) +
        (s.variable_isolation ?? 0) +
        (s.behavioral_evidence ?? 0) +
        (s.tester_freshness ?? 0) +
        (s.synthesis_honesty ?? 0);
      return {
        hypothesis_quality: s.hypothesis_quality ?? 0,
        variable_isolation: s.variable_isolation ?? 0,
        behavioral_evidence: s.behavioral_evidence ?? 0,
        tester_freshness: s.tester_freshness ?? 0,
        synthesis_honesty: s.synthesis_honesty ?? 0,
        total,
      };
    }
    return null;
  } catch {
    return null;
  }
}

type Phase3ConsensusOutcome = {
  draft: {
    status: "passed" | "revision_required" | "pending_review";
    score_awarded: number | null;
    points_possible: number | null;
    feedback: string;
    reasoning: string | null;
    raw_output: string;
    error: string | null;
    consensus?: any;
  } | null;
  scorecard: Phase3Scorecard;
  autoApprove: boolean;
  error: boolean;
};

function runPhase3Consensus(
  kimi: Phase3Scorecard | null,
  minimax: Phase3Scorecard | null,
  kimiGrade: ReturnType<typeof parseModelGrade>,
  minimaxGrade: ReturnType<typeof parseModelGrade>
): Phase3ConsensusOutcome {
  // Extract feedback from whichever model gave structured output
  const kimiFeedback = kimiGrade?.feedback ?? "";
  const minimaxFeedback = minimaxGrade?.feedback ?? "";
  const kimiReasoning = kimiGrade?.reasoning ?? "";

  // Both error
  if (!kimi && !minimax) {
    return {
      draft: null,
      scorecard: { hypothesis_quality: 0, variable_isolation: 0, behavioral_evidence: 0, tester_freshness: 0, synthesis_honesty: 0, total: 0 },
      autoApprove: false,
      error: true,
    };
  }

  // Single model
  if (!kimi || !minimax) {
    const winner = kimi ?? minimax!;
    const passThreshold = 60;
    const passed = winner.total >= passThreshold;

    return {
      draft: {
        status: passed ? "passed" : "revision_required",
        score_awarded: winner.total,
        points_possible: 100,
        feedback: kimiFeedback || minimaxFeedback || "",
        reasoning: kimiReasoning || "",
        raw_output: JSON.stringify(winner),
        error: null,
        consensus: { agreement: "single_model", models: [] },
      },
      scorecard: winner,
      autoApprove: passed,
      error: false,
    };
  }

  // Average the scorecards
  const averaged: Phase3Scorecard = {
    hypothesis_quality: Math.round((kimi.hypothesis_quality + minimax.hypothesis_quality) / 2),
    variable_isolation: Math.round((kimi.variable_isolation + minimax.variable_isolation) / 2),
    behavioral_evidence: Math.round((kimi.behavioral_evidence + minimax.behavioral_evidence) / 2),
    tester_freshness: Math.round((kimi.tester_freshness + minimax.tester_freshness) / 2),
    synthesis_honesty: Math.round((kimi.synthesis_honesty + minimax.synthesis_honesty) / 2),
    total: Math.round((kimi.total + minimax.total) / 2),
  };

  const passThreshold = 60;
  const passed = averaged.total >= passThreshold;

  return {
    draft: {
      status: passed ? "passed" : "revision_required",
      score_awarded: averaged.total,
      points_possible: 100,
      feedback: kimiFeedback || minimaxFeedback || "",
      reasoning: kimiReasoning || "",
      raw_output: JSON.stringify(averaged),
      error: null,
      consensus: {
        agreement: "agree",
        models: [
          { model: PRIMARY_MODEL, ...kimi },
          { model: SECONDARY_MODEL, ...minimax },
        ],
      },
    },
    scorecard: averaged,
    autoApprove: passed,
    error: false,
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function runModelStream(opts: {
  modelName: string;
  prompt: string;
  send: (obj: unknown) => void;
  label: string;
}): Promise<string | null> {
  const { modelName, prompt, send, label } = opts;
  let accumulated = "";

  try {
    const result = streamText({
      model: getModel(modelName),
      prompt,
      temperature: 0.5,
      maxOutputTokens: 3000,
      onError: (e) => {
        console.error(`[phase3/cycles/ai-grade] ${label} stream error:`, e);
      },
    });

    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        const delta = (part as { text?: string }).text ?? "";
        accumulated += delta;
        send({ type: "thinking", delta, model: label });
      } else if (part.type === "error") {
        send({ type: "error", message: String((part as { error?: unknown }).error ?? `${label} stream error`), model: label });
      }
    }

    return accumulated;
  } catch (err: unknown) {
    console.error(`[phase3/cycles/ai-grade] ${label} model error:`, err);
    send({ type: "error", message: `${label} failed: ${(err as { message?: string }).message ?? String(err)}`, model: label });
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) =>
      setTimeout(() => {
        console.error(`[phase3/cycles/ai-grade] ${label} timed out after ${ms}ms`);
        resolve(null);
      }, ms)
    ),
  ]);
}
