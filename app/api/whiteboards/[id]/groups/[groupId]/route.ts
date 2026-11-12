import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { deleteGroup, updateGroup } from "@/lib/supabase/whiteboard-groups";
import { groupInputSchema } from "@/lib/whiteboard/groups";
import { readJson } from "@/lib/whiteboard/route-guard";

import { guardLead } from "../guard";

type Params = { params: Promise<{ id: string; groupId: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Changes a group: { name, mentorIds, studentIds }. Staff only. */
export async function PATCH(request: Request, { params }: Params) {
  const { id, groupId } = await params;
  const guard = await guardLead(id);
  if (!guard.ok) return guard.response;
  if (!UUID.test(groupId)) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  const parsed = groupInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid group" }, { status: 422 });
  try {
    const group = await updateGroup(id, groupId, parsed.data);
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    return NextResponse.json({ group });
  } catch (error) {
    return safeServerError("Failed to save group", error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, groupId } = await params;
  const guard = await guardLead(id);
  if (!guard.ok) return guard.response;
  if (!UUID.test(groupId)) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  try {
    await deleteGroup(id, groupId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to delete group", error);
  }
}
