import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { deleteSession } from "@/lib/hackathon/db";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
