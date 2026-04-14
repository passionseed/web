// supabase/functions/portfolio-fit/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SCORE_VERSION = 1;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Helpers ─────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function sanitize(s: unknown, maxLen = 500): string {
  return String(s ?? "")
    .replace(/[\r\n<>]/g, " ")
    .slice(0, maxLen);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function isCacheFresh(scoredAt: string): boolean {
  return Date.now() - new Date(scoredAt).getTime() < CACHE_MAX_AGE_MS;
}

// ── AI scoring via Gemini ───────────────────────────────────────────────

interface AiScoringResult {
  alignment_score: number; // 0-100
  gaps: Array<{ gap: string; suggestion: string }>;
  narrative: string;
}

async function scoreWithGemini(params: {
  portfolioItems: Array<{
    item_type: string;
    title: string;
    description: string | null;
    tags: string[];
  }>;
  requirements: {
    what_they_seek: string | null;
    portfolio_criteria: string[] | null;
    program_vision: string | null;
    sample_keywords: string[] | null;
  };
  programName: string;
  facultyName: string;
  universityName: string;
}): Promise<AiScoringResult> {
  const portfolioText = params.portfolioItems
    .map(
      (p) =>
        `[${p.item_type.toUpperCase()}] ${p.title}: ${p.description ?? ""}`,
    )
    .join("\n");

  const prompt = `You are evaluating a Thai high school student's portfolio for TCAS Round 1 (portfolio round) admission.

Program: ${sanitize(params.programName)}
Faculty: ${sanitize(params.facultyName)}
University: ${sanitize(params.universityName)}

What this program looks for:
${sanitize(params.requirements.what_they_seek ?? "Not specified", 500)}

Required portfolio components: ${JSON.stringify(params.requirements.portfolio_criteria ?? [])}
Key values/keywords: ${JSON.stringify(params.requirements.sample_keywords ?? [])}

Student's portfolio:
${portfolioText.slice(0, 2000)}

Score the student's portfolio fit for this program. Return ONLY valid JSON:
{
  "alignment_score": <integer 0-100>,
  "narrative": "<2-3 sentences in Thai explaining fit — be specific about what aligns>",
  "gaps": [
    {"gap": "<missing element>", "suggestion": "<concrete action in Thai>"}
  ]
}

Rules:
- alignment_score 80-100 = strong fit, portfolio directly demonstrates program values
- alignment_score 50-79 = moderate fit, some relevant experience but gaps exist
- alignment_score 0-49 = weak fit, portfolio doesn't demonstrate program's needs
- Limit gaps to the 2-3 most important missing elements
- Write narrative and suggestions in Thai`;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Gemini response");
  return JSON.parse(jsonMatch[0]);
}

// ── Route: POST /portfolio-fit ───────────────────────────────────────────
// Score a student against an array of TCAS1 round IDs.
// Returns array of FitScoreResult, writing to program_fit_scores as a side effect.

