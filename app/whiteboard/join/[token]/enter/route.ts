import { NextResponse, type NextRequest } from "next/server";

import { getViewer, joinByToken } from "@/lib/supabase/whiteboards";

export const dynamic = "force-dynamic";

/** Joins the board behind a share link, then redirects to it (or to sign-in first). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  const viewer = await getViewer();
  if (!viewer) return to(`/login?next=${encodeURIComponent(`/whiteboard/join/${token}`)}`);

  const result = await joinByToken(token, viewer);
  return to(result.kind === "joined" ? `/whiteboard/${result.boardId}` : `/whiteboard/join/${token}?invalid=1`);
}
