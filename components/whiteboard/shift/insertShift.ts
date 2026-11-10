"use client";

import { convertToExcalidrawElements, getCommonBounds } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { NOTE_LINE } from "@/lib/whiteboard/canvas-fit";
import {
  isPlacementObstacle,
  isShiftCardKind,
  projectCanvasSkeleton,
  shiftCardSkeleton,
  zoneFreeSlot,
  zoneSlot,
} from "@/lib/whiteboard/shift-cards";

import { insertElements, insertSkeletons } from "../insert";
import { fitCanvases } from "./useCanvasFit";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Whether a scene box is fully on screen. */
function onScreen(api: ExcalidrawImperativeAPI, box: { x: number; y: number; width: number; height: number }) {
  const { scrollX, scrollY, width, height, zoom } = api.getAppState();
  const left = -scrollX;
  const top = -scrollY;
  return box.x >= left && box.y >= top && box.x + box.width <= left + width / zoom.value && box.y + box.height <= top + height / zoom.value;
}

/**
 * Puts the selected note straight into typing. The + button that added it sits
 * outside Excalidraw, so keyboard focus is outside the board: hand focus back
 * to the board and send the Enter that Excalidraw uses to start editing a
 * selected note's text.
 */
function startTyping() {
  requestAnimationFrame(() => {
    const board = document.querySelector<HTMLElement>(".excalidraw-container") ?? document.querySelector<HTMLElement>(".excalidraw");
    if (!board) return;
    board.focus();
    board.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
  });
}

/** Most new lines a full zone grows by for one note (notes dragged off the grid can need two). */
const MAX_GROW = 3;

/**
 * Adds an empty note to a canvas zone, in the zone's next free slot, as part of
 * the zone's project frame, and starts typing on it. A full zone grows by a
 * line first, and the rows below it move down.
 */
export function insertZoneNote(api: ExcalidrawImperativeAPI, zoneId: string) {
  const find = () => {
    const scene = api.getSceneElements();
    return { scene, zone: scene.find((el) => el.id === zoneId) };
  };
  let { scene, zone } = find();
  const kind = zone?.customData?.zone;
  if (!zone || !isShiftCardKind(kind)) return;
  for (let i = 0; i < MAX_GROW && zone && zone.frameId && !zoneFreeSlot(zone, scene.filter(isPlacementObstacle)); i++) {
    if (!fitCanvases(api, [zone.frameId], { zoneId, height: NOTE_LINE })) break;
    ({ scene, zone } = find());
  }
  if (!zone) return;
  const placedZone = zone;
  const inZone = scene.filter(
    (el) =>
      el.customData?.card &&
      el.x >= placedZone.x &&
      el.y >= placedZone.y &&
      el.x < placedZone.x + placedZone.width &&
      el.y < placedZone.y + placedZone.height,
  ).length;
  const at = zoneSlot(zone, scene.filter(isPlacementObstacle), inZone);
  const elements = convertToExcalidrawElements([shiftCardSkeleton(kind)]).map(
    (el) => ({ ...el, frameId: placedZone.frameId ?? null }) as ExcalidrawElement,
  );
  const placed = insertElements(api, elements, at);
  const note = placed.find((el) => el.type === "rectangle");
  if (note && !onScreen(api, note)) api.scrollToContent(note, { animate: false });
  startTyping();
}

/** Space between a new canvas and what is already on the board. */
const CANVAS_GAP = 240;

/**
 * Adds an empty project canvas to the right of everything already on the
 * board (or where the viewer is looking on an empty board), so it never lands
 * on someone else's work, then zooms to it with nothing selected.
 */
export function insertProjectCanvas(api: ExcalidrawImperativeAPI, ownerName: string) {
  const skeletons = projectCanvasSkeleton(`โปรเจกต์ · ${ownerName}`);
  const frame = skeletons.at(-1) as { width: number; height: number };
  const existing = api.getSceneElements();
  let at: { x: number; y: number } | undefined;
  if (existing.length) {
    const [, minY, maxX] = getCommonBounds(existing);
    at = { x: maxX + CANVAS_GAP + frame.width / 2, y: minY + frame.height / 2 };
  }
  const placed = insertSkeletons(api, skeletons, at);
  api.updateScene({ appState: { selectedElementIds: {} } });
  const canvas = placed.find((el) => el.type === "frame");
  api.scrollToContent(canvas ?? placed, { fitToViewport: true, viewportZoomFactor: 0.9, animate: !reducedMotion() });
}
