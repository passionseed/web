/**
 * CDN URL utility — rewrites Backblaze B2 URLs to Cloudflare CDN URLs.
 *
 * Patterns handled:
 *   1. S3-style B2:  https://{bucket}.s3.{region}.backblazeb2.com/{path}
 *      → https://cdn.passionseed.org/file/{bucket}/{path}
 *
 *   2. Friendly B2:  https://f005.backblazeb2.com/file/{bucket}/{path}
 *      → https://cdn.passionseed.org/file/{bucket}/{path}
 *
 *   3. Already CDN:  https://cdn.passionseed.org/...
 *      → returned as-is (pass-through)
 *
 *   4. Non-B2 URLs (Supabase Storage, external links, etc.)
 *      → returned as-is
 */

const CDN_BASE = "https://cdn.passionseed.org";

/**
 * Rewrite a Backblaze B2 URL to a Cloudflare CDN URL.
 *
 * @param b2Url - Raw URL (may be B2, CDN, Supabase, external, empty, or nullish)
 * @returns CDN URL, or empty string for null/empty input
 */
export function toCdnUrl(b2Url: string | null | undefined): string {
  if (!b2Url) {
    return "";
  }

  // Already a CDN URL — pass through
  if (b2Url.startsWith(`${CDN_BASE}/`)) {
    return b2Url;
  }

  try {
    const url = new URL(b2Url);

    // Pattern 1: S3-style B2 endpoint
    // e.g. https://pseed-dev.s3.us-east-005.backblazeb2.com/images/test.webp
    const s3B2Match = url.hostname.match(
      /^(?<bucket>[^.]+)\.s3\.[a-z0-9-]+\.backblazeb2\.com$/i
    );
    if (s3B2Match?.groups?.bucket) {
      const bucket = s3B2Match.groups.bucket;
      const path = url.pathname.replace(/^\//, "");
      return `${CDN_BASE}/file/${bucket}/${path}`;
    }

    // Pattern 2: Friendly B2 endpoint (f005, f000, etc.)
    // e.g. https://f005.backblazeb2.com/file/pseed-dev/guidebook.pdf
    const friendlyB2Match = url.hostname.match(
      /^f\d+\.backblazeb2\.com$/i
    );
    if (friendlyB2Match) {
      // Path is already /file/{bucket}/{rest}
      return `${CDN_BASE}${url.pathname}`;
    }
  } catch {
    // Invalid URL — return original string (graceful fallback)
    return b2Url;
  }

  // Not a recognized B2 URL — return as-is
  return b2Url;
}
