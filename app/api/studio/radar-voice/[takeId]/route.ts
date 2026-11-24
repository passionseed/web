import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import {
  createSignedTakeUrl,
  deleteVoiceTake,
  getVoiceTake,
  isVoiceTakeUuid,
  pickVoiceTake,
  SIGNED_URL_EXPIRES_SECONDS,
} from "@/lib/supabase/radar-voice";
import { createAdminClient } from "@/utils/supabase/admin";

const NO_STORE = { "Cache-Control": "private, no-store" };

type Params = Promise<{ takeId: string }>;

/**
 * GET /api/studio/radar-voice/[takeId]
 * Admin-only. Returns a single take and a short-lived signed playback URL.
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

    const signedUrl = await createSignedTakeUrl(service, take.storage_path, SIGNED_URL_EXPIRES_SECONDS);
    return NextResponse.json({ take, signedUrl, expiresIn: SIGNED_URL_EXPIRES_SECONDS }, { headers: NO_STORE });
  } catch (error) {
    return safeServerError("Failed to fetch voice take", error);
  }
}

/**
 * PATCH /api/studio/radar-voice/[takeId]
 * Admin-only. Picks (stars) or unpicks a take. Picking atomically unpicks
 * any other take for the same `(story_id, beat_index)`.
 */
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { takeId } = await params;
    if (!isVoiceTakeUuid(takeId)) {
      return NextResponse.json({ error: "Invalid take ID" }, { status: 400, headers: NO_STORE });
    }

    const body = (await request.json().catch(() => null)) as { picked?: unknown } | null;
    const picked = body && typeof body.picked === "boolean" ? body.picked : true;

    const service = createAdminClient();
    const take = await pickVoiceTake(service, takeId, picked);
    if (!take) {
      return NextResponse.json({ error: "Take not found" }, { status: 404, headers: NO_STORE });
    }

    return NextResponse.json({ take }, { headers: NO_STORE });
  } catch (error) {
    return safeServerError("Failed to update voice take", error);
  }
}

/**
 * DELETE /api/studio/radar-voice/[takeId]
 * Admin-only. Deletes the database row and removes its WAV from Storage.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { takeId } = await params;
    if (!isVoiceTakeUuid(takeId)) {
      return NextResponse.json({ error: "Invalid take ID" }, { status: 400, headers: NO_STORE });
    }

    const service = createAdminClient();
    const result = await deleteVoiceTake(service, takeId);
    if (!result.deleted) {
      return NextResponse.json({ error: "Take not found" }, { status: 404, headers: NO_STORE });
    }

    return NextResponse.json({ deleted: true, id: takeId }, { headers: NO_STORE });
  } catch (error) {
    return safeServerError("Failed to delete voice take", error);
  }
}
