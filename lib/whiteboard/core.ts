import { z } from "zod";

/**
 * Pure rules for whiteboards: who may do what, what a share link grants,
 * request shapes, and the small helpers the live editor uses to sync.
 */

export type WhiteboardRole = "owner" | "editor" | "viewer";
export type MemberRole = Exclude<WhiteboardRole, "owner">;
export type LinkAccess = "none" | "view" | "edit";

export const LINK_ACCESS: readonly LinkAccess[] = ["none", "view", "edit"];
export const MAX_ELEMENTS = 20000;
export const MAX_FILE_DATA_URL = 4_000_000;
export const MAX_THUMBNAIL = 400_000;

export const canEdit = (role: WhiteboardRole | null): boolean => role === "owner" || role === "editor";
export const canManage = (role: WhiteboardRole | null): boolean => role === "owner";

/** The role a share link gives. Joining never lowers access someone already has. */
export function joinRole(existing: MemberRole | null, linkAccess: LinkAccess): MemberRole | null {
  if (linkAccess === "none") return existing;
  const fromLink: MemberRole = linkAccess === "edit" ? "editor" : "viewer";
  if (existing === "editor" || fromLink === "editor") return "editor";
  return "viewer";
}

export const boardTopic = (boardId: string) => `whiteboard:${boardId}`;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Give the board a name")
  .max(120, "Keep the name under 120 characters");

/** An Excalidraw element as far as the server cares: an id and a version. */
export const elementSchema = z
  .object({ id: z.string().min(1).max(100), version: z.number().int().nonnegative() })
  .passthrough();

export const patchBoardSchema = z
  .object({
    title: titleSchema.optional(),
    linkAccess: z.enum(["none", "view", "edit"]).optional(),
    elements: z.array(elementSchema).max(MAX_ELEMENTS).optional(),
    thumbnail: z
      .string()
      .max(MAX_THUMBNAIL)
      .regex(/^data:image\/(png|jpeg|webp);base64,/)
      .optional(),
  })
  .strict();
export type PatchBoard = z.infer<typeof patchBoardSchema>;

export const createBoardSchema = z.object({ title: titleSchema.optional() }).strict();

export const filesSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(100),
      mimeType: z.string().min(1).max(100).regex(/^image\//),
      dataURL: z.string().max(MAX_FILE_DATA_URL).regex(/^data:image\/[a-z0-9.+-]+;base64,/i),
    }),
  )
  .min(1)
  .max(20);

export const memberPatchSchema = z.object({ role: z.enum(["editor", "viewer"]) }).strict();

type Versioned = { id: string; version: number };

/** Elements whose version differs from the last one we sent or saved. */
export function changedSince<T extends Versioned>(elements: readonly T[], seen: ReadonlyMap<string, number>): T[] {
  return elements.filter((el) => seen.get(el.id) !== el.version);
}

/** Records the versions of elements that were sent or saved. */
export function markSeen(seen: Map<string, number>, elements: readonly Versioned[]): void {
  for (const el of elements) seen.set(el.id, el.version);
}

/** Same element merge the database runs: highest version per id wins, ties go to `incoming`. */
export function mergeElements<T extends Versioned>(current: readonly T[], incoming: readonly T[]): T[] {
  const byId = new Map<string, T>();
  for (const el of current) byId.set(el.id, el);
  for (const el of incoming) {
    const existing = byId.get(el.id);
    if (!existing || el.version >= existing.version) byId.set(el.id, el);
  }
  return [...byId.values()];
}

const CURSOR_COLORS = ["#f97316", "#a855f7", "#06b6d4", "#22c55e", "#ec4899", "#eab308", "#3b82f6", "#ef4444"];

/** A stable cursor colour per person. */
export function colorFor(userId: string): { background: string; stroke: string } {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  const stroke = CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
  return { background: `${stroke}33`, stroke };
}

