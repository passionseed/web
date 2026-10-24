import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { deleteBoard, patchBoard, removeMember } from "@/lib/supabase/whiteboards";
import { patchBoardSchema, stampAuthor } from "@/lib/whiteboard/core";
import { guardBoard, readJson } from "@/lib/whiteboard/route-guard";

type Params = { params: Promise<{ id: string }> };

/**
 * Saves a board. Editors send changed elements (merged server-side) and
 * thumbnails; only the owner renames or changes link access.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const parsed = patchBoardSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid change" }, { status: 422 });
  }
  const patch = parsed.data;
  const ownerOnly = patch.title !== undefined || patch.linkAccess !== undefined;
  const guard = await guardBoard(id, ownerOnly ? "manage" : "edit");
  if (!guard.ok) return guard.response;

  try {
    // The server, not the client, says who last changed each element.
    await patchBoard(id, patch.elements ? { ...patch, elements: stampAuthor(patch.elements, guard.viewer.id) } : patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to save board", error);
  }
}

/** The owner deletes the board; anyone else leaves it. */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  try {
    if (guard.role === "owner") await deleteBoard(id);
    else await removeMember(id, guard.viewer.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to remove board", error);
  }
}
