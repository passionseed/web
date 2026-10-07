/**
 * POST /api/seedstack/link/poll  { device_code }
 *
 * The CLI polls until the student approves. On approval the token is minted
 * once and returned here, so it never appears in the browser or the AI chat.
 */

import { NextRequest, NextResponse } from "next/server";

import { pollLinkRequest } from "@/lib/seedstack/server";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { device_code?: unknown } | null;
  const deviceCode = typeof body?.device_code === "string" ? body.device_code : "";
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(deviceCode)) {
    return NextResponse.json({ ok: false, error: "invalid_device_code" }, { status: 400 });
  }

  try {
    const result = await pollLinkRequest(deviceCode);
    if (result.status === "expired") {
      return NextResponse.json({ ok: false, status: "expired" }, { status: 410 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[seedstack link poll] failed:", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
