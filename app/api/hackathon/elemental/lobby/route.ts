import { NextResponse, type NextRequest } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { parseDelayMinutes } from "@/lib/hackathon/elemental/lobby";
import { lobbyPayload } from "@/lib/supabase/hackathon-leaderboard";

export const dynamic = "force-dynamic";

/**
 * The waiting room as JSON: board names and styles and a head count only
 * (lib/hackathon/elemental/lobby.ts). An open lobby polls every 12 s, so the
 * CDN keeps an answer for 10 s. Kept out of search results like the page.
 * ?delay=<minutes>: the projector's held-back view (names set at least that long ago).
 */
export async function GET(request: NextRequest) {
  const delayMinutes = parseDelayMinutes(request.nextUrl.searchParams.get("delay"));
  const payload = await lobbyPayload(ELEMENTAL.slug, new Date(), { delayMinutes });
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": payload.state === "over" ? "public, s-maxage=600, stale-while-revalidate=3600" : "public, s-maxage=10, stale-while-revalidate=20",
      "X-Robots-Tag": "noindex",
    },
  });
}
