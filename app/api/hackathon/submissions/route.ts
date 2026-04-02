import { NextRequest, NextResponse } from "next/server";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { createClient } from "@supabase/supabase-js";

function getHackathonAuthClient() {
  const url = process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function GET(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getHackathonAuthClient();
  const participant = await getSessionParticipant(token, supabase);
  if (!participant) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activityIds = searchParams.get("activityIds")?.split(",").filter(Boolean) ?? [];

  if (activityIds.length === 0) {
    return NextResponse.json({ submissions: [] });
  }

  const { data, error } = await supabase
    .from("hackathon_phase_activity_submissions")
    .select("activity_id, status")
    .eq("participant_id", participant.id)
    .in("activity_id", activityIds);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }

  return NextResponse.json({ submissions: data ?? [] });
}
