"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from "react";

import type { IslandHotspot, IslandPicture } from "@/lib/shift-island/picture";
import { pxPerNativeFor, type Rect } from "@/lib/shift-island/live/geometry";
import { PHASE_TINT, waterColor } from "@/lib/shift-island/live/lighting";
import { NO_PLAZA, plazaWorld, type PlazaInput, type PlazaLabelId, type PlazaSpotId } from "@/lib/shift-island/live/plaza";
import type { LightPhase } from "@/lib/shift-island/live/types";
import { HUD_RESERVE, scrollToCentre, worldLayout, type Insets } from "@/lib/shift-island/live/world";

import { COMMON, HUD, ISLAND, stageName } from "./copy";
import islandStyles from "./island.module.css";
import { IslandLive } from "./live/IslandLive";
import liveStyles from "./live/live.module.css";
import { PlazaLayer } from "./live/PlazaLayer";
import { PlotMarker } from "./player/PlotMarker";
import styles from "./world.module.css";

interface IslandViewportProps {
  picture: IslandPicture | null;
  /** Hotspots on; off for the no-project screen, which only shows the place. */
  interactive?: boolean;
  /** Changes on every check-in tap: replays the dust puff at the student's tree. */
  puffKey?: number;
  onPlot?: (hotspot: IslandHotspot) => void;
  /** True while a sheet or the story covers the island: the living island stops every timer. */
  paused?: boolean;
  /** The whole island between the HUD bars, instead of the close view. */
  whole?: boolean;
  /**
   * Bangkok's light when the server rendered the page, so a night visit is
   * dark from the first paint instead of flashing the daytime picture.
   */
  initialPhase?: LightPhase;
  /**
   * The plaza (notice board, Demo Day festival, campfire), drawn by the
   * living island; labels are their DOM text, names the tap targets' aria-labels.
   */
  plaza?: {
    input: PlazaInput;
    labels: Partial<Record<PlazaLabelId, string>>;
    names: Partial<Record<PlazaSpotId, string>>;
    onSpot?: (id: PlazaSpotId) => void;
  };
  /** The living island became (true) or stopped being (false) the picture on screen. */
  onLiveChange?: (live: boolean) => void;
  /**
   * The notice board's tap target is (true) or is not (false) on screen
   * between the HUD bars, in the close view, big enough to tap: only then
   * can it stand in for the bottom board button.
   */
  onNoticeVisible?: (visible: boolean) => void;
  /**
   * The viewer, for their own picture over their own plot's pin. Passed only
   * by the island of a student with a plot (IslandHome); the picture data
   * itself never carries identity, and no other plot ever gets a picture.
   */
  me?: { name: string; avatarUrl: string | null };
}

/** The HUD's reserve over the world (top bar with the coin pill, bottom bar): the notice board under it does not count as seen. */
const HUD_MARGIN = `-${HUD_RESERVE.top}px 0px -${HUD_RESERVE.bottom}px 0px`;
/** How much of the notice board's tap target must be in that area to count. */
const NOTICE_SEEN = 0.6;

export function hotspotLabel(hotspot: IslandHotspot): string {
  return hotspot.mine ? ISLAND.myPlot(hotspot.slot, stageName(hotspot.stage)) : ISLAND.plot(hotspot.slot);
}

/** The server and the first client render use 2x; the device's own ratio follows after hydration. */
const SERVER_ZOOM = 2;
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
/** The open sea in daylight: the world's colour until the living island says otherwise. */
const DAY_SEA = waterColor("day");
/** A mouse drag shorter than this is still a click on a plot. */
const DRAG_SLOP = 4;
/** The tap hint steps aside after this long (its fade starts at 6s in world.module.css). */
const HINT_MS = 6400;

