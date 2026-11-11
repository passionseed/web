/**
 * Quests on a whiteboard: tasks mentors draw on the board by hand (a green
 * "Quest" label with the task written under it, as on SHIFT[3] Day 2).
 *
 * A student starts a quest, and everything new they put on the board until
 * they end it is their work for that quest: each element carries a tag in
 * customData.quest (which quest, which session, who, when). The tag travels
 * with the element like any edit, so it needs no table of its own, and it can
 * be changed later by right-clicking the element.
 */

/** customData.quest on an element made for a quest. */
export type QuestTag = {
  /** The id of the quest's "Quest" label element. */
  id: string;
  /** One start-to-end run of the quest by one person. */
  session: string;
  /** User id of whoever made it for the quest. */
  by: string;
  /** ISO time it was tagged. */
  at: string;
};

export type Quest = {
  /** The id of its "Quest" label element. */
  id: string;
  /** 1-based, in reading order (top to bottom, then left to right). */
  number: number;
  /** The task written under the label, on one line; empty if there is none. */
  title: string;
  /** The label's position and size, to put the start button next to it. */
  x: number;
  y: number;
  width: number;
  height: number;
};

type El = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDeleted?: boolean;
  text?: string;
  containerId?: string | null;
  boundElements?: readonly { id: string; type: string }[] | null;
  customData?: Record<string, unknown> | null;
};

