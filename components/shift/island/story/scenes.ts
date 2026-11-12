/**
 * The four story panels as data: made-up plots drawn by the island's own scene
 * builder, so every panel matches the real island pixel for pixel. Pure, no
 * DOM: the overlay measures its box and asks fitPanel how to show a panel
 * crisply (an integer number of device pixels per native pixel).
 */
import { ACTOR_FRAMES, MOTION_SIZES } from "@/bot/assets/island/motion-sprites";
import { buildScene, spriteSize, type IslandScene, type SceneTree } from "@/bot/src/quests/island/scene";
import type { LightPhase, LiveActor } from "@/lib/shift-island/live/types";

type IslandPlot = Parameters<typeof buildScene>[0][number];

export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface StoryPanel {
  /** 1..4, as the dots and the aria-label count them. */
  n: number;
  /** Null when the scene could not be built: the panel shows its fallback sprite. */
  scene: IslandScene | null;
  phase: LightPhase;
  /** Boat, gulls and cloud shadows. */
  ambient: boolean;
  /** The part of the scene this panel frames, in native pixels. */
  view: PixelRect;
  /** What stays in frame when a small screen crops the view. */
  focus: PixelPoint;
  /** People drawn above the trees, in the scene's native pixels. */
  actors: LiveActor[];
  /** The tree stage (SPRITES stage_N, through PixelIcon) the panel shows when the canvas cannot draw. */
  fallback: number;
}

/** Panels 2 and 3 frame one tree in about this many native pixels. */
export const TREE_VIEW = { w: 160, h: 112 } as const;
/** Where the tree's soil line sits in a tree view, from the top. */
const SOIL_AT = 0.68;
/** Sea and sky kept around the festival's trees. */
const FESTIVAL_MARGIN = 24;
/** The builder and the tester share one size (10 x 14). */
const [ACTOR_W, ACTOR_H] = MOTION_SIZES.builder_0;
/** One step of a person's two-frame idle. */
const ACTOR_FRAME_MS = 600;

function plot(slot: number, stage: number, extra: Partial<IslandPlot> = {}): IslandPlot {
  return { slot, stage, visitor: false, key: false, helper: false, lantern: false, name: null, mine: false, plain: false, ...extra };
}

/** Eight plots for the festival night: mixed stages, three earned lanterns, a few visitors and paths. */
export const FESTIVAL_PLOTS: readonly IslandPlot[] = [
  plot(1, 7, { lantern: true, visitor: true, helper: true }),
  plot(2, 5, { lantern: true }),
  plot(3, 6, { visitor: true, key: true }),
  plot(4, 3),
  plot(5, 4, { lantern: true, helper: true }),
  plot(6, 2),
  plot(7, 5, { visitor: true }),
  plot(8, 1),
];

