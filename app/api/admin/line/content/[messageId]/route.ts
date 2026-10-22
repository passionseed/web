import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getLineOaMessageContent, lineErrorStatus } from "@/lib/line-oa/client";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { isStoredLineInboundMedia } from "@/lib/supabase/line-oa";

/**
 * Streams a photo, video, voice note, or file a customer sent on LINE. LINE
 * hosts the bytes behind the channel token, so the admin inbox reads them here.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { messageId } = await params;
  try {
    if (!(await isStoredLineInboundMedia(messageId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { body, contentType } = await getLineOaMessageContent(messageId);
    return new Response(Readable.toWeb(body) as ReadableStream, {
      headers: {
        "Content-Type": contentType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    if (lineErrorStatus(error) === 404) {
      return NextResponse.json({ error: "LINE no longer has this file" }, { status: 410 });
    }
    return safeServerError("Failed to load LINE content", error);
  }
}
