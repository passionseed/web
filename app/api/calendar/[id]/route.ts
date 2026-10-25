import { NextResponse } from "next/server";

import { calendarViewer, isUuid, mayAttachBoard } from "@/lib/calendar/route-guard";
import { safeServerError } from "@/lib/security/route-guards";
import { blockColumns, blockOwner, deleteBlock, updateBlock } from "@/lib/supabase/calendar";
import { readJson } from "@/lib/whiteboard/route-guard";

type Params = { params: Promise<{ id: string }> };

/** The block's creator or an admin may change it. */
async function guardOwn(id: string) {
  const guard = await calendarViewer();
  if (!guard.ok) return guard;
  const owner = isUuid(id) ? await blockOwner(id) : null;
  if (!owner) return { ok: false as const, response: NextResponse.json({ error: "Block not found" }, { status: 404 }) };
  if (owner !== guard.viewer.id && !guard.viewer.isAdmin) {
    return { ok: false as const, response: NextResponse.json({ error: "Only who made it can change it" }, { status: 403 }) };
  }
  return guard;
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const guard = await guardOwn(id);
    if (!guard.ok) return guard.response;
    const parsed = blockColumns(await readJson(request));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 422 });
    if (!(await mayAttachBoard(guard.viewer, parsed.columns))) {
      return NextResponse.json({ error: "Only the board owner can attach this board" }, { status: 403 });
    }
    await updateBlock(id, parsed.columns);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to update block", error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const guard = await guardOwn(id);
    if (!guard.ok) return guard.response;
    await deleteBlock(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to delete block", error);
  }
}
