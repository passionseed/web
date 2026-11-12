"use client";

import { getVisibleSceneBounds } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useMemo } from "react";

import { useSceneTick, useViewportTick } from "./useViewportTick";

/** Kinds of element that carry someone's words or drawing. */
const LABELLED = new Set(["text", "freedraw", "image"]);
const MAX_CHIPS = 400;
/** Screen pixels around the viewport where chips still render, so they do not pop in at the edge. */
const CULL_MARGIN = 200;

type Chip = { id: string; x: number; y: number; label: string };

/**
 * Admin overlay: a small name tag on each piece of writing, drawing or image
 * saying who made it (and who last edited it, when that is someone else).
 *
 * Chips are placed in scene coordinates inside one container that follows the
 * canvas with a single transform, so scrolling writes one style instead of one
 * per chip. Each chip undoes the zoom so its text stays the same size.
 */
export function AuthorsLayer({ api, nameOf }: { api: ExcalidrawImperativeAPI; nameOf: (id: string) => string }) {
  useViewportTick(api);
  const sceneTick = useSceneTick(api);

  const allChips = useMemo<Chip[]>(() => {
    const elements = api.getSceneElements();
    const byId = new Map(elements.map((el) => [el.id, el]));
    return elements
      .filter((el) => LABELLED.has(el.type))
      .flatMap((el) => {
        const createdBy = el.customData?.createdBy;
        const updatedBy = el.customData?.updatedBy;
        if (typeof createdBy !== "string") return [];
        // Text inside a sticky is tagged at the sticky's corner.
        const anchor = (el.type === "text" && el.containerId && byId.get(el.containerId)) || el;
        const label =
          typeof updatedBy === "string" && updatedBy !== createdBy
            ? `${nameOf(createdBy)} · แก้: ${nameOf(updatedBy)}`
            : nameOf(createdBy);
        return [{ id: el.id, x: anchor.x, y: anchor.y, label }];
      });
    // sceneTick stands in for the scene's contents, which `api` reads imperatively.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, nameOf, sceneTick]);

  const appState = api.getAppState();
  const zoom = appState.zoom.value;
  const [x1, y1, x2, y2] = getVisibleSceneBounds(appState);
  const margin = CULL_MARGIN / zoom;
  const chips: Chip[] = [];
  for (const chip of allChips) {
    if (chips.length >= MAX_CHIPS) break;
    if (chip.x < x1 - margin || chip.x > x2 + margin || chip.y < y1 - margin || chip.y > y2 + margin) continue;
    chips.push(chip);
  }

  // Same mapping as sceneCoordsToViewportCoords: (scene + scroll) * zoom + offset.
  const tx = appState.scrollX * zoom + appState.offsetLeft;
  const ty = appState.scrollY * zoom + appState.offsetTop;

  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${tx}px, ${ty}px) scale(${zoom})`, ["--wb-unzoom" as string]: 1 / zoom }}
      >
        {chips.map((chip) => (
          <span
            key={chip.id}
            className="absolute h-0 w-0 origin-top-left"
            style={{ left: chip.x, top: chip.y, transform: "scale(var(--wb-unzoom))" }}
          >
            {/* Like the reference's cursor tag: paper, an indigo hairline, ink text. No filled pill. */}
            <span className="absolute bottom-[2px] left-0 w-max max-w-48 truncate rounded-[3px] border border-[color:var(--wb-indigo)] bg-[color:var(--wb-card)] px-[7px] text-[11px] font-medium leading-4 text-[color:var(--wb-text)]">
              {chip.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
