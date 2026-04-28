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

// GET /api/admin/hackathon/activities/editor - Fetch all phases with activities, content, assessments
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

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
      hackathon_phase_activities(
        id,
        phase_id,
        title,
        instructions,
        display_order,
        estimated_minutes,
        is_required,
        is_draft,
        created_at,
        updated_at,
        hackathon_phase_activity_content(
          id,
          activity_id,
          content_type,
          content_title,
          content_url,
          content_body,
          display_order,
          metadata,
          created_at
        ),
        hackathon_phase_activity_assessments(
          id,
          activity_id,
          assessment_type,
          points_possible,
          is_graded,
          metadata,
          created_at,
          updated_at
        )
      )
    `)
    .order("phase_number", { ascending: true });

  if (phasesError) {
    console.error("[admin/hackathon/activities/editor] fetch error:", phasesError);
    return NextResponse.json({ error: "Failed to fetch phases" }, { status: 500 });
  }

  // Sort activities within each phase by display_order
  const formattedPhases = (phases ?? []).map((phase) => ({
    ...phase,
    hackathon_phase_activities: (phase.hackathon_phase_activities ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((act) => ({
        ...act,
        hackathon_phase_activity_content: (act.hackathon_phase_activity_content ?? [])
          .sort((a, b) => a.display_order - b.display_order),
        hackathon_phase_activity_assessments: act.hackathon_phase_activity_assessments ?? [],
      })),
  }));

  return NextResponse.json({ phases: formattedPhases });
}
