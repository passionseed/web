/**
 * Admin PathLab map list: search, visibility and difficulty are filtered in
 * SQL across every page, node counts come from an embedded count, and bulk
 * deletes run server-side with limited concurrency. Query helpers are pure so
 * the client component shares the URL format with the route.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildIlikeSearchFilter,
  isUuid,
  normalizeSearch,
  pageRange,
  parsePositiveInt,
  totalPages,
} from "./admin-list-params";

export const MAP_VISIBILITIES = ["public", "private", "team"] as const;
export type MapVisibility = (typeof MAP_VISIBILITIES)[number];

export const ADMIN_MAPS_PAGE_SIZE = 50;
export const ADMIN_MAPS_MAX_PAGE_SIZE = 100;
/** `learning_maps.difficulty` is CHECK (1..10). */
export const MAP_DIFFICULTY_MAX = 10;

export function isMapVisibility(value: unknown): value is MapVisibility {
  return typeof value === "string" && (MAP_VISIBILITIES as readonly string[]).includes(value);
}

export interface AdminMapsQuery {
  q: string;
  visibility: MapVisibility | null;
  difficulty: number | null;
  page: number;
  limit: number;
}

export const DEFAULT_ADMIN_MAPS_QUERY: AdminMapsQuery = {
  q: "",
  visibility: null,
  difficulty: null,
  page: 1,
  limit: ADMIN_MAPS_PAGE_SIZE,
};

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(source: ParamSource, key: string): string | null {
  if (source instanceof URLSearchParams) return source.get(key);
  const value = source[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function parseAdminMapsQuery(source: ParamSource): AdminMapsQuery {
  const visibility = readParam(source, "visibility");
  const difficultyRaw = readParam(source, "difficulty");
  const difficulty = parsePositiveInt(difficultyRaw, 0);
  return {
    q: normalizeSearch(readParam(source, "q") ?? readParam(source, "search")),
    visibility: isMapVisibility(visibility) ? visibility : null,
    difficulty: difficulty >= 1 && difficulty <= MAP_DIFFICULTY_MAX ? difficulty : null,
    page: parsePositiveInt(readParam(source, "page"), 1),
    limit: parsePositiveInt(readParam(source, "limit"), ADMIN_MAPS_PAGE_SIZE, ADMIN_MAPS_MAX_PAGE_SIZE),
  };
}

/** Serialise a query, dropping defaults so URLs stay short. */
export function adminMapsQueryToParams(query: Partial<AdminMapsQuery>): URLSearchParams {
  const params = new URLSearchParams();
  const q = normalizeSearch(query.q);
  if (q) params.set("q", q);
  if (query.visibility) params.set("visibility", query.visibility);
  if (query.difficulty) params.set("difficulty", String(query.difficulty));
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.limit && query.limit !== ADMIN_MAPS_PAGE_SIZE) params.set("limit", String(query.limit));
  return params;
}

export const MAP_SEARCH_COLUMNS = ["title", "description", "category"] as const;
export const CREATOR_SEARCH_COLUMNS = ["username", "full_name"] as const;
export const MAX_CREATOR_MATCHES = 50;

/**
 * Map text search, optionally widened to maps made by matching creators.
 * Both halves are top-level alternatives in one PostgREST `or()`.
 */
export function buildMapSearchFilter(raw: string, creatorIds: readonly string[] = []): string | null {
  const text = buildIlikeSearchFilter(raw, MAP_SEARCH_COLUMNS);
  if (!text) return null;
  const ids = Array.from(new Set(creatorIds.filter(isUuid))).slice(0, MAX_CREATOR_MATCHES);
  if (ids.length === 0) return text;
  return `${text},creator_id.in.(${ids.join(",")})`;
}

export interface AdminMapRow {
  id: string;
  title: string;
  description: string | null;
  creator_id: string | null;
  creator_name: string;
  difficulty: number | null;
  category: string | null;
  visibility: MapVisibility | null;
  node_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminMapsPage {
  maps: AdminMapRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const MAP_LIST_COLUMNS = `
  id,
  title,
  description,
  creator_id,
  difficulty,
  category,
  visibility,
  created_at,
  updated_at,
  profiles!creator_id ( username, full_name ),
  map_nodes ( count )
`;

interface MapRecord {
  id: string;
  title: string;
  description: string | null;
  creator_id: string | null;
  difficulty: number | null;
  category: string | null;
  visibility: string | null;
  created_at: string | null;
  updated_at: string | null;
  profiles: { username: string | null; full_name: string | null } | { username: string | null; full_name: string | null }[] | null;
  map_nodes: { count: number }[] | null;
}

export function toAdminMapRow(record: MapRecord): AdminMapRow {
  const profile = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles;
  return {
    id: record.id,
    title: record.title,
    description: record.description ?? null,
    creator_id: record.creator_id ?? null,
    creator_name: profile?.full_name || profile?.username || "Unknown",
    difficulty: record.difficulty ?? null,
    category: record.category ?? null,
    visibility: isMapVisibility(record.visibility) ? record.visibility : null,
    node_count: record.map_nodes?.[0]?.count ?? 0,
    created_at: record.created_at ?? null,
    updated_at: record.updated_at ?? null,
  };
}

/** Creators whose name matches the search, so "maps by Jane" finds them. */
export async function findCreatorIds(client: SupabaseClient, raw: string): Promise<string[]> {
  const filter = buildIlikeSearchFilter(raw, CREATOR_SEARCH_COLUMNS);
  if (!filter) return [];
  const { data, error } = await client.from("profiles").select("id").or(filter).limit(MAX_CREATOR_MATCHES);
  if (error) return []; // Creator matching is a nice-to-have; title search still works.
  return ((data ?? []) as { id: string }[]).map((row) => row.id);
}

/**
 * One page of maps with every filter applied in SQL. Throws on a DB error.
 *
 * A page past the end (a stale or shared link, or a list that shrank) is
 * served as the last page, with `pagination.page` saying which page that is.
 * PostgREST answers such a range with 416 (PGRST103) and no count, so the
 * total then comes from a head count with the same filters.
 */
export async function listAdminMaps(client: SupabaseClient, query: AdminMapsQuery): Promise<AdminMapsPage> {
  const creatorIds = query.q ? await findCreatorIds(client, query.q) : [];
  const search = buildMapSearchFilter(query.q, creatorIds);

  const filtered = (columns: string, options: { count: "exact"; head?: boolean }) => {
    let request = client.from("learning_maps").select(columns, options);
    if (query.visibility) request = request.eq("visibility", query.visibility);
    if (query.difficulty) request = request.eq("difficulty", query.difficulty);
    if (search) request = request.or(search);
    return request;
  };

  /** One page; `total` is null when PostgREST said the page is past the end. */
  const readPage = async (page: number): Promise<{ rows: MapRecord[]; total: number | null }> => {
    const { from, to } = pageRange(page, query.limit);
    const { data, count, error } = await filtered(MAP_LIST_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, to);
    if (error?.code === "PGRST103") return { rows: [], total: null };
    if (error) throw new Error(`Failed to load maps: ${error.message}`);
    const rows = (data ?? []) as unknown as MapRecord[];
    return { rows, total: count ?? rows.length };
  };

  const result = (page: number, rows: MapRecord[], total: number): AdminMapsPage => ({
    maps: rows.map(toAdminMapRow),
    pagination: { page, limit: query.limit, total, totalPages: totalPages(total, query.limit) },
  });

  const requested = await readPage(query.page);
  if (requested.rows.length > 0 || query.page <= 1) {
    return result(query.page, requested.rows, requested.total ?? 0);
  }

  let total = requested.total;
  if (total === null) {
    const { count, error } = await filtered("id", { count: "exact", head: true });
    if (error) throw new Error(`Failed to count maps: ${error.message}`);
    total = count ?? 0;
  }
  const lastPage = totalPages(total, query.limit);
  if (lastPage === 0) return result(1, [], 0);
  if (lastPage >= query.page) return result(query.page, [], total);
  const last = await readPage(lastPage);
  return result(lastPage, last.rows, last.total ?? total);
}

// ---------------------------------------------------------------------------
// Bulk delete
// ---------------------------------------------------------------------------

export const BULK_DELETE_MAX = 100;
export const BULK_DELETE_CONCURRENCY = 3;

export function parseBulkDeleteIds(body: unknown): { ok: true; ids: string[] } | { ok: false; error: string } {
  const ids = (body as { ids?: unknown } | null)?.ids;
  if (!Array.isArray(ids) || ids.length === 0) return { ok: false, error: "Send at least one map ID" };
  if (!ids.every(isUuid)) return { ok: false, error: "Every map ID must be a UUID" };
  const unique = Array.from(new Set(ids.map((id) => id.toLowerCase())));
  if (unique.length > BULK_DELETE_MAX) {
    return { ok: false, error: `Delete at most ${BULK_DELETE_MAX} maps at a time` };
  }
  return { ok: true, ids: unique };
}

/** Run `worker` over `items`, at most `limit` at a time, keeping input order. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(lanes);
  return results;
}

export interface BulkDeleteResult {
  deleted: string[];
  failed: { id: string; error: string }[];
}

export async function bulkDeleteMaps(
  ids: readonly string[],
  deleteOne: (id: string) => Promise<void>,
  concurrency = BULK_DELETE_CONCURRENCY,
): Promise<BulkDeleteResult> {
  const settled = await mapWithConcurrency(ids, concurrency, deleteOne);
  const result: BulkDeleteResult = { deleted: [], failed: [] };
  settled.forEach((outcome, i) => {
    if (outcome.status === "fulfilled") result.deleted.push(ids[i]);
    else {
      const reason = outcome.reason;
      result.failed.push({
        id: ids[i],
        error: reason instanceof Error && reason.message.includes("Could not delete the map")
          ? "It may still have linked data"
          : "Delete failed",
      });
    }
  });
  return result;
}
