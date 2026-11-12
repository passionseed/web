/**
 * Synthetic whiteboard elements for the quest canvas tests: a SHIFT project
 * canvas laid out like the real one (canvasZones), with notes, labels,
 * versions and authors, plus things around it that must never leak in.
 * All ids are made up.
 */
import { STICKY_COLORS } from "@/lib/whiteboard/core";
import { canvasZones, SHIFT_CARDS, type ShiftCardKind } from "@/lib/whiteboard/shift-cards";

export const OWNER = "11111111-1111-4111-8111-111111111111";
export const EDITOR = "22222222-2222-4222-8222-222222222222";
export const OUTSIDER = "33333333-3333-4333-8333-333333333333";
export const BOARD_OWNER = "44444444-4444-4444-8444-444444444444";

export interface NoteSpec {
  id: string;
  kind: ShiftCardKind;
  text: string;
  /** Daily zones only. */
  day?: number;
  /** Who typed the note's text (customData.createdBy on the label). */
  by?: string;
  versions?: { v: number; text: string; why?: string; by?: string }[];
  /** A plain yellow sticky instead of a tagged card. */
  plain?: boolean;
  /** A bare text element instead of a note. */
  bare?: boolean;
  updated?: number;
  deleted?: boolean;
}

export interface CanvasSpec {
  frameId?: string;
  project?: string;
  name?: string | null;
  owner?: string;
  editors?: string[];
  /** A canvas from before owners existed: only customData.createdBy. */
  legacy?: boolean;
  deleted?: boolean;
  /** Left edge of the frame on the board. */
  x?: number;
  notes?: NoteSpec[];
}

type El = Record<string, unknown> & { id: string };

const FRAME_PAD = 40;
const FRAME_HINT = 72;
const YELLOW = STICKY_COLORS.find((c) => c.name === "Yellow")!.fill;

/** The elements of one SHIFT canvas: frame, hint, zones with labels, and notes with their text. */
export function canvasElements(spec: CanvasSpec): El[] {
  const frameId = spec.frameId ?? "frame-1";
  const fx = spec.x ?? 100;
  const fy = 100;
  const ox = fx + FRAME_PAD;
  const oy = fy + FRAME_HINT;
  const zones = canvasZones();
  const out: El[] = [];

  out.push({
    id: `${frameId}-hint`,
    type: "text",
    x: ox,
    y: fy + 24,
    width: 900,
    height: 25,
    text: "กด + เพิ่ม ในช่องไหน ก็ได้โน้ตเรื่องนั้น",
    frameId,
    customData: { canvasHint: true },
  });
  zones.forEach((z, i) => {
    out.push({
      id: `${frameId}-zone-${i}`,
      type: "rectangle",
      x: ox + z.x,
      y: oy + z.y,
      width: z.width,
      height: z.height,
      backgroundColor: SHIFT_CARDS[z.kind].color,
      frameId,
      customData: { zone: z.kind, ...(z.day ? { day: z.day } : {}) },
      updated: 1,
    });
    out.push({
      id: `${frameId}-zone-${i}-label`,
      type: "text",
      x: ox + z.x + 24,
      y: oy + z.y + 20,
      width: 300,
      height: 60,
      text: `${SHIFT_CARDS[z.kind].emoji} label`,
      frameId,
      customData: { zoneLabel: z.kind },
    });
  });

  const slots = new Map<string, number>();
  for (const n of spec.notes ?? []) {
    const zone = zones.find((z) => z.kind === n.kind && (n.kind !== "daily" || z.day === (n.day ?? 1)))!;
    const key = `${zone.kind}:${zone.day ?? 0}`;
    const slot = slots.get(key) ?? 0;
    slots.set(key, slot + 1);
    const x = ox + zone.x + 24 + slot * 110;
    const y = oy + zone.y + 100;
    const updated = n.updated ?? 1000 + slot;
    if (n.bare) {
      out.push({
        id: n.id,
        type: "text",
        x,
        y,
        width: 100,
        height: 40,
        text: n.text,
        originalText: n.text,
        frameId,
        isDeleted: n.deleted ?? false,
        updated,
        customData: n.by ? { createdBy: n.by } : {},
      });
      continue;
    }
    const versions = n.versions?.map((v) => ({ v: v.v, text: v.text, at: "2026-11-10T10:00:00.000Z", by: v.by ?? OWNER, ...(v.why ? { why: v.why } : {}) }));
    out.push({
      id: n.id,
      type: "rectangle",
      x,
      y,
      width: 100,
      height: 80,
      backgroundColor: n.plain ? YELLOW : SHIFT_CARDS[n.kind].color,
      frameId,
      isDeleted: n.deleted ?? false,
      updated,
      boundElements: [{ id: `${n.id}-text`, type: "text" }],
      customData: {
        ...(n.plain ? {} : { card: n.kind }),
        ...(versions ? { versions } : {}),
        ...(n.by ? { createdBy: n.by } : {}),
      },
    });
    out.push({
      id: `${n.id}-text`,
      type: "text",
      x: x + 5,
      y: y + 5,
      width: 90,
      height: 70,
      // Excalidraw wraps `text`; `originalText` keeps what was typed.
      text: n.text.replace(/\n/g, " \n"),
      originalText: n.text,
      containerId: n.id,
      frameId,
      isDeleted: n.deleted ?? false,
      updated: updated + 1,
      customData: n.by ? { createdBy: n.by } : {},
    });
  }

  const zonesBottom = Math.max(...zones.map((z) => z.y + z.height));
  out.push({
    id: frameId,
    type: "frame",
    x: fx,
    y: fy,
    width: 2224 + 2 * FRAME_PAD,
    height: FRAME_HINT + zonesBottom + FRAME_PAD,
    name: spec.name === undefined ? "Lamp project" : spec.name,
    isDeleted: spec.deleted ?? false,
    updated: 5,
    customData: spec.legacy
      ? { project: spec.project ?? "proj-1", createdBy: spec.owner ?? OWNER }
      : { project: spec.project ?? "proj-1", owner: spec.owner ?? OWNER, editors: spec.editors ?? [EDITOR] },
  });
  return out;
}

/** Things around a canvas that must never be read as part of it. */
export function noise(): El[] {
  return [
    // A loose sticky on the board.
    { id: "loose-1", type: "rectangle", x: -900, y: 100, width: 200, height: 200, backgroundColor: YELLOW, customData: { createdBy: OUTSIDER } },
    { id: "loose-1-text", type: "text", x: -890, y: 110, width: 180, height: 50, text: "ข้อความนอกแคนวาส", originalText: "ข้อความนอกแคนวาส", containerId: "loose-1" },
    // A note lying on top of the canvas (in the problem zone) without being in it.
    { id: "on-top", type: "rectangle", x: 170, y: 280, width: 100, height: 80, backgroundColor: SHIFT_CARDS.problem.color, customData: { card: "problem", createdBy: OUTSIDER } },
    { id: "on-top-text", type: "text", x: 175, y: 285, width: 90, height: 60, text: "วางทับไว้เฉยๆ", originalText: "วางทับไว้เฉยๆ", containerId: "on-top" },
    // An arrow and a deleted element.
    { id: "arrow-1", type: "arrow", x: 0, y: 0, width: 10, height: 10, startBinding: { elementId: "loose-1" }, endBinding: { elementId: "on-top" } },
    { id: "gone-1", type: "rectangle", x: 0, y: 0, width: 10, height: 10, isDeleted: true },
  ];
}
