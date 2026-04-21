import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { streamText } from "ai";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getModel } from "@/lib/ai/modelRegistry";
import { getPhaseSpec } from "@/lib/hackathon/phase-specs";
import { persistDraft, type AiDraft } from "@/lib/hackathon/ai-grader";
import {
  analyzeSubmission,
  formatImageAnalysisForPrompt,
  type SubmissionImageAnalysis,
} from "@/lib/hackathon/image-analysis";

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

function compactText(value: string | null | undefined, maxLength: number) {
  if (!value) return null;
  const normalized = value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

function compactPhaseSpec(phaseSpec: string | null, phaseNumber: number | null, phaseTitle: string | null) {
  if (!phaseSpec) {
    return `Phase ${phaseNumber ?? "?"}: ${phaseTitle ?? "Unknown phase"} (no detailed spec available)`;
  }

  const lines = phaseSpec
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^```/.test(line));

  const picked: string[] = [];
  let length = 0;

  for (const line of lines) {
    if (line.length < 3) continue;
    const normalized = line.replace(/^#+\s*/, "");
    if (!/[A-Za-z\u0E00-\u0E7F]/.test(normalized)) continue;
    if (picked.includes(normalized)) continue;
    if (length + normalized.length > 1400) break;
    picked.push(normalized);
    length += normalized.length + 1;
    if (picked.length >= 10) break;
  }

  return picked.join("\n");
}

function inferActivityLens(activityTitle: string | null, activityInstructions: string | null) {
  const source = `${activityTitle ?? ""} ${activityInstructions ?? ""}`.toLowerCase();

  const lenses = [
    {
      pattern: /(problem|pain point|user need|insight|customer problem|needs?)/,
      outcome: "Clarify the real user problem, not just a broad topic.",
      evidence: "Specific user, concrete pain, why it matters now.",
      redFlag: "Generic social issue summary with no sharp user insight.",
    },
    {
      pattern: /(interview|survey|research|observe|observation|validation|evidence)/,
      outcome: "Show learning from reality, not guesses.",
      evidence: "Quotes, patterns, counts, or surprising observations.",
      redFlag: "Claims without source, fake certainty, no evidence trail.",
    },
    {
      pattern: /(system|stakeholder|ecosystem|map|root cause|causal|leverage)/,
      outcome: "Map the system and identify leverage points.",
      evidence: "Actors, incentives, constraints, and why one leverage point matters most.",
      redFlag: "Flat list of causes with no relationships or tradeoffs.",
    },
    {
      pattern: /(solution|prototype|mvp|feature|design|wireframe|mockup|build)/,
      outcome: "Propose a solution tightly matched to the problem.",
      evidence: "Who it is for, what it changes, and why this design choice fits.",
      redFlag: "Feature list with weak problem-solution fit.",
    },
    {
      pattern: /(experiment|test|pilot|assumption|hypothesis|metric|success)/,
      outcome: "Design a test that can prove or disprove the riskiest assumption.",
      evidence: "Clear hypothesis, metric, target user, and decision rule.",
      redFlag: "Activity plan with no measurable learning goal.",
    },
    {
      pattern: /(pitch|story|presentation|demo|deck)/,
      outcome: "Communicate a crisp story from problem to insight to action.",
      evidence: "Clear narrative, not buzzwords; one memorable takeaway.",
      redFlag: "Over-claiming impact without support.",
    },
    {
      pattern: /(reflection|journal|retrospective|learned|takeaway)/,
      outcome: "Show genuine reflection and changed thinking.",
      evidence: "What surprised them, what changed, what they would do next.",
      redFlag: "Performative positivity with no real self-correction.",
    },
  ];

  const matched = lenses.find((lens) => lens.pattern.test(source));
  return matched ?? {
    outcome: "Meet the activity's real learning goal, not just complete the format.",
    evidence: "Specific, concrete thinking tied to the instructions.",
    redFlag: "Vague answers that sound polished but prove little.",
  };
}

type AssessmentRow = {
  id?: string;
  assessment_type?: string | null;
  points_possible?: number | null;
  is_graded?: boolean | null;
  display_order?: number | null;
  metadata?: Record<string, unknown> | null;
};

function formatAssessmentQuestions(assessments: AssessmentRow[]): string {
  if (!assessments?.length) return "(no assessment questions defined)";

  return assessments
    .map((a, idx) => {
      const m = (a.metadata ?? {}) as Record<string, unknown>;
      const prompt =
        (typeof m.prompt === "string" && m.prompt) ||
        (typeof m.question === "string" && m.question) ||
        (typeof m.submission_label === "string" && m.submission_label) ||
        null;
      const label =
        (typeof m.label === "string" && m.label) ||
        (typeof m.title === "string" && m.title) ||
        null;
      const helper =
        (typeof m.helper_text === "string" && m.helper_text) ||
        (typeof m.description === "string" && m.description) ||
        null;
      const min = typeof m.min_length === "number" ? m.min_length : null;
      const max = typeof m.max_length === "number" ? m.max_length : null;

      const parts: string[] = [];
      parts.push(
        `Q${idx + 1} (${a.assessment_type ?? "?"}${
          a.points_possible != null ? `, ${a.points_possible}pt` : ""
        }${a.is_graded ? ", graded" : ""}):`
      );
      if (label) parts.push(`Label: ${label}`);
      if (prompt) parts.push(`Prompt: ${prompt}`);
      if (helper) parts.push(`Helper: ${helper}`);
      if (min != null || max != null) {
        parts.push(`Length: ${min ?? 0}..${max ?? "∞"} chars`);
      }
      if (!prompt && !label && !helper) {
        const rest = Object.keys(m).filter((k) => typeof m[k] !== "object");
        if (rest.length) parts.push(`Meta: ${rest.map((k) => `${k}=${m[k]}`).join("; ")}`);
      }
      return parts.join("\n");
    })
    .join("\n\n");
}

type PriorRevision = {
  n: number;
  text_answer: string | null;
  review: {
    status?: string | null;
    feedback?: string | null;
  } | null;
};

function formatPriorRevisions(revisions: PriorRevision[]): string | null {
  if (!revisions?.length) return null;
  return revisions
    .slice(-3)
    .map((r) => {
      const status = r.review?.status ?? "ungraded";
      const fb = compactText(r.review?.feedback ?? null, 400) ?? "(no feedback)";
      const text = compactText(r.text_answer, 500) ?? "(no text)";
      return `R${r.n} [${status}]\nanswer: ${text}\nfeedback given: ${fb}`;
    })
    .join("\n\n");
}

function buildPrompt(params: {
  phaseSpec: string | null;
  phaseNumber: number | null;
  phaseTitle: string | null;
  activityTitle: string | null;
  activityInstructions: string | null;
  pointsPossible: number | null;
  assessments: AssessmentRow[];
  textAnswer: string | null;
  imageUrl: string | null;
  fileUrls: string[];
  scope: "individual" | "team";
  ownerLabel: string;
  priorRevisions: PriorRevision[];
  imageAnalysis: SubmissionImageAnalysis | null;
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
    assessments,
    priorRevisions,
    imageAnalysis,
  } = params;

  const phaseContext = compactPhaseSpec(phaseSpec, phaseNumber, phaseTitle);
  const activityLens = inferActivityLens(activityTitle, activityInstructions);
  const shortInstructions = compactText(activityInstructions, 900) ?? "(no instructions provided)";
  const shortAnswer = compactText(textAnswer, 2200) ?? "(no text submitted)";
  const assessmentQuestions = compactText(formatAssessmentQuestions(assessments), 1600) ?? "(none)";
  const priorBlock = formatPriorRevisions(priorRevisions);
  const imageAnalysisText = imageAnalysis ? formatImageAnalysisForPrompt(imageAnalysis) : null;

  const hasVisualSubmission = imageUrl || fileUrls.length > 0;

  return [
    "You are a warm, encouraging mentor grading one hackathon activity.",
    "Your ONLY job: check whether the student did what the assessment instructions asked them to do. Nothing more.",
    "Default to generous. This is an early-stage hackathon, not a PhD defense — reward effort and good-faith attempts.",
    "",
    "LANGUAGE — STRICT",
    "Detect the language of the student's SUBMISSION text (not the instructions, not the phase spec).",
    "- If the submission contains ANY Thai script (ก-๙), write EVERYTHING in natural Thai — your live thinking, your reasoning, the feedback, everything. Use warm พี่-style Thai, not formal academic Thai.",
    "- Only if the submission is purely English (zero Thai characters), write in English.",
    "- Never mix languages inside one sentence. Never translate the student's words back to English when writing in Thai.",
    "- This rule overrides any default language habit you have.",
    "",
    "Be warm, direct, specific. No fluff, no rubric recital, no emojis.",
    "",
    "=== PRIMARY CRITERIA — judge the submission ONLY against these ===",
    "",
    "ACTIVITY INSTRUCTIONS (this is what the student was told to do)",
    shortInstructions,
    "",
    "ASSESSMENT QUESTIONS (the specific prompts they were asked to answer)",
    assessmentQuestions,
    "",
    "Grade based on whether the student addressed THESE instructions and questions.",
    "If they answered the questions with a reasonable attempt, that is a pass — even if the thinking is still rough.",
    "",
    "=== CONTEXT ONLY — do not use these to add extra requirements ===",
    "",
    "Phase aim (informational):",
    phaseContext,
    "",
    "Optional lens you MAY reference for feedback, but not as a pass/fail gate:",
    `- Nice-to-see: ${activityLens.outcome}`,
    `- Evidence that deepens the answer: ${activityLens.evidence}`,
    "",
    "ACTIVITY METADATA",
    `Title: ${activityTitle ?? "(untitled)"}`,
    `Scope: ${scope}`,
    `Owner: ${ownerLabel}`,
    pointsPossible != null ? `Points possible: ${pointsPossible}` : "Ungraded (no numeric score)",
    "",
    priorBlock ? "PRIOR ATTEMPTS (oldest → newest). Credit the student for addressing earlier feedback." : "",
    priorBlock ?? "",
    priorBlock ? "" : "",
    "CURRENT SUBMISSION",
    `Text:\n${shortAnswer}`,
    "",
    hasVisualSubmission ? "VISUAL SUBMISSION ANALYSIS" : "",
    hasVisualSubmission ? "The student submitted visual material. Here is the AI analysis of what the images show:" : "",
    hasVisualSubmission ? "---" : "",
    imageAnalysisText ?? (hasVisualSubmission ? "(Image analysis was not available for this submission)" : ""),
    hasVisualSubmission ? "---" : "",
    hasVisualSubmission ? "Treat visuals as supporting evidence that the student engaged with the instructions." : "",
    hasVisualSubmission ? "" : "",
    imageUrl ? `Original Image URL: ${imageUrl}` : "",
    fileUrls.length > 0 ? `Additional Files:\n${fileUrls.join("\n")}` : "",
    "",
    "GRADING RULES — be generous",
    "- passed = the student addressed the instructions and assessment questions with a genuine attempt. Rough or incomplete thinking is still a pass as long as the core ask was answered.",
    "- revision_required = ONLY when the student clearly did not answer what was asked (blank, off-topic, one-liner for a multi-part question, copy-paste without substance).",
    "- pending_review = only when you truly cannot tell from the provided material.",
    "- Do NOT fail a student for lack of depth, missing 'evidence', vague phrasing, or not hitting the phase aim. Those belong in feedback, not in the pass/fail decision.",
    pointsPossible != null
      ? `- score_awarded = 0..${pointsPossible}. Around ${Math.round(pointsPossible * 0.6)} = a reasonable attempt; only go lower when the instructions were clearly not addressed.`
      : "- score_awarded = null.",
    "- feedback = 3 short paragraphs in an encouraging tone: (1) what they did that works, (2) one or two things that would deepen the answer (suggestion, not requirement), (3) a small, doable next step.",
    "- reasoning = 2-4 short admin-only sentences explaining the judgment.",
    "",
    "OUTPUT",
    "Part 1: stream 2-4 short sentences of live reasoning for the admin.",
    "Part 2: output one JSON block in a ```json fence using exactly:",
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
    "Stop after the JSON fence.",
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
      hackathon_phase_activity_assessments(id, assessment_type, points_possible, is_graded, display_order, metadata),
      revisions
    `)
    .eq("id", id)
    .single();

  if (submissionError || !submission) return null;

  const sub = submission as any;
  const activity = pickOne(sub.hackathon_phase_activities);
  const phase = pickOne(activity?.hackathon_program_phases);
  const assessmentsRaw = Array.isArray(sub.hackathon_phase_activity_assessments)
    ? sub.hackathon_phase_activity_assessments
    : sub.hackathon_phase_activity_assessments
      ? [sub.hackathon_phase_activity_assessments]
      : [];
  const assessments = [...assessmentsRaw].sort(
    (a: any, b: any) => (a?.display_order ?? 0) - (b?.display_order ?? 0)
  );
  const assessment = assessments[0] ?? null;
  const pointsPossible =
    typeof assessment?.points_possible === "number" ? assessment.points_possible : null;

  const ownerLabel =
    scope === "individual"
      ? `participant ${sub.participant_id}`
      : `team ${sub.team_id}`;

  const phaseSpec = await getPhaseSpec(phase?.phase_number ?? null);

  const priorRevisions: PriorRevision[] = Array.isArray(sub.revisions)
    ? (sub.revisions as PriorRevision[])
    : [];

  // Analyze images if present
  const activityLens = inferActivityLens(activity?.title ?? null, activity?.instructions ?? null);
  const imageUrl = sub.image_url ?? null;
  const fileUrls = Array.isArray(sub.file_urls) ? sub.file_urls : [];

  let imageAnalysis: SubmissionImageAnalysis | null = null;
  if (imageUrl || fileUrls.length > 0) {
    try {
      imageAnalysis = await analyzeSubmission({
        imageUrl,
        fileUrls,
        activityLens,
        activityTitle: activity?.title ?? null,
      });
    } catch (err) {
      console.error("[ai-grade] Image analysis failed:", err);
      // Continue without image analysis - the prompt will note this limitation
    }
  }

  const prompt = buildPrompt({
    phaseSpec,
    phaseNumber: phase?.phase_number ?? null,
    phaseTitle: phase?.title ?? null,
    activityTitle: activity?.title ?? null,
    activityInstructions: activity?.instructions ?? null,
    pointsPossible,
    assessments,
    textAnswer: sub.text_answer ?? null,
    imageUrl,
    fileUrls,
    scope,
    ownerLabel,
    priorRevisions,
    imageAnalysis,
  });

  return {
    prompt,
    hasPhaseSpec: Boolean(phaseSpec),
    phaseNumber: phase?.phase_number ?? null,
    phaseTitle: phase?.title ?? null,
    activityTitle: activity?.title ?? null,
    pointsPossible,
    hasImageAnalysis: Boolean(imageAnalysis?.primaryImage?.analysis || imageAnalysis?.files?.length),
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
    has_image_analysis: context.hasImageAnalysis,
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
      maxOutputTokens: 3000,
      onError: (e) => {
        console.error("[admin/hackathon/ai-grade] stream error:", e);
      },
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let accumulated = "";
        let clientAlive = true;

        // Safe send: if the client disconnected, swallow the error so the
        // MiniMax loop and persistDraft still run to completion.
        const send = (obj: unknown) => {
          if (!clientAlive) return;
          try {
            controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
          } catch {
            clientAlive = false;
          }
        };

        // Send image analysis status if available
        if (context.hasImageAnalysis) {
          send({ type: "status", message: "Image analysis completed - visual content included in grading context" });
        }

        try {
          for await (const part of result.fullStream) {
            // Accumulate FIRST, independent of client status.
            if (part.type === "text-delta") {
              const delta = (part as any).text ?? "";
              accumulated += delta;
              send({ type: "thinking", delta });
            } else if (part.type === "reasoning-delta") {
              const delta = (part as any).text ?? "";
              send({ type: "reasoning", delta });
            } else if (part.type === "error") {
              send({ type: "error", message: String((part as any).error ?? "stream error") });
            }
          }

          const object = parseAiGradeJson(accumulated);
          if (!object) {
            console.error("[admin/hackathon/ai-grade] failed to parse JSON", { accumulated });
            send({ type: "error", message: "AI did not return a valid JSON block", raw: accumulated });
            return;
          }

          // Persist draft whether or not the client is still listening.
          let promoted = false;
          try {
            const draft: AiDraft = {
              status: object.review_status,
              score_awarded: object.score_awarded,
              points_possible: context.pointsPossible,
              feedback: object.feedback,
              reasoning: object.reasoning ?? null,
              raw_output: accumulated,
              error: null,
            };
            const persisted = await persistDraft(getHackathonServiceClient(), {
              scope: rawScope as "individual" | "team",
              submissionId: id,
              draft,
              source: "manual",
              model: AI_MODEL,
              reviewedByUserId: admin.id,
            });
            promoted = persisted.promoted;
            console.log("[admin/hackathon/ai-grade] draft persisted", {
              scope: rawScope,
              id,
              promoted,
              clientAlive,
            });
          } catch (persistErr) {
            console.error("[admin/hackathon/ai-grade] persist draft failed:", persistErr);
          }

          send({
            type: "done",
            suggestion: object,
            model: AI_MODEL,
            has_phase_spec: context.hasPhaseSpec,
            persisted: true,
            auto_approved: promoted,
          });
        } catch (err: any) {
          console.error("[admin/hackathon/ai-grade] stream loop error:", err);
          send({ type: "error", message: err?.message ?? String(err) });
        } finally {
          try { controller.close(); } catch {}
        }
      },
      cancel() {
        // Client closed the tab. The `start()` loop continues via the
        // clientAlive gate so persistDraft still runs.
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
