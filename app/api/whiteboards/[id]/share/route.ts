import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { rotateShareToken } from "@/lib/supabase/whiteboards";
import { guardBoard } from "@/lib/whiteboard/route-guard";

/** Makes a new share link; the old one stops working. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await guardBoard(id, "manage");
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ shareToken: await rotateShareToken(id) });
  } catch (error) {
    return safeServerError("Failed to reset link", error);
  }
}
