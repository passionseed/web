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

/** Admin-only results: never let a CDN or the browser cache keep them. */
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return json({ error: "Not authorized" }, 403);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const aspect = searchParams.get("aspect") as any;
  const teamId = searchParams.get("teamId");
  const limit = parseInt(searchParams.get("limit") ?? "10");

  if (!query && !teamId) {
    return json({ error: "q or teamId required" }, 400);
  }

  try {
    let results;
    if (teamId) {
      results = await findSimilarTeams(teamId, { aspect, limit });
    } else {
      results = await searchTeamDirections(query!, { aspect, limit });
    }

    return json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return json({ error: "Search failed" }, 500);
  }
}
