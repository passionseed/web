import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getLineOaMessageContent, lineErrorStatus } from "@/lib/line-oa/client";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import { isStoredLineInboundMedia } from "@/lib/supabase/line-oa";

/** Types a browser can show inline without running script. Anything else downloads. */
const INLINE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mpeg",
  "audio/aac",
]);

/**
 * The bytes come from a customer, and this route is same-origin with the
 * admin, so a file claiming to be HTML must never render here.
 */
function safeContentHeaders(contentType: string | null): HeadersInit {
  const mime = contentType?.split(";")[0].trim().toLowerCase() ?? "";
  const inline = INLINE_TYPES.has(mime);
  return {
    "Content-Type": inline ? mime : "application/octet-stream",
    "Content-Disposition": inline ? "inline" : "attachment",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cache-Control": "private, max-age=86400",
  };
}

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
      headers: safeContentHeaders(contentType),
    });
  } catch (error) {
    if (lineErrorStatus(error) === 404) {
      return NextResponse.json({ error: "LINE no longer has this file" }, { status: 410 });
    }
    return safeServerError("Failed to load LINE content", error);
  }
}
