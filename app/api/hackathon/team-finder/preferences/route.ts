import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import {
  getTeamFinderEntry,
  upsertTeamFinderEntry,
} from "@/lib/hackathon/team-finder";

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const participant = await getSessionParticipant(token);
    if (!participant) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const entry = await getTeamFinderEntry(participant.id);
    if (!entry) return NextResponse.json({ error: "Not opted in" }, { status: 400 });

    const body = await req.json();
    const preferences: string[] = Array.isArray(body.preferences)
      ? (body.preferences as unknown[])
          .filter((id): id is string => typeof id === "string")
          .slice(0, 5)
      : [];

    await upsertTeamFinderEntry(participant.id, preferences);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("team-finder preferences error:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
