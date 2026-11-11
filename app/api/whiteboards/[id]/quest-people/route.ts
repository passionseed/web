import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { canReviewQuests, questPeople } from "@/lib/supabase/whiteboards";
import { guardBoard, readJson } from "@/lib/whiteboard/route-guard";

type Params = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS = 300;

/**
 * Discord names and pictures of the people in a board's Quest dashboard.
 * Body: { ids: string[] }. Quest reviewers only (owner, site admins, reviewers).
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  const body = (await readJson(request)) as { ids?: unknown } | undefined;
  const ids = Array.isArray(body?.ids) ? body.ids.filter((v): v is string => typeof v === "string" && UUID.test(v)) : null;
  if (!ids || ids.length > MAX_IDS) return NextResponse.json({ error: "Invalid ids" }, { status: 422 });
  try {
    if (!(await canReviewQuests(id, guard.viewer, guard.role))) {
      return NextResponse.json({ error: "Quest reviewers only" }, { status: 403 });
    }
    return NextResponse.json({ people: await questPeople(id, ids) });
  } catch (error) {
    return safeServerError("Failed to load people", error);
  }
}
