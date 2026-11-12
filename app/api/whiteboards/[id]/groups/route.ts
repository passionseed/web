import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { createGroup, listGroups } from "@/lib/supabase/whiteboard-groups";
import { groupInputSchema } from "@/lib/whiteboard/groups";
import { readJson } from "@/lib/whiteboard/route-guard";

import { guardLead } from "./guard";

type Params = { params: Promise<{ id: string }> };

/** The board's mentor groups. Staff only. */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardLead(id);
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ groups: await listGroups(id) });
  } catch (error) {
    return safeServerError("Failed to load groups", error);
  }
}

/** Creates a group: { name, mentorIds, studentIds }. Staff only. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardLead(id);
  if (!guard.ok) return guard.response;
  const parsed = groupInputSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid group" }, { status: 422 });
  try {
    return NextResponse.json({ group: await createGroup(id, guard.viewer.id, parsed.data) });
  } catch (error) {
    return safeServerError("Failed to create group", error);
  }
}
