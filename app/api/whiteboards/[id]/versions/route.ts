import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { createVersion, listVersions } from "@/lib/supabase/whiteboards";
import { versionSchema } from "@/lib/whiteboard/core";
import { guardBoard, readJson } from "@/lib/whiteboard/route-guard";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ versions: await listVersions(id) });
  } catch (error) {
    return safeServerError("Failed to load versions", error);
  }
}

/** Names the board as it is now. The client saves pending edits first. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardBoard(id, "edit");
  if (!guard.ok) return guard.response;
  const parsed = versionSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Give the version a name" }, { status: 422 });
  try {
    const versionId = await createVersion(id, guard.viewer.id, parsed.data.label, parsed.data.thumbnail);
    return NextResponse.json({ id: versionId }, { status: 201 });
  } catch (error) {
    return safeServerError("Failed to save version", error);
  }
}
