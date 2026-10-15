import { NextResponse } from "next/server";
import { buildCertificateContent } from "@/lib/shift-round/certificate/content";
import { certificateBaseUrl } from "@/lib/shift-round/certificate/config";
import { renderCertificatePng } from "@/lib/shift-round/certificate/render";
import { fetchCertificate } from "@/lib/shift-round/certificate/rpc";
import { isImageFormat } from "@/lib/shift-round/certificate/types";

/**
 * GET /c/<publicId>/image/<story|square>?v=<render_version> (spec 6.2, E11).
 * Matching v -> PNG with a short shared cache (revocations and renames must reach
 * CDNs within minutes, so never `immutable`). Missing or old v -> 302 to the current v.
 * Revoked/tombstone -> 410, not found -> 404 (the app hides share), lookup
 * failure -> 503.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_CACHE = "public, max-age=300, s-maxage=300, stale-while-revalidate=60";

const NO_STORE = { "Cache-Control": "no-store" };

function jsonError(status: number, code: string) {
  return NextResponse.json({ ok: false, error: { code } }, { status, headers: NO_STORE });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicId: string; format: string }> }
) {
  const { publicId, format } = await params;
  if (!isImageFormat(format)) return jsonError(404, "not_found");

  const lookup = await fetchCertificate(publicId);
  switch (lookup.kind) {
    case "not_found":
      return jsonError(404, "certificate_not_found");
    case "error":
      return jsonError(503, "unavailable");
    case "revoked":
    case "tombstone":
      return jsonError(410, "certificate_revoked");
    case "valid":
      break;
  }

  const current = String(lookup.data.render_version);
  const url = new URL(request.url);
  if (url.searchParams.get("v") !== current) {
    const target = new URL(url.pathname, url.origin);
    target.searchParams.set("v", current);
    return NextResponse.redirect(target, { status: 302, headers: NO_STORE });
  }

  try {
    const content = buildCertificateContent(lookup.snapshot, lookup.publicId, certificateBaseUrl());
    const png = await renderCertificatePng(content, format);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": IMAGE_CACHE,
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return jsonError(503, "render_failed");
  }
}
