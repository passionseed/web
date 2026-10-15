import { NextResponse } from "next/server";
import { checkCertificateHealth } from "@/lib/shift-round/certificate/health";

/**
 * GET /api/shift/cert-health (spec 6.2, E11). The issue job calls this before
 * issuing; 200 {ok:true} only when the renderer works and the public RPC
 * answers `certificate_not_found` for a known-missing id.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await checkCertificateHealth();
  return NextResponse.json(result, {
    status: result.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
