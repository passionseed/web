/**
 * Database and Storage access for Career Radar voice-over takes.
 *
 * All functions accept a Supabase client argument: API routes and Server
 * Components pass `createAdminClient()` AFTER `requireAdmin()`, and the
 * `pnpm radar:voice` CLI passes its service-role client. Components never
 * query Supabase directly.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const RADAR_VOICE_BUCKET = "radar-voice";
export const RADAR_VOICE_TABLE = "radar_voice_takes";
export const SIGNED_URL_EXPIRES_SECONDS = 3600;

export interface RadarVoiceTake {
  id: string;
  story_id: string;
  beat_index: number;
  line_hash: string;
  storage_path: string;
  duration_ms: number;
  peak_dbfs: number | null;
  noise_floor_dbfs: number | null;
  picked: boolean;
  created_by: string | null;
  created_at: string;
}

export interface CreateVoiceTakeInput {
  storyId: string;
  beatIndex: number;
  lineHash: string;
  wavBytes: Uint8Array;
  durationMs: number;
  peakDbfs: number;
  noiseFloorDbfs: number;
  createdBy: string;
}

const TAKE_COLUMNS =
  "id, story_id, beat_index, line_hash, storage_path, duration_ms, peak_dbfs, noise_floor_dbfs, picked, created_by, created_at";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isVoiceTakeUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Deterministic, safe Storage key inside the private `radar-voice` bucket. */
export function buildTakeStoragePath(
  storyId: string,
  beatIndex: number,
  lineHash: string,
  takeId: string,
): string {
  const beat = String(beatIndex).padStart(2, "0");
  return `${storyId}/beat-${beat}-${lineHash}/${takeId}.wav`;
}

/** Detects a missing table before the migration has been applied to Postgres. */
export function isMissingRadarVoiceTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "42P01" || e.code === "PGRST205") return true;
  return typeof e.message === "string" && e.message.includes("radar_voice_takes") && e.message.includes("does not exist");
}

export async function listVoiceTakes(
  client: SupabaseClient,
  storyId?: string,
): Promise<RadarVoiceTake[]> {
  let query = client
    .from(RADAR_VOICE_TABLE)
    .select(TAKE_COLUMNS)
    .order("created_at", { ascending: false });

  if (storyId) {
    query = query.eq("story_id", storyId);
  }

  const { data, error } = await query;
  if (error) {
    throw Object.assign(new Error(`Failed to list voice takes: ${error.message}`), {
      code: error.code,
    });
  }
  return (data ?? []) as RadarVoiceTake[];
}

export async function listPickedVoiceTakes(
  client: SupabaseClient,
  storyId?: string,
): Promise<RadarVoiceTake[]> {
  let query = client
    .from(RADAR_VOICE_TABLE)
    .select(TAKE_COLUMNS)
    .eq("picked", true)
    .order("story_id", { ascending: true })
    .order("beat_index", { ascending: true });

  if (storyId) {
    query = query.eq("story_id", storyId);
  }

  const { data, error } = await query;
  if (error) {
    throw Object.assign(new Error(`Failed to list picked voice takes: ${error.message}`), {
      code: error.code,
    });
  }
  return (data ?? []) as RadarVoiceTake[];
}

export async function getVoiceTake(
  client: SupabaseClient,
  takeId: string,
): Promise<RadarVoiceTake | null> {
  if (!isVoiceTakeUuid(takeId)) return null;
  const { data, error } = await client
    .from(RADAR_VOICE_TABLE)
    .select(TAKE_COLUMNS)
    .eq("id", takeId)
    .maybeSingle();

  if (error) {
    throw Object.assign(new Error(`Failed to load voice take: ${error.message}`), {
      code: error.code,
    });
  }
  return (data as RadarVoiceTake | null) ?? null;
}

