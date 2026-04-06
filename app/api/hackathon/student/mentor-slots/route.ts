import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.HACKATHON_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Returns available (free) slots for a mentor for the next 14 days.
// Combines the mentor's weekly availability schedule with existing bookings
// to produce a list of concrete datetime slots that are still open.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mentorId = searchParams.get("mentor_id");
  const durationMinutes = parseInt(searchParams.get("duration") ?? "30", 10);

  if (!mentorId) {
    return NextResponse.json({ error: "mentor_id is required" }, { status: 400 });
  }

  const client = getClient();

  // 1. Fetch mentor's weekly availability (day_of_week 0=Sun, hour 0-23)
  const { data: availability, error: availError } = await client
    .from("mentor_availability")
    .select("day_of_week, hour")
    .eq("mentor_id", mentorId);

  if (availError) {
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }

  // If no availability set, return empty — mentor hasn't configured their schedule
  if (!availability || availability.length === 0) {
    return NextResponse.json({ slots: [] });
  }

  // Build a set for quick lookup: "dayOfWeek:hour"
  const availSet = new Set(availability.map((a: { day_of_week: number; hour: number }) => `${a.day_of_week}:${a.hour}`));

  // 2. Fetch existing bookings for the next 14 days (pending + confirmed)
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + 14);

  const { data: bookings, error: bookingError } = await client
    .from("mentor_bookings")
    .select("slot_datetime, duration_minutes, status")
    .eq("mentor_id", mentorId)
    .in("status", ["pending", "confirmed"])
    .gte("slot_datetime", now.toISOString())
    .lte("slot_datetime", end.toISOString());

  if (bookingError) {
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }

  // Build a set of booked slot starts (ISO strings rounded to the hour)
  const bookedSet = new Set(
    (bookings ?? []).map((b: { slot_datetime: string }) => {
      const d = new Date(b.slot_datetime);
      d.setMinutes(0, 0, 0);
      return d.toISOString();
    })
  );

  // 3. Generate concrete slots for the next 14 days
  const slots: string[] = [];

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = new Date(now);
    date.setDate(now.getDate() + dayOffset);
    const dayOfWeek = date.getDay(); // 0=Sun

    for (let hour = 0; hour <= 20; hour++) {
      if (!availSet.has(`${dayOfWeek}:${hour}`)) continue;

      const slot = new Date(date);
      slot.setHours(hour, 0, 0, 0);

      // Must be in the future (with a 30min buffer)
      if (slot.getTime() <= now.getTime() + 30 * 60 * 1000) continue;

      // Must not already be booked
      const slotKey = new Date(slot);
      slotKey.setMinutes(0, 0, 0);
      if (bookedSet.has(slotKey.toISOString())) continue;

      slots.push(slot.toISOString());
    }
  }

  return NextResponse.json({ slots });
}
