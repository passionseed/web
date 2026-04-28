import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionParticipant } from "@/lib/hackathon/db";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getHackathonClient() {
  return createClient(
    process.env.HACKATHON_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY!
  );
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function GET(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getClient();
  const participant = await getSessionParticipant(token, supabase);
  if (!participant) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });

  // Look up team membership
  const { data: membership } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participant.id)
    .maybeSingle();

  if (!membership?.team_id) {
    return NextResponse.json({ chances_left: 1, booking: null, assigned_mentor_ids: null });
  }

  const teamId = membership.team_id;

  // Fetch mentor IDs assigned to this team (from hackathon DB) and booking config in parallel
  const hackathonDb = getHackathonClient();
  const [assignmentsResult, configResult] = await Promise.all([
    hackathonDb.from("mentor_team_assignments").select("mentor_id").eq("team_id", teamId),
    supabase.from("hackathon_booking_config").select("max_bookings_per_team").eq("id", 1).maybeSingle(),
  ]);

  const assignedMentorIds: string[] | null =
    assignmentsResult.data && assignmentsResult.data.length > 0
      ? assignmentsResult.data.map((a: { mentor_id: string }) => a.mentor_id)
      : null;

  const maxBookings: number = configResult.data?.max_bookings_per_team ?? 1;

  // Find bookings for this team with mentor profile joined
  const { data: bookings } = await supabase
    .from("mentor_bookings")
    .select(`
      id,
      status,
      cancellation_reason,
      slot_datetime,
      duration_minutes,
      notes,
      discord_room,
      mentor_id,
      mentor_profiles (
        id,
        full_name,
        profession,
        institution,
        photo_url
      )
    `)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ chances_left: maxBookings, booking: null, assigned_mentor_ids: assignedMentorIds });
  }

  // Count bookings that were not cancelled-by-student-after-accept
  const usedBookings = bookings.filter(
    (b) => b.status !== "cancelled" || b.cancellation_reason !== "ยกเลิกโดยผู้เข้าร่วม"
  );
  const usedCount = usedBookings.length;
  const chancesLeft = Math.max(0, maxBookings - usedCount);

  // Active = pending or confirmed
  const activeBooking = bookings.find((b) => b.status !== "cancelled") ?? null;

  if (activeBooking) {
    // If meeting time has already passed for a confirmed booking, hide the card
    const meetingEnd = new Date(activeBooking.slot_datetime).getTime() + (activeBooking.duration_minutes ?? 30) * 60 * 1000;
    if (activeBooking.status === "confirmed" && Date.now() > meetingEnd) {
      return NextResponse.json({ chances_left: chancesLeft, booking: null, assigned_mentor_ids: assignedMentorIds });
    }
    return NextResponse.json({ chances_left: chancesLeft, booking: activeBooking, assigned_mentor_ids: assignedMentorIds });
  }

  // No active booking — show latest cancelled for context
  const latestCancelled = bookings[0];
  return NextResponse.json({
    chances_left: chancesLeft,
    booking: latestCancelled,
    assigned_mentor_ids: assignedMentorIds,
  });
}
