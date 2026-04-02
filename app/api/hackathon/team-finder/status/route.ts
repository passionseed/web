import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import {
  getTeamFinderEntry,
  listTeamFinderParticipantsExcluding,
} from "@/lib/hackathon/team-finder";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const participant = await getSessionParticipant(token);
    if (!participant) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const [entry, others] = await Promise.all([
      getTeamFinderEntry(participant.id),
      listTeamFinderParticipantsExcluding(participant.id),
    ]);

    return NextResponse.json({
      isOptedIn: entry !== null,
      preferences: entry?.preferences ?? [],
      participants: others,
    });
  } catch (error) {
    console.error("team-finder status error:", error);
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}
