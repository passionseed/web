import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { streamText } from "ai";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getModel } from "@/lib/ai/modelRegistry";
import { getPhaseSpec, getActivitySpec, formatActivitySpecForPrompt } from "@/lib/hackathon/phase-specs";
import { persistDraft, type AiDraft } from "@/lib/hackathon/ai-grader";
import {
  analyzeSubmission,
  formatImageAnalysisForPrompt,
  type SubmissionImageAnalysis,
} from "@/lib/hackathon/image-analysis";
import { getActiveGradingPrompt } from "@/lib/hackathon/grading-prompt";

// Hobby plan max is 60s
export const maxDuration = 60;

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
      redFlag: "Solution flowchart instead of problem map (shows app features/user journey instead of root causes/stakeholders/incentives). Flat list of causes with no relationships or tradeoffs.",
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

function formatLatestRevisionFeedback(revisions: PriorRevision[]): string | null {
  if (!revisions?.length) return null;
  const latest = revisions[revisions.length - 1];
  if (!latest.review?.feedback) return null;
  return compactText(latest.review.feedback, 600);
}

function buildPrompt(params: {
  phaseSpec: string | null;
  phaseNumber: number | null;
  phaseTitle: string | null;
  activityTitle: string | null;
  activityInstructions: string | null;
  activitySpecFormatted: string;
  pointsPossible: number | null;
  assessments: AssessmentRow[];
  textAnswer: string | null;
  imageUrl: string | null;
  fileUrls: string[];
  scope: "individual" | "team";
  ownerLabel: string;
  priorRevisions: PriorRevision[];
  latestRevisionFeedback: string | null;
  imageAnalysis: SubmissionImageAnalysis | null;
  graderComment: string | null;
  upcomingActivities: { title: string; instructions: string | null; display_order: number | null }[];
  template?: string | null;
}) {
  const {
    phaseSpec,
    phaseNumber,
    phaseTitle,
    activityTitle,
    activityInstructions,
    activitySpecFormatted,
    pointsPossible,
    textAnswer,
    imageUrl,
    fileUrls,
    assessments,
    priorRevisions,
    latestRevisionFeedback,
    imageAnalysis,
    graderComment,
    upcomingActivities,
    template,
  } = params;

  const phaseContext = compactPhaseSpec(phaseSpec, phaseNumber, phaseTitle);
  const activityLens = inferActivityLens(activityTitle, activityInstructions);
  const shortInstructions = compactText(activityInstructions, 900) ?? "(no instructions provided)";
  const shortAnswer = compactText(textAnswer, 2200) ?? "(no text submitted)";
  const assessmentQuestions = compactText(formatAssessmentQuestions(assessments), 1600) ?? "(none)";
  const priorBlock = formatPriorRevisions(priorRevisions);
  const imageAnalysisText = imageAnalysis ? formatImageAnalysisForPrompt(imageAnalysis) : null;
  const hasVisualSubmission = imageUrl || fileUrls.length > 0;

  // Build section strings for template substitution
  const activitySpecSection = activitySpecFormatted
    ? "=== ACTIVITY-SPECIFIC GRADING CONTEXT ===\n" + activitySpecFormatted
    : "";

  const upcomingSection = upcomingActivities.length > 0
    ? `\nUpcoming activities in this phase (do NOT suggest they'll do these later — they may have already):\n${upcomingActivities.map((a, i) => `${i + 1}. ${a.title}`).join("\n")}`
    : "";

  const priorFeedbackSection = latestRevisionFeedback
    ? `=== PRIOR FEEDBACK (latest revision) ===\n${latestRevisionFeedback}\n\nCheck whether the student addressed this feedback in their current submission.`
    : "";

  const priorRevisionsSection = priorBlock
    ? `=== PRIOR ATTEMPTS ===\n${priorBlock}`
    : "";

  const imageSection = hasVisualSubmission && imageAnalysisText
    ? `=== IMAGE ANALYSIS ===\n${imageAnalysisText}\n\nIf the image analysis flags a "solution flowchart" when the activity asks for a "problem map," this is an automatic revision_required — the student submitted the wrong artifact type.`
    : "(no images submitted)";

  const scoringRules = pointsPossible != null
    ? `- Score: 0 to ${pointsPossible}. ${Math.round(pointsPossible * 0.6)} is a solid pass. Award full points only for exceptional work that exceeds expectations.`
    : "- Score: null (ungraded activity).";

  const scoreField = pointsPossible != null
    ? `"score_awarded": <number 0..${pointsPossible}>,`
    : '"score_awarded": null,';

  const graderCommentSection = graderComment
    ? `\n=== HUMAN GRADER NOTE ===\n${graderComment}`
    : "";

  // If we have a DB template, use placeholder substitution
  if (template) {
    return template
      .replace(/\{\{activity_title\}\}/g, activityTitle ?? "Untitled")
      .replace(/\{\{activity_instructions\}\}/g, shortInstructions)
      .replace(/\{\{assessment_questions\}\}/g, assessmentQuestions)
      .replace(/\{\{activity_spec_section\}\}/g, activitySpecSection)
      .replace(/\{\{phase_context\}\}/g, phaseContext)
      .replace(/\{\{learning_goal\}\}/g, activityLens.outcome)
      .replace(/\{\{evidence\}\}/g, activityLens.evidence)
      .replace(/\{\{red_flag\}\}/g, activityLens.redFlag)
      .replace(/\{\{upcoming_activities_section\}\}/g, upcomingSection)
      .replace(/\{\{prior_feedback_section\}\}/g, priorFeedbackSection)
      .replace(/\{\{prior_revisions_section\}\}/g, priorRevisionsSection)
      .replace(/\{\{submission_text\}\}/g, shortAnswer)
      .replace(/\{\{image_analysis_section\}\}/g, imageSection)
      .replace(/\{\{scoring_rules\}\}/g, scoringRules)
      .replace(/\{\{score_field\}\}/g, scoreField)
      .replace(/\{\{grader_comment_section\}\}/g, graderCommentSection)
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // Fallback: hardcoded prompt (same as before)
  return [
    "You are an experienced hackathon mentor grading student submissions. Your job is to assess whether the student has genuinely engaged with the learning goal — not whether they wrote a lot or used fancy words.",
    "",
    "=== LANGUAGE ===",
    "Match the student's submission language. Thai script = Thai. Otherwise English. No mixing within the feedback.",
    "",
    "=== ACTIVITY ===",
    `Title: ${activityTitle ?? "Untitled"}`,
    "",
    "=== INSTRUCTIONS ===",
    shortInstructions,
    "",
    "=== ASSESSMENT QUESTIONS ===",
    assessmentQuestions,
    "",
    activitySpecSection,
    "",
    "=== PHASE CONTEXT ===",
    `Phase: ${phaseContext}`,
    `Learning goal: ${activityLens.outcome}`,
    `Evidence to look for: ${activityLens.evidence}`,
    `Red flag: ${activityLens.redFlag}`,
    upcomingSection,
    "",
    priorFeedbackSection,
    "",
    priorRevisionsSection,
    "",
    "=== CURRENT SUBMISSION ===",
    shortAnswer,
    "",
    imageSection,
    "",
    "=== GRADING RUBRIC ===",
    "passed — The student made a genuine attempt at the learning goal. Their work shows evidence of real thinking, not just completion. They may have gaps, but the core understanding is present.",
    "revision_required — The submission is off-topic, blank, copy-paste with no effort, or fundamentally misunderstands the task (e.g., solution flowchart instead of problem map). Be strict about artifact-type mismatches.",
    "pending_review — The content is genuinely unclear, incomplete, or ambiguous. You cannot confidently assess it.",
    "",
    "=== SCORING ===",
    scoringRules,
    "- If instructions asked for an image but none was provided: score = 0 AND revision_required.",
    "- PROBLEM vs SOLUTION CHECK: For system/map activities, if the submission shows app features, user journeys, or 'how our product works' instead of root causes, stakeholder incentives, and forces keeping the problem alive → revision_required. Be strict.",
    "",
    "=== FEEDBACK FORMAT ===",
    "Write 3 short paragraphs:",
    "1. WHAT THEY DID WELL — Be specific. Quote or reference concrete parts of their submission. Generic praise is useless.",
    "2. GAPS OR SUGGESTIONS — 1-2 specific things to improve. Tie each to the learning goal.",
    "3. NEXT STEP — One clear action they should take next. If revision_required, state exactly what needs to change.",
    "",
    "=== REASONING ===",
    "Provide a short admin-only explanation of your grading decision. What evidence made you decide? What was the decisive factor?",
    "",
    "=== OUTPUT FORMAT ===",
    "Return ONLY a JSON object. No prose outside the JSON.",
    "```json",
    "{",
    '  "review_status": "passed" | "revision_required" | "pending_review",',
    `  ${scoreField}`,
    '  "feedback": "<3-paragraph student-facing feedback>",',
    '  "reasoning": "<admin-only grading rationale>"',
    "}",
    "```",
    graderCommentSection,
  ]
    .filter(Boolean)
    .join("\n");
}

async function gatherPromptContext(
  scope: "individual" | "team",
  id: string,
  graderComment?: string | null,
  opts?: { skipImageAnalysis?: boolean; templateOverride?: string | null }
) {
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
        display_order,
        phase_id,
        hackathon_program_phases(id, phase_number, title)
      ),
      revisions
    `)
    .eq("id", id)
    .single();

  if (submissionError || !submission) {
    console.error("[ai-grade] submission fetch failed", { scope, id, error: submissionError?.message });
    return null;
  }

  const sub = submission as any;
  const activity = pickOne(sub.hackathon_phase_activities);
  const phase = pickOne(activity?.hackathon_program_phases);

  // Fetch all assessments for this activity separately to avoid duplicate table alias error
  const { data: assessmentsData } = await serviceClient
    .from("hackathon_phase_activity_assessments")
    .select("id, assessment_type, points_possible, is_graded, display_order, metadata")
    .eq("activity_id", activity?.id ?? "")
    .order("display_order");

  const assessmentsRaw: AssessmentRow[] = (assessmentsData ?? []) as AssessmentRow[];
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

  // Fetch all activities in this phase to know what's coming next
  let phaseActivities: { title: string; instructions: string | null; display_order: number | null }[] = [];
  if (phase?.id) {
    const { data: activitiesData } = await serviceClient
      .from("hackathon_phase_activities")
      .select("title, instructions, display_order")
      .eq("phase_id", phase.id)
      .order("display_order", { ascending: true });
    phaseActivities = activitiesData ?? [];
  }

  // Analyze images if present
  const activityLens = inferActivityLens(activity?.title ?? null, activity?.instructions ?? null);
  const imageUrl = sub.image_url ?? null;
  const fileUrls = Array.isArray(sub.file_urls) ? sub.file_urls : [];

  let imageAnalysis: SubmissionImageAnalysis | null = null;
  if (!opts?.skipImageAnalysis && (imageUrl || fileUrls.length > 0)) {
    imageAnalysis = await analyzeSubmission({
      imageUrl,
      fileUrls,
      activityLens,
      activityTitle: activity?.title ?? null,
    });
  }

  const currentActivityOrder = activity?.display_order ?? 0;
  const upcomingActivities = phaseActivities.filter(
    (a) => (a.display_order ?? 0) > currentActivityOrder
  );

  // Load activity-specific spec for richer grading context
  const activitySpec = await getActivitySpec(
    phase?.phase_number ?? null,
    activity?.display_order ?? null,
    activity?.title ?? null
  );
  const activitySpecFormatted = formatActivitySpecForPrompt(activitySpec);

  const latestRevisionFeedback = formatLatestRevisionFeedback(priorRevisions);

  // Load the editable prompt template from DB (or use override)
  let template: string | null = opts?.templateOverride ?? null;
  if (!template) {
    const dbPrompt = await getActiveGradingPrompt("default");
    template = dbPrompt?.template ?? null;
  }

  const prompt = buildPrompt({
    phaseSpec,
    phaseNumber: phase?.phase_number ?? null,
    phaseTitle: phase?.title ?? null,
    activityTitle: activity?.title ?? null,
    activityInstructions: activity?.instructions ?? null,
    activitySpecFormatted,
    pointsPossible,
    assessments,
    textAnswer: sub.text_answer ?? null,
    imageUrl,
    fileUrls,
    scope,
    ownerLabel,
    priorRevisions,
    latestRevisionFeedback,
    imageAnalysis,
    graderComment: graderComment ?? null,
    upcomingActivities,
    template,
  });

  return {
    prompt,
    template: template ?? null,
    hasPhaseSpec: Boolean(phaseSpec),
    hasActivitySpec: Boolean(activitySpec),
    phaseNumber: phase?.phase_number ?? null,
    phaseTitle: phase?.title ?? null,
    activityTitle: activity?.title ?? null,
    pointsPossible,
    hasImageAnalysis: Boolean(imageAnalysis?.primaryImage?.analysis || imageAnalysis?.files?.length),
  };
}

async function checkTeamHasMentor(scope: "individual" | "team", id: string): Promise<boolean> {
  const serviceClient = getHackathonServiceClient();
  const table =
    scope === "individual"
      ? "hackathon_phase_activity_submissions"
      : "hackathon_phase_activity_team_submissions";

  const col = scope === "individual" ? "participant_id" : "team_id";

  const { data: sub } = await serviceClient
    .from(table)
    .select(col)
    .eq("id", id)
    .maybeSingle();

  if (!sub) return false;

  let teamId: string | null = null;

  if (scope === "team") {
    teamId = (sub as any).team_id ?? null;
  } else {
    const { data: mem } = await serviceClient
      .from("hackathon_team_members")
      .select("team_id")
      .eq("participant_id", (sub as any).participant_id)
      .maybeSingle();
    teamId = (mem as any)?.team_id ?? null;
  }

  if (!teamId) return false;

  const { data: assignment } = await serviceClient
    .from("mentor_team_assignments")
    .select("id")
    .eq("team_id", teamId)
    .maybeSingle();

  return !!assignment;
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

  const hasMentor = await checkTeamHasMentor(rawScope as "individual" | "team", id);
  if (hasMentor) {
    return NextResponse.json(
      { error: "This team has an assigned mentor. Grading is handled by the mentor." },
      { status: 403 }
    );
  }

  try {
    const context = await gatherPromptContext(
      rawScope as "individual" | "team",
      id,
      null,
      { skipImageAnalysis: true }
    );
    if (!context) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    return NextResponse.json({
      model: AI_MODEL,
      has_phase_spec: context.hasPhaseSpec,
      has_activity_spec: context.hasActivitySpec,
      phase_number: context.phaseNumber,
      phase_title: context.phaseTitle,
      activity_title: context.activityTitle,
      points_possible: context.pointsPossible,
      has_image_analysis: false,
      prompt: context.prompt,
      template: context.template,
    });
  } catch (err: any) {
    console.error("[admin/hackathon/ai-grade] GET error:", err);
    return NextResponse.json(
      { error: "Failed to load prompt", message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
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

  const hasMentor = await checkTeamHasMentor(rawScope as "individual" | "team", id);
  if (hasMentor) {
    return NextResponse.json(
      { error: "This team has an assigned mentor. Grading is handled by the mentor." },
      { status: 403 }
    );
  }

  const body = await _req.json().catch(() => ({}));
  const forceReview = body?.regrade === true;
  const graderComment = typeof body?.grader_comment === "string" ? body.grader_comment.trim() : null;
  const templateOverride = typeof body?.prompt_template === "string" ? body.prompt_template : null;

  const context = await gatherPromptContext(rawScope as "individual" | "team", id, graderComment, { templateOverride });
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
              forceReview,
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
