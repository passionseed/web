import { accessOf, canvasAccessMap, enforceCanvasAccessIn, isProjectFrame } from "./canvas-access";
import { MAX_VERSION_JUMP } from "./core";

/**
 * The browser side of canvas access (see canvas-access.ts). It keeps the last
 * trusted copy of every element: what the database sent, plus this browser's
 * own allowed edits. It checks this browser's edits against that copy
 * (undoing the ones the person may not make, and settling owners and note
 * versions the way Postgres will), and sorts live edits from others.
 *
 * A live edit says who sent it, but the sender writes that themselves, so it
 * proves nothing. Live edits that touch a SHIFT canvas are therefore never
 * shown as they arrive: the browser fetches the saved copy once the sender's
 * save has gone through Postgres, which checked it. Everything else on the
 * board stays live.
 */

type Versioned = {
  id: string;
  type: string;
  version: number;
  versionNonce?: number;
  updated?: number;
  isDeleted?: boolean;
  frameId?: string | null;
  containerId?: string | null;
  customData?: Record<string, unknown> | null;
};

/** A new version of an element, bumped the way Excalidraw's newElementWith does, so it syncs and saves. */
function bump<T extends Versioned>(el: T, updates: Partial<T>): T {
  return {
    ...el,
    ...updates,
    version: el.version + 1,
    versionNonce: Math.floor(Math.random() * 2 ** 31),
    updated: Date.now(),
  };
}

const optional = (value: unknown, type: string) => value === undefined || value === null || typeof value === type;

/**
 * Whether the fields canvas access reads have the types browsers and Postgres agree on.
 * The server rejects anything else; a live edit from a tampered client gets the same treatment.
 */
export const wellFormed = (el: Versioned): boolean =>
  typeof el.id === "string" &&
  typeof el.type === "string" &&
  Number.isSafeInteger(el.version) &&
  el.version >= 0 &&
  optional(el.isDeleted, "boolean") &&
  optional(el.frameId, "string") &&
  optional(el.containerId, "string") &&
  optional(el.customData?.project, "string");

export type CanvasGuard<T extends Versioned> = {
  /**
   * Checks this browser's edits since the last check. `fixes` are elements to
   * put back into the scene: edits undone (something new put into someone
   * else's canvas is removed), canvas owners set, and note versions restored.
   * `blocked` counts the edits that were not allowed, and `changed` lists
   * every element this browser changed since the last check.
   */
  checkLocal(elements: readonly T[], me: string, manager: boolean): { fixes: T[]; blocked: number; changed: T[] };
  /**
   * Sorts live edits from others: `apply` can be shown now; `verify` touch a
   * SHIFT canvas and must come from the database instead (id to the version
   * the sender announced).
   */
  filterRemote(remote: readonly T[]): { apply: T[]; verify: Map<string, number> };
  /** Whether live edits to this element always wait for the saved copy (it has touched a canvas). */
  isHeld(id: string): boolean;
  /** Copies from the database (fetched, or the answer to a save): trusted as they are. */
  trust(saved: readonly T[]): void;
};

export function createCanvasGuard<T extends Versioned>(initial: readonly T[]): CanvasGuard<T> {
  // Kept up to date one element at a time, so checking an edit costs the size of the edit.
  const trusted = new Map<string, T>(initial.map((el) => [el.id, el]));
  const access = canvasAccessMap(initial);
  // Elements whose live edits have touched a canvas. They keep waiting for the saved copy: before
  // that arrives this browser cannot tell whether a later live edit (say, one that moves the
  // element out of the canvas first) is real.
  const held = new Set<string>();
  const remember = (el: T) => {
    trusted.set(el.id, el);
    const canvas = accessOf(el);
    if (canvas) access.set(el.id, canvas);
    else access.delete(el.id);
  };

  /** Whether a live edit touches a canvas: one it was in or is going into, itself, or its note's. */
  const touchesCanvas = (el: T, batch: ReadonlyMap<string, T>): boolean => {
    const known = trusted.get(el.id);
    const isCanvas = (id: string | null | undefined) => Boolean(id) && (access.has(id!) || isProjectFrame(batch.get(id!)));
    if (isProjectFrame(el) || isProjectFrame(known) || access.has(el.id)) return true;
    if (isCanvas(known?.frameId) || isCanvas(el.frameId)) return true;
    for (const containerId of [known?.containerId, el.containerId]) {
      if (!containerId) continue;
      if (isCanvas(batch.get(containerId)?.frameId) || isCanvas(trusted.get(containerId)?.frameId)) return true;
    }
    return false;
  };

  return {
    checkLocal(elements, me, manager) {
      const changed = elements.filter((el) => trusted.get(el.id)?.version !== el.version);
      if (changed.length === 0) return { fixes: [], blocked: 0, changed };
      const originals = new Map(changed.map((el) => [el.id, el]));
      const { allowed, dropped } = enforceCanvasAccessIn(trusted, access, changed, me, manager);
      const fixes: T[] = [];

      for (const el of allowed) {
        const original = originals.get(el.id)!;
        if (el === original) {
          remember(el);
          continue;
        }
        const fixed = bump(original, { customData: el.customData } as Partial<T>);
        remember(fixed);
        fixes.push(fixed);
      }
      for (const el of dropped) {
        const before = trusted.get(el.id);
        const fixed = before ?? bump(el, { isDeleted: true } as Partial<T>);
        remember(fixed);
        fixes.push(fixed);
      }
      return { fixes, blocked: dropped.length, changed };
    },

    filterRemote(remote) {
      const batch = new Map<string, T>();
      for (const el of remote) {
        if (!wellFormed(el)) continue;
        // Nobody's edit raises a version this far; an element pushed out of reach would block everyone's later edits.
        if (el.version > (trusted.get(el.id)?.version ?? 0) + MAX_VERSION_JUMP) continue;
        const queued = batch.get(el.id);
        if (!queued || el.version >= queued.version) batch.set(el.id, el);
      }
      const apply: T[] = [];
      const verify = new Map<string, number>();
      for (const el of batch.values()) {
        if (held.has(el.id) || touchesCanvas(el, batch)) {
          held.add(el.id);
          verify.set(el.id, el.version);
        } else apply.push(el);
      }
      for (const el of apply) {
        if ((trusted.get(el.id)?.version ?? -1) < el.version) remember(el);
      }
      return { apply, verify };
    },

    isHeld: (id) => held.has(id),

    trust(saved) {
      for (const el of saved) remember(el);
    },
  };
}
