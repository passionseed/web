import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { saveRankings } from "@/lib/hackathon/matching-service";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const participant = await getSessionParticipant(token);
    if (!participant) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    await saveRankings({
      eventId: body.eventId,
      participantId: participant.id,
      rankedParticipantIds: Array.isArray(body.rankedParticipantIds)
        ? body.rankedParticipantIds
        : [],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save rankings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
