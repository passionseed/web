/**
 * Reads a bot reply the way bot_flows.ts and island_flows.ts check it. Every
 * quest bot message is one Components V2 card (bot/src/quests/view.ts), so
 * the text is the card's text displays (sections included) joined by
 * newlines, and the components are every button and select inside it, nested
 * ones and section accessories included. A link button has no custom_id.
 */

export interface CardComponent {
  type: number;
  custom_id: string;
  label?: string;
  url?: string;
  options?: { value: string; label: string }[];
  disabled?: boolean;
}

type Json = { type?: number; [key: string]: unknown };

const BUTTON = 2;
const TEXT_DISPLAY = 10;
/** String, user, role, mentionable and channel selects. */
const SELECTS = new Set([3, 5, 6, 7, 8]);

function json(c: unknown): Json {
  const maybe = c as { toJSON?: () => unknown };
  return (typeof maybe?.toJSON === "function" ? maybe.toJSON() : c) as Json;
}

function walk(c: Json, text: string[], components: CardComponent[]): void {
  if (c.type === TEXT_DISPLAY) text.push(String(c.content ?? ""));
  if (c.type === BUTTON || (c.type !== undefined && SELECTS.has(c.type))) components.push(c as unknown as CardComponent);
  for (const child of (c.components as unknown[] | undefined) ?? []) walk(json(child), text, components);
  if (c.accessory) walk(json(c.accessory), text, components);
}

/** { content, components } of a reply payload; a legacy { content } payload reads as its content. */
export function readCard(payload: { content?: string | null; components?: unknown[] } | undefined): {
  content: string;
  components: CardComponent[];
} {
  const text: string[] = [];
  const components: CardComponent[] = [];
  for (const c of payload?.components ?? []) walk(json(c), text, components);
  const legacy = typeof payload?.content === "string" ? payload.content : "";
  return { content: [legacy, ...text].filter(Boolean).join("\n"), components };
}
