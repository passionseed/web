import { createClient } from "@/utils/supabase/client";
import { isAnonymousUser } from "@/lib/supabase/auth";
import { shouldSkipRadarAnalytics } from "@/lib/radar/analytics-host";
export {
  recordRadarMyPathIntent,
  routeRadarCardIntent,
  syncPendingRadarMyPathEvents,
  type RadarFieldIntent,
  type RadarIntentScope,
} from "@/lib/my-path/radar-sync";
import type { Database } from "./database.types";

export { shouldSkipRadarAnalytics } from "@/lib/radar/analytics-host";

type RadarField = Database["public"]["Tables"]["radar_fields"]["Row"];
type RadarCard = Database["public"]["Tables"]["radar_cards"]["Row"];
type RadarCollection = Database["public"]["Tables"]["radar_collections"]["Row"];
type RadarReflectionInsert = Database["public"]["Tables"]["radar_reflections"]["Insert"];

const RADAR_SESSION_KEY = "radar_session_id";
const RADAR_PENDING_REFLECTIONS_KEY = "radar_pending_reflections";
let radarReflectionSyncInFlight: Promise<{ synced: number; remaining: number }> | null = null;
let memoryRadarSessionId = "";
let memoryPendingRadarReflections: PendingRadarReflection[] = [];

// ── Collections ────────────────────────────────────────────────

export async function getRadarCollections(): Promise<RadarCollection[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("radar_collections")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching radar collections:", error);
    throw new Error("Radar request failed");
  }

  return data || [];
}

// ── Fields ───────────────────────────────────────────────────────

export async function getRadarFields(
  filter?: { collectionTag?: string; search?: string }
): Promise<RadarField[]> {
  const supabase = createClient();

  let query = supabase
    .from("radar_fields")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (filter?.collectionTag) {
    query = query.contains("tags", [filter.collectionTag]);
  }

  if (filter?.search) {
    // Strip PostgREST filter meta-characters + LIKE wildcards so the user's
    // search term can never be parsed as filter syntax (injection guard).
    const safe = filter.search.replace(/[,.()*:%\\"]/g, " ").trim().slice(0, 64);
    if (safe) {
      query = query.or(
        `name_th.ilike.%${safe}%,name_en.ilike.%${safe}%,tagline_th.ilike.%${safe}%,tagline_en.ilike.%${safe}%`
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching radar fields:", error);
    throw new Error("Failed to fetch radar fields");
  }

  return data || [];
}

export async function getRadarField(slug: string): Promise<RadarField | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("radar_fields")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching radar field:", error);
    throw new Error("Radar request failed");
  }

  return data;
}

// ── Cards ────────────────────────────────────────────────────────

export async function getRadarCards(fieldId: string): Promise<RadarCard[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("radar_cards")
    .select("*")
    .eq("field_id", fieldId)
    .eq("is_hidden", false)
    .order("position", { ascending: true });

  if (error) {
    console.error("Error fetching radar cards:", error);
    throw new Error("Radar request failed");
  }

  return data || [];
}

// ── Sources ──────────────────────────────────────────────────────

export async function getRadarSources(fieldId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("radar_sources")
    .select("*")
    .eq("field_id", fieldId)
    .order("ref", { ascending: true });

  if (error) {
    console.error("Error fetching radar sources:", error);
    throw new Error("Radar request failed");
  }

  return data || [];
}

// ── Reflections ──────────────────────────────────────────────────

/**
 * The device's Radar session id (localStorage, shared with field views,
 * intents and reflections). Radar Guide RPCs send it as `p_session_id`.
 */
export function getRadarSessionId(): string {
  return getOrCreateSessionId();
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = readStorageValue(RADAR_SESSION_KEY) || memoryRadarSessionId;
  if (!sessionId) {
    sessionId = createReflectionId();
    memoryRadarSessionId = sessionId;
    writeStorageValue(RADAR_SESSION_KEY, sessionId);
  }
  return sessionId;
}

export interface RadarReflectionData {
  fieldSlug: string;
  chapterKey?: string;
  wantToTry?: number | null;
  tags?: string[];
  responseText?: string;
  lang?: string;
}

export interface PendingRadarReflection extends RadarReflectionData {
  id: string;
  sessionId: string;
  createdAt: string;
}

function readPendingRadarReflections(): PendingRadarReflection[] {
  if (typeof window === "undefined") return [];

  const raw = readStorageValue(RADAR_PENDING_REFLECTIONS_KEY);
  if (!raw) return memoryPendingRadarReflections;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return memoryPendingRadarReflections;

    const pending = parsed.filter(
      (item): item is PendingRadarReflection =>
        typeof item?.id === "string" &&
        typeof item?.sessionId === "string" &&
        typeof item?.fieldSlug === "string" &&
        typeof item?.createdAt === "string" &&
        (typeof item?.wantToTry === "number" ||
          item?.wantToTry === null ||
          typeof item?.wantToTry === "undefined")
    );
    memoryPendingRadarReflections = pending;
    return pending;
  } catch {
    return memoryPendingRadarReflections;
  }
}

function writePendingRadarReflections(items: PendingRadarReflection[]) {
  if (typeof window === "undefined") return;
  memoryPendingRadarReflections = items;
  writeStorageValue(RADAR_PENDING_REFLECTIONS_KEY, JSON.stringify(items));
}

function readStorageValue(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn("Radar local storage read failed:", error);
    return null;
  }
}