/** The label text: "Quest", in any case, with an optional star or number sign. */
const LABEL = /^\s*quest\s*[#:⭐★]?\s*$/i;
/** How far below its label a quest's task may be written, in scene units. */
const TITLE_BELOW = 400;
/** Quests whose labels are within this many units vertically are one row, read left to right. */
const ROW = 200;
const MAX_TITLE = 140;

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

const isLabel = (el: El) => el.type === "text" && !el.isDeleted && LABEL.test(el.text ?? "");

/** The quests drawn on a board, in reading order. */
export function findQuests(elements: readonly El[]): Quest[] {
  const labels = elements.filter(isLabel);
  if (labels.length === 0) return [];
  const texts = elements.filter((el) => el.type === "text" && !el.isDeleted && !isLabel(el) && oneLine(el.text ?? ""));

  return labels
    .map((label) => {
      // The task: the nearest text below the label that starts near it horizontally.
      let title = "";
      let best = Infinity;
      for (const t of texts) {
        const below = t.y - (label.y + label.height / 2);
        if (below <= 0 || below > TITLE_BELOW) continue;
        if (t.x > label.x + Math.max(600, label.width * 3) || t.x + t.width < label.x - 200) continue;
        if (below < best) {
          best = below;
          title = oneLine(t.text ?? "");
        }
      }
      if (title.length > MAX_TITLE) title = `${title.slice(0, MAX_TITLE - 1)}…`;
      return { id: label.id, number: 0, title, x: label.x, y: label.y, width: label.width, height: label.height };
    })
    .sort((a, b) => Math.round(a.y / ROW) - Math.round(b.y / ROW) || a.x - b.x)
    .map((q, i) => ({ ...q, number: i + 1 }));
}

/** "Quest 2: หา reference ...", or "Quest 2" when it has no task text. */
export const questName = (q: Pick<Quest, "number" | "title">) => (q.title ? `Quest ${q.number}: ${q.title}` : `Quest ${q.number}`);

/** An element's quest tag, or null when it has none (or a malformed one). */
export function questTagOf(el: { customData?: Record<string, unknown> | null }): QuestTag | null {
  const tag = el.customData?.quest as Partial<QuestTag> | undefined;
  if (!tag || typeof tag !== "object") return null;
  const { id, session, by, at } = tag;
  if (typeof id !== "string" || typeof session !== "string" || typeof by !== "string" || typeof at !== "string") return null;
  return { id, session, by, at };
}

/** A new tag for something made in a quest session. */
export const newQuestTag = (questId: string, session: string, by: string, at = new Date()): QuestTag => ({
  id: questId,
  session,
  by,
  at: at.toISOString(),
});

/**
 * Whether this person may change an element's quest tag: their own tagged
 * work, or anything untagged they made (or that has no maker on record);
 * moderators may change any.
 */
export function mayRetag(el: { customData?: Record<string, unknown> | null }, meId: string, manager: boolean): boolean {
  if (manager) return true;
  const tag = questTagOf(el);
  if (tag) return tag.by === meId;
  const createdBy = el.customData?.createdBy;
  return createdBy === undefined || createdBy === meId;
}

/**
 * The elements a right-click retag applies to: the selected ones plus the text
 * inside a selected shape (or the shape around a selected text), so a note and
 * its words always move together.
 */
export function withBoundText<T extends El>(elements: readonly T[], selectedIds: ReadonlySet<string>): T[] {
  const byId = new Map(elements.map((el) => [el.id, el]));
  const ids = new Set<string>();
  for (const id of selectedIds) {
    const el = byId.get(id);
    if (!el || el.isDeleted) continue;
    ids.add(id);
    if (el.containerId) ids.add(el.containerId);
    for (const b of el.boundElements ?? []) if (b.type === "text") ids.add(b.id);
  }
  return [...ids].map((id) => byId.get(id)).filter((el): el is T => Boolean(el && !el.isDeleted));
}

export type QuestWork = { quest: Quest | null; questId: string; people: { userId: string; texts: string[]; drawings: number; sessions: number }[] };

/**
 * Who made what for each quest. Text (including the words inside notes) is
 * listed; everything else is counted as drawings. A tag whose quest label was
 * deleted is still reported, with quest null.
 */
export function questWork(elements: readonly El[]): QuestWork[] {
  const quests = findQuests(elements);
  const byId = new Map(elements.map((el) => [el.id, el]));
  const work = new Map<string, Map<string, { texts: string[]; drawings: number; sessions: Set<string> }>>();

  for (const el of elements) {
    if (el.isDeleted) continue;
    const tag = questTagOf(el);
    if (!tag) continue;
    // Words inside a note are listed with the note, not twice.
    if (el.type === "text" && el.containerId && byId.get(el.containerId) && questTagOf(byId.get(el.containerId)!)) {
      continue;
    }
    const people = work.get(tag.id) ?? new Map();
    work.set(tag.id, people);
    const mine = people.get(tag.by) ?? { texts: [], drawings: 0, sessions: new Set<string>() };
    people.set(tag.by, mine);
    mine.sessions.add(tag.session);

    // A note's words are in its bound text; a text element's are its own.
    const inner = (el.boundElements ?? []).find((b) => b.type === "text");
    const words = oneLine((inner ? byId.get(inner.id)?.text : el.type === "text" ? el.text : "") ?? "");
    if (words) mine.texts.push(words);
    else mine.drawings++;
  }

  const order = (id: string) => quests.find((q) => q.id === id)?.number ?? Infinity;
  return [...work.entries()]
    .sort(([a], [b]) => order(a) - order(b))
    .map(([questId, people]) => ({
      questId,
      quest: quests.find((q) => q.id === questId) ?? null,
      people: [...people.entries()].map(([userId, p]) => ({ userId, texts: p.texts, drawings: p.drawings, sessions: p.sessions.size })),
    }));
}

/** Markdown section for `pnpm whiteboard:read`: each quest, then what each person made for it. Empty if nobody has. */
export function questsToMarkdown(elements: readonly El[], nameOf: (id: string) => string): string {
  const work = questWork(elements);
  if (work.length === 0) return "";
  const out = ["", "## Quest work"];
  for (const w of work) {
    out.push("", `### ${w.quest ? questName(w.quest) : "A quest that was deleted"}`);
    for (const p of w.people) {
      const parts = [
        ...p.texts.map((t) => `"${t.length > 160 ? `${t.slice(0, 159)}…` : t}"`),
        ...(p.drawings ? [`${p.drawings} drawing${p.drawings === 1 ? "" : "s"}`] : []),
      ];
      out.push(`- ${nameOf(p.userId)}: ${parts.join("; ")}`);
    }
  }
  return out.join("\n") + "\n";
}
