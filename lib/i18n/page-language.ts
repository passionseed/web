/**
 * The language of a page, for <html lang>. Screen readers pick their voice
 * from it, and search engines read it as a hint.
 *
 * Most pages are Thai. The English ones below were measured on the live
 * site on 2026-11-22 (0 to 2% Thai text). A page added in English should be
 * added here.
 */
const ENGLISH_PAGES = new Set(["/about", "/contact", "/link", "/expert-interview", "/hackathon/gallery"]);

/**
 * Pages that follow the site's Thai/English switch (useLanguage). They
 * render English first, then the visitor's saved choice.
 */
const SWITCH_PAGES = ["/about", "/expert-interview", "/settings", "/direction-finder", "/me", "/forgot-password", "/reset-password"];

export type PageLanguage = { lang: "th" | "en"; followsSwitch: boolean };

export function pageLanguage(path: string | null | undefined): PageLanguage {
  const p = (path || "/").replace(/\/+$/, "") || "/";
  const followsSwitch = SWITCH_PAGES.some((s) => p === s || p.startsWith(`${s}/`));
  return { lang: followsSwitch || ENGLISH_PAGES.has(p) ? "en" : "th", followsSwitch };
}
