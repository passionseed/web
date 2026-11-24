import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import {
  createSignedTakeUrl,
  getVoiceTake,
  isVoiceTakeUuid,
  SIGNED_URL_EXPIRES_SECONDS,
} from "@/lib/supabase/radar-voice";
import { createAdminClient } from "@/utils/supabase/admin";

const NO_STORE = { "Cache-Control": "private, no-store" };

type Params = Promise<{ takeId: string }>;

/**
 * GET /api/studio/radar-voice/[takeId]/url
 * Admin-only. Returns a short-lived signed playback URL for a private take WAV.
 */
export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { takeId } = await params;
    if (!isVoiceTakeUuid(takeId)) {
      return NextResponse.json({ error: "Invalid take ID" }, { status: 400, headers: NO_STORE });
    }

    const service = createAdminClient();
    const take = await getVoiceTake(service, takeId);
    if (!take) {
      return NextResponse.json({ error: "Take not found" }, { status: 404, headers: NO_STORE });
    }

    const url = await createSignedTakeUrl(service, take.storage_path, SIGNED_URL_EXPIRES_SECONDS);
    return NextResponse.json({ url, expiresIn: SIGNED_URL_EXPIRES_SECONDS }, { headers: NO_STORE });
  } catch (error) {
    return safeServerError("Failed to create playback URL", error);
  }
}
