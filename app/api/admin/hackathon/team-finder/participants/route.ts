import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { listTeamFinderParticipants } from "@/lib/hackathon/team-finder";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");
  if (!roles?.length) throw new Error("Not authorized");
}

export async function GET() {
  try {
    await requireAdmin();
    const participants = await listTeamFinderParticipants();
    return NextResponse.json({ participants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load";
    const status = message === "Not authenticated" ? 401 : message === "Not authorized" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
