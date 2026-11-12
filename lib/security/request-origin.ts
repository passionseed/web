const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Admin mutations use session cookies, so browser requests must be same-origin. */
export function isTrustedAdminRequest(request: Request): boolean {
  if (SAFE_METHODS.has(request.method)) return true;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const source = origin ?? referer;
  if (!source || request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    return new URL(source).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
