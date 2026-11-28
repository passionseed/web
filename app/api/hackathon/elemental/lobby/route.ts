import { NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { lobbyPayload } from "@/lib/supabase/hackathon-leaderboard";

export const dynamic = "force-dynamic";

/**
 * The waiting room as JSON: board names and styles and a head count only
 * (lib/hackathon/elemental/lobby.ts). An open lobby polls every 12 s, so the
 * CDN keeps an answer for 10 s. Kept out of search results like the page.
 */
export async function GET() {
  const payload = await lobbyPayload(ELEMENTAL.slug);
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": payload.state === "over" ? "public, s-maxage=600, stale-while-revalidate=3600" : "public, s-maxage=10, stale-while-revalidate=20",
      "X-Robots-Tag": "noindex",
    },
  });
}
