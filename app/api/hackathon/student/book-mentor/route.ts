import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { sendMentorBookingNotification } from "@/lib/hackathon/line";
import type { MentorBooking, MentorProfile } from "@/types/mentor";

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

  let body: { mentor_id?: string; slot_datetime?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { mentor_id, slot_datetime, notes } = body;

  if (!slot_datetime) {
    return NextResponse.json({ error: "slot_datetime is required" }, { status: 400 });
  }

  // Look up team membership
  const { data: membership } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participant.id)
    .maybeSingle();

  const teamId = membership?.team_id ?? null;

  // Enforce one active booking per team
  if (teamId) {
    const { data: existingBookings } = await supabase
      .from("mentor_bookings")
      .select("id, status")
      .eq("team_id", teamId)
      .neq("status", "cancelled");

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json(
        { error: "ทีมของคุณใช้สิทธิ์จอง Mentor ครบแล้ว (1 ครั้งต่อทีม)" },
        { status: 409 }
      );
    }
  }

  // If team has mentor assignments, enforce that the chosen mentor is one of them
  if (teamId && mentor_id) {
    const { data: assignments } = await supabase
      .from("mentor_team_assignments")
      .select("mentor_id")
      .eq("team_id", teamId);

    if (assignments && assignments.length > 0) {
      const assignedIds = assignments.map((a: { mentor_id: string }) => a.mentor_id);
      if (!assignedIds.includes(mentor_id)) {
        return NextResponse.json(
          { error: "Mentor นี้ไม่ได้รับมอบหมายให้ทีมของคุณ" },
          { status: 403 }
        );
      }
    }
  }

  // Validate mentor if provided
  let mentor: MentorProfile | null = null;
  if (mentor_id) {
    const { data } = await supabase
      .from("mentor_profiles")
      .select("id, full_name, email, profession, institution, bio, photo_url, line_user_id, instagram_url, linkedin_url, website_url, max_hours_per_week, session_type, is_approved, created_at, updated_at")
      .eq("id", mentor_id)
      .single<MentorProfile>();
    if (!data) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }
    if (!data.is_approved) {
      return NextResponse.json({ error: "Mentor is not available for booking" }, { status: 400 });
    }
    mentor = data;
  }

  // Insert booking — duration always 30 min
  const { data: booking, error: bookingError } = await supabase
    .from("mentor_bookings")
    .insert({
      mentor_id: mentor_id ?? null,
      student_id: participant.id,
      team_id: teamId,
      slot_datetime,
      duration_minutes: 30,
      notes: notes ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (bookingError) {
    console.error("Mentor booking insert error:", bookingError);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  // Notify mentor if one was specified
  if (mentor) {
    sendMentorBookingNotification(mentor, booking as MentorBooking, participant.name).catch((err) =>
      console.error("Line notification failed:", err)
    );
  }

  return NextResponse.json({ booking: booking as MentorBooking });
}
