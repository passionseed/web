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

// POST /api/admin/hackathon/activities/editor/[id]/content - Add content item
export async function POST(
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

  const allowedFields = [
    "content_type",
    "content_title",
    "content_url",
    "content_body",
    "display_order",
    "metadata",
  ];

  const insertData: Record<string, unknown> = { activity_id: activityId };
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      insertData[field] = body[field];
    }
  }

  if (!insertData.content_type) {
    return NextResponse.json({ error: "content_type is required" }, { status: 400 });
  }

  // Ensure metadata is an object
  if (!insertData.metadata) {
    insertData.metadata = {};
  }

  const { data, error } = await serviceClient
    .from("hackathon_phase_activity_content")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("[admin/hackathon/activities/editor/content] insert error:", error);
    return NextResponse.json({ error: "Failed to add content" }, { status: 500 });
  }

  return NextResponse.json({ content: data });
}
