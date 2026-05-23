import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const PAGE_SIZE = 50;

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
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
  return roles?.length ? user : null;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("type"); // 'cycle', 'midphase', 'video', 'all'
  const status = searchParams.get("status"); // 'ungraded', 'graded', 'all'
  const q = searchParams.get("q")?.trim() ?? "";
  const showTest = searchParams.get("show_test") === "true";
  const cycleFilter = searchParams.get("cycle"); // '1','2','3','4','5','all'
  const sortBy = searchParams.get("sort") ?? "submitted_desc"; // 'submitted_desc', 'submitted_asc', 'score_desc', 'score_asc', 'cycle_asc'
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const serviceClient = getHackathonServiceClient();

  const queryCycles = !entityType || entityType === "cycle" || entityType === "all";
  const queryMidphase = !entityType || entityType === "midphase" || entityType === "all";
  const queryVideo = !entityType || entityType === "video" || entityType === "all";

  // Resolve test team IDs to exclude by default
  let testTeamIds: string[] = [];
  if (!showTest) {
    const { data: testTeams } = await serviceClient
      .from("hackathon_teams")
      .select("id")
      .or("name.ilike.%test%,lobby_code.eq.U4SU5F");
    testTeamIds = (testTeams ?? []).map((t) => t.id);
  }

  // Helper: build cycles query
  async function fetchCycles() {
    let dbQuery = serviceClient
      .from("hackathon_phase3_cycles")
      .select(`
        id, team_id, cycle_number, status, gate_decision,
        hypothesis_full, synthesis_result,
        ai_score, mentor_score, started_at, submitted_at, completed_at,
        hackathon_teams(id, name, lobby_code)
      `, { count: "exact" });

    if (testTeamIds.length > 0) {
      dbQuery = dbQuery.not("team_id", "in", `(${testTeamIds.join(",")})`);
    }

    if (status === "ungraded") {
      dbQuery = dbQuery.is("ai_score", null).is("mentor_score", null);
    } else if (status === "graded") {
      dbQuery = dbQuery.or("ai_score.not.is.null,mentor_score.not.is.null");
    }

    if (cycleFilter && cycleFilter !== "all") {
      dbQuery = dbQuery.eq("cycle_number", parseInt(cycleFilter, 10));
    }

    if (q) {
      dbQuery = dbQuery.or(`hackathon_teams.name.ilike.%${q}%,hypothesis_full.ilike.%${q}%`);
    }

    // Sort
    if (sortBy === "submitted_asc") {
      dbQuery = dbQuery.order("submitted_at", { ascending: true, nullsFirst: false });
    } else if (sortBy === "cycle_asc") {
      dbQuery = dbQuery.order("cycle_number", { ascending: true });
    } else {
      // default submitted_desc
      dbQuery = dbQuery.order("submitted_at", { ascending: false, nullsFirst: false });
    }

    return dbQuery;
  }

  // Helper: build midphase query
  async function fetchMidphase() {
    let dbQuery = serviceClient
      .from("hackathon_phase3_midphase_synthesis")
      .select(`
        id, team_id, what_learned, what_changed, what_wrong, confidence_score,
        ai_score, status, submitted_at,
        hackathon_teams(id, name, lobby_code)
      `, { count: "exact" });

    if (testTeamIds.length > 0) {
      dbQuery = dbQuery.not("team_id", "in", `(${testTeamIds.join(",")})`);
    }

    if (status === "ungraded") {
      dbQuery = dbQuery.is("ai_score", null).is("confidence_score", null);
    } else if (status === "graded") {
      dbQuery = dbQuery.or("ai_score.not.is.null,confidence_score.not.is.null");
    }

    if (q) {
      dbQuery = dbQuery.or(`hackathon_teams.name.ilike.%${q}%,what_learned.ilike.%${q}%`);
    }

    // Sort
    if (sortBy === "submitted_asc") {
      dbQuery = dbQuery.order("submitted_at", { ascending: true, nullsFirst: false });
    } else {
      dbQuery = dbQuery.order("submitted_at", { ascending: false, nullsFirst: false });
    }

    return dbQuery;
  }

  // Helper: build video query
  async function fetchVideo() {
    let dbQuery = serviceClient
      .from("hackathon_phase3_video_submissions")
      .select(`
        id, team_id, video_url, ai_scrutinizer_output, judge_scores,
        human_review_status, submitted_at,
        hackathon_teams(id, name, lobby_code)
      `, { count: "exact" });

    if (testTeamIds.length > 0) {
      dbQuery = dbQuery.not("team_id", "in", `(${testTeamIds.join(",")})`);
    }

    if (status === "ungraded") {
      dbQuery = dbQuery.is("ai_scrutinizer_output", null).is("judge_scores", null);
    } else if (status === "graded") {
      dbQuery = dbQuery.or("ai_scrutinizer_output.not.is.null,judge_scores.not.is.null");
    }

    if (q) {
      dbQuery = dbQuery.ilike("hackathon_teams.name", `%${q}%`);
    }

    // Sort
    if (sortBy === "submitted_asc") {
      dbQuery = dbQuery.order("submitted_at", { ascending: true, nullsFirst: false });
    } else {
      dbQuery = dbQuery.order("submitted_at", { ascending: false, nullsFirst: false });
    }

    return dbQuery;
  }

  const [cyclesResult, midphaseResult, videoResult] = await Promise.all([
    queryCycles ? fetchCycles() : Promise.resolve({ data: [], count: 0, error: null }),
    queryMidphase ? fetchMidphase() : Promise.resolve({ data: [], count: 0, error: null }),
    queryVideo ? fetchVideo() : Promise.resolve({ data: [], count: 0, error: null }),
  ]);

  // Batch-fetch cycle steps for visible cycles
  let cycleStepsMap = new Map<string, Array<{ step_type: string; status: string }>>();
  if (queryCycles && cyclesResult.data && cyclesResult.data.length > 0) {
    const cycleIds = cyclesResult.data.map((row: any) => row.id);
    const { data: stepsData } = await serviceClient
      .from("hackathon_phase3_cycle_steps")
      .select("cycle_id, step_type, status")
      .in("cycle_id", cycleIds);
    for (const step of (stepsData ?? [])) {
      const list = cycleStepsMap.get(step.cycle_id) ?? [];
      list.push({ step_type: step.step_type, status: step.status });
      cycleStepsMap.set(step.cycle_id, list);
    }
  }

  if (cyclesResult.error || midphaseResult.error || videoResult.error) {
    console.error("[phase3/queue] fetch error", {
      cycles: cyclesResult.error,
      midphase: midphaseResult.error,
      video: videoResult.error,
    });
    return NextResponse.json({ error: "Failed to fetch Phase 3 items" }, { status: 500 });
  }

  function pickOne<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  }

  const cycles = (cyclesResult.data ?? []).map((row: any) => {
    const team = pickOne(row.hackathon_teams);
    const ai = row.ai_score as { total?: number } | null;
    const mentor = row.mentor_score as { total?: number } | null;
    return {
      type: "cycle" as const,
      id: row.id,
      team_id: row.team_id,
      team_name: team?.name ?? null,
      team_lobby_code: team?.lobby_code ?? null,
      cycle_number: row.cycle_number,
      status: row.status,
      gate_decision: row.gate_decision,
      hypothesis: row.hypothesis_full,
      synthesis_result: row.synthesis_result,
      score: mentor?.total ?? ai?.total ?? null,
      scored_by: mentor ? "mentor" : ai ? "ai" : null,
      started_at: row.started_at,
      submitted_at: row.submitted_at,
      completed_at: row.completed_at,
      steps: cycleStepsMap.get(row.id) ?? [],
    };
  });

  const midphases = (midphaseResult.data ?? []).map((row: any) => {
    const team = pickOne(row.hackathon_teams);
    const ai = row.ai_score as { total?: number } | null;
    return {
      type: "midphase" as const,
      id: row.id,
      team_id: row.team_id,
      team_name: team?.name ?? null,
      team_lobby_code: team?.lobby_code ?? null,
      confidence_score: row.confidence_score,
      what_learned: row.what_learned,
      what_changed: row.what_changed,
      what_wrong: row.what_wrong,
      score: ai?.total ?? (row.confidence_score ? row.confidence_score * 10 : null),
      scored_by: ai ? "ai" : row.confidence_score ? "mentor" : null,
      status: row.status,
      submitted_at: row.submitted_at,
    };
  });

  const videos = (videoResult.data ?? []).map((row: any) => {
    const team = pickOne(row.hackathon_teams);
    const ai = row.ai_scrutinizer_output as { total?: number } | null;
    const judge = row.judge_scores as { total?: number } | null;
    return {
      type: "video" as const,
      id: row.id,
      team_id: row.team_id,
      team_name: team?.name ?? null,
      team_lobby_code: team?.lobby_code ?? null,
      video_url: row.video_url,
      score: judge?.total ?? ai?.total ?? null,
      scored_by: judge ? "judge" : ai ? "ai" : null,
      human_review_status: row.human_review_status,
      submitted_at: row.submitted_at,
    };
  });

  // Combine and sort
  let items = [...cycles, ...midphases, ...videos];
  items.sort((a, b) => {
    if (sortBy === "score_desc") {
      return (b.score ?? -1) - (a.score ?? -1);
    }
    if (sortBy === "score_asc") {
      return (a.score ?? 9999) - (b.score ?? 9999);
    }
    if (sortBy === "cycle_asc") {
      const aCycle = a.type === "cycle" ? (a.cycle_number ?? 9999) : 9999;
      const bCycle = b.type === "cycle" ? (b.cycle_number ?? 9999) : 9999;
      if (aCycle !== bCycle) return aCycle - bCycle;
    }
    // default: submitted_at desc (or submitted_asc when chosen)
    const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
    const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
    return sortBy === "submitted_asc" ? aTime - bTime : bTime - aTime;
  });

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedItems = items.slice(offset, offset + PAGE_SIZE);

  return NextResponse.json({
    items: paginatedItems,
    counts: {
      total: totalItems,
      cycles: cyclesResult.count ?? 0,
      midphase: midphaseResult.count ?? 0,
      videos: videoResult.count ?? 0,
    },
    pagination: { page, page_size: PAGE_SIZE, total_items: totalItems, total_pages: totalPages },
  });
}
