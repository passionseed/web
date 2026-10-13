import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * POST /api/shift/transcribe (spec 5.6, 6.3).
 *
 * - Authenticates the caller's own Supabase bearer token; every read (flag,
 *   check RPC, storage download) runs as that student. Never the service role.
 * - Fails closed: transcription runs only when app_config
 *   `shift_round.transcription_enabled` is exactly `true` (missing row,
 *   unreadable config or any other value = off), and the server RPC
 *   `shift_round_transcription_check` must also agree (ownership, round
 *   window, flag, 20/hour).
 * - Never stores audio or text, and never logs audio, transcripts, paths or
 *   tokens. Logs carry error codes only.
 */

export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
export const DEADLINE_MS = 25_000;
export const BUCKET = "shift-round-media";
export const FLAG_KEY = "shift_round.transcription_enabled";
const AUDIO_PATH_RE = /^([0-9a-f-]{36})\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/audio\.m4a$/;

export type ErrorCategory = "validation" | "unauthenticated" | "forbidden" | "unavailable" | "retryable";

export interface TranscriptSegment {
  id: number;
  start_ms: number;
  end_ms: number;
  text: string;
}
export interface TranscribeSuccess {
  text: string;
  segments: TranscriptSegment[];
  language: string;
}

export interface WhisperResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: { id: number; start: number; end: number; text: string }[];
}

export type WhisperFn = (input: { file: File; language: "th" | "en"; signal: AbortSignal }) => Promise<WhisperResult>;

type UserClient = Pick<SupabaseClient, "auth" | "rpc" | "from" | "storage">;

export interface TranscribeDeps {
  createUserClient: (token: string) => UserClient;
  whisper: WhisperFn | null; // null when GROQ_API_KEY is not configured
  deadlineMs?: number;
  log?: (event: string, fields: Record<string, string | number>) => void;
}

export interface HandlerResponse {
  status: number;
  body: TranscribeSuccess | { error: { code: string; category: ErrorCategory; retry_after?: number | null } };
  headers?: Record<string, string>;
}

function fail(status: number, code: string, category: ErrorCategory, retryAfter?: number | null): HandlerResponse {
  const headers: Record<string, string> = {};
  if (retryAfter) headers["Retry-After"] = String(retryAfter);
  return { status, body: { error: { code, category, retry_after: retryAfter ?? null } }, headers };
}

/** Error codes from shift_round_transcription_check (3.2, 3.8) -> HTTP. */
const CHECK_ERRORS: Record<string, [number, ErrorCategory]> = {
  unauthenticated: [401, "unauthenticated"],
  forbidden: [403, "forbidden"],
  transcription_paused: [503, "unavailable"],
  media_not_owned: [403, "forbidden"],
  round_finished: [409, "validation"],
  rate_limited: [429, "retryable"],
  entry_not_found: [404, "validation"],
  media_missing: [404, "validation"],
  invalid_field: [400, "validation"],
  audio_too_long: [413, "validation"],
  unavailable: [503, "unavailable"],
};

export function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

/**
 * One deadline covers the whole request (auth, flag, check RPC, download and
 * whisper), so the JSON error goes out before the platform kills the function
 * (route maxDuration 30s). Work still in flight is abandoned; whisper is aborted.
 */
