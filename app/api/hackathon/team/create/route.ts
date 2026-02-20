import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant, createTeam } from "@/lib/hackathon/db";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE)?.value;
        if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

        const participant = await getSessionParticipant(token);
        if (!participant) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

        const { name } = await req.json();
        if (!name || !name.trim()) {
            return NextResponse.json({ error: "Team name is required" }, { status: 400 });
        }

        const team = await createTeam(participant.id, name.trim());
        return NextResponse.json({ team });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create team";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