/** The phase's light as a multiply colour: the PNG under it looks like the canvas's tinted land. */
function tintColor(phase: LightPhase): string {
  const [r, g, b] = PHASE_TINT[phase].map((m) => Math.round(m * 255));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Arrow keys move between plots in their order on the island; Home and End go to either end. */
function nextPlotIndex(key: string, index: number, count: number): number | null {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return Math.min(index + 1, count - 1);
    case "ArrowLeft":
    case "ArrowUp":
      return Math.max(index - 1, 0);
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

function subscribeResize(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** CSS px per native pixel before the screen is measured: about 2x, on whole device pixels. */
function usePxPerNative(): number {
  return useSyncExternalStore(
    subscribeResize,
    () => pxPerNativeFor(window.devicePixelRatio || 1),
    () => SERVER_ZOOM
  );
}

interface ScreenBox {
  w: number;
  h: number;
  dpr: number;
  safe: Insets;
}

const sameBox = (a: ScreenBox | null, b: ScreenBox) =>
  !!a &&
  a.w === b.w &&
  a.h === b.h &&
  a.dpr === b.dpr &&
  a.safe.top === b.safe.top &&
  a.safe.right === b.safe.right &&
  a.safe.bottom === b.safe.bottom &&
  a.safe.left === b.safe.left;

/**
 * The world's size on screen, the device pixel ratio and the safe-area
 * insets; null until measured (the server, and jsdom where nothing has a size).
 */
function useScreenBox(world: RefObject<HTMLDivElement | null>, probe: RefObject<HTMLDivElement | null>): ScreenBox | null {
  const [box, setBox] = useState<ScreenBox | null>(null);
  useLayoutEffect(() => {
    const element = world.current;
    if (!element) return;
    const read = () => {
      const style = probe.current ? window.getComputedStyle(probe.current) : null;
      const px = (v: string | undefined) => parseFloat(v ?? "") || 0;
      const safe = style
        ? { top: px(style.paddingTop), right: px(style.paddingRight), bottom: px(style.paddingBottom), left: px(style.paddingLeft) }
        : NO_INSETS;
      const next = { w: element.clientWidth, h: element.clientHeight, dpr: window.devicePixelRatio || 1, safe };
      if (next.w <= 0 || next.h <= 0) return;
      setBox((current) => (sameBox(current, next) ? current : next));
    };
    read();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(read) : null;
    observer?.observe(element);
    // A browser zoom changes the pixel ratio without resizing the element.
    window.addEventListener("resize", read);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", read);
    };
  }, [world, probe]);
  return box;
}

/**
 * A mouse can drag the world to pan it (touch pans natively). A drag never
 * ends in a click on a plot. Plain DOM listeners: no React render per move.
 */
function useMouseDragPan(world: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const element = world.current;
    if (!element) return;
    let drag: { id: number; x: number; y: number; left: number; top: number; moved: boolean } | null = null;
    let swallowClick = false;

    const down = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop, moved: false };
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_SLOP) return;
      if (!drag.moved) {
        drag.moved = true;
        element.dataset.dragging = "true";
        element.setPointerCapture?.(event.pointerId);
      }
      element.scrollLeft = drag.left - dx;
      element.scrollTop = drag.top - dy;
    };
    const up = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      swallowClick = drag.moved;
      drag = null;
      delete element.dataset.dragging;
      if (element.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    const click = (event: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    };

    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    element.addEventListener("click", click, true);
    return () => {
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("click", click, true);
    };
  }, [world]);
}

const px = (r: Rect): CSSProperties => ({ left: r.x, top: r.y, width: r.w, height: r.h });

/**
 * The island as a full-screen world: the living island (one canvas) fills the
 * screen edge to edge, the sea going on past the picture in every direction.
 * The island is drawn at whole device pixels per native pixel (about 2x, more
 * when it fits; "whole" fits it between the HUD bars) and pans by touch, mouse
 * drag or focus. The server-rendered PNG paints first and stays whenever the
 * canvas cannot draw. Each plot is a transparent button over the picture.
 */
