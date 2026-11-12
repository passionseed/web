import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { removeMember, setMemberRole, setQuestReviewer } from "@/lib/supabase/whiteboards";
import { memberPatchSchema } from "@/lib/whiteboard/core";
import { guardBoard, readJson } from "@/lib/whiteboard/route-guard";

type Params = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, userId } = await params;
  const guard = await guardBoard(id, "manage");
  if (!guard.ok) return guard.response;
  const parsed = memberPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid role" }, { status: 422 });
  try {
    // Owner only (guard "manage"): who may edit, and who may see everyone's quest work.
    if (parsed.data.role) await setMemberRole(id, userId, parsed.data.role);
    if (parsed.data.questReviewer !== undefined) await setQuestReviewer(id, userId, parsed.data.questReviewer);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to change access", error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, userId } = await params;
  const guard = await guardBoard(id, "manage");
  if (!guard.ok) return guard.response;
  try {
    await removeMember(id, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to remove member", error);
  }
}
