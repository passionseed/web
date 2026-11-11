/**
 * `dm_conversations.origin` arrives with migration 20261111100300. Until that
 * migration is applied, PostgREST rejects any read that names the column, so
 * the admin inbox, scoreboard, campaigns and send gate fall back to treating
 * every thread as a sales thread (no Radar threads can exist yet), as the
 * copilot route already does.
 */
export function isMissingOriginColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  const text = typeof message === "string" ? message : "";
  if (code === "42703" || code === "PGRST204") return /origin/i.test(text) || text === "";
  return /column\s+\S*origin\S*\s+does not exist/i.test(text);
}

let warned = false;

/** Logs once per process that the origin column is missing. */
export function warnMissingOriginColumn(where: string): void {
  if (warned) return;
  warned = true;
  console.warn("dm_conversations.origin is missing; apply migration 20261111100300", {
    errorCode: "dm_origin_column_missing",
    where,
  });
}
