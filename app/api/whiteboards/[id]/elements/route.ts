import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { loadElements } from "@/lib/supabase/whiteboards";
import { elementIdsSchema } from "@/lib/whiteboard/core";
import { guardBoard, readJson } from "@/lib/whiteboard/route-guard";

type Params = { params: Promise<{ id: string }> };

/**
 * The saved copy of some elements. Browsers show live edits to SHIFT canvases
 * from here rather than as they arrive, because only a saved copy has been
 * checked (see lib/whiteboard/canvas-guard.ts). A POST so a long id list fits.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const parsed = elementIdsSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 422 });
  }
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ elements: await loadElements(id, parsed.data.ids) });
  } catch (error) {
    return safeServerError("Failed to load elements", error);
  }
}
