/**
 * Validates if a URL is safe to use in href or src attributes.
 * Allows http, https, mailto, tel, and relative URLs.
 * blocks javascript:, data:, vbscript: and other potentially dangerous schemes.
 */
export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  // Handle relative URLs (start with / or #)
  if (url.startsWith("/") || url.startsWith("#")) return true;

  try {
    const parsed = new URL(url);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol);
  } catch (e) {
    // If URL parsing fails, reject it
    return false;
  }
}
