import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  createMatchingEvent,
  getLatestMatchingEvent,
} from "@/lib/hackathon/matching-service";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function ensureAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  if (!roles?.length) {
    throw new Error("Not authorized");
  }
}

async function buildSummary(eventId: string | null) {
  const service = getServiceClient();

  const [{ data: participants }, { data: members }] = await Promise.all([
    service.from("hackathon_participants").select("id"),
    service.from("hackathon_team_members").select("participant_id"),
  ]);

  const assignedIds = new Set((members ?? []).map((row) => row.participant_id));
  const unteamedParticipantIds = (participants ?? [])
    .map((row) => row.id)
    .filter((id) => !assignedIds.has(id));

  if (!eventId) {
    return {
      unteamedCount: unteamedParticipantIds.length,
      metSubmissionCount: 0,
      rankingSubmissionCount: 0,
    };
  }

  const [{ data: metRows }, { data: rankingRows }] = await Promise.all([
    service
      .from("hackathon_matching_met_connections")
      .select("participant_id")
      .eq("event_id", eventId),
    service
      .from("hackathon_matching_rankings")
      .select("participant_id")
      .eq("event_id", eventId),
  ]);

  return {
    unteamedCount: unteamedParticipantIds.length,
    metSubmissionCount: new Set((metRows ?? []).map((row) => row.participant_id)).size,
    rankingSubmissionCount: new Set(
      (rankingRows ?? []).map((row) => row.participant_id)
    ).size,
  };
}

export async function GET() {
  try {
    await ensureAdmin();
    const event = await getLatestMatchingEvent();
    const summary = await buildSummary(event?.id ?? null);
    return NextResponse.json({ event, summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load event";
    const status =
      message === "Not authenticated" ? 401 : message === "Not authorized" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureAdmin();
    const body = await request.json();
    const event = await createMatchingEvent({
      name: body.name || "Hackathon Team Matching",
      minTeamSize: body.minTeamSize,
      maxTeamSize: body.maxTeamSize,
      rankingDeadline: body.rankingDeadline ?? null,
    });

    const summary = await buildSummary(event.id);
    return NextResponse.json({ event, summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create event";
    const status =
      message === "Not authenticated"
        ? 401
        : message === "Not authorized"
          ? 403
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
