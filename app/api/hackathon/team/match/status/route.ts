import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

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

    const supabase = await createClient();

    // Check waitlist status
    const { data: waitlist, error: waitlistError } = await supabase
      .from("hackathon_team_matching_waitlist")
      .select("id, status, matched_team_id, created_at")
      .eq("participant_id", participant.id)
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (waitlistError || !waitlist) {
      return NextResponse.json(
        { status: "not_in_waitlist", waitlist: null },
        { status: 200 }
      );
    }

    // If matched, get team details
    if (waitlist.status === "matched" && waitlist.matched_team_id) {
      const { data: team } = await supabase
        .from("hackathon_teams")
        .select("id, name, lobby_code")
        .eq("id", waitlist.matched_team_id)
        .single();

      return NextResponse.json(
        { status: "matched", waitlist, team },
        { status: 200 }
      );
    }

    // Count position in waitlist
    const { count } = await supabase
      .from("hackathon_team_matching_waitlist")
      .select("*", { count: "exact", head: true })
      .eq("status", "waiting")
      .lt("created_at", waitlist.created_at);

    return NextResponse.json(
      {
        status: "waiting",
        waitlist,
        position: (count || 0) + 1,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to check status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
