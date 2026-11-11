import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { boardPeople } from "@/lib/supabase/whiteboards";
import { guardBoard } from "@/lib/whiteboard/route-guard";

type Params = { params: Promise<{ id: string }> };

/**
 * Everyone on a board as SHIFT knows them: Discord name and picture, else
 * their profile. For anyone who can open the board; the board loads this after
 * it opens, so opening stays fast.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await guardBoard(id, "view");
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ people: await boardPeople(id, guard.viewer.id) });
  } catch (error) {
    return safeServerError("Failed to load people", error);
  }
}
