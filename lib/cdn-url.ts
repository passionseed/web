/**
 * CDN URL utility — rewrites Backblaze B2 URLs to Cloudflare CDN URLs.
 *
 * Patterns handled:
 *   1. Path-style B2:     https://{bucket}.s3.{region}.backblazeb2.com/{path}
 *      → https://cdn.passionseed.org/{path}
 *
 *   2. Virtual-hosted B2: https://s3.{region}.backblazeb2.com/{bucket}/{path}
 *      → https://cdn.passionseed.org/{path}
 *
 *   3. Friendly B2:       https://f005.backblazeb2.com/file/{bucket}/{path}
 *      → https://cdn.passionseed.org/{path}
 *
 *   4. Already CDN:  https://cdn.passionseed.org/...
 *      → returned as-is (pass-through)
 *
 *   5. Non-B2 URLs (Supabase Storage, external links, etc.)
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

    // Pattern 1: Path-style (S3-style) B2 endpoint
    // e.g. https://pseed-dev.s3.us-east-005.backblazeb2.com/images/test.webp
    // → https://cdn.passionseed.org/images/test.webp
    const s3B2Match = url.hostname.match(
      /^(?<bucket>[^.]+)\.s3\.[a-z0-9-]+\.backblazeb2\.com$/i
    );
    if (s3B2Match?.groups?.bucket) {
      return `${CDN_BASE}${url.pathname}`;
    }

    // Pattern 2: Virtual-hosted B2 endpoint
    // e.g. https://s3.us-east-005.backblazeb2.com/pseed-dev/webtoons/phase1.png
    // → https://cdn.passionseed.org/webtoons/phase1.png
    const virtualB2Match = url.hostname.match(
      /^s3\.[a-z0-9-]+\.backblazeb2\.com$/i
    );
    if (virtualB2Match) {
      // Path is /{bucket}/{rest} — strip the bucket segment
      const path = url.pathname.replace(/^\/[^/]+/, "");
      return `${CDN_BASE}${path}`;
    }

    // Pattern 3: Friendly B2 endpoint (f005, f000, etc.)
    // e.g. https://f005.backblazeb2.com/file/pseed-dev/hackathon/abc.jpg
    // → https://cdn.passionseed.org/hackathon/abc.jpg
    const friendlyB2Match = url.hostname.match(
      /^f\d+\.backblazeb2\.com$/i
    );
    if (friendlyB2Match) {
      // Path is /file/{bucket}/{rest} — strip the /file/{bucket} prefix
      const path = url.pathname.replace(/^\/file\/[^/]+/, "");
      return `${CDN_BASE}${path}`;
    }
  } catch {
    // Invalid URL — return original string (graceful fallback)
    return b2Url;
  }

  // Not a recognized B2 URL — return as-is
  return b2Url;
}
