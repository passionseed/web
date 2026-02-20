import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant, getParticipantTeam } from "@/lib/hackathon/db";
import { cookies } from "next/headers";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE)?.value;
        if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

        const participant = await getSessionParticipant(token);
        if (!participant) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

        const team = await getParticipantTeam(participant.id);
        return NextResponse.json({ team, participant });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch team";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
