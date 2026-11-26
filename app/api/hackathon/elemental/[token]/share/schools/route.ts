import { NextRequest, NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { searchSchools } from "@/lib/hackathon/elemental/schools";
import { demoPagesOn, shareOpen } from "@/lib/hackathon/elemental/share";
import { safeServerError } from "@/lib/security/route-guards";
import { getShareContext, releaseExpiredHolds, seatsLeft, takenSchools } from "@/lib/supabase/hackathon-share-claims";

/**
 * Search the school list for the share page. Only for a sign-up's own token,
 * so who holds which school isn't open to everyone.
 * GET ?q=<what they typed> → { schools: [{ key, name, province, taken }], seatsLeft }
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
    // The demo (/hackathon/join/demo/share) searches the real list with nothing held.
    if (token === "demo" && demoPagesOn()) {
      const rows = await searchSchools(q, 8);
      return NextResponse.json({ schools: rows.map(([key, name, province]) => ({ key, name, province, taken: false })), seatsLeft: 27 });
    }
    if (!shareOpen()) return NextResponse.json({ error: "closed" }, { status: 409 });
    const reg = await getShareContext(token);
    if (!reg) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const rows = await searchSchools(q, 8);
    await releaseExpiredHolds(ELEMENTAL.slug);
    const [taken, left] = await Promise.all([takenSchools(ELEMENTAL.slug, rows.map((r) => r[0])), seatsLeft(ELEMENTAL.slug)]);
    return NextResponse.json(
      {
        schools: rows.map(([key, name, province]) => ({ key, name, province, taken: taken.has(key) })),
        seatsLeft: left,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return safeServerError("Could not search schools", error);
  }
}
