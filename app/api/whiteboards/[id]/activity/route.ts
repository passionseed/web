import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { loadActivity } from "@/lib/supabase/whiteboards";
import { guardBoard } from "@/lib/whiteboard/route-guard";

type Params = { params: Promise<{ id: string }> };

/** The board's change history and who wrote what. PassionSeed admins only. */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  if (!guard.viewer.isAdmin) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  try {
    return NextResponse.json(await loadActivity(id));
  } catch (error) {
    return safeServerError("Failed to load activity", error);
  }
}
