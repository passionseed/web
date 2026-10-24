import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { createBoard, getViewer, listBoards } from "@/lib/supabase/whiteboards";
import { createBoardSchema } from "@/lib/whiteboard/core";
import { readJson } from "@/lib/whiteboard/route-guard";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  try {
    return NextResponse.json({ boards: await listBoards(viewer) });
  } catch (error) {
    return safeServerError("Failed to load boards", error);
  }
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const parsed = createBoardSchema.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid board" }, { status: 422 });
  }
  try {
    const id = await createBoard(viewer, parsed.data.title);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return safeServerError("Failed to create board", error);
  }
}
