import { ButtonBuilder, ButtonStyle } from "discord.js";

/**
 * The island on the website (/shift/island): the bot's link button to it.
 * The website is the game; the bot only opens the door. The URL comes from
 * the environment alone, read when a card is drawn: never a Discord id or
 * anything a student typed.
 */

/** The island page on the website, appended to NEXT_PUBLIC_SITE_URL. */
export const ISLAND_WEB_PATH = "/shift/island";

/** The link button's label. */
export const ISLAND_LINK_LABEL = "🌐 เปิดเกาะบนเว็บ";
/** The guide page's link button (DRAFT for the Thai review). */
export const GUIDE_LINK_LABEL = "📖 คู่มือเกาะ";

/** Discord's limit for a link button's URL. */
const MAX_URL = 512;

/**
 * The only hosts allowed over plain http, and only with
 * SHIFT_ISLAND_URL_ALLOW_HTTP=1: Discord may refuse a link button it does
 * not accept, which would fail the whole card, so http is never the default.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** Whitespace or control characters: Discord would refuse the button. */
const UNSAFE = /[\s\u0000-\u001f\u007f]/;

/**
 * The island page's address: SHIFT_ISLAND_URL as it is, else
 * NEXT_PUBLIC_SITE_URL (trailing slashes trimmed) + /shift/island. null when
 * neither is set, or the address is not a plain https URL (http only for
 * localhost and 127.0.0.1, and only with SHIFT_ISLAND_URL_ALLOW_HTTP=1),
 * carries a login, or is longer than Discord takes.
 * A SHIFT_ISLAND_URL that is set but refused gives null, not the fallback.
 */
export function islandWebUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const explicit = env.SHIFT_ISLAND_URL?.trim();
  const site = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const candidate = explicit || (site ? `${site}${ISLAND_WEB_PATH}` : "");
  if (!candidate || candidate.length > MAX_URL || UNSAFE.test(candidate)) return null;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  const local = env.SHIFT_ISLAND_URL_ALLOW_HTTP === "1" && url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !local) return null;
  if (url.username || url.password || !url.hostname) return null;
  // A site address with a query or a fragment would swallow the appended path.
  if (!explicit && (url.search || url.hash || !url.pathname.endsWith(ISLAND_WEB_PATH))) return null;
  return candidate;
}

/** The guide page under the island's address, or null when the island has none (or carries a query). */
export function islandGuideUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const base = islandWebUrl(env);
  if (!base) return null;
  const url = new URL(base);
  if (url.search || url.hash) return null;
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/guide`;
  return url.toString();
}

/** "📖 คู่มือเกาะ" opening the guide page, or null when no address is configured. */
export function guideLinkButton(env: NodeJS.ProcessEnv = process.env, label: string = GUIDE_LINK_LABEL): ButtonBuilder | null {
  const url = islandGuideUrl(env);
  return url ? new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel(label) : null;
}

/** "🌐 เปิดเกาะบนเว็บ" (or another label) opening the island page, or null when no address is configured. */
export function islandLinkButton(env: NodeJS.ProcessEnv = process.env, label: string = ISLAND_LINK_LABEL): ButtonBuilder | null {
  const url = islandWebUrl(env);
  return url ? new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url).setLabel(label) : null;
}
