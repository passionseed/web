import { NextResponse } from "next/server";

import { getAdminQueueSnapshot } from "@/lib/admin/overview";
import { requireAdmin } from "@/lib/security/route-guards";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Live work-queue counts for the admin shell (sidebar badges, command
 * palette, overview). Polled by AdminLiveCountsProvider about once a minute.
 * Never cached: the counts are per moment and admin-only.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    guard.response.headers.set("Cache-Control", NO_STORE["Cache-Control"]);
    return guard.response;
  }
  const snapshot = await getAdminQueueSnapshot();
  return NextResponse.json(snapshot, { headers: NO_STORE });
}
