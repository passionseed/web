import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { setTimer } from "@/lib/supabase/whiteboards";
import { timerSchema } from "@/lib/whiteboard/core";
import { guardBoard, readJson } from "@/lib/whiteboard/route-guard";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await guardBoard(id, "edit");
  if (!guard.ok) return guard.response;
  const parsed = timerSchema.safeParse(await readJson(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid timer" }, { status: 422 });
  try {
    return NextResponse.json({ timer: await setTimer(id, parsed.data.seconds) });
  } catch (error) {
    return safeServerError("Failed to set timer", error);
  }
}