async function handleScore(req: Request): Promise<Response> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Auth — get user from JWT
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  let body: { round_ids?: string[]; force_refresh?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { round_ids = [], force_refresh = false } = body;

  await supabase.from("funnel_events").insert({
    user_id: user.id,
    event_name: "grading_request",
    metadata: { round_count: round_ids.length },
  });
  if (!Array.isArray(round_ids) || round_ids.length === 0) {
    return json({ error: "round_ids must be a non-empty array" }, 400);
  }
  if (round_ids.length > 50) {
    return json({ error: "Max 50 round_ids per request" }, 400);
  }

  // Fetch student profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("gpax, subject_interests, interest_embedding")
    .eq("id", user.id)
    .single();

  const studentGpax: number | null = profile?.gpax ?? null;
  const studentEmbedding: number[] | null =
    profile?.interest_embedding ?? null;

  // Fetch student portfolio
  const { data: portfolioItems } = await supabase
    .from("student_portfolio_items")
    .select("id, item_type, title, description, tags, embedding")
    .eq("user_id", user.id);

  const items = portfolioItems ?? [];

  // Check cache — return cached results where fresh
  const { data: cached } = await supabase
    .from("program_fit_scores")
    .select("*")
    .eq("user_id", user.id)
    .eq("score_version", SCORE_VERSION)
    .in("round_id", round_ids);

  const cachedByRound = new Map<string, Record<string, unknown>>();
  for (const c of cached ?? []) {
    if (!force_refresh && isCacheFresh(c.scored_at)) {
      cachedByRound.set(c.round_id, c);
    }
  }

  const toScore = round_ids.filter((id) => !cachedByRound.has(id));

  // Fetch round details for rounds we need to score
  const results: Record<string, unknown>[] = [...cachedByRound.values()];

  if (toScore.length > 0) {
    const { data: rounds } = await supabase
      .from("tcas_admission_rounds")
      .select(
        `
        id, program_id, round_type, round_number, project_name,
        receive_seats, min_gpax, folio_closed_date, link,
        program:tcas_programs (
          program_name, program_name_en, faculty_name,
          embedding,
          university:tcas_universities ( university_name, university_id )
        )
      `,
      )
      .in("id", toScore);

    const { data: requirements } = await supabase
      .from("program_requirements")
      .select(
        "round_id, what_they_seek, portfolio_criteria, program_vision, sample_keywords",
      )
      .in("round_id", toScore);

    const reqByRound = new Map(
      (requirements ?? []).map((r) => [r.round_id, r]),
    );

    for (const round of rounds ?? []) {
      const prog = round.program as any;
      const uni = prog?.university as any;
      const req = reqByRound.get(round.id);
      const programEmbedding: number[] | null = prog?.embedding ?? null;

      // Hard eligibility gate: GPAX < min_gpax → fail
      // If GPAX is null → skip gate (pass)
      const eligibilityPass =
        !round.min_gpax ||
        round.min_gpax === 0 ||
        studentGpax === null ||
        studentGpax >= round.min_gpax;

      if (
        round.min_gpax &&
        round.min_gpax > 0 &&
        studentGpax !== null &&
        studentGpax < round.min_gpax
      ) {
        const row = {
          user_id: user.id,
          round_id: round.id,
          program_id: round.program_id,
          eligibility_pass: false,
          fit_score: 0,
          confidence: "low",
          narrative: `GPAX ขั้นต่ำ ${round.min_gpax} — ยังไม่ผ่านเกณฑ์`,
          gaps: [],
          portfolio_snapshot: { items_count: items.length },
          scored_at: new Date().toISOString(),
          score_version: SCORE_VERSION,
        };
        await supabase
          .from("program_fit_scores")
          .upsert(row, { onConflict: "user_id,round_id" });
        results.push({
          ...row,
          program_name: prog?.program_name,
          program_name_en: prog?.program_name_en,
          faculty_name: prog?.faculty_name,
          university_name: uni?.university_name,
          university_id: uni?.university_id,
          round_type: round.round_type,
          round_number: round.round_number,
          project_name: round.project_name,
          receive_seats: round.receive_seats,
          min_gpax: round.min_gpax,
          folio_closed_date: round.folio_closed_date,
          link: round.link,
        });
        continue;
      }

      // Semantic similarity
      let semanticScore = 50; // default neutral
      if (studentEmbedding && programEmbedding) {
        const sim = cosineSimilarity(studentEmbedding, programEmbedding);
        semanticScore = Math.round(Math.min(100, Math.max(0, sim * 100)));
      }

      // Determine confidence + AI scoring
      const hasPortfolio = items.length > 0;
      const hasRequirements = !!req?.what_they_seek;

      let fitScore = semanticScore;
      let confidence: "low" | "medium" | "high" = "low";
      let narrative: string | null = null;
      let gaps: Array<{ gap: string; suggestion: string }> = [];

      if (hasPortfolio && hasRequirements) {
        // High confidence: 30% semantic + 70% AI alignment
        confidence = "high";
        try {
          const aiResult = await scoreWithGemini({
            portfolioItems: items.map((it) => ({
              item_type: it.item_type,
              title: it.title,
              description: it.description,
              tags: it.tags ?? [],
            })),
            requirements: req,
            programName: prog?.program_name ?? "",
            facultyName: prog?.faculty_name ?? "",
            universityName: uni?.university_name ?? "",
          });
          fitScore = Math.round(
            semanticScore * 0.3 + aiResult.alignment_score * 0.7,
          );
          narrative = aiResult.narrative;
          gaps = aiResult.gaps ?? [];
        } catch (e) {
          // Degrade gracefully — return semantic score without narrative, never 500
          console.error("Gemini scoring failed:", e);
          confidence = "medium";
          fitScore = semanticScore;
        }
      } else if (hasRequirements) {
        // Medium confidence: semantic score + narrative suggesting adding portfolio
        confidence = "medium";
        fitScore = semanticScore;
        narrative =
          "เพิ่มผลงานพอร์ตโฟลิโอของคุณเพื่อรับการวิเคราะห์ที่ละเอียดยิ่งขึ้น";
      } else {
        // Low confidence: 50% GPAX bonus + 50% semantic
        confidence = "low";
        const gpaxBonus =
          studentGpax !== null ? Math.round((studentGpax / 4.0) * 100) : 50;
        fitScore = Math.round(gpaxBonus * 0.5 + semanticScore * 0.5);
      }

      const row = {
        user_id: user.id,
        round_id: round.id,
        program_id: round.program_id,
        eligibility_pass: true,
        fit_score: fitScore,
        confidence,
        narrative,
        gaps,
        portfolio_snapshot: {
          items_count: items.length,
          item_titles: items.map((i) => i.title),
        },
        scored_at: new Date().toISOString(),
        score_version: SCORE_VERSION,
      };

      const { error: writeError } = await supabase
        .from("program_fit_scores")
        .upsert(row, { onConflict: "user_id,round_id" });

      if (writeError) {
        console.error(
          "Fit score write error:",
          writeError.message,
          "round_id:",
          round.id,
        );
      }

      results.push({
        ...row,
        program_name: prog?.program_name,
        program_name_en: prog?.program_name_en,
        faculty_name: prog?.faculty_name,
        university_name: uni?.university_name,
        university_id: uni?.university_id,
        round_type: round.round_type,
        round_number: round.round_number,
        project_name: round.project_name,
        receive_seats: round.receive_seats,
        min_gpax: round.min_gpax,
        folio_closed_date: round.folio_closed_date,
        link: round.link,
      });
    }
  }

  return json({ results });
}

