import { NextRequest, NextResponse } from "next/server";
import {
  getMentorBySessionToken,
  consumeLineConnectCode,
  setMentorLineUserId,
  MENTOR_SESSION_COOKIE,
} from "@/lib/hackathon/mentor-db";
import { sendLineWelcomeMessage } from "@/lib/hackathon/line";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const lineUserId = await consumeLineConnectCode(code);
  if (!lineUserId) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  await setMentorLineUserId(mentor.id, lineUserId);

  // Send welcome confirmation back via Line (fire and forget)
  sendLineWelcomeMessage(lineUserId, mentor.full_name).catch(console.error);

  return NextResponse.json({ ok: true });
}
