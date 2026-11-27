import { NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { shareOpen } from "@/lib/hackathon/elemental/share";
import { leaderboardPayload } from "@/lib/supabase/hackathon-leaderboard";

export const dynamic = "force-dynamic";

/**
 * The public team board as JSON: team names, school names and numbers only.
 * Cached at the edge for a few seconds, so an open board page polling every
 * 20 s costs the database about one read per region per 15 s.
 */
export async function GET() {
  const payload = await leaderboardPayload(ELEMENTAL.slug, shareOpen());
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control":
        payload.state === "live" ? "public, s-maxage=15, stale-while-revalidate=30" : "public, s-maxage=5, stale-while-revalidate=10",
    },
  });
}