// ── Route: GET /portfolio-fit/discover ──────────────────────────────────
// Returns top-N TCAS1 programs the student hasn't viewed yet, sorted by fit.

async function handleDiscover(req: Request): Promise<Response> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? "5"),
    20,
  );

  // Get student's interest embedding
  const { data: profile } = await supabase
    .from("profiles")
    .select("gpax, interest_embedding")
    .eq("id", user.id)
    .single();

  if (!profile?.interest_embedding) {
    return json({
      results: [],
      reason: "Complete your profile to get recommendations",
    });
  }

  // Get programs the student has already scored (i.e., viewed)
  const { data: alreadyScored } = await supabase
    .from("program_fit_scores")
    .select("round_id")
    .eq("user_id", user.id);

  const seenRoundIds = new Set(
    (alreadyScored ?? []).map((r) => r.round_id),
  );

  // Vector search: find top TCAS1 programs by embedding similarity
  const { data: candidates } = await supabase.rpc("search_programs", {
    query_embedding: profile.interest_embedding,
    match_threshold: 0.3,
    match_count: 100,
  });

  if (!candidates || candidates.length === 0) {
    return json({ results: [] });
  }

  // Get TCAS1 round IDs for these programs, filtering unseen
  const programIds = candidates.map(
    (c: { program_id: string }) => c.program_id,
  );
  const { data: rounds } = await supabase
    .from("tcas_admission_rounds")
    .select("id, program_id, min_gpax")
    .in("program_id", programIds)
    .eq("round_number", 1);

  const eligibleRounds = (rounds ?? []).filter((r) => {
    if (seenRoundIds.has(r.id)) return false;
    if (
      r.min_gpax &&
      r.min_gpax > 0 &&
      profile.gpax &&
      profile.gpax < r.min_gpax
    )
      return false;
    return true;
  });

  const topRoundIds = eligibleRounds
    .slice(0, limit * 3)
    .map((r) => r.id);
  if (topRoundIds.length === 0) return json({ results: [] });

  // Score them using the same endpoint logic
  const scoreResp = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/portfolio-fit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("Authorization") ?? "",
      },
      body: JSON.stringify({ round_ids: topRoundIds }),
    },
  );

  const scoreData = await scoreResp.json();
  const scored = (scoreData.results ?? [])
    .sort(
      (a: { fit_score: number }, b: { fit_score: number }) =>
        b.fit_score - a.fit_score,
    )
    .slice(0, limit);

  return json({ results: scored });
}

// ── Router ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);

  try {
    if (
      req.method === "POST" &&
      url.pathname.endsWith("/portfolio-fit")
    ) {
      return await handleScore(req);
    }
    if (
      req.method === "GET" &&
      url.pathname.endsWith("/portfolio-fit/discover")
    ) {
      return await handleDiscover(req);
    }
    return json({ error: "Not found" }, 404);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("portfolio-fit error:", message);
    return json({ error: "Internal server error" }, 500);
  }
});
