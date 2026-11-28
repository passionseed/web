import { NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { boardPhase } from "@/lib/hackathon/elemental/team-style-phase";
import { leaderboardPayload } from "@/lib/supabase/hackathon-leaderboard";

export const dynamic = "force-dynamic";

const CACHE: Record<string, string> = {
  // An open board page polls every 20 s: about one database read per region per 15 s.
  live: "public, s-maxage=15, stale-while-revalidate=30",
  // Frozen at sign-up close; only a board name or style change moves it.
  final: "public, s-maxage=120, stale-while-revalidate=600",
};

/**
 * The public team board as JSON: board names, school names and numbers only.
 * Kept out of search results like the page (students are mostly minors).
 */
export async function GET() {
  const payload = await leaderboardPayload(ELEMENTAL.slug, boardPhase());
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": CACHE[payload.state] ?? "public, s-maxage=5, stale-while-revalidate=10",
      "X-Robots-Tag": "noindex",
    },
  });
}
