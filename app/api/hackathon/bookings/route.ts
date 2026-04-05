import { NextRequest, NextResponse } from "next/server";
import { findMentorById, createBooking } from "@/lib/hackathon/mentor-db";
import { sendMentorBookingNotification } from "@/lib/hackathon/line";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mentor_id, slot_datetime, duration_minutes, notes, booker_name } = body;

    if (!mentor_id || !slot_datetime || !booker_name) {
      return NextResponse.json(
        { error: "mentor_id, slot_datetime, and booker_name are required" },
        { status: 400 }
      );
    }

    const mentor = await findMentorById(mentor_id);
    if (!mentor) return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    if (!mentor.is_approved) return NextResponse.json({ error: "Mentor not available" }, { status: 403 });

    const slotDate = new Date(slot_datetime);
    if (isNaN(slotDate.getTime())) {
      return NextResponse.json({ error: "Invalid slot_datetime" }, { status: 400 });
    }
    if (slotDate < new Date()) {
      return NextResponse.json({ error: "Cannot book a slot in the past" }, { status: 400 });
    }

    const booking = await createBooking({
      mentor_id,
      student_id: null,
      slot_datetime,
      duration_minutes: duration_minutes ?? 30,
      notes,
    });

    // Fire and forget — booking is already saved
    sendMentorBookingNotification(mentor, booking, booker_name).catch((err) =>
      console.error("Line notification failed:", err)
    );

    return NextResponse.json({ booking });
  } catch (err) {
    console.error("Booking creation error:", err);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
