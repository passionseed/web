import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionParticipant } from "@/lib/hackathon/db";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    return NextResponse.json({ chances_left: 1, booking: null });
  }

  const teamId = membership.team_id;

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
    .limit(10);

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ chances_left: 1, booking: null });
  }

  // Active = pending or confirmed
  const activeBooking = bookings.find((b) => b.status !== "cancelled");
  if (activeBooking) {
    return NextResponse.json({ chances_left: 0, booking: activeBooking });
  }

  // All cancelled — quota restored only if cancelled by mentor (not by student)
  const latestCancelled = bookings[0];
  const cancelledByStudent = latestCancelled.cancellation_reason === "ยกเลิกโดยผู้เข้าร่วม";
  return NextResponse.json({
    chances_left: cancelledByStudent ? 0 : 1,
    booking: latestCancelled,
  });
}
