import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import {
  getLatestHackathonMatchingEvent,
  getParticipantTeam,
  getSessionParticipant,
  listHackathonMatchingCandidates,
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
      return NextResponse.json({ participants: [], event: null, team });
    }

    const participants = await listHackathonMatchingCandidates(participant.id);
    return NextResponse.json({ participants, event, team });
  } catch (error) {
    console.error("Error loading matching participants:", error);
    return NextResponse.json(
      { error: "Failed to load participants" },
      { status: 500 }
    );
  }
}
