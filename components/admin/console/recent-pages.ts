/**
 * The last few admin pages an admin opened, for the command palette. Paths
 * only (record IDs at most), never queries, names, or search text.
 */

export const RECENT_PAGES_KEY = "admin:recent-pages";
export const RECENT_PAGES_LIMIT = 6;

/** An admin path without query or hash, or null for anything else. */
export function cleanAdminPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (clean !== "/admin" && !clean.startsWith("/admin/")) return null;
  if (clean.length > 200) return null;
  return clean;
}

/** Newest first, unique, capped. */
export function pushRecentPath(
  list: readonly string[],
  path: string,
): string[] {
  const clean = cleanAdminPath(path);
  if (!clean) return [...list];
  return [clean, ...list.filter((p) => p !== clean)].slice(
    0,
    RECENT_PAGES_LIMIT,
  );
}

export function readRecentPaths(
  storage: Storage | null = safeStorage(),
): string[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(
      storage.getItem(RECENT_PAGES_KEY) ?? "[]",
    );
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((p) => (typeof p === "string" ? cleanAdminPath(p) : null))
      .filter((p): p is string => Boolean(p))
      .slice(0, RECENT_PAGES_LIMIT);
  } catch {
    return [];
  }
}

export function recordRecentPath(
  path: string,
  storage: Storage | null = safeStorage(),
): void {
  if (!storage) return;
  try {
    const next = pushRecentPath(readRecentPaths(storage), path);
    storage.setItem(RECENT_PAGES_KEY, JSON.stringify(next));
  } catch {
    // Private mode or a full quota: recents are a convenience, skip them.
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
