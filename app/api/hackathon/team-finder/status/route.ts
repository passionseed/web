import { NextRequest, NextResponse } from "next/server";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { getCorsHeaders, extractHackathonToken } from "@/lib/hackathon/auth";
import {
  getTeamFinderEntry,
  listTeamFinderParticipantsExcluding,
} from "@/lib/hackathon/team-finder";

export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const token = extractHackathonToken(req);
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: corsHeaders });

    const participant = await getSessionParticipant(token);
    if (!participant) return NextResponse.json({ error: "Invalid session" }, { status: 401, headers: corsHeaders });

    const [entry, others] = await Promise.all([
      getTeamFinderEntry(participant.id),
      listTeamFinderParticipantsExcluding(participant.id),
    ]);

    return NextResponse.json({
      isOptedIn: entry !== null,
      preferences: entry?.preferences ?? [],
      participants: others,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("team-finder status error:", error);
    return NextResponse.json({ error: "Failed to load status" }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}
