import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { duplicateBoard } from "@/lib/supabase/whiteboards";
import { duplicateSchema } from "@/lib/whiteboard/core";
import { guardBoard, readJson } from "@/lib/whiteboard/route-guard";

/** Anyone who can see a board can copy it (or one of its versions) into their own boards. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  const parsed = duplicateSchema.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Invalid copy" }, { status: 422 });
  try {
    const newId = await duplicateBoard(id, guard.viewer, parsed.data.versionId);
    if (!newId) return NextResponse.json({ error: "Version not found" }, { status: 404 });
    return NextResponse.json({ id: newId }, { status: 201 });
  } catch (error) {
    return safeServerError("Failed to copy board", error);
  }
}
