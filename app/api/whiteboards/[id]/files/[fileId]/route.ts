import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { callerRole, loadFile } from "@/lib/supabase/whiteboards";
import { FILE_ID, IMAGE_CACHE_CONTROL, parseDataUrl, shouldCompress } from "@/lib/whiteboard/images";

type Params = { params: Promise<{ id: string; fileId: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One board image as plain bytes, cached by the browser for a year: a file
 * id's bytes never change. Bytes are a quarter smaller than the base64 JSON of
 * the batch route, and each image can arrive (and show) on its own.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id, fileId } = await params;
  if (!UUID.test(id) || !FILE_ID.test(fileId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const role = await callerRole(id);
    if (role === "signin") return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    if (!role) return NextResponse.json({ error: "Board not found" }, { status: 404 });

    const file = await loadFile(id, fileId);
    // Not uploaded yet (its maker's save is still on the way): no caching, so a retry finds it.
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    const parsed = parseDataUrl(file.dataURL);
    if (!parsed) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { body, mimeType } = await smaller(Buffer.from(parsed.base64, "base64"), file.mimeType, file.dataURL.length);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": IMAGE_CACHE_CONTROL,
        // An SVG opened on its own must not run anything on our origin.
        "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
        "X-Content-Type-Options": "nosniff",
        Vary: "Cookie",
      },
    });
  } catch (error) {
    return safeServerError("Failed to load image", error);
  }
}

/**
 * Big PNG and JPEG images (screenshots, phone photos) go out as WebP at the
 * same size in pixels, usually a fifth of the bytes. Images uploaded since
 * uploads compress themselves are already small and pass straight through.
 */
async function smaller(body: Buffer, mimeType: string, dataUrlLength: number): Promise<{ body: Buffer; mimeType: string }> {
  if (!shouldCompress(mimeType, dataUrlLength) || mimeType === "image/webp") return { body, mimeType };
  try {
    const { default: sharp } = await import("sharp");
    const webp = await sharp(body).webp({ quality: 82 }).toBuffer();
    return webp.length < body.length ? { body: webp, mimeType: "image/webp" } : { body, mimeType };
  } catch {
    return { body, mimeType };
  }
}
