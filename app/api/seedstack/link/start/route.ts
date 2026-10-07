/**
 * POST /api/seedstack/link/start
 *
 * The SeedStack CLI asks to be linked. Returns a secret device code (kept by
 * the CLI) and a short user code the student approves on /shift/seedstack
 * after signing in with Discord.
 */

import { NextResponse } from "next/server";

import { LINK_POLL_INTERVAL_S, LINK_TTL_MS } from "@/lib/seedstack/link";
import { createLinkRequest } from "@/lib/seedstack/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.passionseed.org";

export async function POST() {
  try {
    const { deviceCode, userCode } = await createLinkRequest();
    const url = new URL("/shift/seedstack", SITE_URL);
    url.searchParams.set("code", userCode);
    return NextResponse.json({
      ok: true,
      device_code: deviceCode,
      user_code: userCode,
      url: url.toString(),
      interval: LINK_POLL_INTERVAL_S,
      expires_in: LINK_TTL_MS / 1000,
    });
  } catch (error) {
    console.error("[seedstack link start] failed:", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
