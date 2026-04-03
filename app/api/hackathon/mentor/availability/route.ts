import { NextRequest, NextResponse } from "next/server";
import {
  getMentorBySessionToken,
  getMentorAvailability,
  replaceMentorAvailability,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";

async function getToken(req: NextRequest) {
  return req.cookies.get(MENTOR_SESSION_COOKIE)?.value ?? null;
}

export async function GET(req: NextRequest) {
  const token = await getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slots = await getMentorAvailability(mentor.id);
  return NextResponse.json({ slots });
}

export async function PUT(req: NextRequest) {
  const token = await getToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { slots } = await req.json();
    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: "slots must be an array" }, { status: 400 });
    }
    for (const s of slots) {
      if (typeof s.day_of_week !== "number" || s.day_of_week < 0 || s.day_of_week > 6) {
        return NextResponse.json({ error: "Invalid day_of_week" }, { status: 400 });
      }
      if (typeof s.hour !== "number" || s.hour < 0 || s.hour > 23) {
        return NextResponse.json({ error: "Invalid hour" }, { status: 400 });
      }
    }

    const updated = await replaceMentorAvailability(mentor.id, slots);
    return NextResponse.json({ slots: updated });
  } catch (err) {
    console.error("Availability update error:", err);
    return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
  }
}