function safeScene(plots: readonly IslandPlot[], festival = false): IslandScene | null {
  try {
    return buildScene([...plots], { markMine: false, festival });
  } catch {
    // A renderer refusal (RenderError) keeps the story going on its fallback sprites.
    return null;
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

function wholeScene(scene: IslandScene | null): PixelRect {
  return scene ? { x: 0, y: 0, w: scene.width, h: scene.height } : { x: 0, y: 0, w: TREE_VIEW.w, h: TREE_VIEW.h };
}

/** A tree view: the tree centred, its soil line about two thirds down, kept inside the scene. */
export function treeView(scene: IslandScene, tree: SceneTree, w: number = TREE_VIEW.w, h: number = TREE_VIEW.h): PixelRect {
  const vw = Math.min(w, scene.width);
  const vh = Math.min(h, scene.height);
  const cx = tree.left + Math.floor(tree.w / 2);
  const soil = tree.top + tree.h - 4;
  return {
    x: clamp(Math.round(cx - vw / 2), 0, scene.width - vw),
    y: clamp(Math.round(soil - vh * SOIL_AT), 0, scene.height - vh),
    w: vw,
    h: vh,
  };
}

/** Left of the tree's soil mound, where the renderer's visitor stands on the right (mirrored). */
function leftOf(tree: SceneTree): PixelPoint {
  return { x: tree.left + 2 - ACTOR_W, y: tree.top + tree.h - 4 - ACTOR_H };
}

/** Right of the soil mound: the renderer's own visitor spot. */
function rightOf(tree: SceneTree): PixelPoint {
  return { x: tree.left + tree.w - 2, y: tree.top + tree.h - 4 - ACTOR_H };
}

function centre(rect: PixelRect): PixelPoint {
  return { x: rect.x + Math.floor(rect.w / 2), y: rect.y + Math.floor(rect.h / 2) };
}

/** The well in the middle of the plaza: what a small screen keeps when it crops a whole-island panel. */
function plazaCentre(scene: IslandScene): PixelPoint {
  return centre({ x: scene.well.x, y: scene.well.y, ...spriteSize("well") });
}

function sized(at: PixelPoint | null, sprite: string): PixelRect[] {
  return at ? [{ x: at.x, y: at.y, ...spriteSize(sprite) }] : [];
}

/** Every tree with its decorations, every tag and the banner, with some sea around them, inside the scene. */
function festivalView(scene: IslandScene): PixelRect {
  const boxes: PixelRect[] = [
    ...scene.trees.flatMap((t) => [
      { x: t.left, y: t.top, w: t.w, h: t.h },
      ...sized(t.key, "key_flag"),
      ...sized(t.visitor, "visitor"),
      ...sized(t.lantern, "lantern"),
    ]),
    ...scene.tags.map((t) => ({ x: t.x, y: t.y, w: t.w, h: t.h })),
    ...sized(scene.banner, "banner"),
  ];
  if (!boxes.length) return wholeScene(scene);
  const x0 = Math.max(0, Math.min(...boxes.map((b) => b.x)) - FESTIVAL_MARGIN);
  const y0 = Math.max(0, Math.min(...boxes.map((b) => b.y)) - FESTIVAL_MARGIN);
  const x1 = Math.min(scene.width, Math.max(...boxes.map((b) => b.x + b.w)) + FESTIVAL_MARGIN);
  const y1 = Math.min(scene.height, Math.max(...boxes.map((b) => b.y + b.h)) + FESTIVAL_MARGIN);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function actor(frames: readonly string[], at: PixelPoint, flip: boolean): LiveActor {
  return { frames, x: at.x, y: at.y, frameMs: ACTOR_FRAME_MS, flip };
}

/** A tree panel: one plot at `stage` on slot 1, framed around its tree, with people beside it. */
function treePanel(n: number, stage: number, people: "builder" | "builder_and_tester"): StoryPanel {
  const scene = safeScene([plot(1, stage)]);
  const tree = scene?.trees[0] ?? null;
  const view = scene && tree ? treeView(scene, tree) : wholeScene(scene);
  const actors: LiveActor[] = [];
  if (tree) {
    // Both face the tree as drawn: the builder's hammer is on its right, the tester's phone on its left.
    actors.push(actor(ACTOR_FRAMES.builder, leftOf(tree), false));
    if (people === "builder_and_tester") actors.push(actor(ACTOR_FRAMES.tester, rightOf(tree), false));
  }
  return {
    n,
    scene,
    phase: "day",
    ambient: true,
    view,
    focus: tree ? { x: tree.left + Math.floor(tree.w / 2), y: tree.top + Math.floor(tree.h / 2) } : centre(view),
    actors,
    fallback: stage,
  };
}

/**
 * The four panels, in order:
 * 1 the empty island at dawn, sea and gulls moving;
 * 2 one plot with a seedling and its builder, by day;
 * 3 the same plot grown (stage 5), the builder and a tester trying the work;
 * 4 festival night: eight trees, three earned lanterns, banner and festoon.
 */
export function storyPanels(): StoryPanel[] {
  const empty = safeScene([]);
  const emptyView = wholeScene(empty);
  const festival = safeScene(FESTIVAL_PLOTS, true);
  const festivalRect = festival ? festivalView(festival) : wholeScene(festival);
  return [
    {
      n: 1,
      scene: empty,
      phase: "dawn",
      ambient: true,
      view: emptyView,
      focus: empty ? plazaCentre(empty) : centre(emptyView),
      actors: [],
      fallback: 0,
    },
    treePanel(2, 2, "builder"),
    treePanel(3, 5, "builder_and_tester"),
    {
      n: 4,
      scene: festival,
      phase: "night",
      ambient: true,
      view: festivalRect,
      focus: festival ? plazaCentre(festival) : centre(festivalRect),
      actors: [],
      fallback: 7,
    },
  ];
}

export interface PanelFit {
  /** Native pixels handed to IslandCanvas as its crop. */
  crop: PixelRect;
  /** Device pixels per native pixel: always a whole number. */
  scale: number;
  /** CSS size of the canvas. */
  width: number;
  height: number;
}

/** A fit filling less than this share of the box tries one more zoom step... */
export const ZOOM_BELOW = 0.8;
/** ...when the cropped view still shows at least this share of the view on both axes. */
export const KEEP_AT_LEAST = 0.6;

function around(view: PixelRect, focus: PixelPoint, w: number, h: number): PixelRect {
  return {
    x: clamp(Math.round(focus.x - w / 2), view.x, view.x + view.w - w),
    y: clamp(Math.round(focus.y - h / 2), view.y, view.y + view.h - h),
    w,
    h,
  };
}

/**
 * How to show `view` inside a box of `box` CSS pixels on a screen with this
 * device pixel ratio: the largest whole number of device pixels per native
 * pixel that fits, one step bigger (cropped around `focus`) when the fit
 * would leave the box mostly empty, and cropped to the box when even one
 * device pixel per native pixel is too big. Pixels stay square and crisp.
 */
export function fitPanel(view: PixelRect, focus: PixelPoint, box: { w: number; h: number }, dpr: number): PanelFit {
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const dw = Math.max(1, Math.floor(box.w * ratio));
  const dh = Math.max(1, Math.floor(box.h * ratio));
  let scale = Math.max(1, Math.floor(Math.min(dw / view.w, dh / view.h)));
  let w = Math.min(view.w, Math.floor(dw / scale));
  let h = Math.min(view.h, Math.floor(dh / scale));
  const fill = Math.max((view.w * scale) / dw, (view.h * scale) / dh);
  if (fill < ZOOM_BELOW) {
    const next = scale + 1;
    const nw = Math.min(view.w, Math.floor(dw / next));
    const nh = Math.min(view.h, Math.floor(dh / next));
    if (nw >= view.w * KEEP_AT_LEAST && nh >= view.h * KEEP_AT_LEAST) {
      scale = next;
      w = nw;
      h = nh;
    }
  }
  w = Math.max(1, w);
  h = Math.max(1, h);
  const crop = w === view.w && h === view.h ? { ...view } : around(view, focus, w, h);
  return { crop, scale, width: (crop.w * scale) / ratio, height: (crop.h * scale) / ratio };
}
