import { NextRequest, NextResponse } from "next/server";

import { storyById } from "@/lib/radar-stories";
import { estimateNoiseFloorDbfs, measureLevels } from "@/lib/radar-stories/audio-dsp";
import { LINE_HASH_PATTERN } from "@/lib/radar-stories/voice";
import { validateUploadedWav, WAV_UPLOAD_LIMITS } from "@/lib/radar-stories/wav";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import {
  createSignedTakeUrl,
  createVoiceTake,
  listVoiceTakes,
  SIGNED_URL_EXPIRES_SECONDS,
} from "@/lib/supabase/radar-voice";
import { createAdminClient } from "@/utils/supabase/admin";

const NO_STORE = { "Cache-Control": "private, no-store" };

function parseOptionalDbfs(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n > 0 || n < -120) return null;
  return Math.round(n * 10) / 10;
}

/**
 * GET /api/studio/radar-voice?storyId=<id>
 * Admin-only. Lists takes for one story, or all stories when `storyId` is omitted.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const storyId = request.nextUrl.searchParams.get("storyId")?.trim() || undefined;
    if (storyId && !storyById(storyId)) {
      return NextResponse.json({ error: `Unknown story "${storyId}"` }, { status: 404, headers: NO_STORE });
    }

    const service = createAdminClient();
    const takes = await listVoiceTakes(service, storyId);
    return NextResponse.json({ storyId: storyId ?? null, takes }, { headers: NO_STORE });
  } catch (error) {
    return safeServerError("Failed to list voice takes", error);
  }
}

/**
 * POST /api/studio/radar-voice
 * Admin-only. Accepts either:
 *   - Raw WAV body (`Content-Type: audio/wav`) with `storyId`, `beatIndex`, `lineHash`
 *     in query parameters or `x-story-id` / `x-beat-index` / `x-line-hash` headers.
 *   - `multipart/form-data` with `audio` file and `storyId`, `beatIndex`, `lineHash` fields.
 * Validates WAV format, size, mono 16-bit PCM, sample rate, and duration server-side.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > WAV_UPLOAD_LIMITS.maxBytes + 64 * 1024) {
      return NextResponse.json(
        { error: "Audio payload exceeds maximum allowed size" },
        { status: 413, headers: NO_STORE },
      );
    }

    let storyId: string | null = null;
    let beatIndexRaw: string | null = null;
    let lineHashValue: string | null = null;
    let clientNoiseFloorRaw: string | null = null;
    let wavBytes: Uint8Array;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("audio");
      if (!(file instanceof Blob)) {
        return NextResponse.json({ error: "Missing audio file" }, { status: 400, headers: NO_STORE });
      }
      storyId = typeof form.get("storyId") === "string" ? String(form.get("storyId")).trim() : null;
      beatIndexRaw = typeof form.get("beatIndex") === "string" ? String(form.get("beatIndex")).trim() : null;
      lineHashValue = typeof form.get("lineHash") === "string" ? String(form.get("lineHash")).trim() : null;
      clientNoiseFloorRaw =
        typeof form.get("noiseFloorDbfs") === "string" ? String(form.get("noiseFloorDbfs")).trim() : null;
      wavBytes = new Uint8Array(await file.arrayBuffer());
    } else {
      const params = request.nextUrl.searchParams;
      storyId = (params.get("storyId") ?? request.headers.get("x-story-id"))?.trim() || null;
      beatIndexRaw = (params.get("beatIndex") ?? request.headers.get("x-beat-index"))?.trim() || null;
      lineHashValue = (params.get("lineHash") ?? request.headers.get("x-line-hash"))?.trim() || null;
      clientNoiseFloorRaw = (params.get("noiseFloorDbfs") ?? request.headers.get("x-noise-floor-dbfs"))?.trim() || null;
      wavBytes = new Uint8Array(await request.arrayBuffer());
    }

    if (!storyId) {
      return NextResponse.json({ error: "Missing storyId" }, { status: 400, headers: NO_STORE });
    }
    const script = storyById(storyId);
    if (!script) {
      return NextResponse.json({ error: `Unknown story "${storyId}"` }, { status: 404, headers: NO_STORE });
    }

    const beatIndex = beatIndexRaw !== null && /^\d+$/.test(beatIndexRaw) ? Number(beatIndexRaw) : -1;
    if (beatIndex < 0 || beatIndex >= script.beats.length) {
      return NextResponse.json({ error: "Invalid beatIndex for story" }, { status: 400, headers: NO_STORE });
    }

    if (!lineHashValue || !LINE_HASH_PATTERN.test(lineHashValue)) {
      return NextResponse.json({ error: "Invalid lineHash (expected 8 hex characters)" }, { status: 400, headers: NO_STORE });
    }

    const validated = validateUploadedWav(wavBytes);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400, headers: NO_STORE });
    }

    const { wav } = validated;
    const levels = measureLevels(wav.samples);
    const noiseFloorDbfs =
      parseOptionalDbfs(clientNoiseFloorRaw) ?? estimateNoiseFloorDbfs(wav.samples, wav.sampleRate);

    const service = createAdminClient();
    const take = await createVoiceTake(service, {
      storyId,
      beatIndex,
      lineHash: lineHashValue,
      wavBytes,
      durationMs: wav.durationMs,
      peakDbfs: levels.peakDbfs,
      noiseFloorDbfs,
      createdBy: admin.value.userId,
    });

    const signedUrl = await createSignedTakeUrl(service, take.storage_path, SIGNED_URL_EXPIRES_SECONDS);
    return NextResponse.json({ take, signedUrl }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return safeServerError("Failed to upload voice take", error);
  }
}
