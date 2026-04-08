import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { findMentorById } from "@/lib/hackathon/mentor-db";
import { sendMentorBookingNotification } from "@/lib/hackathon/line";
import type { MentorBooking } from "@/types/mentor";

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

export async function POST(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getClient();
  const participant = await getSessionParticipant(token, supabase);
  if (!participant) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });

  let body: { mentor_id?: string; slot_datetime?: string; duration_minutes?: number; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { mentor_id, slot_datetime, duration_minutes, notes } = body;

  if (!mentor_id || !slot_datetime) {
    return NextResponse.json({ error: "mentor_id and slot_datetime are required" }, { status: 400 });
  }

  // Validate mentor exists and is approved
  const mentor = await findMentorById(mentor_id);
  if (!mentor) {
    return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
  }

  if (!mentor.is_approved) {
    return NextResponse.json({ error: "Mentor is not available for booking" }, { status: 400 });
  }

  // Insert booking
  const { data: booking, error: bookingError } = await supabase
    .from("mentor_bookings")
    .insert({
      mentor_id,
      student_id: participant.id,
      slot_datetime,
      duration_minutes: duration_minutes ?? 30,
      notes: notes ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (bookingError) {
    console.error("Mentor booking insert error:", bookingError);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  // Fire and forget — booking is already saved
  sendMentorBookingNotification(mentor, booking as MentorBooking, participant.name).catch((err) =>
    console.error("Line notification failed:", err)
  );

  return NextResponse.json({ booking: booking as MentorBooking });
}
