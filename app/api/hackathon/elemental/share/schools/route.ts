import { NextRequest, NextResponse } from "next/server";

import { searchSchools } from "@/lib/hackathon/elemental/schools";
import { safeServerError } from "@/lib/security/route-guards";

/**
 * Search the school list for the student and teacher share pages.
 * GET ?q=<what they typed> → { schools: [{ key, name, province }] }
 * Nothing here names a person, so it needs no token.
 */
export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
    const rows = await searchSchools(q, 8);
    return NextResponse.json({ schools: rows.map(([key, name, province]) => ({ key, name, province })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return safeServerError("Could not search schools", error);
  }
}
