import { NextRequest, NextResponse } from "next/server";
import { getMentorBySessionToken, MENTOR_SESSION_COOKIE } from "@/lib/hackathon/mentor-db";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (!["confirmed", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Verify the booking belongs to this mentor
  const { data: booking } = await getClient()
    .from("mentor_bookings")
    .select("id, mentor_id, status")
    .eq("id", id)
    .eq("mentor_id", mentor.id)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Booking already cancelled" }, { status: 400 });
  }

  const { data: updated, error } = await getClient()
    .from("mentor_bookings")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  return NextResponse.json({ booking: updated });
}
