import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { addComment, listComments } from "@/lib/supabase/whiteboards";
import { commentSchema } from "@/lib/whiteboard/core";
import { guardBoard, readJson } from "@/lib/whiteboard/route-guard";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ comments: await listComments(id) });
  } catch (error) {
    return safeServerError("Failed to load comments", error);
  }
}

/** Everyone on the board, viewers included, can comment. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  const parsed = commentSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid comment" }, { status: 422 });
  }
  try {
    const commentId = await addComment(id, guard.viewer.id, parsed.data);
    if (!commentId) return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    return NextResponse.json({ id: commentId }, { status: 201 });
  } catch (error) {
    return safeServerError("Failed to add comment", error);
  }
}
