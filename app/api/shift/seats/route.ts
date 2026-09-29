import { NextRequest, NextResponse } from "next/server";
import { cohortStatus, getShiftCohort } from "@/lib/content/shift-cohort";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const round = request.nextUrl.searchParams.get("round");
  const cohort = round && /^\d+$/.test(round) ? getShiftCohort(Number(round)) : undefined;
  if (!cohort) return NextResponse.json({ error: "Unknown round" }, { status: 400 });

  try {
    const { count, error } = await createAdminClient()
      .from("shift_applications")
      .select("id", { count: "exact", head: true })
      .eq("cohort", cohort.name)
      .not("paid_at", "is", null);
    if (error || count === null) throw new Error("Seat count unavailable");
    // Only aggregate counts leave the server; applicant records remain private.
    return NextResponse.json({
      remaining: Math.max(0, cohort.seats - count),
      open: cohortStatus(cohort) === "open",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Seat count unavailable" }, { status: 503 });
  }
}
