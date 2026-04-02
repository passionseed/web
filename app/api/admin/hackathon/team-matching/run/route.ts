import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  getHackathonMatchingEvent,
  getLatestHackathonMatchingEvent,
  runHackathonAutomaticTeamMatching,
} from "@/lib/hackathon/db";

async function requireAdmin() {
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

  if (!roles || roles.length === 0) {
    throw new Error("Not authorized");
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const requestedEventId =
      typeof body.eventId === "string" ? body.eventId : undefined;

    const event = requestedEventId
      ? await getHackathonMatchingEvent(requestedEventId)
      : await getLatestHackathonMatchingEvent();

    if (!event) {
      return NextResponse.json({ error: "Matching event not found" }, { status: 404 });
    }

    const result = await runHackathonAutomaticTeamMatching(event.id);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run matching";
    const status =
      message === "Not authenticated"
        ? 401
        : message === "Not authorized"
          ? 403
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
