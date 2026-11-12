/**
 * Client-side attribution for Radar pages (spec section 1, step 5).
 *
 * The server never reads utm parameters (the field page's data cache stays
 * effective), so everything here runs in the browser:
 * - `parseAttribution` reads utm tokens, the referrer host and the in-app
 *   browser from plain strings (pure, tested).
 * - `captureRadarAttribution` keeps the last tagged touch in sessionStorage and
 *   removes utm parameters from the address bar.
 * - `getOrCreateVisitId` keeps one visit id per page for 30 minutes of
 *   inactivity, so a reload does not count as a second visit.
 *
 * Storage can be blocked (private mode, IG in-app browser quirks): every read
 * and write is wrapped and falls back to memory.
 */
import { sanitizeUtmToken } from "./utm";
import type { RadarAttribution, UaApp } from "./types";

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
type UtmKey = (typeof UTM_KEYS)[number];

export const RADAR_LAST_TOUCH_KEY = "radar_last_touch";
export const RADAR_VISIT_KEY_PREFIX = "radar_visit:";
/** A visit ends after 30 minutes without activity on that page. */
export const RADAR_VISIT_IDLE_MS = 30 * 60 * 1000;
/** A tagged touch stops being inherited by untagged visits after a day. */
export const RADAR_LAST_TOUCH_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const OWN_HOSTS = ["passionseed.org"];
const REFERRER_HOST_PATTERN = /^[a-z0-9.-]{1,253}$/;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const EMPTY_ATTRIBUTION: RadarAttribution = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  referrer_host: null,
  ua_app: null,
};

// ---------------------------------------------------------------------------
// Pure parsing
// ---------------------------------------------------------------------------

/**
 * The in-app browser, from the user agent. Order matters: Instagram's UA can
 * carry Facebook tokens, so Instagram is checked first. A normal browser is
 * null; a recognised in-app browser we do not report separately is "other".
 */
export function detectUaApp(userAgent: string | null | undefined): UaApp | null {
  if (!userAgent) return null;
  if (/\bInstagram\b/i.test(userAgent)) return "instagram";
  if (/musical_ly|BytedanceWebview|\bTikTok\b|trill_/i.test(userAgent)) return "tiktok";
  if (/\bLine\//.test(userAgent)) return "line";
  if (/FBAN|FBAV|FB_IAB|FBIOS/.test(userAgent)) return "facebook";
  if (/Twitter|Snapchat|MicroMessenger|KAKAOTALK|Pinterest|LinkedInApp|Discord/i.test(userAgent)) {
    return "other";
  }
  return null;
}

function bareHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
}

function isOwnHost(host: string, ownHost: string | null | undefined): boolean {
  const bare = bareHost(host);
  const own = [...OWN_HOSTS, ...(ownHost ? [bareHost(ownHost)] : [])];
  return own.some((candidate) => bare === candidate || bare.endsWith(`.${candidate}`));
}

/** The referrer's host, or null when it is missing, malformed or our own site. */
export function referrerHost(
  referrer: string | null | undefined,
  ownHost?: string | null
): string | null {
  if (!referrer) return null;
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host || !REFERRER_HOST_PATTERN.test(host)) return null;
  if (isOwnHost(host, ownHost)) return null;
  return host;
}

function readUtm(params: URLSearchParams, key: UtmKey): string | null {
  return sanitizeUtmToken(params.get(key), key === "utm_content");
}

/**
 * Attribution for one page load. Utm tokens that would fail the SQL check
 * are null, so the client never sends something the RPC would drop.
 */
export function parseAttribution(
  search: string | null | undefined,
  referrer: string | null | undefined,
  userAgent: string | null | undefined,
  ownHost?: string | null
): RadarAttribution {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search ?? "");
  } catch {
    params = new URLSearchParams();
  }
  return {
    utm_source: readUtm(params, "utm_source"),
    utm_medium: readUtm(params, "utm_medium"),
    utm_campaign: readUtm(params, "utm_campaign"),
    utm_content: readUtm(params, "utm_content"),
    referrer_host: referrerHost(referrer, ownHost),
    ua_app: detectUaApp(userAgent),
  };
}

export function hasUtm(attribution: RadarAttribution): boolean {
  return Boolean(
    attribution.utm_source ||
      attribution.utm_medium ||
      attribution.utm_campaign ||
      attribution.utm_content
  );
}

/**
 * The same URL without utm parameters, as a path for `history.replaceState`
 * (pathname, remaining query, hash). Other parameters such as `from` keep
 * their order. Null when there is nothing to strip.
 */
