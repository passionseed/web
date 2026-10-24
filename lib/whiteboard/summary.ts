import { STICKY_COLORS } from "./core";

/**
 * Turns a board's raw Excalidraw elements into something a person or an AI can
 * read: areas (frames and the tinted zones templates draw) with the notes and
 * text inside them, the arrows between things, and the comment threads.
 */

type El = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDeleted?: boolean;
  text?: string;
  name?: string | null;
  containerId?: string | null;
  frameId?: string | null;
  backgroundColor?: string;
  boundElements?: { id: string; type: string }[] | null;
  startBinding?: { elementId: string } | null;
  endBinding?: { elementId: string } | null;
  customData?: { createdBy?: unknown; updatedBy?: unknown } | null;
};

export type SummaryItem = {
  id: string;
  kind: "sticky" | "shape" | "text" | "image";
  text: string;
  color?: string;
  /** User ids from customData (see stampAuthor); absent on elements from before it existed. */
  createdBy?: string;
  updatedBy?: string;
};
export type SummaryArea = { id: string; title: string; items: SummaryItem[] };
export type SummaryLink = { from: string; to: string; label?: string };
export type BoardSummary = { areas: SummaryArea[]; loose: SummaryItem[]; links: SummaryLink[]; counts: Record<string, number> };

export type SummaryComment = {
  author: string;
  body: string;
  createdAt: string;
  resolved: boolean;
  replies: { author: string; body: string; createdAt: string }[];
};

const STICKY_BY_FILL = new Map<string, string>(STICKY_COLORS.map((c) => [c.fill.toLowerCase(), c.name]));
const SHAPES = new Set(["rectangle", "ellipse", "diamond"]);
/** Unlabelled rectangles at least this big that hold other things count as areas. */
const MIN_AREA = 300;
const ROW = 40;

const centre = (e: El) => ({ x: e.x + e.width / 2, y: e.y + e.height / 2 });
const inside = (outer: El, e: El) => {
  const c = centre(e);
  return c.x > outer.x && c.x < outer.x + outer.width && c.y > outer.y && c.y < outer.y + outer.height;
};
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
/** Rows top to bottom, left to right within a row. */
const readingOrder = (a: El, b: El) => Math.round(a.y / ROW) - Math.round(b.y / ROW) || a.x - b.x;

export function summarizeElements(raw: unknown[]): BoardSummary {
  const all = (raw as El[]).filter((e) => e && !e.isDeleted);
  const byId = new Map(all.map((e) => [e.id, e]));
  const labelOf = new Map<string, string>();
  const labelEl = new Map<string, El>();
  for (const e of all) {
    if (e.type === "text" && e.containerId && e.text) {
      labelOf.set(e.containerId, oneLine(e.text));
      labelEl.set(e.containerId, e);
    }
  }
  // Who wrote it: for a note, whoever typed its text, else whoever drew the shape.
  const authors = (e: El) => {
    const source = labelEl.get(e.id)?.customData ?? e.customData;
    const pick = (v: unknown) => (typeof v === "string" ? v : undefined);
    const createdBy = pick(source?.createdBy);
    const updatedBy = pick(source?.updatedBy);
    return { ...(createdBy ? { createdBy } : {}), ...(updatedBy ? { updatedBy } : {}) };
  };

  // Areas: frames, plus big unlabelled rectangles with something inside.
  const frames = all.filter((e) => e.type === "frame" || e.type === "magicframe");
  const zones = all.filter(
    (e) =>
      e.type === "rectangle" &&
      !labelOf.has(e.id) &&
      e.width >= MIN_AREA &&
      e.height >= MIN_AREA &&
      all.some((o) => o !== e && o.type !== "arrow" && o.type !== "line" && !o.containerId && inside(e, o) && o.width < e.width),
  );
  const zoneIds = new Set(zones.map((z) => z.id));

  // A zone's title is the text sitting just above it (how templates draw them) or at its top edge.
  const titleTexts = new Set<string>();
  const zoneTitle = (z: El) => {
    const candidates = all.filter(
      (t) =>
        t.type === "text" &&
        !t.containerId &&
        t.text &&
        t.x < z.x + z.width &&
        t.x + t.width > z.x &&
        t.y + t.height >= z.y - 90 &&
        t.y <= z.y + 70,
    );
    candidates.sort((a, b) => Math.abs(a.y + a.height - z.y) - Math.abs(b.y + b.height - z.y));
    const t = candidates[0];
    if (!t) return "";
    titleTexts.add(t.id);
    return oneLine(t.text!);
  };

  const areas = [...frames, ...zones]
    .map((a) => ({ el: a, title: a.type === "rectangle" ? zoneTitle(a) : oneLine(a.name ?? "Frame") }))
    .sort((a, b) => readingOrder(a.el, b.el));

  const toItem = (e: El): SummaryItem | null => {
    const by = authors(e);
    if (e.type === "text") return e.text ? { id: e.id, kind: "text", text: oneLine(e.text), ...by } : null;
    if (e.type === "image") return { id: e.id, kind: "image", text: labelOf.get(e.id) ?? "(image)", ...by };
    if (!SHAPES.has(e.type)) return null;
    const color = STICKY_BY_FILL.get((e.backgroundColor ?? "").toLowerCase());
    const text = labelOf.get(e.id) ?? "";
    if (color && e.type === "rectangle") return { id: e.id, kind: "sticky", text, color, ...by };
    return text ? { id: e.id, kind: "shape", text, ...by } : null;
  };

  const placed: SummaryArea[] = areas.map((a) => ({ id: a.el.id, title: a.title, items: [] }));
  const loose: SummaryItem[] = [];
  const items = all
    .filter((e) => !e.containerId && !zoneIds.has(e.id) && !frames.includes(e) && !titleTexts.has(e.id))
    .sort(readingOrder);
  for (const e of items) {
    const item = toItem(e);
    if (!item) continue;
    // Smallest area that holds it; a frame claims its children directly.
    let home = e.frameId ? areas.findIndex((a) => a.el.id === e.frameId) : -1;
    if (home < 0) {
      let best = Infinity;
      areas.forEach((a, i) => {
        const size = a.el.width * a.el.height;
        if (a.el.id !== e.id && inside(a.el, e) && size < best) {
          best = size;
          home = i;
        }
      });
    }
    (home >= 0 ? placed[home].items : loose).push(item);
  }

  const name = (id?: string) => {
    const e = id ? byId.get(id) : undefined;
    if (!e) return "?";
    return labelOf.get(e.id) ?? (e.text ? oneLine(e.text) : e.type === "frame" ? oneLine(e.name ?? "Frame") : `(${e.type})`);
  };
  const links: SummaryLink[] = all
    .filter((e) => e.type === "arrow" && (e.startBinding || e.endBinding))
    .map((e) => ({
      from: name(e.startBinding?.elementId),
      to: name(e.endBinding?.elementId),
      ...(labelOf.has(e.id) ? { label: labelOf.get(e.id) } : {}),
    }));

  const counts: Record<string, number> = {};
  for (const e of all) counts[e.type] = (counts[e.type] ?? 0) + 1;

  return { areas: placed.filter((a) => a.items.length > 0 || a.title), loose, links, counts };
}

