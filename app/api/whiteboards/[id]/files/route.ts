import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { loadFiles, saveFiles } from "@/lib/supabase/whiteboards";
import { filesSchema } from "@/lib/whiteboard/core";
import { guardBoard, readJson } from "@/lib/whiteboard/route-guard";

type Params = { params: Promise<{ id: string }> };

/** Images on the board, fetched by id: GET ?ids=a,b,c */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  const ids = (new URL(request.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 50);
  try {
    return NextResponse.json({ files: await loadFiles(id, ids) });
  } catch (error) {
    return safeServerError("Failed to load images", error);
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardBoard(id, "edit");
  if (!guard.ok) return guard.response;
  const parsed = filesSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Image is too large or not an image" }, { status: 422 });
  try {
    await saveFiles(id, guard.viewer.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to save images", error);
  }
}
