import { enforceCanvasAccess } from "./canvas-access";

/**
 * The browser side of canvas access (see canvas-access.ts). It keeps the last
 * trusted copy of every element, checks this browser's own edits against it
 * (undoing the ones the person may not make, and giving new canvases their
 * owner), and filters live edits from others by who sent them. Postgres
 * enforces the same rule on save; this keeps every screen in step with it.
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

export type CanvasGuard<T extends Versioned> = {
  /**
   * Checks this browser's edits since the last check. `fixes` are elements to
   * put back into the scene: edits undone (something new put into someone
   * else's canvas is removed) and canvas owners set. `blocked` counts the
   * edits that were not allowed.
   */
  checkLocal(elements: readonly T[], me: string, manager: boolean): { fixes: T[]; blocked: number };
  /** Live edits from others that this browser should apply: only those their sender may make. */
  filterRemote(remote: readonly T[], managers: ReadonlySet<string>): T[];
};

export function createCanvasGuard<T extends Versioned>(initial: readonly T[]): CanvasGuard<T> {
  const trusted = new Map<string, T>(initial.map((el) => [el.id, el]));

  return {
    checkLocal(elements, me, manager) {
      const changed = elements.filter((el) => trusted.get(el.id)?.version !== el.version);
      if (changed.length === 0) return { fixes: [], blocked: 0 };
      const originals = new Map(changed.map((el) => [el.id, el]));
      const { allowed, dropped } = enforceCanvasAccess([...trusted.values()], changed, me, manager);
      const fixes: T[] = [];

      for (const el of allowed) {
        const original = originals.get(el.id)!;
        if (el === original) {
          trusted.set(el.id, el);
          continue;
        }
        const fixed = bump(original, { customData: el.customData } as Partial<T>);
        trusted.set(el.id, fixed);
        fixes.push(fixed);
      }
      for (const el of dropped) {
        const before = trusted.get(el.id);
        const fixed = before ?? bump(el, { isDeleted: true } as Partial<T>);
        trusted.set(el.id, fixed);
        fixes.push(fixed);
      }
      return { fixes, blocked: dropped.length };
    },

    filterRemote(remote, managers) {
      const bySender = new Map<string, T[]>();
      for (const el of remote) {
        const sender = typeof el.customData?.updatedBy === "string" ? el.customData.updatedBy : "";
        bySender.set(sender, [...(bySender.get(sender) ?? []), el]);
      }
      const accepted: T[] = [];
      for (const [sender, batch] of bySender) {
        const { allowed } = enforceCanvasAccess([...trusted.values()], batch, sender, managers.has(sender));
        // A corrected element (a forged owner or team) is a new object: never apply it.
        accepted.push(...allowed.filter((el) => batch.includes(el)));
      }
      for (const el of accepted) {
        if ((trusted.get(el.id)?.version ?? -1) < el.version) trusted.set(el.id, el);
      }
      return accepted;
    },
  };
}
