import { NextRequest, NextResponse } from "next/server";
import {
  getMentorBySessionToken,
  MENTOR_SESSION_COOKIE,
  getOverlappingConfirmedBookings,
  assignDiscordRooms,
} from "@/lib/hackathon/mentor-db";
import { sendMentorSessionConfirmedNotification } from "@/lib/hackathon/line";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { MentorBooking } from "@/types/mentor";

function getClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const mentor = await getMentorBySessionToken(token);
    if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { status } = await req.json();

    if (!["confirmed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Verify booking belongs to this mentor
    const { data: booking, error: fetchError } = await getClient()
      .from("mentor_bookings")
      .select("*")
      .eq("id", id)
      .eq("mentor_id", mentor.id)
      .single();

    if (fetchError) {
      console.error("Booking fetch error:", fetchError);
      return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
    }

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "Booking already cancelled" }, { status: 400 });
    }

    if (status === "confirmed") {
      // Mark as confirmed, clear any stale room first
      const { error: updateError } = await getClient()
        .from("mentor_bookings")
        .update({ status: "confirmed", discord_room: null })
        .eq("id", id);
      if (updateError) {
        console.error("Booking confirm error:", updateError);
        return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
      }

      // Fetch the freshly-confirmed booking
      const { data: freshBooking } = await getClient()
        .from("mentor_bookings")
        .select("*")
        .eq("id", id)
        .single();
      if (!freshBooking) return NextResponse.json({ error: "Failed to fetch updated booking" }, { status: 500 });

      // Find all other confirmed bookings that overlap with this session
      const overlapping = await getOverlappingConfirmedBookings(
        freshBooking.slot_datetime,
        freshBooking.duration_minutes,
        id
      );

      // Assign rooms across the full conflict group (including this booking)
      const conflictGroup: MentorBooking[] = [freshBooking as MentorBooking, ...overlapping];
      const updated = await assignDiscordRooms(conflictGroup);

      const thisBooking = updated.find((b) => b.id === id) ?? (freshBooking as MentorBooking);

      // Send Line notification with room number
      if (thisBooking.discord_room !== null) {
        try {
          await sendMentorSessionConfirmedNotification(mentor, {
            ...thisBooking,
            discord_room: thisBooking.discord_room,
          });
        } catch (lineErr) {
          console.error("Line notify failed:", lineErr);
        }
      }

      return NextResponse.json({ booking: thisBooking });
    }

    // status === "cancelled"
    // Find overlapping confirmed bookings BEFORE cancelling (they'll need recompute)
    const overlappingBeforeCancel = await getOverlappingConfirmedBookings(
      booking.slot_datetime,
      booking.duration_minutes,
      id
    );

    // Cancel and clear room
    const { data: cancelled, error: cancelError } = await getClient()
      .from("mentor_bookings")
      .update({ status: "cancelled", discord_room: null })
      .eq("id", id)
      .select("*")
      .single();
    if (cancelError) {
      console.error("Booking cancel error:", cancelError);
      return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
    }

    // Recompute rooms for remaining confirmed bookings that overlapped
    if (overlappingBeforeCancel.length > 0) {
      await assignDiscordRooms(overlappingBeforeCancel);
    }

    return NextResponse.json({ booking: cancelled });
  } catch (err) {
    console.error("Booking PATCH unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
