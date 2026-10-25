import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { loadVersionElements } from "@/lib/supabase/whiteboards";
import { guardBoard } from "@/lib/whiteboard/route-guard";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  try {
    const elements = await loadVersionElements(id, versionId);
    if (!elements) return NextResponse.json({ error: "Version not found" }, { status: 404 });
    return NextResponse.json({ elements });
  } catch (error) {
    return safeServerError("Failed to load version", error);
  }
}
