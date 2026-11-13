/**
 * The island's story in Discord: what /start shows before someone has started
 * (and what the live post's buttons show them). Five pages, one moving picture
 * each, stepped with ▶ ถัดไป and ◀ ย้อน on the same private message; the last
 * page holds the two ways in, the web island and starting here.
 *
 * The story is the lore bible's (docs/designs/shift-high-island-lore.md):
 * the prologue from the invite (day 7 of SHIFT, the bottle at dusk, the
 * ticket "เจอกันบนเกาะ"), then the web story's four panels, drawn from the same
 * scenes (components/shift/island/story/scenes.ts) with the bot's moving-island
 * renderer: the empty island at dawn, a seedling and its builder, the grown
 * tree with someone trying the work, festival night.
 *
 * No database call: pages are text and pictures only. Each picture is drawn
 * once per process, on first view, and kept.
 */
import { AttachmentBuilder, type ButtonBuilder } from "discord.js";

import { storyPanels, type StoryPanel } from "@/components/shift/island/story/scenes";
import type { LightPhase } from "@/lib/shift-island/live/types";

import { T } from "./copy";
import { cid } from "./ids";
import { renderSceneGif } from "./island/gif";
import { buildScene } from "./island/scene";
import { ButtonStyle, button, buttonRows, type Block, type View } from "./ui";
import { islandLinkButton } from "./weblink";

/** How wide a story picture may be: big enough to read the pixel art on a phone, small enough to load fast. */
const PAGE_MAX_WIDTH = 960;

/** A story page's picture: a scene, the light, the part of it to show and who stands in it. */
interface Picture {
  panel: StoryPanel | null;
  phase: LightPhase;
}

/** The pictures, page by page: the prologue at dusk, then the web story's four panels. */
function pictures(): Picture[] {
  let dusk: StoryPanel | null = null;
  try {
    const scene = buildScene([], { festival: false });
    dusk = { n: 0, scene, phase: "dusk", ambient: false, view: { x: 0, y: 0, w: scene.width, h: scene.height }, focus: { x: 0, y: 0 }, actors: [], fallback: 0 };
  } catch {
    dusk = null;
  }
  const panels = storyPanels();
  return [{ panel: dusk, phase: "dusk" }, ...panels.map((panel) => ({ panel, phase: panel.phase }))];
}

/** Pages in the story. */
export const STORY_PAGES = T.storyPages.length;

/** The page's attachment name. */
export function storyPictureName(page: number): string {
  return `shift-island-story-${page + 1}.gif`;
}

const drawn = new Map<number, Buffer | null>();
let plan: Picture[] | null = null;

/** The page's GIF, drawn on first use; null when it cannot be drawn (the page goes out as text). */
export function storyGif(page: number): Buffer | null {
  if (drawn.has(page)) return drawn.get(page)!;
  let gif: Buffer | null = null;
  try {
    plan ??= pictures();
    const pic = plan[page];
    if (pic?.panel?.scene) {
      gif = renderSceneGif(pic.panel.scene, {
        scale: 4,
        maxWidth: PAGE_MAX_WIDTH,
        phase: pic.phase,
        view: pic.panel.view,
        actors: pic.panel.actors,
      }).gif;
    }
  } catch (error) {
    console.error(`[shift-quests] story picture ${page + 1} skipped: ${(error as Error)?.message ?? "unknown"}`);
  }
  drawn.set(page, gif);
  return gif;
}

/** Draws every page's picture ahead of time, one per event-loop turn, so no press waits on drawing. */
export function warmStory(): void {
  let page = 0;
  const next = () => {
    if (page >= STORY_PAGES) return;
    storyGif(page++);
    setTimeout(next, 50).unref?.();
  };
  setTimeout(next, 1000).unref?.();
}

/** "● ● ○ ○ ○": where the reader is. */
function dots(page: number): string {
  return Array.from({ length: STORY_PAGES }, (_, k) => (k <= page ? "●" : "○")).join(" ");
}

/** The page clamped into the story. */
export function storyPage(raw: unknown): number {
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), STORY_PAGES - 1) : 0;
}

/** One page of the story: its picture, its lines, where you are, and the way on. */
export function storyView(rawPage: number): View {
  const page = storyPage(rawPage);
  const copy = T.storyPages[page];
  const last = page === STORY_PAGES - 1;
  const gif = storyGif(page);
  const name = storyPictureName(page);
  const files = gif ? [new AttachmentBuilder(gif, { name, description: copy.alt })] : [];

  const blocks: Block[] = [];
  if (files.length) blocks.push({ kind: "image", name, alt: copy.alt });
  blocks.push({ kind: "text", text: copy.text });
  if (last) blocks.push({ kind: "subtext", text: T.introPromise });
  blocks.push({ kind: "subtext", text: dots(page) });

  const back = page > 0 ? [button(cid("story", String(page - 1)), T.storyBack)] : [];
  let buttons: ButtonBuilder[];
  if (last) {
    const board = islandLinkButton(process.env, T.btnBoard);
    buttons = [...(board ? [board] : []), button(cid("start"), T.startButton, ButtonStyle.Primary), button(cid("start_info"), T.btnRules), ...back];
  } else {
    buttons = [
      ...back,
      button(cid("story", String(page + 1)), T.storyNext, ButtonStyle.Primary),
      button(cid("story", String(STORY_PAGES - 1)), T.storySkip),
    ];
  }
  return { tone: "island", title: copy.title, blocks, rows: buttonRows(buttons), files };
}
