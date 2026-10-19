/**
 * Crawlers that fetch a pasted link to draw its chat card. LINE and iMessage
 * identify as facebookexternalhit. Human in-app browsers (LINE's "Line/13.x")
 * are deliberately not matched.
 */
const LINK_PREVIEW_AGENTS =
  /facebookexternalhit|Facebot|Twitterbot|Slackbot-LinkExpanding|Discordbot|TelegramBot|WhatsApp\/|LinkedInBot|SkypeUriPreview/i;

export const ADMIN_PREVIEW_PREFIX = "/link-preview";

export function isLinkPreviewBot(userAgent: string | null | undefined): boolean {
  return !!userAgent && LINK_PREVIEW_AGENTS.test(userAgent);
}

/**
 * Where a preview bot's admin request should be served from, or null.
 * Admin pages bounce signed-out visitors to /login, which hides their card.
 * The preview route renders tags and a poster only, never admin code.
 */
export function adminPreviewPath(method: string, pathname: string, userAgent: string | null): string | null {
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  if ((method !== "GET" && method !== "HEAD") || !isAdmin || !isLinkPreviewBot(userAgent)) return null;
  return `${ADMIN_PREVIEW_PREFIX}${pathname}`;
}
