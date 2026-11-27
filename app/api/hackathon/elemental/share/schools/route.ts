import { NextRequest, NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { searchSchools } from "@/lib/hackathon/elemental/schools";
import { safeServerError } from "@/lib/security/route-guards";
import { schoolsWithSeat } from "@/lib/supabase/hackathon-share-links";

/**
 * Search the school list for the student and teacher share pages.
 * GET ?q=<what they typed> → { schools: [{ key, name, province, seatTaken }] }
 * seatTaken: someone at that school already qualified for its free seat.
 * Nothing here names a person, so it needs no token.
 */
export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
    const rows = await searchSchools(q, 8);
    let taken = new Set<string>();
    try {
      taken = await schoolsWithSeat(ELEMENTAL.slug, rows.map((r) => r[0]));
    } catch (error) {
      // No seats table yet: every seat is still open.
      console.error("[elemental share] seat lookup failed", error);
    }
    return NextResponse.json(
      { schools: rows.map(([key, name, province]) => ({ key, name, province, seatTaken: taken.has(key) })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return safeServerError("Could not search schools", error);
  }
}
