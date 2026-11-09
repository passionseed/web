import { NextRequest, NextResponse } from "next/server";
import { isUuid } from "@/lib/admin/queue-tools/url";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

/**
 * What the admin review screen needs. Listed by name so the secrets on the
 * row never reach the browser: claim_token is the bearer secret an expert
 * uses to claim the profile, and ip_address, user_agent and
 * interview_session_id are request metadata.
 */
const EXPERT_DETAIL_COLUMNS = [
  "id",
  "name",
  "title",
  "company",
  "photo_url",
  "field_category",
  "linkedin_url",
  "interview_data",
  "interview_transcript",
  "mentoring_preference",
  "booking_url",
  "status",
  "admin_notes",
  "created_at",
  "updated_at",
  "reviewed_at",
].join(", ");

const PATHLAB_COLUMNS = "id, seed_id, path_id, generation_status, generation_error, created_at, generated_at";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { supabase } = admin.value;
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Expert not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("expert_profiles")
      .select(EXPERT_DETAIL_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return safeServerError("Failed to fetch expert", error);
    }
    if (!data) {
      return NextResponse.json({ error: "Expert not found" }, { status: 404 });
    }

    const { data: pathlab } = await supabase
      .from("expert_pathlabs")
      .select(PATHLAB_COLUMNS)
      .eq("expert_profile_id", id)
      .maybeSingle();

    return NextResponse.json({ expert: data, pathlab });
  } catch (error) {
    return safeServerError("Failed to fetch expert", error);
  }
}
