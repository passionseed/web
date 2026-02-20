import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ participant: null }, { status: 401 });

  const participant = await getSessionParticipant(token);
  if (!participant) return NextResponse.json({ participant: null }, { status: 401 });

  return NextResponse.json({ participant });
}