/** Every author id in a summary, to look up names. */
export function authorIds(summary: BoardSummary): string[] {
  const ids = new Set<string>();
  for (const i of [...summary.areas.flatMap((a) => a.items), ...summary.loose]) {
    if (i.createdBy) ids.add(i.createdBy);
    if (i.updatedBy) ids.add(i.updatedBy);
  }
  return [...ids];
}

function itemLine(i: SummaryItem, names: Map<string, string>) {
  const body =
    i.kind === "sticky"
      ? `[${i.color} sticky] ${i.text || "(empty)"}`
      : i.kind === "image"
        ? `[image] ${i.text}`
        : i.kind === "shape"
          ? `[box] ${i.text}`
          : i.text;
  const name = (id?: string) => (id ? (names.get(id) ?? "someone") : undefined);
  const by = name(i.createdBy);
  const edited = i.updatedBy && i.updatedBy !== i.createdBy ? name(i.updatedBy) : undefined;
  const credit = by ? ` (by ${by}${edited ? `, edited by ${edited}` : ""})` : "";
  return `- ${body}${credit}`;
}

/** Markdown for one board. */
export function boardToMarkdown(
  board: { title: string; owner: string; updatedAt: string; members: string[] },
  summary: BoardSummary,
  comments: SummaryComment[] = [],
  /** User id to display name, for "who wrote what". */
  names: Map<string, string> = new Map(),
): string {
  const line = (i: SummaryItem) => itemLine(i, names);
  const out = [`# ${board.title}`, "", `Owner: ${board.owner} · Updated: ${board.updatedAt}`];
  if (board.members.length) out.push(`Members: ${board.members.join(", ")}`);
  const counts = Object.entries(summary.counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(", ");
  out.push(`Elements: ${counts || "none"}`);

  for (const a of summary.areas) {
    out.push("", `## ${a.title || "Untitled area"}`);
    out.push(...(a.items.length ? a.items.map(line) : ["(empty)"]));
  }
  if (summary.loose.length) out.push("", summary.areas.length ? "## Elsewhere on the board" : "## Board", ...summary.loose.map(line));
  if (summary.links.length) {
    out.push("", "## Arrows");
    out.push(...summary.links.map((l) => `- ${l.from} → ${l.to}${l.label ? ` (${l.label})` : ""}`));
  }
  if (comments.length) {
    out.push("", "## Comments");
    for (const c of comments) {
      out.push(`- ${c.author} (${c.createdAt.slice(0, 10)})${c.resolved ? " [resolved]" : ""}: ${oneLine(c.body)}`);
      for (const r of c.replies) out.push(`  - ${r.author}: ${oneLine(r.body)}`);
    }
  }
  return out.join("\n") + "\n";
}
