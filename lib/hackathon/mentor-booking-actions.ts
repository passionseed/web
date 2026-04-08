import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  assignDiscordRooms,
  getOverlappingConfirmedBookings,
} from "@/lib/hackathon/mentor-db";
import {
  sendMentorSessionConfirmedNotification,
  sendMentorCancellationEmail,
} from "@/lib/hackathon/line";
import type { MentorBooking, MentorProfile } from "@/types/mentor";

function getClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getMentorBookingById(
  mentorId: string,
  bookingId: string
): Promise<MentorBooking | null> {
  const { data, error } = await getClient()
    .from("mentor_bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("mentor_id", mentorId)
    .single();

  if (error || !data) return null;
  return data as MentorBooking;
}

export async function getNextPendingBookingForMentor(
  mentorId: string
): Promise<MentorBooking | null> {
  const client = getClient();

  const { data: upcoming } = await client
    .from("mentor_bookings")
    .select("*")
    .eq("mentor_id", mentorId)
    .eq("status", "pending")
    .gte("slot_datetime", new Date().toISOString())
    .order("slot_datetime", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (upcoming) return upcoming as MentorBooking;

  const { data: anyPending } = await client
    .from("mentor_bookings")
    .select("*")
    .eq("mentor_id", mentorId)
    .eq("status", "pending")
    .order("slot_datetime", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (anyPending as MentorBooking | null) ?? null;
}

export async function updateMentorBookingStatus(
  mentor: MentorProfile,
  bookingId: string,
  status: "confirmed" | "cancelled",
  reason?: string
): Promise<{ booking?: MentorBooking; error?: string; code?: number }> {
  const client = getClient();
  const booking = await getMentorBookingById(mentor.id, bookingId);

  if (!booking) {
    return { error: "Booking not found", code: 404 };
  }

  if (booking.status === "cancelled") {
    return { error: "Booking already cancelled", code: 400 };
  }

  if (status === "cancelled" && booking.status === "confirmed") {
    if (!reason || reason.trim().length === 0) {
      return { error: "Reason is required when cancelling a confirmed booking", code: 400 };
    }
  }

  if (status === "confirmed") {
    const { error: updateError } = await client
      .from("mentor_bookings")
      .update({ status: "confirmed", discord_room: null })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Booking confirm error:", updateError);
      return { error: "Failed to update booking", code: 500 };
    }

    const { data: freshBooking } = await client
      .from("mentor_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (!freshBooking) {
      return { error: "Failed to fetch updated booking", code: 500 };
    }

    const overlapping = await getOverlappingConfirmedBookings(
      freshBooking.slot_datetime,
      freshBooking.duration_minutes,
      bookingId
    );

    const conflictGroup: MentorBooking[] = [
      freshBooking as MentorBooking,
      ...overlapping,
    ];
    const updated = await assignDiscordRooms(conflictGroup);
    const thisBooking =
      updated.find((candidate) => candidate.id === bookingId) ??
      (freshBooking as MentorBooking);

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

    return { booking: thisBooking };
  }

  const overlappingBeforeCancel = await getOverlappingConfirmedBookings(
    booking.slot_datetime,
    booking.duration_minutes,
    bookingId
  );

  const { data: cancelled, error: cancelError } = await client
    .from("mentor_bookings")
    .update({ status: "cancelled", discord_room: null, cancellation_reason: reason ?? null })
    .eq("id", bookingId)
    .select("*")
    .single();

  if (cancelError) {
    console.error("Booking cancel error:", cancelError);
    return { error: "Failed to cancel booking", code: 500 };
  }

  if (overlappingBeforeCancel.length > 0) {
    await assignDiscordRooms(overlappingBeforeCancel);
  }

  if (booking.student_id && reason) {
    const { data: student } = await client
      .from("hackathon_participants")
      .select("name, email")
      .eq("id", booking.student_id)
      .single();

    if (student?.email) {
      sendMentorCancellationEmail(
        student.email,
        student.name,
        mentor,
        cancelled as MentorBooking,
        reason
      ).catch(console.error);
    }
  }

  return { booking: cancelled as MentorBooking };
}
