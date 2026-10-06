import { NextResponse } from "next/server";

import { requireUser, safeServerError } from "@/lib/security/route-guards";
import { findShiftApplicationByToken, isJoinable, syncShiftDiscord } from "@/lib/shift/join";
import { isShiftJoinToken } from "@/lib/shift/joinLink";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * For students who joined the server through the invite instead of being
 * added by the bot: grants their SHIFT roles now that they are a member.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const { token } = await params;
    if (!isShiftJoinToken(token)) {
      return NextResponse.json({ error: "invalid" }, { status: 404 });
    }

    const app = await findShiftApplicationByToken(token);
    if (!isJoinable(app) || app.user_id !== auth.value.userId) {
      return NextResponse.json({ error: "invalid" }, { status: 404 });
    }

    const result = await syncShiftDiscord(app);
    return NextResponse.json({ state: result.state }, { status: result.ok ? 200 : 409 });
  } catch (error) {
    return safeServerError("Failed to sync SHIFT Discord roles", error);
  }
}
