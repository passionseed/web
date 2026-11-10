/**
 * Small, client-safe helpers for the admin queue tools' URL state. Every tool
 * keeps its filters in the query string so the overview, the command palette,
 * and a pasted link can open it already filtered.
 */

/** A query string as Next hands it to a page, or the browser's URLSearchParams. */
export type ParamSource =
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

function hasGetter(source: ParamSource): source is { get(name: string): string | null } {
  return typeof (source as { get?: unknown }).get === "function";
}

/** First value of `key`, or undefined. Repeated keys keep the first value. */
export function readParam(source: ParamSource, key: string): string | undefined {
  if (hasGetter(source)) return source.get(key) ?? undefined;
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
}

/** `raw` when it is one of `options`, otherwise `fallback`. */
export function pickOption<T extends string>(
  raw: string | null | undefined,
  options: readonly T[],
  fallback: T,
): T {
  return options.find((option) => option === raw) ?? fallback;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** A record id from the URL, lower-cased, or null when it is not a UUID. */
export function readUuidParam(source: ParamSource, key: string): string | null {
  const raw = readParam(source, key)?.trim();
  return isUuid(raw) ? raw.toLowerCase() : null;
}

const MAX_PAGE = 10_000;

/** A 1-based page number from the URL; anything else is page 1. */
export function readPageParam(source: ParamSource, key = "page"): number {
  const raw = readParam(source, key)?.trim();
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return page >= 1 && page <= MAX_PAGE ? page : 1;
}

/** Trimmed free text from the URL, capped so a pasted essay cannot bloat a query. */
export function readTextParam(source: ParamSource, key: string, max = 200): string {
  return (readParam(source, key) ?? "").trim().slice(0, max);
}

export type QueryValue = string | number | null | undefined | false;

/** `path?query`, leaving out empty values so links stay short and stable. */
export function withQuery(path: string, params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === false || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
