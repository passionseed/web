/**
 * Reads a sent card the way a student sees it, for tests. Works on what
 * renderView() returns and on anything a test interaction recorded from
 * show() (builders or plain JSON). Lives outside __tests__ so Jest does not
 * take it for a test file.
 */

type Json = { type?: number; [key: string]: unknown };

const ACTION_ROW = 1;
const BUTTON = 2;
const STRING_SELECT = 3;
const SECTION = 9;
const TEXT_DISPLAY = 10;
const MEDIA_GALLERY = 12;
const FILE = 13;
const CONTAINER = 17;

function json(c: unknown): Json {
  const maybe = c as { toJSON?: () => unknown };
  return (typeof maybe?.toJSON === "function" ? maybe.toJSON() : c) as Json;
}

/** The top-level components of a payload, as JSON. */
export function cardsOf(payload: unknown): Json[] {
  const components = (payload as { components?: unknown[] } | undefined)?.components ?? [];
  return components.map(json);
}

function children(c: Json): Json[] {
  const list = (c.components as unknown[] | undefined) ?? [];
  return list.map(json);
}

interface Seen {
  body: string[];
  all: string[];
  count: number;
  ids: string[];
  urls: string[];
}

function walk(c: Json, seen: Seen): void {
  seen.count++;
  switch (c.type) {
    case CONTAINER:
    case ACTION_ROW:
      for (const child of children(c)) walk(child, seen);
      break;
    case SECTION:
      for (const child of children(c)) walk(child, seen);
      if (c.accessory) walk(json(c.accessory), seen);
      break;
    case TEXT_DISPLAY:
      seen.body.push(String(c.content ?? ""));
      seen.all.push(String(c.content ?? ""));
      break;
    case BUTTON:
      if (c.label) seen.all.push(String(c.label));
      if (c.custom_id) seen.ids.push(String(c.custom_id));
      break;
    case STRING_SELECT:
      if (c.placeholder) seen.all.push(String(c.placeholder));
      for (const o of (c.options as { label: string }[] | undefined) ?? []) seen.all.push(o.label);
      if (c.custom_id) seen.ids.push(String(c.custom_id));
      break;
    case MEDIA_GALLERY:
      for (const item of (c.items as { media: { url: string } }[] | undefined) ?? []) {
        seen.count++;
        seen.urls.push(item.media.url);
      }
      break;
    case FILE:
      seen.urls.push(String((c.file as { url?: string } | undefined)?.url ?? ""));
      break;
    default:
      if (c.custom_id) seen.ids.push(String(c.custom_id));
  }
}

function read(payload: unknown): Seen {
  const seen: Seen = { body: [], all: [], count: 0, ids: [], urls: [] };
  for (const c of cardsOf(payload)) walk(c, seen);
  return seen;
}

/** Every text display (sections included), button label and select placeholder/option label, in order. */
export function viewText(payload: unknown): string {
  return read(payload).all.join("\n");
}

/** Only the text displays, joined by newlines: a legacy { content } card reads back as that content. */
export function bodyText(payload: unknown): string {
  return read(payload).body.join("\n");
}

/** Components in the whole message, nested ones included, as Discord counts them. */
export function componentCount(payload: unknown): number {
  return read(payload).count;
}

/** Characters across all text displays (Discord's 4000 limit). */
export function textLength(payload: unknown): number {
  return read(payload).body.reduce((n, t) => n + t.length, 0);
}

/** Custom IDs of every button and select, in order. */
export function customIds(payload: unknown): string[] {
  return read(payload).ids;
}

/** Media gallery and file URLs ("attachment://name.png"), in order. */
export function mediaUrls(payload: unknown): string[] {
  return read(payload).urls;
}

/** The card's accent colour. */
export function accentColor(payload: unknown): number | undefined {
  return cardsOf(payload)[0]?.accent_color as number | undefined;
}