export function shareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/whiteboard/join/${token}`;
}

export const versionSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    thumbnail: z
      .string()
      .max(MAX_THUMBNAIL)
      .regex(/^data:image\/(png|jpeg|webp);base64,/)
      .optional(),
  })
  .strict();

export const commentSchema = z
  .object({
    body: z.string().trim().min(1, "Write something first").max(2000),
    parentId: z.string().uuid().optional(),
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
  })
  .strict()
  .refine((c) => c.parentId || (c.x !== undefined && c.y !== undefined), "A new thread needs a spot on the board");

export const commentPatchSchema = z.object({ resolved: z.boolean() }).strict();

export const timerSchema = z
  .object({ seconds: z.number().int().min(1).max(86400).nullable() })
  .strict();

export const duplicateSchema = z.object({ versionId: z.string().uuid().optional() }).strict();

type Restorable = Versioned & { isDeleted?: boolean };

/**
 * Turns the board back into a saved version as a normal edit: everything not
 * in the version is deleted, and every element gets a version above anything
 * any collaborator has seen, so the restore wins every merge and can be undone.
 */
export function restoreVersion<T extends Restorable>(current: readonly T[], snapshot: readonly T[]): T[] {
  const currentById = new Map(current.map((el) => [el.id, el]));
  const snapshotIds = new Set(snapshot.map((el) => el.id));
  const bump = (id: string, version: number) => Math.max(version, currentById.get(id)?.version ?? 0) + 1;
  const deleted = current
    .filter((el) => !snapshotIds.has(el.id) && !el.isDeleted)
    .map((el) => ({ ...el, isDeleted: true, version: el.version + 1 }));
  const restored = snapshot.map((el) => ({ ...el, isDeleted: false, version: bump(el.id, el.version) }));
  const untouched = current.filter((el) => !snapshotIds.has(el.id) && el.isDeleted);
  return [...untouched, ...deleted, ...restored];
}

/** Seconds left on a timer that rings at `endsAt`, never below zero. */
export function secondsLeft(endsAt: string | null, now = Date.now()): number {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 1000));
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const STICKY_COLORS = [
  { name: "Yellow", fill: "#ffe680" },
  { name: "Orange", fill: "#ffc58a" },
  { name: "Pink", fill: "#ffb3d1" },
  { name: "Purple", fill: "#d7b8ff" },
  { name: "Blue", fill: "#a8d8ff" },
  { name: "Green", fill: "#b5f0b0" },
  { name: "Gray", fill: "#e3e3e3" },
] as const;

export const STAMPS = ["👍", "❤️", "🔥", "⭐", "✅", "❓", "💡", "🎉", "👀", "+1"] as const;
export const EMOTES = ["👍", "❤️", "😂", "🔥", "🎉", "👏", "😮", "🤔"] as const;

type Linkable = {
  id: string;
  containerId?: string | null;
  frameId?: string | null;
  boundElements?: readonly { id: string; type: string }[] | null;
  startBinding?: { elementId: string } | null;
  endBinding?: { elementId: string } | null;
};

/**
 * Gives imported elements fresh ids, keeping text-in-shape, arrow bindings
 * and frames pointing at each other, so importing the same file twice never
 * collides with what is already on the board.
 */
export function remapIds<T extends Linkable>(elements: readonly T[], makeId: () => string): T[] {
  const ids = new Map(elements.map((el) => [el.id, makeId()]));
  const map = (id: string | null | undefined) => (id ? (ids.get(id) ?? id) : id);
  return elements.map((el) => ({
    ...el,
    id: ids.get(el.id)!,
    ...(el.containerId ? { containerId: map(el.containerId) } : {}),
    ...(el.frameId ? { frameId: map(el.frameId) } : {}),
    ...(el.boundElements ? { boundElements: el.boundElements.map((b) => ({ ...b, id: map(b.id)! })) } : {}),
    ...(el.startBinding ? { startBinding: { ...el.startBinding, elementId: map(el.startBinding.elementId)! } } : {}),
    ...(el.endBinding ? { endBinding: { ...el.endBinding, elementId: map(el.endBinding.elementId)! } } : {}),
  }));
}

type CustomData = Record<string, unknown> | null | undefined;

/**
 * Records who made and last changed each element, in Excalidraw's customData.
 * createdBy is kept from the first person who sent it; updatedBy is whoever
 * sends it now. Elements from before this existed get the next editor as creator.
 */
export function stampAuthor<T extends object>(elements: readonly T[], userId: string): T[] {
  return elements.map((el) => {
    const data = (el as { customData?: CustomData }).customData;
    const createdBy = typeof data?.createdBy === "string" ? data.createdBy : userId;
    if (data?.createdBy === createdBy && data?.updatedBy === userId) return el;
    return { ...el, customData: { ...data, createdBy, updatedBy: userId } };
  });
}
