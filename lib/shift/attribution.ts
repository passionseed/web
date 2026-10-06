const STORAGE_KEY = "shift_source";

export function normalizeShiftSource(value: unknown): string | null {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(value)
    ? value.toLowerCase()
    : null;
}

/** Last explicit source in this tab. Internal navigation never overwrites it. */
export function getShiftSource(): string | null {
  if (typeof window === "undefined") return null;
  const incoming = normalizeShiftSource(new URLSearchParams(window.location.search).get("utm_source"));
  try {
    if (incoming) window.sessionStorage.setItem(STORAGE_KEY, incoming);
    return incoming ?? normalizeShiftSource(window.sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return incoming;
  }
}

export function withShiftSource(href: string, source: string | null): string {
  if (!source || !href.startsWith("/") || href.startsWith("//")) return href;
  const url = new URL(href, "https://passionseed.org");
  url.searchParams.set("utm_source", source);
  return `${url.pathname}${url.search}${url.hash}`;
}
