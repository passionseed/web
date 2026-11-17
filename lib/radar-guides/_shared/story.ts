/**
 * Small builders for game-story blocks, so page files read like a script.
 * Pure data helpers: no React, no runtime state.
 */
import type {
  CopyLabel,
  CopyText,
  DialogueLine,
  FactBadge,
  FactId,
  GuideBlock,
  ItemKind,
} from "@/lib/radar-guide/guide-types";
import type { HostMood } from "@/lib/radar-guide/story";

interface LineOpts {
  facts?: readonly FactId[];
  mood?: HostMood;
  badge?: FactBadge;
  labels?: readonly CopyLabel[];
}

function copy(th: string, opts: LineOpts = {}): CopyText {
  const text: CopyText = { th };
  if (opts.facts?.length) Object.assign(text, { factIds: opts.facts });
  if (opts.badge) Object.assign(text, { badge: opts.badge });
  if (opts.labels?.length) Object.assign(text, { labels: opts.labels });
  return text;
}

/** One dialogue box spoken by the host NPC (GUIDE_HOST). */
export function host(th: string, opts: LineOpts = {}): DialogueLine {
  return { speaker: "host", text: copy(th, opts), ...(opts.mood ? { mood: opts.mood } : {}) };
}

/** One dialogue box from the game itself (system voice, no sprite). */
export function sys(th: string, opts: LineOpts = {}): DialogueLine {
  return { speaker: "system", text: copy(th, opts) };
}

/** One dialogue box in the player's voice (what the student might be thinking). */
export function me(th: string, opts: LineOpts = {}): DialogueLine {
  return { speaker: "player", text: copy(th, opts) };
}

export function dialogue(id: string, ...lines: DialogueLine[]): GuideBlock {
  return { kind: "dialogue", id, lines };
}

interface ItemOpts extends LineOpts {
  title?: string;
  meta?: string;
  simulated?: boolean;
}

/** An in-world fact item: intel card, notification, terminal line, chat bubble or stat readout. */
export function item(id: string, kind: ItemKind, th: string, opts: ItemOpts = {}): GuideBlock {
  return {
    kind: "item",
    id,
    item: kind,
    text: copy(th, opts),
    ...(opts.title ? { titleTh: opts.title } : {}),
    ...(opts.meta ? { metaTh: opts.meta } : {}),
    ...(opts.simulated ? { simulated: true } : {}),
  };
}

export function beat(id: string, unlockLabelTh: string, ...blocks: GuideBlock[]): GuideBlock {
  return { kind: "beat", id, unlockLabelTh, blocks };
}

export const CLIP: GuideBlock = { kind: "clip", id: "cutscene" };
