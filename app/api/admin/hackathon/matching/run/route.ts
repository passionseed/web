import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  getLatestMatchingEvent,
  runMatchingEvent,
} from "@/lib/hackathon/matching-service";

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

export async function POST(request: NextRequest) {
  try {
    await ensureAdmin();

    const body = await request.json().catch(() => ({}));
    const eventId =
      body.eventId ?? (await getLatestMatchingEvent())?.id;

    if (!eventId) {
      return NextResponse.json(
        { error: "No matching event available" },
        { status: 400 }
      );
    }

    const result = await runMatchingEvent(eventId);
    return NextResponse.json({ result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to run matching event";
    const status =
      message === "Not authenticated"
        ? 401
        : message === "Not authorized"
          ? 403
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
