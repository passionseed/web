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

// PATCH /api/admin/hackathon/activities/editor/[id]/content/[contentId] - Update content
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contentId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { contentId } = await params;
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

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await serviceClient
    .from("hackathon_phase_activity_content")
    .update(updateData)
    .eq("id", contentId)
    .select()
    .single();

  if (error) {
    console.error("[admin/hackathon/activities/editor/content] update error:", error);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }

  return NextResponse.json({ content: data });
}

// DELETE /api/admin/hackathon/activities/editor/[id]/content/[contentId] - Delete content
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contentId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { contentId } = await params;
  const serviceClient = getHackathonServiceClient();

  const { error } = await serviceClient
    .from("hackathon_phase_activity_content")
    .delete()
    .eq("id", contentId);

  if (error) {
    console.error("[admin/hackathon/activities/editor/content] delete error:", error);
    return NextResponse.json({ error: "Failed to delete content" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
