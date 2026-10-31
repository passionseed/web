import { GRAPH_API_VERSION, MetaGraphApiError, parseMetaErrorBody } from "@/lib/meta/graph";

/**
 * Read-only GET client for the marketing sync. Every call here is a GET:
 * this module has no way to send, edit or delete anything on Meta.
 */

/** Ads tokens (EAA..., ads_read) only work against this host. */
export const FB_GRAPH_HOST = "https://graph.facebook.com";

export type GraphParams = Record<string, string | number | undefined>;

export interface GraphPage<T> {
  data: T[];
  paging?: { next?: string };
}

function buildUrl(host: string, path: string, params: GraphParams, accessToken: string): string {
  const url = new URL(`${host}/${GRAPH_API_VERSION}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  url.searchParams.set("access_token", accessToken);
  return url.toString();
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw parseMetaErrorBody(await res.text(), res.status);
  return (await res.json()) as T;
}

export function graphGet<T>(
  host: string,
  path: string,
  params: GraphParams,
  accessToken: string
): Promise<T> {
  return getJson<T>(buildUrl(host, path, params, accessToken));
}

/**
 * Follows `paging.next` until the edge is exhausted, `maxPages` is hit, or
 * `stopAfter` says the last page was enough (for newest-first edges).
 */
export async function graphGetAll<T>(
  host: string,
  path: string,
  params: GraphParams,
  accessToken: string,
  { maxPages = 50, stopAfter }: { maxPages?: number; stopAfter?: (page: T[]) => boolean } = {}
): Promise<T[]> {
  const rows: T[] = [];
  let url: string | null = buildUrl(host, path, params, accessToken);
  for (let page = 0; url && page < maxPages; page += 1) {
    const json: GraphPage<T> = await getJson<GraphPage<T>>(url);
    rows.push(...json.data);
    url = stopAfter?.(json.data) ? null : json.paging?.next ?? null;
  }
  return rows;
}

/**
 * True when Meta refused for lack of a permission (code 10 or 200-299), as
 * opposed to a bad request. The fix is a re-issued token, not a code change.
 */
export function isMissingPermission(error: unknown): boolean {
  if (!(error instanceof MetaGraphApiError)) return false;
  const code = error.code ?? 0;
  return code === 10 || (code >= 200 && code < 300) || /permission/i.test(error.message);
}

/** Meta's "invalid parameter" code, returned for a metric a media type lacks. */
export function isInvalidParameter(error: unknown): boolean {
  return error instanceof MetaGraphApiError && error.code === 100 && !isMissingPermission(error);
}

/** Short, token-free code for the sync run log and admin page. */
export function errorCodeFor(error: unknown, permissionCode: string): string {
  if (error instanceof MetaGraphApiError) {
    if (error.isTokenExpired) return "token_expired";
    if (error.isRateLimited) return "rate_limited";
    if (isMissingPermission(error)) return permissionCode;
    return `meta_error_${error.code ?? error.statusCode}`;
  }
  return "sync_failed";
}
