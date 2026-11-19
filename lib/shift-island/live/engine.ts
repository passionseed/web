/**
 * The living island's loop: one canvas, drawn from the scene with the atlas
 * of the current light phase. Browser only (it touches the DOM); import it
 * from client components.
 *
 * Cheap by design:
 * - setTimeout to the next due tick, then one requestAnimationFrame; nothing
 *   is drawn when nothing visible changed, and only the part of the island on
 *   screen is ever repainted on a tick (what a scroll reveals is painted as it
 *   appears);
 * - no getImageData or putImageData in the loop, no filters, shadows or
 *   full-canvas blends, no React state per frame;
 * - zero timers while off-screen, in a hidden tab, paused (a sheet is open),
 *   still, or under prefers-reduced-motion (then one still frame is drawn).
 *
 * People idle (people.ts): whoever stands or sits breathes and now and then
 * blinks, each new frame inside its own sprite's box, so a quiet island
 * repaints a few small rects a second for them (about 18 x 22 native px each,
 * with the shadow's margin). A new frame that draws the same sprite in the
 * same place repaints nothing (draw.ts dirtyRects), so standing between
 * breaths costs nothing. Reduced motion and a still island draw everyone
 * plain and repaint nothing for them.
 *
 * The island's small life (ambient.ts, through fx.ts) by day: a sparrow or
 * two and a few butterflies repaint only their own boxes (a bird high over
 * its shadow repaints the two apart) on the ticks they move, and a gust
 * repaints each tuft or flower patch it bends, a few px each, as it crosses.
 * Their state is worked out once per tick. None of it at night, on a still
 * or tiny island or under reduced motion.
 *
 * The interact outline (outline.ts): the one clickable thing nearest the
 * player's aim, or the hotspot a keyboard focused, gets a 1 px ring round its
 * silhouette. The rings are made from the atlas's alpha when a thing is
 * picked (every shape it can take, once) and kept; a tick only works out
 * which thing is nearest (the things that never move are searched once per
 * aim, the walkers whose path comes near it on each tick) and repaints the
 * old and new rings' boxes when the pick changes. A walker, the fire's flame
 * or a swaying tree that carries its ring along repaints it in its own
 * padded box, and the pulse steps on the sea's beat, when the whole view
 * repaints anyway, so neither adds a repaint. An aim or focus that moves
 * repaints the old and new rings in one frame, also on a still island
 * (reduced motion), where the ring holds steady.
 *
 * The clock counts running time only: after a pause the island carries on
 * where it stopped and never replays missed ticks.
 */
import type { IslandScene } from "@/bot/src/quests/island/scene";

import { buildAtlasData, styleKey, stylesOf, type AtlasData } from "./atlas";
import { webSeaRects, webSprites } from "./atmosphere";
import { TICK_MS, motionAt, nextTickAt, type Motion } from "./clock";
import {
  actorRect,
  dirtyRects,
  paintLand,
  paintMarker,
  redrawRect,
  sceneModel,
  seaRectsFor,
  type DrawContext,
  type Layers,
  type SceneModel,
} from "./draw";
import { IslandFx, type FxMotion } from "./fx";
import { area, exposed, intersect, visibleRect, type Rect } from "./geometry";
import { gradeRgb, gradedWater } from "./grade";
import type { Aim, InteractTarget } from "./interact";
import { bangkokPhase } from "./lighting";
import { OutlineLayer, ringDirty, ringTickDirty, withRing, type Ring } from "./outline";
import { livelyActors, partnerSprite } from "./people";
import { paintSignposts, signposts, wholeUnit, type Signpost } from "./signposts";
import type { LightPhase, LiveActor } from "./types";