export function IslandViewport({
  picture,
  interactive = true,
  puffKey = 0,
  onPlot,
  paused = false,
  whole = false,
  initialPhase,
  plaza,
  onLiveChange,
  onNoticeVisible,
  me,
}: IslandViewportProps) {
  const world = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const zoom = usePxPerNative();
  const box = useScreenBox(world, probe);
  useMouseDragPan(world);
  // The src that failed, not a flag: the next picture (a new ?v= after any
  // action) clears the error by itself, with no remount and no scroll jump.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [liveReady, setLiveReady] = useState(false);
  const [liveFailed, setLiveFailed] = useState(false);
  /** The light of the hour and the open sea's colour in it: the server's guess, then the living island's. */
  const [light, setLight] = useState<{ phase: LightPhase; sea: string } | null>(() =>
    initialPhase ? { phase: initialPhase, sea: waterColor(initialPhase) } : null
  );
  /** The plot that holds the group's one tab stop, once the student has moved to one. */
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  // A timer, not only the CSS fade, so the hint also goes under reduced motion.
  const [hintGone, setHintGone] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setHintGone(true), HINT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const liveOn = picture?.scene != null && !liveFailed;
  // When the canvas goes away (no scene), the PNG shows again until a new canvas has drawn.
  const [liveWasOn, setLiveWasOn] = useState(liveOn);
  if (liveOn !== liveWasOn) {
    setLiveWasOn(liveOn);
    if (!liveOn) setLiveReady(false);
  }
  const live = liveOn && liveReady;
  // The canvas draws from the scene, not the PNG: a failed PNG matters only without it.
  const broken = picture != null && failedSrc === picture.src && !liveOn;

  // The plaza's sprites change only with its input: one repaint each, never per frame.
  const scene = picture?.scene ?? null;
  const plazaInput = plaza?.input ?? null;
  const plazaKey = plazaInput ? JSON.stringify(plazaInput) : null;
  const plazaView = useMemo(
    () => (scene && plazaInput ? plazaWorld(scene, plazaInput) : NO_PLAZA),
    // The key stands for the input, which callers rebuild on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scene, plazaKey]
  );

  const liveChange = useRef(onLiveChange);
  useEffect(() => {
    liveChange.current = onLiveChange;
  });
  useEffect(() => {
    liveChange.current?.(live);
  }, [live]);
  // Gone from the screen: the canvas is no longer the picture.
  useEffect(() => () => liveChange.current?.(false), []);

  // The notice board on screen, seen through the world's own scrolling (no React render per scroll).
  const noticeChange = useRef(onNoticeVisible);
  useEffect(() => {
    noticeChange.current = onNoticeVisible;
  });
  const noticeSpot = live && !whole && interactive && !!plaza?.onSpot && !!plaza?.names.notice;
  useEffect(() => {
    const report = (visible: boolean) => noticeChange.current?.(visible);
    const root = world.current;
    const spot = noticeSpot ? root?.querySelector<HTMLElement>('[data-spot="notice"]') : null;
    if (!root || !spot || typeof IntersectionObserver !== "function") {
      report(false);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (entry) report(entry.isIntersecting && entry.intersectionRatio >= NOTICE_SEEN);
      },
      { root, rootMargin: HUD_MARGIN, threshold: [0, NOTICE_SEEN, 1] }
    );
    observer.observe(spot);
    return () => {
      observer.disconnect();
      report(false);
    };
  }, [noticeSpot]);

  const layout =
    box && picture
      ? worldLayout({ viewW: box.w, viewH: box.h, dpr: box.dpr, sceneW: picture.width, sceneH: picture.height, safe: box.safe, whole })
      : null;
  const scale = layout?.scale ?? zoom;
  const mine = picture?.mine ?? null;

  // Start on the student's plot (or the island's middle) whenever the scale or the world changes.
  const centreKey = layout ? `${layout.scale}|${layout.world.w}x${layout.world.h}|${mine?.slot ?? "-"}` : null;
  useEffect(() => {
    const element = world.current;
    if (!element || !layout || !box) return;
    const point = mine ? { x: mine.x + mine.w / 2, y: mine.y + mine.h / 2 } : { x: 50, y: 50 };
    const at = scrollToCentre(layout, { w: box.w, h: box.h }, point, box.safe);
    element.scrollLeft = at.left;
    element.scrollTop = at.top;
    // The key stands for the layout, the box and the plot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreKey]);

  const sea = light?.sea ?? DAY_SEA;
  const shade = light?.phase;
  // Until the canvas draws (or when it cannot), the daytime PNG takes the hour's light too.
  const pngTint = !live && light && light.phase !== "day" ? tintColor(light.phase) : null;

  if (!picture || broken) {
    return (
      <>
        <div ref={world} className={styles.world} style={{ background: sea }} data-empty="true">
          <div ref={probe} className={styles.safeProbe} aria-hidden="true" />
        </div>
        <div className={styles.failed}>
          <div className={styles.failedBox}>
            <p className={styles.failedLine} role="status">
              {ISLAND.pictureFailed}
            </p>
            {picture ? (
              <button
                type="button"
                className={islandStyles.quietButton}
                onClick={() => {
                  // A fresh URL, so the browser does not hand back the failed answer.
                  setRetry((n) => n + 1);
                  setFailedSrc(null);
                }}
              >
                {COMMON.retry}
              </button>
            ) : null}
          </div>
        </div>
      </>
    );
  }

  const islandRect: CSSProperties = layout ? px(layout.island) : { width: picture.width * zoom, height: picture.height * zoom };
  const canvasRect: CSSProperties = layout ? px(layout.canvas) : islandRect;
  const src = retry > 0 ? `${picture.src}${picture.src.includes("?") ? "&" : "?"}r=${retry}` : picture.src;
  const pictureSrc = picture.src;
  const hotspots = picture.hotspots;
  const tabSlot = hotspots.some((h) => h.slot === activeSlot)
    ? activeSlot
    : (hotspots.find((h) => h.mine)?.slot ?? hotspots[0]?.slot ?? null);

  function onPlotKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = hotspots.findIndex((h) => h.slot === tabSlot);
    const next = index < 0 ? null : nextPlotIndex(event.key, index, hotspots.length);
    if (next == null) return;
    event.preventDefault();
    const slot = hotspots[next].slot;
    setActiveSlot(slot);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-slot="${slot}"]`)?.focus();
  }

  return (
    <>
      <div
        ref={world}
        className={styles.world}
        style={{ background: sea }}
        data-live={live ? "true" : undefined}
        data-whole={whole ? "true" : undefined}
      >
        <div ref={probe} className={styles.safeProbe} aria-hidden="true" />
        <div
          className={styles.sizer}
          data-measured={layout ? "true" : "false"}
          style={layout ? { width: layout.world.w, height: layout.world.h } : undefined}
        >
          <div className={styles.islandBox} style={islandRect}>
            {/* A pixel-art PNG from our own route: next/image would resample it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={ISLAND.pictureAlt}
              width={Math.round(picture.width * scale)}
              height={Math.round(picture.height * scale)}
              className={styles.image}
              style={live ? { visibility: "hidden" } : undefined}
              draggable={false}
              onError={() => setFailedSrc(pictureSrc)}
            />
            {pngTint ? <span className={styles.tint} style={{ background: pngTint }} aria-hidden="true" /> : null}
          </div>
          {liveOn && picture.scene ? (
            <div className={styles.canvasBox} style={canvasRect}>
              <IslandLive
                scene={picture.scene}
                paused={paused}
                fit={whole}
                crop={layout?.frame}
                scroller={world}
                actors={plazaView.actors}
                className={liveStyles.live}
                onReady={() => setLiveReady(true)}
                onFail={() => setLiveFailed(true)}
                onPhase={(phase, water) => setLight({ phase, sea: water })}
              />
            </div>
          ) : null}
          <div className={styles.islandBox} style={islandRect}>
            {live ? <span role="img" aria-label={ISLAND.pictureAlt} className={liveStyles.label} /> : null}
            {/* Your own picture over your own pin: decorative, never takes a tap. */}
            {me && mine ? <PlotMarker picture={picture} me={me} /> : null}
            {interactive ? (
              // One tab stop for every plot (the student's own, at first); arrow keys move between them.
              <div role="group" aria-label={HUD.plots} className={styles.hotspots} onKeyDown={onPlotKey}>
                {picture.hotspots.map((hotspot) => (
                  <button
                    key={hotspot.slot}
                    type="button"
                    className={styles.hotspot}
                    data-slot={hotspot.slot}
                    data-mine={hotspot.mine ? "true" : undefined}
                    tabIndex={hotspot.slot === tabSlot ? 0 : -1}
                    onFocus={() => setActiveSlot(hotspot.slot)}
                    style={{
                      left: `${hotspot.x + hotspot.w / 2}%`,
                      top: `${hotspot.y + hotspot.h / 2}%`,
                      // A 48px floor close up; the whole island puts plots closer
                      // than 48px, so the native box (at least 12px) is used instead.
                      width: whole ? `${hotspot.w}%` : `max(48px, ${hotspot.w}%)`,
                      height: whole ? `${hotspot.h}%` : `max(48px, ${hotspot.h}%)`,
                    }}
                    aria-label={hotspotLabel(hotspot)}
                    onClick={() => {
                      setHintGone(true);
                      onPlot?.(hotspot);
                    }}
                  />
                ))}
                {mine && puffKey > 0 ? (
                  <span
                    key={puffKey}
                    className={styles.puff}
                    style={{ left: `${mine.x + mine.w / 2}%`, top: `${mine.y + mine.h}%` }}
                    aria-hidden="true"
                  >
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                ) : null}
              </div>
            ) : null}
            {plaza ? (
              <PlazaLayer
                world={plazaView}
                labels={plaza.labels}
                names={plaza.names}
                onSpot={
                  plaza.onSpot
                    ? (id) => {
                        setHintGone(true);
                        plaza.onSpot?.(id);
                      }
                    : undefined
                }
                // The PNG draws no plaza: its tap targets go with the canvas.
                interactive={interactive && liveOn}
                showLabels={live && !whole}
                whole={whole}
              />
            ) : null}
          </div>
        </div>
      </div>
      <div className={styles.shade} data-phase={shade} aria-hidden="true" />
      {interactive && picture.hotspots.length > 0 && !hintGone ? (
        <p className={styles.tapHint} aria-hidden="true">
          {ISLAND.tapHint}
        </p>
      ) : null}
    </>
  );
}
