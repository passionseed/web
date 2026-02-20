import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { deleteSession } from "@/lib/hackathon/db";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) {
      await deleteSession(token);
    }
    const res = NextResponse.json({ success: true });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  } catch {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