export async function createVoiceTake(
  client: SupabaseClient,
  input: CreateVoiceTakeInput,
): Promise<RadarVoiceTake> {
  const takeId = crypto.randomUUID();
  const storagePath = buildTakeStoragePath(input.storyId, input.beatIndex, input.lineHash, takeId);

  const { error: uploadError } = await client.storage
    .from(RADAR_VOICE_BUCKET)
    .upload(storagePath, input.wavBytes, {
      contentType: "audio/wav",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload WAV to storage: ${uploadError.message}`);
  }

  const { data, error: insertError } = await client
    .from(RADAR_VOICE_TABLE)
    .insert({
      id: takeId,
      story_id: input.storyId,
      beat_index: input.beatIndex,
      line_hash: input.lineHash,
      storage_path: storagePath,
      duration_ms: Math.round(input.durationMs),
      peak_dbfs: input.peakDbfs,
      noise_floor_dbfs: input.noiseFloorDbfs,
      picked: false,
      created_by: input.createdBy,
    })
    .select(TAKE_COLUMNS)
    .single();

  if (insertError || !data) {
    // Clean up orphaned object if the DB write failed.
    await client.storage.from(RADAR_VOICE_BUCKET).remove([storagePath]).catch(() => undefined);
    throw new Error(`Failed to save voice take metadata: ${insertError?.message ?? "unknown error"}`);
  }

  return data as RadarVoiceTake;
}

/**
 * Picks (stars) or unpicks a take. Picking atomically clears any other picked
 * take for the same `(story_id, beat_index)` via `pick_radar_voice_take`.
 */
export async function pickVoiceTake(
  client: SupabaseClient,
  takeId: string,
  picked = true,
): Promise<RadarVoiceTake | null> {
  if (!isVoiceTakeUuid(takeId)) return null;

  if (!picked) {
    const { data, error } = await client
      .from(RADAR_VOICE_TABLE)
      .update({ picked: false })
      .eq("id", takeId)
      .select(TAKE_COLUMNS)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to unpick voice take: ${error.message}`);
    }
    return (data as RadarVoiceTake | null) ?? null;
  }

  const { data, error } = await client.rpc("pick_radar_voice_take", { p_take_id: takeId });
  if (error) {
    throw new Error(`Failed to pick voice take: ${error.message}`);
  }
  const rows = (data ?? []) as RadarVoiceTake[];
  return rows[0] ?? null;
}

export async function deleteVoiceTake(
  client: SupabaseClient,
  takeId: string,
): Promise<{ deleted: boolean; take: RadarVoiceTake | null }> {
  if (!isVoiceTakeUuid(takeId)) return { deleted: false, take: null };

  const existing = await getVoiceTake(client, takeId);
  if (!existing) return { deleted: false, take: null };

  const { error: deleteError } = await client
    .from(RADAR_VOICE_TABLE)
    .delete()
    .eq("id", takeId);

  if (deleteError) {
    throw new Error(`Failed to delete voice take row: ${deleteError.message}`);
  }

  const { error: storageError } = await client.storage
    .from(RADAR_VOICE_BUCKET)
    .remove([existing.storage_path]);

  if (storageError) {
    // Row is already gone; log storage cleanup failure without stranding the UI.
    console.error(`[radar-voice] failed to remove storage object ${existing.storage_path}:`, storageError.message);
  }

  return { deleted: true, take: existing };
}

export async function createSignedTakeUrl(
  client: SupabaseClient,
  storagePath: string,
  expiresInSeconds = SIGNED_URL_EXPIRES_SECONDS,
): Promise<string> {
  const { data, error } = await client.storage
    .from(RADAR_VOICE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? "missing url"}`);
  }
  return data.signedUrl;
}

export async function downloadVoiceTakeBuffer(
  client: SupabaseClient,
  storagePath: string,
): Promise<Buffer> {
  const { data, error } = await client.storage
    .from(RADAR_VOICE_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to download ${storagePath}: ${error?.message ?? "empty response"}`);
  }
  return Buffer.from(await data.arrayBuffer());
}
