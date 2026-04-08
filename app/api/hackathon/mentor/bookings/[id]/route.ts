import { NextRequest, NextResponse } from "next/server";
import {
  getMentorBySessionToken,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";
import { updateMentorBookingStatus } from "@/lib/hackathon/mentor-booking-actions";

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

    const result = await updateMentorBookingStatus(mentor, id, status);
    if (!result.booking) {
      return NextResponse.json(
        { error: result.error ?? "Failed to update booking" },
        { status: result.code ?? 500 }
      );
    }

    return NextResponse.json({ booking: result.booking });
  } catch (err) {
    console.error("Booking PATCH unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
