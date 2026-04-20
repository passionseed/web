import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { streamText } from "ai";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getModel } from "@/lib/ai/modelRegistry";
import { getPhaseSpec } from "@/lib/hackathon/phase-specs";

const AI_MODEL = "MiniMax-M2.7-highspeed";

const aiGradeSchema = z.object({
  review_status: z.enum(["pending_review", "passed", "revision_required"]),
  score_awarded: z.number().nullable(),
  feedback: z.string().min(1).max(4000),
  reasoning: z.string().max(2000),
});

type AiGradeResult = z.infer<typeof aiGradeSchema>;

function parseAiGradeJson(raw: string): AiGradeResult | null {
  if (!raw) return null;

  // Pull JSON out of possible markdown fences or prose.
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1] ?? raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  const jsonSlice = candidate.slice(start, end + 1);
  try {
    const parsed = JSON.parse(jsonSlice);
    const result = aiGradeSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

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

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function buildPrompt(params: {
  phaseSpec: string | null;
  phaseNumber: number | null;
  phaseTitle: string | null;
  activityTitle: string | null;
  activityInstructions: string | null;
  pointsPossible: number | null;
  textAnswer: string | null;
  imageUrl: string | null;
  fileUrls: string[];
  scope: "individual" | "team";
  ownerLabel: string;
}) {
  const {
    phaseSpec,
    phaseNumber,
    phaseTitle,
    activityTitle,
    activityInstructions,
    pointsPossible,
    textAnswer,
    imageUrl,
    fileUrls,
    scope,
    ownerLabel,
  } = params;

  return [
    "# Role",
    "You are a seasoned startup advisor and social-change mentor reviewing a high school student's hackathon work.",
    "Think like a mix of YC partner and systems-thinking coach: sharp, warm, honest, and allergic to fluff.",
    "Your job is to move this student forward — praise only what is real, call out vague thinking directly, and give one concrete next move they can do today.",
    "",
    "# Language — CRITICAL",
    "Detect the primary language of the student's submission below and respond ENTIRELY in that language.",
    "- If the submission is mostly Thai (ไทย / มี or any Thai script), write EVERYTHING in Thai — both your live thinking and the JSON string values (feedback, reasoning). Use warm, direct Thai like a พี่ mentor, not formal academic Thai.",
    "- If mostly English, respond in English.",
    "- If mixed, follow whichever dominates. Mirror their voice.",
    "- NEVER translate or mix languages inside one paragraph. One language, start to end.",
    "",
    "# Ground rules",
    "- Address the student as 'you' in second person (or 'คุณ' / 'เธอ' in Thai — match their register).",
    "- No checklist theatre: skip rubric jargon. Speak like a human mentor at a whiteboard.",
    "- No hedging, no 'great job!', no emojis. Be specific about what's real vs. hand-wavy.",
    "- If the submission is near-empty, low-effort, or copy-pasted AI slop, say so plainly and require revision.",
    "- Feedback must reference the student's own words/numbers. Never generic advice.",
    "",
    "# Phase context (what this phase is really trying to teach)",
    phaseSpec
      ? phaseSpec
      : `Phase ${phaseNumber ?? "?"}: ${phaseTitle ?? "Unknown phase"} (no detailed spec available — grade based on activity instructions only)`,
    "",
    "# Activity",
    `Title: ${activityTitle ?? "(untitled)"}`,
    `Scope: ${scope === "team" ? "team submission" : "individual submission"}`,
    `Submitted by: ${ownerLabel}`,
    pointsPossible != null ? `Points possible: ${pointsPossible}` : "Ungraded (no numeric score)",
    "",
    "## Instructions the student saw",
    activityInstructions ?? "(no instructions provided — infer from activity title)",
    "",
    "# Student submission",
    textAnswer ? `## Written answer\n${textAnswer}` : "## Written answer\n(no text submitted)",
    imageUrl ? `## Image URL\n${imageUrl}` : "",
    fileUrls.length > 0 ? `## Attached files\n${fileUrls.join("\n")}` : "",
    "",
    "# What to produce",
    "",
    "## review_status",
    "- 'passed' — the submission shows real thinking AND meets the activity's intent. You would be proud to forward this to a real stakeholder.",
    "- 'revision_required' — there's effort but something is missing (vague, generic, wrong scope, skipped key criteria, looks AI-generated).",
    "- 'pending_review' — use only if you truly can't tell (e.g., submission is only an image link you can't see).",
    "",
    "## score_awarded",
    pointsPossible != null
      ? `A number 0..${pointsPossible}. Be calibrated: ${pointsPossible} = exemplary; around ${Math.round(pointsPossible * 0.7)} = solid pass; below ${Math.round(pointsPossible * 0.5)} = revision_required.`
      : "null (this activity is ungraded).",
    "",
    "## feedback (to the student, shown in their inbox)",
    "Write 3 short sections, separated by blank lines. Total ~150-250 words, no headings needed:",
    "1. What's real — one concrete thing from their submission that is genuinely strong, quoted or paraphrased.",
    "2. What's missing or off — the single sharpest gap, in one or two sentences. Be direct.",
    "3. Your next move — one specific, doable step they can take in the next 30 minutes to level up (not a vague 'think deeper'). Frame it as an advisor would: 'Try X. Then Y.'",
    "",
    "If revision is required, make the next move actionable enough that they can resubmit today.",
    "",
    "## reasoning (admin-only, not shown to student)",
    "2-4 sentences: why you scored this way, which phase criteria they hit/missed, any red flags (AI-generated, copy-paste, off-topic).",
    "",
    "# Output format — CRITICAL",
    "Stream your response in TWO parts:",
    "",
    "PART 1 — Live thinking (shown to admin as it streams):",
    "Write 2-4 short sentences of your live reasoning — what you notice, what matters, where you're leaning. Plain prose, in the student's language. No headings, no JSON, no 'I am now going to...' meta-talk.",
    "",
    "PART 2 — JSON block (parsed by the app):",
    "After your thinking, emit a blank line, then a code fence with the JSON object. Exact shape:",
    "```json",
    "{",
    '  "review_status": "passed" | "revision_required" | "pending_review",',
    pointsPossible != null
      ? `  "score_awarded": <number 0..${pointsPossible}>,`
      : '  "score_awarded": null,',
    '  "feedback": "<3-section feedback to the student, single string, blank lines between sections>",',
    '  "reasoning": "<admin-only rationale>"',
    "}",
    "```",
    "",
    "After the closing ``` of the JSON block, stop. No more text.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function gatherPromptContext(scope: "individual" | "team", id: string) {
  const serviceClient = getHackathonServiceClient();
  const table =
    scope === "individual"
      ? "hackathon_phase_activity_submissions"
      : "hackathon_phase_activity_team_submissions";

  const { data: submission, error: submissionError } = await serviceClient
    .from(table)
    .select(`
      *,
      hackathon_phase_activities(
        id,
        title,
        instructions,
        phase_id,
        hackathon_program_phases(id, phase_number, title)
      ),
      hackathon_phase_activity_assessments(id, points_possible, is_graded)
    `)
    .eq("id", id)
    .single();

  if (submissionError || !submission) return null;

  const sub = submission as any;
  const activity = pickOne(sub.hackathon_phase_activities);
  const phase = pickOne(activity?.hackathon_program_phases);
  const assessment = pickOne(sub.hackathon_phase_activity_assessments);
  const pointsPossible =
    typeof assessment?.points_possible === "number" ? assessment.points_possible : null;

  const ownerLabel =
    scope === "individual"
      ? `participant ${sub.participant_id}`
      : `team ${sub.team_id}`;

  const phaseSpec = await getPhaseSpec(phase?.phase_number ?? null);

  const prompt = buildPrompt({
    phaseSpec,
    phaseNumber: phase?.phase_number ?? null,
    phaseTitle: phase?.title ?? null,
    activityTitle: activity?.title ?? null,
    activityInstructions: activity?.instructions ?? null,
    pointsPossible,
    textAnswer: sub.text_answer ?? null,
    imageUrl: sub.image_url ?? null,
    fileUrls: Array.isArray(sub.file_urls) ? sub.file_urls : [],
    scope,
    ownerLabel,
  });

  return {
    prompt,
    hasPhaseSpec: Boolean(phaseSpec),
    phaseNumber: phase?.phase_number ?? null,
    phaseTitle: phase?.title ?? null,
    activityTitle: activity?.title ?? null,
    pointsPossible,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scope: string; id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { scope: rawScope, id } = await params;
  if (rawScope !== "individual" && rawScope !== "team") {
    return NextResponse.json({ error: "Invalid submission scope" }, { status: 400 });
  }

  const context = await gatherPromptContext(rawScope as "individual" | "team", id);
  if (!context) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  return NextResponse.json({
    model: AI_MODEL,
    has_phase_spec: context.hasPhaseSpec,
    phase_number: context.phaseNumber,
    phase_title: context.phaseTitle,
    activity_title: context.activityTitle,
    points_possible: context.pointsPossible,
    prompt: context.prompt,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ scope: string; id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { scope: rawScope, id } = await params;
  if (rawScope !== "individual" && rawScope !== "team") {
    return NextResponse.json({ error: "Invalid submission scope" }, { status: 400 });
  }

  const context = await gatherPromptContext(rawScope as "individual" | "team", id);
  if (!context) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  console.log("[admin/hackathon/ai-grade] POST start", {
    scope: rawScope,
    id,
    hasMinimaxKey: Boolean(process.env.MINIMAX_API_KEY),
    minimaxKeyPrefix: process.env.MINIMAX_API_KEY?.slice(0, 6),
  });

  if (!process.env.MINIMAX_API_KEY) {
    console.error("[admin/hackathon/ai-grade] MINIMAX_API_KEY missing in process.env");
    return NextResponse.json(
      { error: "MINIMAX_API_KEY is not set on the server. Add it to .env.local and restart the dev server." },
      { status: 500 }
    );
  }

  try {
    const result = streamText({
      model: getModel(AI_MODEL),
      prompt: context.prompt,
      temperature: 0.5,
      maxOutputTokens: 1500,
      onError: (e) => {
        console.error("[admin/hackathon/ai-grade] stream error:", e);
      },
    });

    // Stream as newline-delimited JSON events so the client gets:
    //   {"type":"thinking","delta":"..."}  for every text chunk
    //   {"type":"done","suggestion":{...}} at the end (parsed JSON block)
    //   {"type":"error","message":"..."}   if parsing fails
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let accumulated = "";
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

        try {
          for await (const delta of result.textStream) {
            accumulated += delta;
            send({ type: "thinking", delta });
          }

          const object = parseAiGradeJson(accumulated);
          if (!object) {
            console.error("[admin/hackathon/ai-grade] failed to parse JSON", { accumulated });
            send({ type: "error", message: "AI did not return a valid JSON block", raw: accumulated });
          } else {
            send({
              type: "done",
              suggestion: object,
              model: AI_MODEL,
              has_phase_spec: context.hasPhaseSpec,
            });
          }
        } catch (err: any) {
          console.error("[admin/hackathon/ai-grade] stream loop error:", err);
          send({ type: "error", message: err?.message ?? String(err) });
        } finally {
          controller.close();
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
  } catch (error: any) {
    console.error("[admin/hackathon/ai-grade] AI error:", error);
    return NextResponse.json(
      {
        error: "AI grading failed",
        message: error?.message ?? String(error),
        name: error?.name,
        cause: error?.cause ? String(error.cause) : undefined,
      },
      { status: 500 }
    );
  }
}
