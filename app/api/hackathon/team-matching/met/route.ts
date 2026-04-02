import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import {
  getHackathonMatchingEvent,
  getParticipantHackathonMatchingState,
  getSessionParticipant,
  replaceParticipantHackathonMetConnections,
} from "@/lib/hackathon/db";

export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    const eventId = typeof body.eventId === "string" ? body.eventId : "";
    const metParticipantIds = Array.isArray(body.metParticipantIds)
      ? body.metParticipantIds.filter((id): id is string => typeof id === "string")
      : [];

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    const event = await getHackathonMatchingEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: "Matching event not found" }, { status: 404 });
    }

    if (event.status !== "live") {
      return NextResponse.json(
        { error: "Matching event is read-only" },
        { status: 400 }
      );
    }

    await replaceParticipantHackathonMetConnections(
      event.id,
      participant.id,
      metParticipantIds
    );
    const state = await getParticipantHackathonMatchingState(event.id, participant.id);

    return NextResponse.json({ success: true, state });
  } catch (error) {
    console.error("Error saving met connections:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save met connections";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
