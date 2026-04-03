import { NextRequest, NextResponse } from "next/server";
import { deleteMentorSession, MENTOR_SESSION_COOKIE } from "@/lib/hackathon/mentor-db";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (token) await deleteMentorSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(MENTOR_SESSION_COOKIE);
  return res;
}
