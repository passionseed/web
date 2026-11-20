/**
 * Reads operation pages (Markdown) into the rows hackathon_ops_seed() takes.
 *
 * A page has a frontmatter header (title, updated), a two-column table whose
 * first column names the field (Goal, Done when, Owner, Deadline, Status), and
 * a "## Steps" list of "- [ ]" or "- [x]" items. "(fill in)" means unknown.
 * A README in the same folder only sets the order (the order its links
 * appear in); it is never an operation itself.
 *
 * The pages are private. Nothing here holds or logs their content: the seed
 * script reads them from a local folder at run time.
 */

export interface SeedStep {
  text: string;
  done: boolean;
}

export interface SeedOperation {
  slug: string;
  title: string;
  goal: string | null;
  done_when: string | null;
  owner: string | null;
  deadline_text: string | null;
  /** YYYY-MM-DD, the first date found in the deadline, or null. */
  deadline_on: string | null;
  status: string | null;
  position: number;
  steps: SeedStep[];
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Markdown links become their text; bold, italics and code marks go. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|`)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "(fill in)", empty and dash-only cells mean unknown. */
function known(value: string | undefined): string | null {
  if (value === undefined) return null;
  const text = plainText(value);
  if (!text || /^\(fill in\)$/i.test(text) || /^[-–—]+$/.test(text)) return null;
  return text;
}

function frontmatter(markdown: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(markdown);
  const out: Record<string, string> = {};
  if (!match) return out;
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (kv) out[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function isValidDay(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * The first date in a deadline like "Tue 17 Nov; closes Fri 18 Dec" or
 * "2026-12-19". A date without a year takes the reference year, or the next
 * one when its month is more than six months before the reference month (a
 * January deadline on a page updated in November).
 */
export function parseDeadline(text: string | null, ref: { year: number; month: number }): string | null {
  if (!text) return null;
  const isoMatch = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text);
  const dayMonth = /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:\s+(\d{4}))?\b/i.exec(text);
  const first = [isoMatch, dayMonth].filter((m): m is RegExpExecArray => !!m).sort((a, b) => a.index - b.index)[0];
  if (!first) return null;
  if (first === isoMatch) {
    const [y, m, d] = [Number(first[1]), Number(first[2]), Number(first[3])];
    return isValidDay(y, m, d) ? iso(y, m, d) : null;
  }
  const day = Number(first[1]);
  const month = MONTHS.indexOf(first[2].slice(0, 3).toLowerCase()) + 1;
  let year = first[3] ? Number(first[3]) : ref.year;
  if (!first[3] && month < ref.month - 6) year += 1;
  return isValidDay(year, month, day) ? iso(year, month, day) : null;
}

/** The field table: rows of "| Field | Value |", the field matched case-insensitively. */
function tableFields(markdown: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const line of markdown.split(/\r?\n/)) {
    const row = /^\s*\|(.*)\|\s*$/.exec(line);
    if (!row) continue;
    const cells = row[1].split("|").map((cell) => cell.trim());
    if (cells.length < 2) continue;
    const key = plainText(cells[0]).toLowerCase();
    if (!fields.has(key)) fields.set(key, cells.slice(1).join(" | "));
  }
  return fields;
}

/** The "- [ ]" items under "## Steps", up to the next heading of level 1 or 2. */
function stepsOf(markdown: string): SeedStep[] {
  const steps: SeedStep[] = [];
  let inSteps = false;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^(#{1,2})\s+(.*)$/.exec(line);
    if (heading) {
      inSteps = plainText(heading[2]).toLowerCase() === "steps";
      continue;
    }
    if (!inSteps) continue;
    const item = /^[-*]\s+\[([ xX])\]\s+(.+)$/.exec(line);
    if (!item) continue;
    const text = plainText(item[2]);
    if (text) steps.push({ text: text.slice(0, 500), done: item[1].toLowerCase() === "x" });
  }
  return steps;
}

/**
 * One page, or null when it is not an operation (no field table and no
 * steps). Throws on a file name that cannot be a slug.
 */
export function parseOperation(
  fileName: string,
  markdown: string,
  opts: { position?: number; year?: number } = {}
): SeedOperation | null {
  const slug = fileName.replace(/\.md$/i, "").toLowerCase();
  if (!SLUG.test(slug)) throw new Error(`${fileName}: the file name must be lowercase letters, digits and dashes`);
  const meta = frontmatter(markdown);
  const fields = tableFields(markdown);
  const steps = stepsOf(markdown);
  const hasFields = ["goal", "owner", "deadline", "status"].some((k) => fields.has(k));
  if (!hasFields && steps.length === 0) return null;

  const h1 = /^#\s+(.+)$/m.exec(markdown)?.[1];
  const title = plainText(meta.title ?? h1 ?? slug).slice(0, 200) || slug;
  const updated = /^(\d{4})-(\d{2})-\d{2}$/.exec(meta.updated ?? "");
  const now = new Date();
  const ref = {
    year: opts.year ?? (updated ? Number(updated[1]) : now.getUTCFullYear()),
    month: updated ? Number(updated[2]) : opts.year ? 1 : now.getUTCMonth() + 1,
  };
  const deadline = known(fields.get("deadline"));

  return {
    slug,
    title,
    goal: known(fields.get("goal"))?.slice(0, 1000) ?? null,
    done_when: known(fields.get("done when"))?.slice(0, 1000) ?? null,
    owner: known(fields.get("owner"))?.slice(0, 100) ?? null,
    deadline_text: deadline?.slice(0, 200) ?? null,
    deadline_on: parseDeadline(deadline, ref),
    status: known(fields.get("status"))?.slice(0, 300) ?? null,
    position: opts.position ?? 0,
    steps: steps.slice(0, 100),
  };
}

/** The order the README links the pages in: file names, first mention wins. */
export function readmeOrder(readme: string): string[] {
  const order: string[] = [];
  for (const match of readme.matchAll(/\]\(\.?\/?([a-z0-9][a-z0-9-]*\.md)(?:#[^)]*)?\)/gi)) {
    const name = match[1].toLowerCase();
    if (!order.includes(name)) order.push(name);
  }
  return order;
}

/**
 * Every operation in a folder's files ({name: content}). Pages the README
 * links come first in its order, then the rest by name.
 */
export function parseFolder(files: Record<string, string>, opts: { year?: number } = {}): SeedOperation[] {
  const readmeName = Object.keys(files).find((name) => name.toLowerCase() === "readme.md");
  const order = readmeName ? readmeOrder(files[readmeName]) : [];
  const names = Object.keys(files)
    .filter((name) => name !== readmeName && /\.md$/i.test(name))
    .sort((a, b) => {
      const ia = order.indexOf(a.toLowerCase());
      const ib = order.indexOf(b.toLowerCase());
      if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
      return a.localeCompare(b);
    });
  const ops: SeedOperation[] = [];
  for (const name of names) {
    const op = parseOperation(name, files[name], { position: ops.length + 1, year: opts.year });
    if (op) ops.push(op);
  }
  return ops;
}
