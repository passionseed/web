import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { deleteComment, getComment, resolveComment } from "@/lib/supabase/whiteboards";
import { canEdit, commentPatchSchema } from "@/lib/whiteboard/core";
import { guardBoard, readJson } from "@/lib/whiteboard/route-guard";

type Params = { params: Promise<{ id: string; commentId: string }> };

/** Editors and the thread's author can resolve or reopen a thread. */
export async function PATCH(request: Request, { params }: Params) {
  const { id, commentId } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  const parsed = commentPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid change" }, { status: 422 });
  try {
    const comment = await getComment(id, commentId);
    if (!comment || comment.parent_id) return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    if (!canEdit(guard.role) && comment.author_id !== guard.viewer.id) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    await resolveComment(commentId, parsed.data.resolved);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to update comment", error);
  }
}

/** Authors delete their own comments; the owner can delete any. */
export async function DELETE(_request: Request, { params }: Params) {
  const { id, commentId } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  try {
    const comment = await getComment(id, commentId);
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    if (guard.role !== "owner" && comment.author_id !== guard.viewer.id) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    await deleteComment(commentId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to delete comment", error);
  }
}
