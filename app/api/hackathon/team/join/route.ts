import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant, joinTeam } from "@/lib/hackathon/db";
import { cookies } from "next/headers";

const TEAM_OPERATIONS_LOCKED = false;

export async function POST(req: NextRequest) {
  if (TEAM_OPERATIONS_LOCKED) {
    return NextResponse.json({ error: "การเข้าร่วมทีมถูกปิดชั่วคราว" }, { status: 403 });
  }
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE)?.value;
        if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

        const participant = await getSessionParticipant(token);
        if (!participant) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

        const { lobbyCode } = await req.json();
        if (!lobbyCode) return NextResponse.json({ error: "Lobby code required" }, { status: 400 });

        const team = await joinTeam(lobbyCode, participant.id);
        return NextResponse.json({ team });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to join team";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
