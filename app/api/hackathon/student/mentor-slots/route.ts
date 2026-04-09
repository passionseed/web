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

  // 1. Fetch mentor's weekly availability (day_of_week 0=Mon, hour 0-23)
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
  // All hours are in Bangkok time (UTC+7). We work in Bangkok time throughout.
  const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
  const slots: string[] = [];

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    // Get the current Bangkok date
    const bangkokNow = new Date(now.getTime() + BANGKOK_OFFSET_MS);
    const bangkokDate = new Date(bangkokNow);
    bangkokDate.setUTCDate(bangkokNow.getUTCDate() + dayOffset);

    const dayOfWeek = (bangkokDate.getUTCDay() + 6) % 7; // 0=Mon in Bangkok

    for (let hour = 0; hour <= 23; hour++) {
      if (!availSet.has(`${dayOfWeek}:${hour}`)) continue;

      // Build slot as Bangkok time then convert to UTC
      const slotBangkok = new Date(bangkokDate);
      slotBangkok.setUTCHours(hour, 0, 0, 0);
      const slotUTC = new Date(slotBangkok.getTime() - BANGKOK_OFFSET_MS);

      // Must be in the future (with a 30min buffer)
      if (slotUTC.getTime() <= now.getTime() + 30 * 60 * 1000) continue;

      // Must not already be booked
      const slotKey = new Date(slotUTC);
      slotKey.setMinutes(0, 0, 0);
      if (bookedSet.has(slotKey.toISOString())) continue;

      slots.push(slotUTC.toISOString());
    }
  }

  return NextResponse.json({ slots });
}
