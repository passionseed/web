/**
 * Who may change a SHIFT project canvas. A canvas (a frame tagged
 * customData.project) belongs to whoever made it, and they choose teammates
 * (customData.editors) who may change it too. Everyone else on the board can
 * see it but not change it, so one student cannot rewrite or wipe another's
 * project. The board's owner (staff) may change any canvas, to moderate.
 *
 * The same rule runs in three places: in Postgres, where every save is merged
 * (whiteboard_merge_elements, the one that counts); in each browser before it
 * keeps an edit (an edit you may not make is undone at once); and on live
 * edits arriving from others (edits from outside a canvas's team are ignored).
 * Canvases from before owners existed fall back to their creator.
 */

export const MAX_EDITORS = 30;
const USER_ID = /^[0-9a-f-]{36}$/;

type El = {
  id: string;
  type: string;
  frameId?: string | null;
  containerId?: string | null;
  isDeleted?: boolean;
  customData?: Record<string, unknown> | null;
};

export type CanvasAccess = { owner: string; editors: string[] };

const isProjectFrame = (el: El) => el.type === "frame" && typeof el.customData?.project === "string";

/** A clean team list: user ids, no repeats, not the owner, at most MAX_EDITORS. */
export function cleanEditors(value: unknown, owner: string): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((v): v is string => typeof v === "string" && USER_ID.test(v) && v !== owner);
  return [...new Set(ids)].slice(0, MAX_EDITORS);
}

/** Who may change a project frame's canvas, or null when it is not a protected canvas. */
export function accessOf(frame: El): CanvasAccess | null {
  if (!isProjectFrame(frame) || frame.isDeleted) return null;
  const owner = frame.customData?.owner ?? frame.customData?.createdBy;
  if (typeof owner !== "string" || !owner) return null;
  return { owner, editors: cleanEditors(frame.customData?.editors, owner) };
}

/** Every protected canvas on a board, by frame id. */
export function canvasAccessMap(elements: readonly El[]): Map<string, CanvasAccess> {
  const map = new Map<string, CanvasAccess>();
  for (const el of elements) {
    const access = accessOf(el);
    if (access) map.set(el.id, access);
  }
  return map;
}

export const canEditCanvas = (access: CanvasAccess, userId: string, manager: boolean): boolean =>
  manager || access.owner === userId || access.editors.includes(userId);

/**
 * Splits a batch of element changes into those `userId` may make and those
 * they may not, judged against `current`, the trusted state before the batch.
 * An element belongs to every canvas it was in or is going into (a frame is
 * its own canvas; a note's text goes with its note), and the user must be
 * allowed on each.
 *
 * Allowed project frames come back with their owner fixed: a new canvas
 * belongs to whoever saves it, an existing one keeps its owner, and only the
 * owner or a manager can change its team. A corrected frame is a new object,
 * so callers that must not alter elements (live edits from others) can tell
 * a correction apart from an untouched change.
 */
export function enforceCanvasAccess<T extends El>(
  current: readonly El[],
  changes: readonly T[],
  userId: string,
  manager: boolean,
): { allowed: T[]; dropped: T[] } {
  const saved = new Map(current.map((el) => [el.id, el]));
  const incoming = new Map(changes.map((el) => [el.id, el]));
  const access = canvasAccessMap(current);
  const allowed: T[] = [];
  const dropped: T[] = [];

  for (const change of changes) {
    const before = saved.get(change.id);
    const canvases = new Set<string>();
    for (const el of [before, change]) {
      if (!el) continue;
      if (el.frameId) canvases.add(el.frameId);
      if (isProjectFrame(el)) canvases.add(el.id);
      const box = el.containerId ? (incoming.get(el.containerId) ?? saved.get(el.containerId)) : undefined;
      if (box?.frameId) canvases.add(box.frameId);
    }
    const ok = [...canvases].every((id) => {
      const a = access.get(id);
      return !a || canEditCanvas(a, userId, manager);
    });
    if (ok) allowed.push(withOwner(change, access.get(change.id), userId, manager));
    else dropped.push(change);
  }
  return { allowed, dropped };
}

function withOwner<T extends El>(change: T, prior: CanvasAccess | undefined, userId: string, manager: boolean): T {
  if (!isProjectFrame(change)) return change;
  const owner = prior?.owner ?? userId;
  const editors =
    !prior || manager || prior.owner === userId ? cleanEditors(change.customData?.editors, owner) : prior.editors;
  const unchanged =
    change.customData?.owner === owner && JSON.stringify(change.customData?.editors) === JSON.stringify(editors);
  if (unchanged) return change;
  return { ...change, customData: { ...change.customData, owner, editors } };
}

/** Whether `userId` may change things in a frame: true unless it is a protected canvas they are not on. */
export function mayEditFrame(
  access: ReadonlyMap<string, CanvasAccess>,
  frameId: string | null | undefined,
  userId: string,
  manager: boolean,
): boolean {
  const canvas = frameId ? access.get(frameId) : undefined;
  return !canvas || canEditCanvas(canvas, userId, manager);
}
