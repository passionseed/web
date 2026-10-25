import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { removeMember, setMemberRole } from "@/lib/supabase/whiteboards";
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
    await setMemberRole(id, userId, parsed.data.role);
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
