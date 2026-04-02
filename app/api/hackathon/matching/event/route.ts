import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { getParticipantMatchingState } from "@/lib/hackathon/matching-service";

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

    const state = await getParticipantMatchingState(participant.id);
    return NextResponse.json({ state });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load matching state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
