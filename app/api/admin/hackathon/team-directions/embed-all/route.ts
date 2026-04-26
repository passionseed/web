import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { enqueueEmbedJob } from "@/lib/embeddings/jobs";

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

export async function POST() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  try {
    const client = createAdminClient();
    const { data: teams } = await client
      .from("hackathon_teams")
      .select("id");

    if (!teams || teams.length === 0) {
      return NextResponse.json({ enqueued: 0, message: "No teams found" });
    }

    let enqueued = 0;
    for (const team of teams) {
      try {
        await enqueueEmbedJob(team.id as string, "manual", client);
        enqueued++;
      } catch (err) {
        const errorDetails = err instanceof Error ? err.message : JSON.stringify(err);
        console.error(`[embed-all] Failed to enqueue team ${team.id}:`, errorDetails);
      }
    }

    const failed = teams.length - enqueued;
    return NextResponse.json({
      enqueued,
      failed,
      total: teams.length,
      message: `Enqueued ${enqueued}/${teams.length} teams for embedding (${failed} failed)`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