function writeStorageValue(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn("Radar local storage write failed:", error);
  }
}

function createReflectionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
      .slice(6, 8)
      .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }

  return `radar-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toRadarReflectionInsert(
  reflection: PendingRadarReflection,
  userId: string
): RadarReflectionInsert {
  const wantToTry =
    typeof reflection.wantToTry === "number" &&
    reflection.wantToTry >= 1 &&
    reflection.wantToTry <= 5
      ? reflection.wantToTry
      : null;

  return {
    user_id: userId,
    session_id: reflection.sessionId,
    field_slug: reflection.fieldSlug,
    chapter_key: reflection.chapterKey || null,
    want_to_try: wantToTry,
    tags: reflection.tags || [],
    response_text: reflection.responseText?.slice(0, 500) || null,
    lang: reflection.lang || "th",
    created_at: reflection.createdAt,
  };
}

export function saveRadarReflectionLocally(
  data: RadarReflectionData
): PendingRadarReflection {
  const reflection: PendingRadarReflection = {
    ...data,
    id: createReflectionId(),
    sessionId: getOrCreateSessionId(),
    createdAt: new Date().toISOString(),
  };

  writePendingRadarReflections([...readPendingRadarReflections(), reflection]);
  return reflection;
}

export async function getSavedRadarReflectionChapterKeys(
  fieldSlug: string
): Promise<Set<string>> {
  const saved = new Set<string>();

  readPendingRadarReflections()
    .filter((reflection) => reflection.fieldSlug === fieldSlug)
    .forEach((reflection) => {
      if (reflection.chapterKey) saved.add(reflection.chapterKey);
    });

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || isAnonymousUser(user)) {
      return saved;
    }

    const { data, error } = await supabase
      .from("radar_reflections")
      .select("chapter_key")
      .eq("field_slug", fieldSlug);

    if (error) {
      console.error("Error loading saved radar reflections:", error);
      return saved;
    }

    (data || []).forEach((reflection) => {
      if (reflection.chapter_key) saved.add(reflection.chapter_key);
    });
  } catch (error) {
    console.error("Error loading saved radar reflections:", error);
  }

  return saved;
}

export async function syncPendingRadarReflections(): Promise<{
  synced: number;
  remaining: number;
}> {
  if (radarReflectionSyncInFlight) {
    return radarReflectionSyncInFlight;
  }

  radarReflectionSyncInFlight = syncPendingRadarReflectionsOnce().finally(() => {
    radarReflectionSyncInFlight = null;
  });

  return radarReflectionSyncInFlight;
}

async function syncPendingRadarReflectionsOnce(): Promise<{
  synced: number;
  remaining: number;
}> {
  const pending = readPendingRadarReflections();
  if (pending.length === 0) {
    return { synced: 0, remaining: 0 };
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || isAnonymousUser(user)) {
    return { synced: 0, remaining: pending.length };
  }

  const syncedIds = new Set<string>();

  for (const reflection of pending) {
    const { error } = await supabase
      .from("radar_reflections")
      .insert(toRadarReflectionInsert(reflection, user.id));

    if (error) {
      console.error("Error submitting radar reflection:", error);
      continue;
    }

    syncedIds.add(reflection.id);
  }

  const remaining = readPendingRadarReflections().filter(
    (reflection) => !syncedIds.has(reflection.id)
  );
  writePendingRadarReflections(remaining);
  return { synced: syncedIds.size, remaining: remaining.length };
}

export async function submitRadarReflection(
  data: RadarReflectionData
): Promise<void> {
  saveRadarReflectionLocally(data);
  void syncPendingRadarReflections();
}

// ── Field views & path intents ─────────────────────────────────

export interface RadarPathIntentData {
  fieldSlug: string;
  fieldId?: string;
  pathSlug: string;
  buttonLabel?: string;
  /** Radar Guide visit (`useRadarVisit`), so the funnel can count intents per visit. */
  visitId?: string | null;
}

const VISIT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validVisitId(visitId: string | null | undefined): string | null {
  return typeof visitId === "string" && VISIT_ID_PATTERN.test(visitId) ? visitId : null;
}

/** PostgREST "column not in schema cache": the visit_id migration has not reached this database. */
const MISSING_COLUMN_CODE = "PGRST204";

export type RadarAnalyticsWriteResult = "recorded" | "skipped" | "failed";

export async function recordRadarFieldView(
  fieldSlug: string,
  fieldId?: string
): Promise<void> {
  if (typeof window === "undefined" || shouldSkipRadarAnalytics()) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("radar_field_views").insert({
    user_id: user && !isAnonymousUser(user) ? user.id : null,
    session_id: getOrCreateSessionId(),
    field_id: fieldId || null,
    field_slug: fieldSlug,
  });

  if (error) {
    console.error("Error recording radar field view:", error);
  }
}

export async function recordRadarPathIntent(
  data: RadarPathIntentData
): Promise<RadarAnalyticsWriteResult> {
  if (typeof window === "undefined" || shouldSkipRadarAnalytics()) {
    return "skipped";
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const row = {
    user_id: user && !isAnonymousUser(user) ? user.id : null,
    session_id: getOrCreateSessionId(),
    field_id: data.fieldId || null,
    field_slug: data.fieldSlug,
    path_slug: data.pathSlug,
    button_label: data.buttonLabel || null,
  };
  const visitId = validVisitId(data.visitId);
  // `visit_id` is newer than the generated types (migration 20261111100100).
  let { error } = await supabase
    .from("radar_path_intents")
    .insert((visitId ? { ...row, visit_id: visitId } : row) as typeof row);

  if (error && visitId && (error as { code?: string }).code === MISSING_COLUMN_CODE) {
    // The intent matters more than its visit link: retry without the column.
    ({ error } = await supabase.from("radar_path_intents").insert(row));
  }

  if (error) {
    console.error("Error recording radar path intent:", error);
    return "failed";
  }

  return "recorded";
}

export async function recordRadarStartOptionInterest(
  startOptionId: string,
  eventType: "interested" | "opened" | "saved" | "dismissed" | "not_interested",
  visitId?: string | null
): Promise<void> {
  if (typeof window === "undefined" || shouldSkipRadarAnalytics()) return;

  const supabase = createClient();
  const { error } = await (supabase as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>
    ) => Promise<{ error: { message: string } | null }>;
  }).rpc("record_radar_interest", {
    p_start_option_id: startOptionId,
    p_event_type: eventType,
    p_session_id: getOrCreateSessionId(),
    // The funnel view reads metadata.visit_id for "interested" events.
    p_metadata: validVisitId(visitId) ? { visit_id: validVisitId(visitId) } : {},
  });

  if (error) {
    console.error("Failed to record Radar start option interest:", error);
  }
}