export async function handleTranscribe(
  input: { authorization: string | null; body: unknown },
  deps: TranscribeDeps
): Promise<HandlerResponse> {
  const log = deps.log ?? (() => {});
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<HandlerResponse>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      log("shift_transcribe_failed", { code: "timeout" });
      resolve(fail(504, "transcription_failed", "retryable"));
    }, deps.deadlineMs ?? DEADLINE_MS);
  });
  try {
    return await Promise.race([transcribe(input, deps, log, controller.signal), deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function transcribe(
  input: { authorization: string | null; body: unknown },
  deps: TranscribeDeps,
  log: NonNullable<TranscribeDeps["log"]>,
  signal: AbortSignal
): Promise<HandlerResponse> {
  const token = extractBearer(input.authorization);
  if (!token) return fail(401, "unauthenticated", "unauthenticated");

  const body = (input.body ?? {}) as { path?: unknown; lang?: unknown };
  const path = typeof body.path === "string" ? body.path : "";
  const lang: "th" | "en" = body.lang === "en" ? "en" : "th";
  const parts = AUDIO_PATH_RE.exec(path);
  if (!parts) return fail(400, "invalid_field", "validation");

  const supabase = deps.createUserClient(token);
  let userId: string;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return fail(401, "unauthenticated", "unauthenticated");
    userId = data.user.id;
  } catch {
    return fail(503, "retryable", "retryable");
  }
  // Folder 2 is the owner (2.5). The RPC re-checks; this avoids a wasted call.
  if (parts[2] !== userId) return fail(403, "media_not_owned", "forbidden");

  // Flag, fail closed (E18 says flags are not authorization: the RPC below is).
  try {
    const { data, error } = await supabase.from("app_config").select("value").eq("key", FLAG_KEY).maybeSingle();
    if (error || !data || data.value !== true) return fail(503, "transcription_paused", "unavailable");
  } catch {
    return fail(503, "transcription_paused", "unavailable");
  }
  if (!deps.whisper) return fail(503, "transcription_paused", "unavailable");

  let maxSeconds = 180;
  try {
    const { data, error } = await supabase.rpc("shift_round_transcription_check", { p_path: path });
    if (error) {
      const missing = error.code === "PGRST202" || error.code === "42883";
      return missing ? fail(503, "unavailable", "unavailable") : fail(503, "retryable", "retryable");
    }
    const envelope = data as
      | { ok: true; data?: { max_seconds?: number } }
      | { ok: false; error?: { code?: string; retry_after?: number | null } }
      | null;
    if (!envelope || typeof envelope !== "object") return fail(503, "unavailable", "unavailable");
    if (!envelope.ok) {
      const code = envelope.error?.code ?? "unavailable";
      const [status, category] = CHECK_ERRORS[code] ?? [400, "validation" as ErrorCategory];
      log("shift_transcribe_check_denied", { code });
      return fail(status, code, category, envelope.error?.retry_after ?? null);
    }
    if (typeof envelope.data?.max_seconds === "number") maxSeconds = envelope.data.max_seconds;
    // Size comes from storage metadata, so oversized audio is refused before download.
    const bytes = (envelope.data as { bytes?: unknown } | undefined)?.bytes;
    if (typeof bytes === "number" && bytes > MAX_AUDIO_BYTES) return fail(413, "audio_too_long", "validation");
  } catch {
    return fail(503, "retryable", "retryable");
  }

  let audio: Blob;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) return fail(404, "media_missing", "validation");
    audio = data;
  } catch {
    return fail(503, "retryable", "retryable");
  }
  if (audio.size > MAX_AUDIO_BYTES) return fail(413, "audio_too_long", "validation");

  if (signal.aborted) return fail(504, "transcription_failed", "retryable");
  try {
    const file = new File([audio], "audio.m4a", { type: "audio/mp4" });
    const result = await deps.whisper({ file, language: lang, signal });
    if (typeof result.duration === "number" && result.duration > maxSeconds + 5) {
      return fail(422, "audio_too_long", "validation");
    }
    const segments = (result.segments ?? []).map((segment, index) => ({
      id: typeof segment.id === "number" ? segment.id : index,
      start_ms: Math.max(0, Math.round(segment.start * 1000)),
      end_ms: Math.max(0, Math.round(segment.end * 1000)),
      text: segment.text.trim(),
    }));
    log("shift_transcribe_ok", { segments: segments.length });
    return {
      status: 200,
      body: { text: (result.text ?? "").trim(), segments, language: normalizeLanguage(result.language, lang) },
      headers: {},
    };
  } catch {
    // After the deadline the outer race has already answered 504; nothing to log twice.
    if (signal.aborted) return fail(504, "transcription_failed", "retryable");
    log("shift_transcribe_failed", { code: "provider_error" });
    return fail(502, "transcription_failed", "retryable");
  }
}

function normalizeLanguage(value: string | undefined, fallback: "th" | "en"): string {
  if (!value) return fallback;
  const lower = value.toLowerCase();
  if (lower === "thai" || lower === "th") return "th";
  if (lower === "english" || lower === "en") return "en";
  return lower.slice(0, 16);
}

/** Supabase client acting as the student (their JWT on every request). */
export function createUserClientFromEnv(token: string): UserClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("supabase_not_configured");
  return createSupabaseClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
