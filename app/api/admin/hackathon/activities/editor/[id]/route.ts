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

// PATCH /api/admin/hackathon/activities/editor/[id] - Update activity
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const serviceClient = getHackathonServiceClient();

  // Allowed fields for activity update
  const allowedFields = [
    "title",
    "instructions",
    "display_order",
    "estimated_minutes",
    "is_required",
    "is_draft",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from("hackathon_phase_activities")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[admin/hackathon/activities/editor] update error:", error);
    return NextResponse.json({ error: "Failed to update activity" }, { status: 500 });
  }

  return NextResponse.json({ activity: data });
}

// GET /api/admin/hackathon/activities/editor/[id] - Fetch single activity with content and assessment
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const serviceClient = getHackathonServiceClient();

  const { data, error } = await serviceClient
    .from("hackathon_phase_activities")
    .select(`
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
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("[admin/hackathon/activities/editor] fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }

  return NextResponse.json({
    activity: {
      ...data,
      hackathon_phase_activity_content: (data.hackathon_phase_activity_content ?? []).sort(
        (a, b) => a.display_order - b.display_order
      ),
    },
  });
}