export function stripUtmFromUrl(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href, "https://passionseed.org");
  } catch {
    return null;
  }
  const keys = [...url.searchParams.keys()].filter((key) => key.toLowerCase().startsWith("utm_"));
  if (keys.length === 0) return null;
  for (const key of new Set(keys)) url.searchParams.delete(key);
  const query = url.searchParams.toString();
  return `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
}

// ---------------------------------------------------------------------------
// Storage (browser only)
// ---------------------------------------------------------------------------

const memoryStore = new Map<string, string>();

function readSession(key: string): string | null {
  try {
    const value = window.sessionStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    // Blocked storage: fall through to memory.
  }
  return memoryStore.get(key) ?? null;
}

function writeSession(key: string, value: string): void {
  memoryStore.set(key, value);
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Blocked storage: the memory copy lasts for this page load.
  }
}

/** Test helper: forget the in-memory fallback. */
export function resetAttributionMemory(): void {
  memoryStore.clear();
  capturedInThisDocument = false;
}

export function createVisitId(): string {
  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

interface StoredTouch {
  attribution: RadarAttribution;
  at: number;
}

/** Set after the first capture in this document; later captures are in-app navigations. */
let capturedInThisDocument = false;

function readTouch(now: number): RadarAttribution | null {
  const raw = readSession(RADAR_LAST_TOUCH_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredTouch>;
    if (typeof parsed?.at !== "number" || now - parsed.at > RADAR_LAST_TOUCH_MAX_AGE_MS) return null;
    const stored = parsed.attribution ?? EMPTY_ATTRIBUTION;
    // Re-sanitise: sessionStorage is writable by anything on the page.
    const touch: RadarAttribution = {
      ...EMPTY_ATTRIBUTION,
      utm_source: sanitizeUtmToken(stored.utm_source),
      utm_medium: sanitizeUtmToken(stored.utm_medium),
      utm_campaign: sanitizeUtmToken(stored.utm_campaign),
      utm_content: sanitizeUtmToken(stored.utm_content, true),
      referrer_host: referrerHost(
        typeof stored.referrer_host === "string" ? `https://${stored.referrer_host}/` : null
      ),
    };
    return hasUtm(touch) || touch.referrer_host ? touch : null;
  } catch {
    return null;
  }
}

/**
 * The last tagged touch in this tab, or null when the latest arrival was
 * untagged. B2 uses it to pick the follow platform (`tiktok-*` sources).
 */
export function getLastRadarTouch(now = Date.now()): RadarAttribution | null {
  if (typeof window === "undefined") return null;
  const touch = readTouch(now);
  return touch && hasUtm(touch) ? touch : null;
}

/**
 * Attribution for this page view, browser only.
 *
 * - An arrival from outside (utm tags or an outside referrer) becomes the
 *   tab's last touch.
 * - A view without either inherits the last touch: a student who came from a
 *   reel to the hub and then opened a career still counts under that reel.
 *   In-app navigations ignore `document.referrer`, which keeps the first
 *   page's referrer for the life of the document.
 * - Utm parameters are removed from the address bar either way.
 *
 * Test-only: `options.firstInDocument` overrides the in-app navigation check.
 */
export function captureRadarAttribution(
  now = Date.now(),
  options: { firstInDocument?: boolean } = {}
): RadarAttribution {
  if (typeof window === "undefined") return EMPTY_ATTRIBUTION;

  const firstInDocument = options.firstInDocument ?? !capturedInThisDocument;
  capturedInThisDocument = true;

  const { location } = window;
  const referrer = firstInDocument && typeof document !== "undefined" ? document.referrer : null;
  const current = parseAttribution(
    location.search,
    referrer,
    typeof navigator === "undefined" ? null : navigator.userAgent,
    location.hostname
  );

  let attribution = current;
  if (hasUtm(current) || current.referrer_host) {
    const touch: StoredTouch = { attribution: { ...current, ua_app: null }, at: now };
    writeSession(RADAR_LAST_TOUCH_KEY, JSON.stringify(touch));
  } else {
    const inherited = readTouch(now);
    if (inherited) attribution = { ...inherited, ua_app: current.ua_app };
  }

  const stripped = stripUtmFromUrl(location.href);
  if (stripped) {
    try {
      window.history.replaceState(window.history.state, "", stripped);
    } catch {
      // A sandboxed frame can refuse replaceState; the visit still counts.
    }
  }

  return attribution;
}

interface StoredVisit {
  id: string;
  at: number;
}

export interface RadarVisitIdResult {
  visitId: string;
  /** True when this call started a new visit (the caller records it). */
  isNew: boolean;
}

/**
 * The visit id for a page (`pageKey` is the field slug, or "hub"). Reused
 * while the page was active in the last 30 minutes, including after a reload;
 * each call slides the window.
 */
export function getOrCreateVisitId(pageKey: string, now = Date.now()): RadarVisitIdResult {
  const key = `${RADAR_VISIT_KEY_PREFIX}${pageKey}`;
  let existing: StoredVisit | null = null;
  if (typeof window !== "undefined") {
    const raw = readSession(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<StoredVisit>;
        if (
          typeof parsed?.id === "string" &&
          UUID_V4_PATTERN.test(parsed.id) &&
          typeof parsed.at === "number" &&
          now - parsed.at >= 0 &&
          now - parsed.at <= RADAR_VISIT_IDLE_MS
        ) {
          existing = { id: parsed.id, at: parsed.at };
        }
      } catch {
        existing = null;
      }
    }
  }

  const visit: StoredVisit = { id: existing?.id ?? createVisitId(), at: now };
  if (typeof window !== "undefined") writeSession(key, JSON.stringify(visit));
  return { visitId: visit.id, isNew: existing === null };
}

/** Slides the visit window without creating a new visit (call on activity). */
export function touchVisit(pageKey: string, visitId: string, now = Date.now()): void {
  if (typeof window === "undefined") return;
  writeSession(`${RADAR_VISIT_KEY_PREFIX}${pageKey}`, JSON.stringify({ id: visitId, at: now }));
}
