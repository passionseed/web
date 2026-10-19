import { NextResponse } from "next/server";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { listShiftInterest, topWindows } from "@/lib/shift/interestStore";
import { createAdminClient } from "@/utils/supabase/admin";

/** Admin view of SHIFT pre-orders: every sign-up plus the busiest 7-day windows. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const rows = await listShiftInterest(createAdminClient());
    return NextResponse.json({ interest: rows, windows: topWindows(rows, 8) });
  } catch (error) {
    return safeServerError("Failed to load SHIFT interest", error);
  }
}
