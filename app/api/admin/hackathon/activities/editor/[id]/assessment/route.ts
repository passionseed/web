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

// PATCH /api/admin/hackathon/activities/editor/[id]/assessment - Update or create assessment
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id: activityId } = await params;
  const body = await req.json();

  const serviceClient = getHackathonServiceClient();

  // Check if assessment already exists
  const { data: existing } = await serviceClient
    .from("hackathon_phase_activity_assessments")
    .select("id")
    .eq("activity_id", activityId)
    .single();

  const allowedFields = [
    "assessment_type",
    "points_possible",
    "is_graded",
    "metadata",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (existing) {
    // Update existing assessment
    const { data, error } = await serviceClient
      .from("hackathon_phase_activity_assessments")
      .update(updateData)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("[admin/hackathon/activities/editor/assessment] update error:", error);
      return NextResponse.json({ error: "Failed to update assessment" }, { status: 500 });
    }

    return NextResponse.json({ assessment: data });
  } else {
    // Create new assessment
    const { data, error } = await serviceClient
      .from("hackathon_phase_activity_assessments")
      .insert({ activity_id: activityId, ...updateData })
      .select()
      .single();

    if (error) {
      console.error("[admin/hackathon/activities/editor/assessment] insert error:", error);
      return NextResponse.json({ error: "Failed to create assessment" }, { status: 500 });
    }

    return NextResponse.json({ assessment: data });
  }
}
