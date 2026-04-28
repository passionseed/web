import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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

// Returns phases + activities with submission COUNTS (fast, no submission data).
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const programId = searchParams.get("program_id");

  const serviceClient = getHackathonServiceClient();

  const { data: phases, error: phasesError } = await serviceClient
    .from("hackathon_program_phases")
    .select(`
      id,
      program_id,
      slug,
      title,
      description,
      phase_number,
      starts_at,
      ends_at,
      due_at,
      created_at,
      updated_at,
      hackathon_phase_activities!hackathon_phase_activities_phase_id_fkey(
        id,
        phase_id,
        title,
        instructions,
        display_order,
        estimated_minutes,
        is_required,
        is_draft,
        submission_scope,
        created_at,
        updated_at,
        hackathon_phase_activity_content(id, content_type, content_title, display_order),
        hackathon_phase_activity_assessments(id, assessment_type, points_possible, is_graded, display_order, metadata)
      )
    `)
    .order("phase_number", { ascending: true });

  if (phasesError) {
    console.error("[admin/hackathon/activities] phases fetch error:", phasesError);
    return NextResponse.json({ error: "Failed to fetch phases" }, { status: 500 });
  }

  const activityIds: string[] = [];
  for (const phase of phases ?? []) {
    const acts = Array.isArray(phase.hackathon_phase_activities) ? phase.hackathon_phase_activities : [];
    for (const a of acts) activityIds.push(a.id);
  }

  if (activityIds.length === 0) {
    return NextResponse.json({ phases: phases ?? [], stats: { total_submissions: 0, pending_review: 0, passed: 0, revision_required: 0 } });
  }

  // Single RPC call — returns grouped counts with zero row data transfer
  const { data: countRows, error: countError } = await serviceClient
    .rpc("get_hackathon_activity_submission_counts", { activity_ids: activityIds });

  if (countError) {
    console.error("[admin/hackathon/activities] count rpc error:", countError);
    return NextResponse.json({ error: "Failed to fetch submission counts" }, { status: 500 });
  }

  const subCountMap = new Map<string, number>();
  const pendingMap = new Map<string, number>();
  const passedMap = new Map<string, number>();
  const revisionMap = new Map<string, number>();

  for (const row of countRows ?? []) {
    const id: string = row.activity_id;
    const cnt: number = Number(row.cnt);
    subCountMap.set(id, (subCountMap.get(id) ?? 0) + cnt);
    if (row.review_status === "pending_review") pendingMap.set(id, (pendingMap.get(id) ?? 0) + cnt);
    else if (row.review_status === "passed") passedMap.set(id, (passedMap.get(id) ?? 0) + cnt);
    else if (row.review_status === "revision_required") revisionMap.set(id, (revisionMap.get(id) ?? 0) + cnt);
  }

  let totalSubmissions = 0, pendingReview = 0, passed = 0, needsRevision = 0;

  const formattedPhases = (phases ?? []).map((phase) => {
    const acts = Array.isArray(phase.hackathon_phase_activities) ? phase.hackathon_phase_activities : [];
    return {
      ...phase,
      hackathon_phase_activities: acts.sort((a, b) => a.display_order - b.display_order).map((act) => {
        const count = subCountMap.get(act.id) ?? 0;
        const pending = pendingMap.get(act.id) ?? 0;
        const passedCnt = passedMap.get(act.id) ?? 0;
        const rev = revisionMap.get(act.id) ?? 0;
        totalSubmissions += count; pendingReview += pending; passed += passedCnt; needsRevision += rev;
        return {
          ...act,
          content: Array.isArray(act.hackathon_phase_activity_content) ? act.hackathon_phase_activity_content.sort((a, b) => a.display_order - b.display_order) : [],
          assessments: Array.isArray(act.hackathon_phase_activity_assessments) ? act.hackathon_phase_activity_assessments.sort((a, b) => a.display_order - b.display_order) : [],
          submissions: [],
          submission_count: count,
          submission_pending: pending,
          submission_passed: passedCnt,
          submission_revision: rev,
        };
      }),
    };
  });

  return NextResponse.json({
    phases: formattedPhases,
    stats: { total_submissions: totalSubmissions, pending_review: pendingReview, passed, revision_required: needsRevision },
  });
}
