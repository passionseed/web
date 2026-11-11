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
 * The clock counts running time only: after a pause the island carries on
 * where it stopped and never replays missed ticks.
 */
import type { IslandScene } from "@/bot/src/quests/island/scene";

import { buildAtlasData, type AtlasData } from "./atlas";
import { TICK_MS, motionAt, nextTickAt, type Motion } from "./clock";
import { dirtyRects, paintLand, paintOverlay, redrawRect, sceneModel, seaRectsFor, type DrawContext, type Layers, type SceneModel } from "./draw";
import { area, exposed, intersect, visibleRect, type Rect } from "./geometry";
import { bangkokPhase, waterColor } from "./lighting";
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

/**
 * Atlases by phase, shared by every island on the page (the viewport and the
 * story panels): built and uploaded once, never drawn into afterwards.
 */
const sharedAtlases = new Map<LightPhase, { data: AtlasData; image: HTMLCanvasElement }>();

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
  private drawn: Motion | null = null;
  private lastTick = -1;
  private lowDetail = false;
  private nextPhaseCheck = 0;
  private swaying: boolean[] = [];
  private actorsKey: string;
  private readonly cleanup: (() => void)[] = [];
  private scrollerCleanup: (() => void) | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    props: LiveIslandProps,
    private readonly events: LiveIslandEvents = {}
  ) {
    this.props = props;
    this.actorsKey = actorsKey(props.actors);
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
      if (!this.ready) return;
      const cropChanged = JSON.stringify(next.crop) !== JSON.stringify(prev.crop);
      // A refreshed page sends an equal scene as a new object: only a real change rebuilds.
      const sceneChanged = next.scene !== prev.scene && JSON.stringify(next.scene) !== JSON.stringify(prev.scene);
      let repaint = false;
      if (sceneChanged || cropChanged) {
        this.prepareScene();
        repaint = true;
      }
      if (next.phase !== prev.phase) this.checkPhase();
      if (actorsChanged || next.ambient !== prev.ambient || next.fit !== prev.fit) {
        this.measure();
        repaint = true;
      }
      if (repaint) this.paintAll();
      this.sync();
    });
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

  /** First build: atlas and layers in one animation frame, the first frame in the next (each well under 16 ms). */
  private init(): void {
    this.initRaf = 0;
    this.phase = this.wantedPhase();
    this.nextPhaseCheck = performance.now() + PHASE_CHECK_MS;
    this.prepareScene();
    const first = () =>
      this.guard(() => {
        this.initRaf = 0;
        this.paintAll();
        this.stillShown = this.isStill();
        this.ready = true;
        this.events.onReady?.();
        this.events.onPhase?.(this.phase, waterColor(this.phase));
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
  }

  private start(): void {
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
    if (this.initRaf) cancelAnimationFrame(this.initRaf);
    if (this.eventRaf) cancelAnimationFrame(this.eventRaf);
    this.initRaf = 0;
    this.eventRaf = 0;
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
    this.events.onPhase?.(phase, waterColor(phase));
  }

  // ------------------------------------------------------------- layers

  private atlas(phase: LightPhase): { data: AtlasData; image: HTMLCanvasElement } {
    let entry = sharedAtlases.get(phase);
    if (!entry) {
      const data = buildAtlasData(phase);
      const image = newCanvas(data.width, data.height);
      // Once per phase, never in the loop.
      context(image).putImageData(new ImageData(new Uint8ClampedArray(data.data), data.width, data.height), 0, 0);
      entry = { data, image };
      sharedAtlases.set(phase, entry);
    }
    return entry;
  }

  /** The scene's model, the canvas size, the land layer and the tag overlay. */
  private prepareScene(): void {
    const { scene } = this.props;
    this.model = sceneModel(scene);
    this.swaying = this.model.trees.map((t) => t.b != null);
    const frame = this.frameRect();
    if (this.canvas.width !== frame.w) this.canvas.width = frame.w;
    if (this.canvas.height !== frame.h) this.canvas.height = frame.h;
    const atlas = this.atlas(this.phase);
    this.overlayCanvas = this.sized(this.overlayCanvas, scene.width, scene.height);
    const overlay = context(this.overlayCanvas);
    overlay.clearRect(0, 0, scene.width, scene.height);
    paintOverlay(overlay as DrawContext<Img>, this.model, atlas.image, atlas.data.rects);
    this.buildLand();
    this.measure();
  }

  private sized(c: HTMLCanvasElement | null, w: number, h: number): HTMLCanvasElement {
    if (!c) return newCanvas(w, h);
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    return c;
  }

  private buildLand(): void {
    const model = this.model;
    if (!model) return;
    const atlas = this.atlas(this.phase);
    this.landCanvas = this.sized(this.landCanvas, model.scene.width, model.scene.height);
    const land = context(this.landCanvas);
    land.clearRect(0, 0, model.scene.width, model.scene.height);
    paintLand(land as DrawContext<Img>, model, atlas.image, atlas.data.rects);
    this.layers = {
      atlas: atlas.image,
      rects: atlas.data.rects,
      flipped: atlas.data.flipped,
      seaRects: seaRectsFor(atlas.data.rects),
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

  private motion(tick: number): Motion {
    const model = this.model!;
    return motionAt(tick, {
      span: this.span(),
      scene: model.scene,
      swaying: this.swaying,
      actors: this.props.actors,
      ambient: this.props.ambient,
      still: this.isStill(),
      lowDetail: this.lowDetail,
      night: this.phase === "night",
    });
  }

  private currentTick(): number {
    const step = this.step();
    return Math.floor(this.elapsed(performance.now()) / (TICK_MS * step)) * step;
  }

  private paint(rects: Rect[], motion: Motion): void {
    const ctx = this.ctx;
    const model = this.model;
    const layers = this.layers;
    if (!ctx || !model || !layers || rects.length === 0) return;
    const frame = this.frameRect();
    ctx.setTransform(1, 0, 0, 1, -frame.x, -frame.y);
    ctx.imageSmoothingEnabled = false;
    const state = { motion, night: this.phase === "night", actors: this.props.actors };
    for (const r of rects) {
      const clipped = intersect(r, frame);
      if (clipped) redrawRect(ctx as DrawContext<Img>, clipped, model, layers, state);
    }
  }

  /** The whole canvas, at the current moment. */
  private paintAll(): void {
    if (!this.model) return;
    const motion = this.motion(this.currentTick());
    this.paint([this.frameRect()], motion);
    this.drawn = motion;
  }

  /** One tick: only what changed, only where it is on screen. */
  private paintTick(motion: Motion): void {
    const model = this.model;
    const layers = this.layers;
    if (!model || !layers) return;
    const view = this.view;
    if (!view) {
      // Nothing on screen: the next reveal paints it fresh.
      this.drawn = motion;
      return;
    }
    const dirty = dirtyRects(this.drawn, motion, model, layers.rects, this.props.actors);
    this.drawn = motion;
    if (dirty === "all") {
      this.paint([view], motion);
      return;
    }
    const parts = dirty.map((r) => intersect(r, view)).filter((r): r is Rect => r != null);
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
