import { NextResponse } from "next/server";
import { createTeamDirectionSnapshot } from "@/lib/embeddings/team-direction";

async function requireAdminUser() {
  const { createClient } = await import("@/utils/supabase/server");
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

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  try {
    const { teamId } = await request.json();
    if (!teamId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }

    console.log("[embed-team] Processing team:", teamId);
    const snapshot = await createTeamDirectionSnapshot(teamId);
    
    return NextResponse.json({
      success: true,
      snapshotId: snapshot.id,
      teamId: snapshot.team_id,
      profile: snapshot.profile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[embed-team] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
