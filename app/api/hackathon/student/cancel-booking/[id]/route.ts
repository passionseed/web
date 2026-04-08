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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getClient();
  const participant = await getSessionParticipant(token, supabase);
  if (!participant) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });

  const { id: bookingId } = await params;

  // Look up team membership
  const { data: membership } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participant.id)
    .maybeSingle();

  // Find the booking and verify it belongs to this student or their team
  const { data: booking } = await supabase
    .from("mentor_bookings")
    .select("id, status, student_id, team_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const isOwner =
    booking.student_id === participant.id ||
    (membership?.team_id && booking.team_id === membership.team_id);

  if (!isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Booking already cancelled" }, { status: 400 });
  }

  const { error: cancelError } = await supabase
    .from("mentor_bookings")
    .update({
      status: "cancelled",
      cancellation_reason: "ยกเลิกโดยผู้เข้าร่วม",
    })
    .eq("id", bookingId);

  if (cancelError) {
    console.error("Student cancel booking error:", cancelError);
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
