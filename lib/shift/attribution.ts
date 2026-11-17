const STORAGE_KEY = "shift_source";
const SOURCE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,79}$/i;

export function normalizeShiftSource(value: unknown): string | null {
  return typeof value === "string" && SOURCE_PATTERN.test(value)
    ? value.toLowerCase()
    : null;
}

/**
 * Inline script for the SHIFT layout. It saves the channel while the HTML is
 * still loading, so a tap before React hydrates (when links aren't tagged yet)
 * still reaches the form. Same rules as getShiftSource; it never throws and
 * leaves no globals.
 */
export const SHIFT_SOURCE_CAPTURE_SCRIPT =
  `(function(){try{var s=new URLSearchParams(location.search).get("utm_source");` +
  `if(s&&${SOURCE_PATTERN}.test(s))sessionStorage.setItem(${JSON.stringify(STORAGE_KEY)},s.toLowerCase())}catch(e){}})();`;

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
