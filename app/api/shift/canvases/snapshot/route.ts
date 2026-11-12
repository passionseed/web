import { NextResponse } from "next/server";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { takeCanvasSnapshots } from "@/lib/supabase/shift-canvas-snapshots";

export const maxDuration = 300;

/**
 * POST /api/shift/canvases/snapshot: takes today's snapshot now instead of
 * waiting for tonight's job (say, on a round's first day). Site admins only:
 * it asks Claude Haiku about every canvas.
 */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  try {
    return NextResponse.json({ ok: true, ...(await takeCanvasSnapshots()) });
  } catch (error) {
    return safeServerError("Could not take the snapshot", error);
  }
}
