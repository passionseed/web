import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { checkRateLimit } from "@/lib/expert-interview/rate-limiter";
import { clientIp, DEVICE_ID_RE, isBotUserAgent, TRACKED_SOURCE_RE } from "@/lib/hackathon/elemental/link-views";
import { DEVICE_COOKIE } from "@/lib/hackathon/elemental/link-views-shared";
import { recordLinkView } from "@/lib/supabase/hackathon-link-views";
import { findLinkKind } from "@/lib/supabase/hackathon-share-links";

const bodySchema = z.object({ src: z.string().regex(TRACKED_SOURCE_RE) });

/** View beacons per network address per hour. A school on one wifi opening many links stays well under it. */
const VIEWS_PER_IP_PER_HOUR = 300;

/**
 * A device opened a share link (sent by the landing and sign-up pages' script,
 * so link previews and crawlers that don't run scripts never count). Only
 * links that exist count. Always 204: the page doesn't care, and a failure
 * must never show to the visitor. Sets the first-party device cookie.
 */
export async function POST(request: NextRequest) {
  const existing = request.cookies.get(DEVICE_COOKIE)?.value;
  const deviceId = existing && DEVICE_ID_RE.test(existing) ? existing : randomBytes(16).toString("hex");
  const res = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (deviceId !== existing) {
    res.cookies.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
    });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  const ua = request.headers.get("user-agent") ?? "";
  if (!parsed.success || isBotUserAgent(ua)) return res;
  const src = parsed.data.src;
  const ip = clientIp(request.headers);
  try {
    const limit = await checkRateLimit(`elemental-view:${ip}`, VIEWS_PER_IP_PER_HOUR);
    if (!limit.allowed) return res;
    const code = src.replace(/^(share|t)-/, "");
    const kind = await findLinkKind(ELEMENTAL.slug, code);
    if (!kind || (kind === "teacher") !== src.startsWith("t-")) return res;
    await recordLinkView(ELEMENTAL.slug, src, deviceId, ip, ua);
  } catch (error) {
    console.error("Failed to record the link view", error);
  }
  return res;
}
