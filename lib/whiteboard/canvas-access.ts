import { MAX_VERSION_JUMP } from "./core";
import { settleVersions } from "./shift-cards";

/**
 * Who may change a SHIFT project canvas. A canvas (a frame tagged
 * customData.project) belongs to one person (customData.owner), who chooses
 * teammates (customData.editors) who may change it too. Everyone else on the
 * board can see it but not change it, so one student cannot rewrite or wipe
 * another's project. Moderators (the board's owner and site admins) may change
 * any canvas, and the owner or a moderator may hand a canvas to someone else.
 *
 * Postgres enforces this on every save (whiteboard_merge_elements, the one that
 * counts) and also decides what only it can know: who is on the board, who
 * started a project, and who wrote what. This copy runs in each browser before
 * it keeps an edit (an edit you may not make is undone at once), and the
 * database's answer to each save puts right anything this copy could not know.
 * Canvases from before owners existed fall back to their creator.
 */

export const MAX_EDITORS = 30;
export const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type El = {
  id: string;
  type: string;
  version?: number;
  frameId?: string | null;
  containerId?: string | null;
  isDeleted?: boolean;
  customData?: Record<string, unknown> | null;
};

export type CanvasAccess = { owner: string; editors: string[] };

export const isProjectFrame = (el: El | undefined): boolean =>
  el?.type === "frame" && typeof el.customData?.project === "string";

/** A clean team list: user ids, no repeats, not the owner, sorted, at most MAX_EDITORS (as in Postgres). */
export function cleanEditors(value: unknown, owner: string): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((v): v is string => typeof v === "string" && USER_ID.test(v) && v !== owner);
  return [...new Set(ids)].sort().slice(0, MAX_EDITORS);
}

/**
 * Who may change a project frame's canvas, or null when it is not a protected
 * canvas. A deleted canvas stays protected, so no one but its owner can bring
 * it back, and then still as theirs.
 */