export interface LiveIslandProps {
  scene: IslandScene;
  phase: LightPhase | "auto";
  paused: boolean;
  still: boolean;
  actors: readonly LiveActor[];
  ambient: boolean;
  /**
   * Native px; null shows the whole scene. It may reach past the scene (even
   * start at a negative x or y): the open sea is drawn there, and the boat,
   * gulls and clouds cross the whole width.
   */
  crop: Rect | null;
  /** The whole island fitted to the box: at most 4 ticks a second, and a still sea when it is tiny. */
  fit: boolean;
  /** The element that scrolls the picture, to repaint only what is on screen; null repaints the whole canvas. */
  scroller: HTMLElement | null;
  /**
   * The slots whose sign shows a name: their signpost carries the ropes its
   * board hangs from (the board itself is DOM, PlotSigns). Close view only;
   * absent is none.
   */
  signs?: readonly number[];
  /**
   * The clickable things the interact outline can pick (interact.ts), their
   * actor indexes pointing into `actors`. Absent or empty: no outline.
   */
  targets?: readonly InteractTarget[];
}

export interface LiveIslandEvents {
  onReady?: () => void;
  onFail?: () => void;
  /** The light changed (also once with the first): the phase and the open sea's colour in it. */
  onPhase?: (phase: LightPhase, water: string) => void;
}

/** Re-read the Bangkok phase this often while running. */
const PHASE_CHECK_MS = 60_000;
/** Native px added around the visible part, so rounding never leaves a seam. */
const VIEW_MARGIN = 2;
/** No actor boxes yet (nothing drawn), one shared value. */
const NO_BOXES: readonly (Rect | null)[] = [];
/** Native px added round each dirty rect: a figure's contact shadow reaches just past its sprite. */
const SHADOW_PAD = 4;

type Img = CanvasImageSource;
type Ctx = CanvasRenderingContext2D;

function newCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function context(c: HTMLCanvasElement, alpha = true): Ctx {
  const ctx = c.getContext("2d", { alpha });
  if (!ctx) throw new Error("no 2d context");
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

const actorsKey = (actors: readonly LiveActor[]) => JSON.stringify(actors);
const signsKey = (signs: readonly number[] | undefined) => (signs ?? []).join(",");
const cropKey = (crop: Rect | null) => JSON.stringify(crop);

/**
 * The tick each new actor appeared on: an actor equal to one already shown
 * keeps that one's tick (a campfire count changing never replays an arrival),
 * anything new starts now.
 */
export function sinceFor(prev: readonly LiveActor[], prevSince: readonly number[], next: readonly LiveActor[], now: number): number[] {
  const free = new Map<string, number[]>();
  prev.forEach((actor, i) => {
    const key = JSON.stringify(actor);
    const list = free.get(key);
    if (list) list.push(prevSince[i] ?? 0);
    else free.set(key, [prevSince[i] ?? 0]);
  });
  return next.map((actor) => free.get(JSON.stringify(actor))?.shift() ?? now);
}

/**
 * Atlases by phase, shared by every island on the page (the viewport and the
 * story panels): built and uploaded once, never drawn into afterwards.
 */
const sharedAtlases = new Map<string, { data: AtlasData; image: HTMLCanvasElement }>();

export class LiveIsland {
  private readonly ctx: Ctx | null;
  private props: LiveIslandProps;
  private model: SceneModel | null = null;
  private layers: Layers<Img> | null = null;
  private landCanvas: HTMLCanvasElement | null = null;
  private overlayCanvas: HTMLCanvasElement | null = null;
  private phase: LightPhase = "day";
  private acc = 0;
  private since: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** A still island's one slow timer: re-reads Bangkok's light so a page left open still turns to dusk. */
  private phaseTimer: ReturnType<typeof setTimeout> | null = null;
  /** The loop's frame request. */
  private raf = 0;
  /** Init and first-frame requests. */
  private initRaf = 0;
  /** A scroll or resize repaint request. */
  private eventRaf = 0;
  private running = false;
  private ready = false;
  private failed = false;
  private destroyed = false;
  private onScreen = true;
  private hidden = false;
  private reduced = false;
  private stillShown = false;
  private view: Rect | null = null;
  /** The crop the layers were last built for (cropKey). */
  private builtCrop = "";
  private drawn: FxMotion | null = null;
  /** The atmosphere: water light, shadows, lamplight, glints and the breeze (web only). */
  private readonly fx = new IslandFx({ canvas: newCanvas, context: (c) => context(c) });
  private lastTick = -1;
  private lowDetail = false;
  private nextPhaseCheck = 0;
  private swaying: boolean[] = [];
  private actorsKey: string;
  /**
   * The actors as drawn: props.actors with the people's idle loops
   * (people.ts livelyActors), index for index, so a tap's index and a box
   * still name the same actor.
   */
  private cast: readonly LiveActor[];
  /** The actor boxes last read (actorBoxes), with the frame, actors and atlas they were read from. */
  private boxes: { at: Motion | number; actors: readonly LiveActor[]; rects: Layers<Img>["rects"]; list: readonly (Rect | null)[] } | null = null;
  /** Per actor, the tick it appeared on: a `once` actor (an arrival) plays from there. */
  private actorsSince: number[];
  /** The interact outline: which thing is picked, and its rings (made from the atlas's alpha, kept). */
  private readonly outline = new OutlineLayer<HTMLCanvasElement>((words, w, h) => {
    const c = newCanvas(w, h);
    // Once per shape of a newly picked thing, never per frame.
    context(c).putImageData(new ImageData(new Uint8ClampedArray(words.buffer, words.byteOffset, words.byteLength), w, h), 0, 0);
    return c;
  });
  /** The ring on the canvas now (null: none). */
  private ring: Ring<HTMLCanvasElement> | null = null;
  /** The atlas the layers were built with: its alpha is what the rings trace. */
  private atlasData: AtlasData | null = null;
  /** A ring repaint request after the aim or the focus moved. */
  private ringRaf = 0;
  private readonly cleanup: (() => void)[] = [];
  private scrollerCleanup: (() => void) | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    props: LiveIslandProps,
    private readonly events: LiveIslandEvents = {}
  ) {
    this.props = props;
    this.actorsKey = actorsKey(props.actors);
    this.cast = livelyActors(props.actors);
    this.actorsSince = props.actors.map(() => 0);
    this.outline.targets = props.targets ?? [];
    let ctx: Ctx | null = null;
    try {
      ctx = canvas.getContext("2d", { alpha: false });
    } catch {
      ctx = null;
    }
    this.ctx = ctx;
    if (!ctx) {
      this.fail();
      return;
    }
    this.guard(() => this.listen());
    this.initRaf = requestAnimationFrame(() => this.guard(() => this.init()));
  }

  /** New props from React. Scene and crop changes rebuild the layers; the clock carries on. */
  update(next: LiveIslandProps): void {
    const prev = this.props;
    this.props = next;
    if (this.failed || this.destroyed) return;
    this.guard(() => {
      if (next.scroller !== prev.scroller) this.watchScroller(next.scroller);
      const key = actorsKey(next.actors);
      const actorsChanged = key !== this.actorsKey;
      this.actorsKey = key;
      if (actorsChanged) {
        this.actorsSince = sinceFor(prev.actors, this.actorsSince, next.actors, this.currentTick());
        this.cast = livelyActors(next.actors);
      }
      const targetsChanged = next.targets !== prev.targets;
      if (targetsChanged) this.outline.targets = next.targets ?? [];
      if (!this.ready) return;
      const cropChanged = cropKey(next.crop) !== cropKey(prev.crop);
      // A refreshed page sends an equal scene as a new object: only a real change rebuilds.
      const sceneChanged = next.scene !== prev.scene && JSON.stringify(next.scene) !== JSON.stringify(prev.scene);
      let repaint = false;
      if (sceneChanged || cropChanged) {
        this.prepareScene();
        repaint = true;
      }
      if (next.phase !== prev.phase) this.checkPhase();
      // The fire, the countdown board and the goal's bulbs light the ground round them; the
      // signposts follow the view (bigger on the whole island) and the names hung on them.
      const postsChanged = next.fit !== prev.fit || signsKey(next.signs) !== signsKey(prev.signs);
      if ((actorsChanged || postsChanged) && !sceneChanged && !cropChanged) {
        this.buildLand();
        repaint = true;
      }
      if (actorsChanged || next.ambient !== prev.ambient || next.fit !== prev.fit) {
        this.measure();
        repaint = true;
      }
      if (repaint) this.paintAll();
      else if (targetsChanged) this.reRing();
      this.sync();
    });
  }

  /**
   * Where the player is aiming, native px (the middle of the visible map, or
   * the mouse pointer), with how far from a thing still counts as near; null
   * when nowhere (a mouse off the map). The ring follows in the next frame.
   */
  aim(aim: Aim | null): void {
    const was = this.outline.aim;
    if (was === aim || (was && aim && was.x === aim.x && was.y === aim.y && was.reach === aim.reach)) return;
    this.outline.aim = aim;
    this.reRing();
  }

  /** The hotspot a keyboard has focused (interact.ts plotKey or spotKey), or null: it shows the ring whatever the aim. */
  focus(key: string | null): void {
    if (this.outline.focused === key) return;
    this.outline.focused = key;
    this.reRing();
  }

  /**
   * Where each actor stands on screen now, native px: the frame last painted,
   * so a tap meets what the eye sees. Null for an actor not drawn; empty
   * before the first frame and after a failure. A read, never a repaint.
   * The same array comes back until another frame is painted or the actors
   * change, so a reader polling every frame (a bubble following a walker)
   * allocates nothing and can tell that nobody moved.
   *
   * `actors` is the list the caller's indexes point into. React hands the
   * engine a new list only after the caller's layout effects have run; until
   * then the answer is null (ask again next frame), never the boxes of
   * whoever stood at that index before.
   */
  actorBoxes(actors?: readonly LiveActor[]): readonly (Rect | null)[] | null {
    if (actors && actors !== this.props.actors) return null;
    const layers = this.layers;
    if (!this.ready || this.failed || this.destroyed || !this.model || !layers) return NO_BOXES;
    // The frame on the canvas, or (before the loop's first frame) the tick it is about to paint.
    const at = this.drawn ?? this.currentTick();
    const kept = this.boxes;
    if (kept && kept.at === at && kept.actors === this.props.actors && kept.rects === layers.rects) return kept.list;
    const motion = typeof at === "number" ? this.motion(at) : at;
    const list = this.cast.map((actor, i) => actorRect(actor, motion.actors[i] ?? 0, layers.rects));
    this.boxes = { at, actors: this.props.actors, rects: layers.rects, list };
    return list;
  }

  destroy(): void {
    this.destroyed = true;
    this.cancelAll();
    this.scrollerCleanup?.();
    for (const undo of this.cleanup.splice(0)) undo();
  }

  // ------------------------------------------------------------- lifecycle

  private guard(fn: () => void): void {
    if (this.failed || this.destroyed) return;
    try {
      fn();
    } catch {
      this.fail();
    }
  }

  private fail(): void {
    if (this.failed) return;
    this.failed = true;
    this.cancelAll();
    this.events.onFail?.();
  }

  private listen(): void {
    const onVisibility = () =>
      this.guard(() => {
        this.hidden = document.visibilityState === "hidden";
        if (!this.hidden && this.ready) this.checkPhase();
        this.sync();
      });
    this.hidden = document.visibilityState === "hidden";
    document.addEventListener("visibilitychange", onVisibility);
    this.cleanup.push(() => document.removeEventListener("visibilitychange", onVisibility));

    const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (mq) {
      this.reduced = mq.matches;
      const onMotion = () =>
        this.guard(() => {
          this.reduced = mq.matches;
          this.sync();
        });
      if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", onMotion);
        this.cleanup.push(() => mq.removeEventListener("change", onMotion));
      } else if (typeof mq.addListener === "function") {
        mq.addListener(onMotion);
        this.cleanup.push(() => mq.removeListener(onMotion));
      }
    }

    // A browser without IntersectionObserver counts the island as on screen.
    if (typeof IntersectionObserver === "function") {
      const io = new IntersectionObserver((entries) =>
        this.guard(() => {
          const entry = entries[entries.length - 1];
          if (entry) this.onScreen = entry.isIntersecting;
          this.sync();
        })
      );
      io.observe(this.canvas);
      this.cleanup.push(() => io.disconnect());
    }

    const onResize = () => this.reveal();
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(onResize);
      ro.observe(this.canvas);
      this.cleanup.push(() => ro.disconnect());
    } else {
      window.addEventListener("resize", onResize);
      this.cleanup.push(() => window.removeEventListener("resize", onResize));
    }
    this.watchScroller(this.props.scroller);
  }

  private watchScroller(scroller: HTMLElement | null): void {
    this.scrollerCleanup?.();
    this.scrollerCleanup = null;
    if (!scroller) return;
    const onScroll = () => this.reveal();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    this.scrollerCleanup = () => scroller.removeEventListener("scroll", onScroll);
  }

  /**
   * First build: atlas and layers in one animation frame; then the heavy
   * part (the shallows' distance field, the terrain) a slice per frame; then
   * the bake and the first frame. Each frame stays short; the picture under
   * the canvas shows until the first frame is drawn.
   */
  private init(): void {
    this.initRaf = 0;
    this.phase = this.wantedPhase();
    this.nextPhaseCheck = performance.now() + PHASE_CHECK_MS;
    this.fx.defer = true;
    this.prepareScene();
    this.fx.defer = false;
    const first = () =>
      this.guard(() => {
        this.initRaf = 0;
        const model = this.model;
        if (model && this.fx.pending && this.fx.prepare(model, this.phase)) {
          this.initRaf = requestAnimationFrame(first);
          return;
        }
        // A scene or crop that really changed while it built (update() waits for ready) is built now, at once.
        const scene = this.props.scene;
        const moved = !model || (scene !== model.scene && JSON.stringify(scene) !== JSON.stringify(model.scene));
        if (moved || cropKey(this.props.crop) !== this.builtCrop) this.prepareScene();
        else if (this.fx.pending) this.buildLand();
        this.paintAll();
        this.stillShown = this.isStill();
        this.ready = true;
        this.events.onReady?.();
        this.events.onPhase?.(this.phase, gradedWater(this.phase));
        this.sync();
      });
    this.initRaf = requestAnimationFrame(first);
  }

  private shouldRun(): boolean {
    const p = this.props;
    return this.ready && !this.failed && !this.destroyed && this.onScreen && !this.hidden && !p.paused && !this.isStill();
  }

  private isStill(): boolean {
    return this.props.still || this.reduced;
  }

  /** Starts or stops the loop to match the flags; a still island gets its one frame. */
  private sync(): void {
    if (!this.ready || this.failed || this.destroyed) return;
    if (this.shouldRun()) {
      if (!this.running) this.start();
      return;
    }
    if (this.running) this.stop();
    if (this.isStill() && !this.stillShown) {
      this.paintAll();
      this.stillShown = true;
    }
    this.syncPhaseTimer();
  }

  /**
   * A still island in Bangkok's light (reduced motion, say) has no loop to
   * notice the hour change, so one timer checks every PHASE_CHECK_MS while it
   * is on screen and the tab is visible. A paused or moving island needs none:
   * start() re-reads the phase and the loop does the rest.
   */
  private syncPhaseTimer(): void {
    const wanted =
      this.ready &&
      !this.failed &&
      !this.destroyed &&
      !this.running &&
      this.isStill() &&
      !this.props.paused &&
      this.onScreen &&
      !this.hidden &&
      this.props.phase === "auto";
    if (!wanted) {
      this.clearPhaseTimer();
      return;
    }
    if (this.phaseTimer) return;
    this.phaseTimer = setTimeout(() => {
      this.phaseTimer = null;
      this.guard(() => {
        this.checkPhase();
        this.syncPhaseTimer();
      });
    }, PHASE_CHECK_MS);
  }

  private clearPhaseTimer(): void {
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.phaseTimer = null;
  }

  private start(): void {
    this.clearPhaseTimer();
    this.running = true;
    this.stillShown = false;
    this.since = performance.now();
    this.checkPhase();
    // Repaint the view on the next frame: it may show an older moment.
    this.drawn = null;
    this.lastTick = -1;
    this.raf = requestAnimationFrame(() => this.guard(() => this.frame()));
  }

  /** Stops the loop: no timer and no frame request remain. */
  private stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.since != null) this.acc += performance.now() - this.since;
    this.since = null;
    this.running = false;
  }

  private cancelAll(): void {
    this.stop();
    this.clearPhaseTimer();
    if (this.initRaf) cancelAnimationFrame(this.initRaf);
    if (this.eventRaf) cancelAnimationFrame(this.eventRaf);
    if (this.ringRaf) cancelAnimationFrame(this.ringRaf);
    this.initRaf = 0;
    this.eventRaf = 0;
    this.ringRaf = 0;
  }

  private elapsed(now: number): number {
    return this.acc + (this.since == null ? 0 : now - this.since);
  }

  private step(): number {
    return this.props.fit ? 2 : 1;
  }

  private schedule(): void {
    if (!this.running) return;
    const ms = this.elapsed(performance.now());
    const due = nextTickAt(ms, this.step()) * TICK_MS;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.running) this.raf = requestAnimationFrame(() => this.guard(() => this.frame()));
    }, Math.max(0, due - ms));
  }

  private frame(): void {
    this.raf = 0;
    if (!this.running) return;
    const now = performance.now();
    if (now >= this.nextPhaseCheck) this.checkPhase();
    const step = this.step();
    const tick = Math.floor(this.elapsed(now) / (TICK_MS * step)) * step;
    if (tick !== this.lastTick) {
      this.lastTick = tick;
      this.paintTick(this.motion(tick));
    }
    this.schedule();
  }

  // ------------------------------------------------------------- phase

  private wantedPhase(): LightPhase {
    const p = this.props.phase;
    return p === "auto" ? bangkokPhase(Date.now()) : p;
  }

  /** Re-reads the phase (from the prop or Bangkok time); a change rebuilds the land in the new light. */
  private checkPhase(): void {
    this.nextPhaseCheck = performance.now() + PHASE_CHECK_MS;
    const phase = this.wantedPhase();
    if (phase === this.phase) return;
    this.phase = phase;
    this.buildLand();
    this.paintAll();
    this.events.onPhase?.(phase, gradedWater(phase));
  }

  // ------------------------------------------------------------- layers

  private atlas(phase: LightPhase): { data: AtlasData; image: HTMLCanvasElement } {
    // One atlas per phase and set of tree styles; a few at most, so the oldest is dropped past 6.
    const styles = stylesOf(this.props.scene.trees);
    const cacheKey = `${phase}|${styles.map(styleKey).sort().join(";")}`;
    let entry = sharedAtlases.get(cacheKey);
    if (!entry) {
      // The web's own sprite set (the breeze, no dotted lantern ring) in the web's grade of the hour.
      const data = buildAtlasData(phase, webSprites(), styles, gradeRgb);
      const image = newCanvas(data.width, data.height);
      // Once per phase, never in the loop.
      context(image).putImageData(new ImageData(new Uint8ClampedArray(data.data), data.width, data.height), 0, 0);
      entry = { data, image };
      if (sharedAtlases.size >= 6) sharedAtlases.delete(sharedAtlases.keys().next().value as string);
      sharedAtlases.set(cacheKey, entry);
    }
    return entry;
  }

  /** The scene's model, the canvas size, the land layer and the tag overlay. */
  private prepareScene(): void {
    const { scene } = this.props;
    this.model = sceneModel(scene);
    this.builtCrop = cropKey(this.props.crop);
    this.swaying = this.model.trees.map((t) => t.b != null);
    const frame = this.frameRect();
    if (this.canvas.width !== frame.w) this.canvas.width = frame.w;
    if (this.canvas.height !== frame.h) this.canvas.height = frame.h;
    this.buildLand();
    this.measure();
  }

  private sized(c: HTMLCanvasElement | null, w: number, h: number): HTMLCanvasElement {
    if (!c) return newCanvas(w, h);
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    return c;
  }

  /**
   * Each plot's signpost: sprite-sized close up, bigger on the whole island
   * (wholeUnit: about as big as the bot's tags, so the numbers still read),
   * with the ropes for a name's board only close up, where the names show.
   */
  private posts(model: SceneModel): Signpost[] {
    const fit = this.props.fit;
    return signposts(model.scene, { unit: fit ? wholeUnit(model.scene) : 1, hung: fit ? [] : this.props.signs });
  }

  private buildLand(): void {
    const model = this.model;
    if (!model) return;
    const atlas = this.atlas(this.phase);
    this.atlasData = atlas.data;
    const posts = this.posts(model);
    this.landCanvas = this.sized(this.landCanvas, model.scene.width, model.scene.height);
    const land = context(this.landCanvas);
    land.clearRect(0, 0, model.scene.width, model.scene.height);
    paintLand(land as DrawContext<Img>, model, atlas.image, atlas.data.rects);
    this.fx.bakeLand(land, model, this.phase, this.cast, atlas.image, atlas.data.rects, posts);
    // The signposts and the pin, in front of the trees and behind the plaza's people.
    this.overlayCanvas = this.sized(this.overlayCanvas, model.scene.width, model.scene.height);
    const overlay = context(this.overlayCanvas);
    overlay.clearRect(0, 0, model.scene.width, model.scene.height);
    paintSignposts(overlay as DrawContext<Img>, posts, atlas.image, atlas.data.rects);
    paintMarker(overlay as DrawContext<Img>, model, atlas.image, atlas.data.rects);
    this.layers = {
      atlas: atlas.image,
      rects: atlas.data.rects,
      flipped: atlas.data.flipped,
      // The open sea's extra looks after each tile's own frames (atmosphere.ts SEA_LOOKS), as fx.ts's seaFrame asks for them.
      seaRects: webSeaRects(seaRectsFor(atlas.data.rects), atlas.data.rects),
      land: this.landCanvas,
      overlay: this.overlayCanvas ?? this.landCanvas,
    };
  }

  /** What the canvas shows, in scene px: the crop inside the scene, or the whole scene. */
  private frameRect(): Rect {
    const whole = { x: 0, y: 0, w: this.props.scene.width, h: this.props.scene.height };
    const crop = this.props.crop;
    if (!crop) return whole;
    const r = { x: Math.round(crop.x), y: Math.round(crop.y), w: Math.max(1, Math.round(crop.w)), h: Math.max(1, Math.round(crop.h)) };
    return r;
  }

  /** Reads the on-screen part and the device scale (layout reads: only on init, scroll and resize). */
  private measure(): void {
    const frame = this.frameRect();
    const box = this.canvas.getBoundingClientRect();
    const dpr = typeof window.devicePixelRatio === "number" && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    const deviceScale = box.width > 0 ? (box.width / frame.w) * dpr : 2;
    this.lowDetail = this.props.fit && deviceScale < 2;
    const scroller = this.props.scroller;
    if (!scroller) {
      this.view = frame;
      return;
    }
    const s = scroller.getBoundingClientRect();
    const client = { left: s.left + scroller.clientLeft, top: s.top + scroller.clientTop, width: scroller.clientWidth, height: scroller.clientHeight };
    this.view = visibleRect(box, client, frame, VIEW_MARGIN);
  }

  // ------------------------------------------------------------- painting

  /** The scene's width, widened to the frame when the frame shows open sea beside it. */
  private span(): { x: number; w: number } {
    const frame = this.frameRect();
    const x = Math.min(0, frame.x);
    return { x, w: Math.max(this.props.scene.width, frame.x + frame.w) - x };
  }

  private motion(tick: number): FxMotion {
    const model = this.model!;
    const motion: Motion = motionAt(tick, {
      span: this.span(),
      scene: model.scene,
      swaying: this.swaying,
      actors: this.cast,
      actorsSince: this.actorsSince,
      ambient: this.props.ambient,
      still: this.isStill(),
      lowDetail: this.lowDetail,
      night: this.phase === "night",
    });
    return Object.assign(motion, { tick });
  }

  private currentTick(): number {
    const step = this.step();
    return Math.floor(this.elapsed(performance.now()) / (TICK_MS * step)) * step;
  }

  /** What the atmosphere needs to know about this frame. */
  private fxOptions() {
    return { frozen: this.isStill() || this.lowDetail, lowDetail: this.lowDetail, span: this.span(), sparse: this.props.fit };
  }

  private paint(rects: Rect[], motion: FxMotion): void {
    const ctx = this.ctx;
    const model = this.model;
    const layers = this.layers;
    if (!ctx || !model || !layers || rects.length === 0) return;
    const frame = this.frameRect();
    ctx.setTransform(1, 0, 0, 1, -frame.x, -frame.y);
    ctx.imageSmoothingEnabled = false;
    const actors = this.cast;
    const fx = withRing(this.fx.hooks(ctx, model, layers, motion, actors, this.fxOptions()), ctx as DrawContext<Img>, this.ring);
    const state = { motion, night: this.phase === "night", actors, fx };
    for (const r of rects) {
      const clipped = intersect(r, frame);
      if (clipped) redrawRect(ctx as DrawContext<Img>, clipped, model, layers, state);
    }
  }

  /** The whole canvas, at the current moment. */
  private paintAll(): void {
    if (!this.model) return;
    const motion = this.motion(this.currentTick());
    this.ring = this.ringAt(motion);
    this.paint([this.frameRect()], motion);
    this.drawn = motion;
  }

  /** The interact outline's ring on a frame (outline.ts), or null. */
  private ringAt(motion: FxMotion): Ring<HTMLCanvasElement> | null {
    const model = this.model;
    const atlas = this.atlasData;
    if (!model || !atlas || this.outline.targets.length === 0) return null;
    const frozen = this.isStill() || this.lowDetail;
    const tick = motion.tick;
    return this.outline.ring({
      model,
      actors: this.cast,
      motion,
      atlas,
      // The partner beside a tree as fx draws it: breathing and blinking, or plain when still.
      partner: frozen ? undefined : (i) => partnerSprite(tick, model.trees[i]?.tree.slot ?? i),
      still: frozen,
    });
  }

  /**
   * The aim, the focus or the targets moved: in the next frame, repaint the
   * old ring's box and the new one's at the moment on the canvas. Also on a
   * still island: it answers the player, it is not motion. While the loop
   * waits for its first frame, that frame draws the ring.
   */
  private reRing(): void {
    if (this.ringRaf || this.destroyed || this.failed) return;
    this.ringRaf = requestAnimationFrame(() =>
      this.guard(() => {
        this.ringRaf = 0;
        const motion = this.drawn;
        if (!this.ready || !motion) return;
        const next = this.ringAt(motion);
        const rects = ringDirty(this.ring, next);
        this.ring = next;
        if (rects.length) this.paint(rects, motion);
      })
    );
  }

  /** One tick: only what changed, only where it is on screen. */
  private paintTick(motion: FxMotion): void {
    const model = this.model;
    const layers = this.layers;
    if (!model || !layers) return;
    const view = this.view;
    if (!view) {
      // Nothing on screen: the next reveal paints it fresh.
      this.drawn = motion;
      return;
    }
    const prev = this.drawn;
    const dirty = dirtyRects(prev, motion, model, layers.rects, this.cast);
    this.drawn = motion;
    // The interact outline: the nearest thing may have walked in or out of reach, or the ring takes its next pulse step.
    const wasRing = this.ring;
    this.ring = this.ringAt(motion);
    if (dirty === "all" || !prev) {
      this.paint([view], motion);
      return;
    }
    // Petals on the breeze and the fire's glow, the ring; then a little room round everything for the figures' shadows.
    const extra = this.fx.dirty(prev, motion, model.scene, layers, this.fxOptions());
    extra.push(...ringTickDirty(wasRing, this.ring));
    const padded = [...dirty, ...extra].map((r) => ({ x: r.x - SHADOW_PAD, y: r.y - SHADOW_PAD, w: r.w + 2 * SHADOW_PAD, h: r.h + 2 * SHADOW_PAD }));
    const parts = padded.map((r) => intersect(r, view)).filter((r): r is Rect => r != null);
    const total = parts.reduce((sum, r) => sum + area(r), 0);
    this.paint(parts.length > 24 || total > area(view) / 2 ? [view] : parts, motion);
  }

  /** After a scroll or resize: paint what just came on screen, at the moment last drawn. One frame, no loop. */
  private reveal(): void {
    if (this.eventRaf || this.destroyed || this.failed) return;
    this.eventRaf = requestAnimationFrame(() =>
      this.guard(() => {
        this.eventRaf = 0;
        if (!this.ready) return;
        const before = this.view;
        const wasLow = this.lowDetail;
        this.measure();
        const after = this.view;
        if (!after) return;
        const motion = this.drawn ?? this.motion(this.currentTick());
        if (wasLow !== this.lowDetail && this.running) {
          this.drawn = null;
          return;
        }
        if (this.isStill() && this.stillShown) return;
        this.paint(exposed(before, after), motion);
      })
    );
  }
}
