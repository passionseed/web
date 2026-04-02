import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { upsertTeamFinderEntry } from "@/lib/hackathon/team-finder";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const participant = await getSessionParticipant(token);
    if (!participant) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    await upsertTeamFinderEntry(participant.id, []);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("team-finder join error:", error);
    return NextResponse.json({ error: "Failed to join" }, { status: 500 });
  }
}
