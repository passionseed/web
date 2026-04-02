import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import {
  getLatestHackathonMatchingEvent,
  getParticipantHackathonMatchingState,
  getParticipantTeam,
  getSessionParticipant,
} from "@/lib/hackathon/db";

export async function GET() {
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

    const [event, team] = await Promise.all([
      getLatestHackathonMatchingEvent(),
      getParticipantTeam(participant.id),
    ]);

    if (!event) {
      return NextResponse.json({
        event: null,
        state: { metParticipantIds: [], rankedParticipantIds: [] },
        team,
        readOnly: true,
      });
    }

    const state = await getParticipantHackathonMatchingState(event.id, participant.id);

    return NextResponse.json({
      event,
      state,
      team,
      readOnly: event.status !== "live",
    });
  } catch (error) {
    console.error("Error loading hackathon matching event:", error);
    return NextResponse.json(
      { error: "Failed to load matching event" },
      { status: 500 }
    );
  }
}