export function accessOf(frame: El): CanvasAccess | null {
  if (!isProjectFrame(frame)) return null;
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
 * `manager` is whether `userId` moderates the board.
 *
 * An element belongs to every canvas it was in or is going into (a frame is
 * its own canvas; a note's text goes with its note, before and after), and the
 * user must be allowed on each. Allowed elements come back settled the way
 * Postgres keeps them: project frames with their owner and team fixed, and
 * note versions that only grow. A settled element is a new object, so callers
 * can tell a correction apart from an untouched change.
 */
export function enforceCanvasAccess<T extends El>(
  current: readonly El[],
  changes: readonly T[],
  userId: string,
  manager: boolean,
  now = Date.now(),
): { allowed: T[]; dropped: T[] } {
  return enforceCanvasAccessIn(new Map(current.map((el) => [el.id, el])), canvasAccessMap(current), changes, userId, manager, now);
}

/**
 * enforceCanvasAccess for callers that keep the trusted state as maps (the
 * browser guard, on every edit), so a check costs the size of the change, not
 * of the board.
 */
export function enforceCanvasAccessIn<T extends El>(
  saved: ReadonlyMap<string, El>,
  access: ReadonlyMap<string, CanvasAccess>,
  changes: readonly T[],
  userId: string,
  manager: boolean,
  now = Date.now(),
): { allowed: T[]; dropped: T[] } {
  const incoming = new Map(changes.map((el) => [el.id, el]));
  const allowed: T[] = [];
  const dropped: T[] = [];

  for (const change of changes) {
    const before = saved.get(change.id);
    const ok =
      canvasesOf(change, before, incoming, saved).every((id) => {
        const a = access.get(id);
        return !a || canEditCanvas(a, userId, manager);
      }) &&
      !teammateReshapes(before, change, access, userId, manager) &&
      !tagsSomeoneElsesFrame(before, change, saved, userId, manager) &&
      !jumpsVersion(before, change);
    if (ok) allowed.push(settle(change, before, access.get(change.id), userId, manager, now));
    else dropped.push(change);
  }
  return { allowed, dropped };
}

/** Every frame an element was in or is going into, itself, and the frames of the note its text belongs to. */
function canvasesOf(change: El, before: El | undefined, incoming: ReadonlyMap<string, El>, saved: ReadonlyMap<string, El>): string[] {
  const ids = new Set<string>([change.id]);
  for (const el of [before, change]) if (el?.frameId) ids.add(el.frameId);
  for (const containerId of [before?.containerId, change.containerId]) {
    if (!containerId) continue;
    for (const box of [incoming.get(containerId), saved.get(containerId)]) if (box?.frameId) ids.add(box.frameId);
  }
  return [...ids];
}

/**
 * Teammates may rename, move and resize a canvas's frame, but only its owner
 * (or a moderator) may delete it, bring it back, change its type, or change or
 * remove its project tag: otherwise a teammate could remove the canvas and
 * make it again as their own.
 */
function teammateReshapes(
  before: El | undefined,
  change: El,
  access: ReadonlyMap<string, CanvasAccess>,
  userId: string,
  manager: boolean,
): boolean {
  const canvas = before ? access.get(before.id) : undefined;
  if (!before || !canvas || manager || canvas.owner === userId) return false;
  return (
    change.type !== "frame" ||
    change.customData?.project !== before.customData?.project ||
    Boolean(change.isDeleted) !== Boolean(before.isDeleted)
  );
}

/**
 * Making an existing plain frame a canvas locks everyone else out of what is in it: only a
 * moderator may, or its creator when nothing of anyone else's is inside. An unknown author counts
 * as this person here, because this browser never stamps what it made itself; Postgres knows, and
 * its answer to the save undoes the change if it was not theirs.
 */
function tagsSomeoneElsesFrame(
  before: El | undefined,
  change: El,
  saved: ReadonlyMap<string, El>,
  userId: string,
  manager: boolean,
): boolean {
  if (!before || before.type !== "frame" || isProjectFrame(before) || !isProjectFrame(change) || manager) return false;
  const mine = (el: El) => el.customData?.createdBy === undefined || el.customData.createdBy === userId;
  if (!mine(before)) return true;
  for (const el of saved.values()) if (el.frameId === before.id && !el.isDeleted && !mine(el)) return true;
  return false;
}

/** One save may not push an element's version far past the trusted copy (see MAX_VERSION_JUMP). */
function jumpsVersion(before: El | undefined, change: El): boolean {
  return typeof change.version === "number" && change.version > (before?.version ?? 0) + MAX_VERSION_JUMP;
}

/**
 * An allowed change as Postgres will keep it. Note versions only grow. A
 * project frame keeps its owner unless its owner or a moderator hands it to
 * someone else, and only they change its team; a new canvas belongs to
 * whoever makes it. (Postgres also checks that owners and teammates are on
 * the board, and who started the project; its answer to the save corrects
 * this copy where they differ.)
 */
function settle<T extends El>(change: T, before: El | undefined, prior: CanvasAccess | undefined, userId: string, manager: boolean, now: number): T {
  let data = change.customData;
  const versions = settleVersions(before?.customData, change.customData, !before, userId, now);
  if (versions && !sameJson(versions, change.customData?.versions)) data = { ...data, versions };

  if (isProjectFrame(change)) {
    const mayManage = !prior || manager || prior.owner === userId;
    const asked = change.customData?.owner;
    const owner = !prior
      ? userId
      : mayManage && typeof asked === "string" && USER_ID.test(asked)
        ? asked
        : prior.owner;
    const editors = mayManage ? cleanEditors(change.customData?.editors, owner) : prior.editors;
    if (change.customData?.owner !== owner || !sameJson(change.customData?.editors, editors)) data = { ...data, owner, editors };
  }
  return data === change.customData ? change : { ...change, customData: data };
}

/** Whether two JSON values are equal, whatever order their keys are in (Postgres reorders them). */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => sameJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
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
