import { NextRequest, NextResponse } from "next/server";
import {
  getMentorBySessionToken,
  getMentorBookings,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filterParam = req.nextUrl.searchParams.get("filter");
  const filter =
    filterParam === "upcoming" || filterParam === "past" ? filterParam : "all";

  const bookings = await getMentorBookings(mentor.id, filter);
  return NextResponse.json({ bookings });
}
