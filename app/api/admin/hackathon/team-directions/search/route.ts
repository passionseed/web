import { NextRequest, NextResponse } from "next/server";
import { searchTeamDirections, findSimilarTeams } from "@/lib/embeddings/search";

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

export async function GET(request: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const aspect = searchParams.get("aspect") as any;
  const teamId = searchParams.get("teamId");
  const limit = parseInt(searchParams.get("limit") ?? "10");

  if (!query && !teamId) {
    return NextResponse.json({ error: "q or teamId required" }, { status: 400 });
  }

  try {
    let results;
    if (teamId) {
      results = await findSimilarTeams(teamId, { aspect, limit });
    } else {
      results = await searchTeamDirections(query!, { aspect, limit });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
