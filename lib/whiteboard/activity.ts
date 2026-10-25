/**
 * Board change history for admins. The database logs one row per save
 * (whiteboard_changes); this folds a person's back-to-back saves into one
 * session so the Activity panel reads "Mint added 4 notes, edited 1".
 */

export type ChangeAction = "added" | "edited" | "changed" | "deleted";

export type ChangeItem = {
  id: string;
  action: ChangeAction;
  type: string;
  /** Set when this is the text inside a sticky or shape. */
  container?: string;
  text?: string;
  /** The text before an edit. */
  before?: string;
};

export type ChangeRow = { userId: string | null; createdAt: string; items: ChangeItem[] };

export type ActivitySession = {
  userId: string | null;
  from: string;
  to: string;
  /** One entry per element, oldest first. */
  items: ChangeItem[];
  counts: Record<ChangeAction, number>;
};

/** Saves by the same person less than this far apart are one session. */
export const SESSION_GAP_MS = 5 * 60 * 1000;

/** Combines two changes to one element within a session, or null when they cancel out. */
function fold(first: ChangeItem, next: ChangeItem): ChangeItem | null {
  if (first.action === "added") {
    return next.action === "deleted" ? null : { ...next, action: "added", before: undefined };
  }
  if (next.action === "deleted") return { ...next, text: next.text ?? first.text };
  const before = first.before ?? (next.action === "edited" ? next.before : undefined);
  const action = first.action === "edited" || next.action === "edited" ? "edited" : "changed";
  if (action === "edited" && before === next.text) return { ...next, action: "changed", before: undefined };
  return { ...next, action, before };
}

function session(rows: ChangeRow[]): ActivitySession {
  const byId = new Map<string, ChangeItem | null>();
  for (const row of rows) {
    for (const item of row.items) {
      const prev = byId.get(item.id);
      // A dropped entry (added then deleted) stays dropped but keeps its place.
      byId.set(item.id, prev === undefined ? item : prev === null ? null : fold(prev, item));
    }
  }
  const items = [...byId.values()].filter((i): i is ChangeItem => i !== null);
  const counts = { added: 0, edited: 0, changed: 0, deleted: 0 };
  for (const item of items) counts[item.action] += 1;
  return { userId: rows[0].userId, from: rows[0].createdAt, to: rows[rows.length - 1].createdAt, items, counts };
}

/** Groups change rows into sessions, newest first. Rows may come in any order. */
export function groupChanges(rows: ChangeRow[], gapMs = SESSION_GAP_MS): ActivitySession[] {
  const sorted = [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const open = new Map<string, ChangeRow[]>();
  const done: ChangeRow[][] = [];
  for (const row of sorted) {
    const key = row.userId ?? "unknown";
    const current = open.get(key);
    const last = current?.[current.length - 1];
    if (current && last && Date.parse(row.createdAt) - Date.parse(last.createdAt) <= gapMs) {
      current.push(row);
    } else {
      if (current) done.push(current);
      open.set(key, [row]);
    }
  }
  done.push(...open.values());
  return done
    .map(session)
    .filter((s) => s.items.length > 0)
    .sort((a, b) => b.to.localeCompare(a.to));
}

/** "4 added, 1 edited" in the panel's words, skipping zeros. */
export function describeCounts(counts: Record<ChangeAction, number>): string {
  const words: [ChangeAction, string][] = [
    ["added", "เพิ่ม"],
    ["edited", "แก้ข้อความ"],
    ["changed", "ย้าย/ปรับ"],
    ["deleted", "ลบ"],
  ];
  return words
    .filter(([action]) => counts[action] > 0)
    .map(([action, word]) => `${word} ${counts[action]}`)
    .join(" · ");
}

type Authored = {
  id: string;
  type?: string;
  isDeleted?: boolean;
  containerId?: string | null;
  customData?: Record<string, unknown> | null;
};

/** Every user id that made or last changed an element on the board. */
export function elementAuthorIds(elements: readonly Authored[]): string[] {
  const ids = new Set<string>();
  for (const el of elements) {
    for (const key of ["createdBy", "updatedBy"] as const) {
      const id = el.customData?.[key];
      if (typeof id === "string") ids.add(id);
    }
  }
  return [...ids];
}
