import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { saveMetConnections } from "@/lib/hackathon/matching-service";

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
    await saveMetConnections({
      eventId: body.eventId,
      participantId: participant.id,
      metParticipantIds: Array.isArray(body.metParticipantIds)
        ? body.metParticipantIds
        : [],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save met list";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
