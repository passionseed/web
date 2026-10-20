import type { StoredBrainEvent } from "./schema";

/**
 * Pure templates that turn app events into Markdown edits on company-brain
 * pages. No AI: every sentence is fixed text plus allowlisted fields.
 * Unknown facts stay `(fill in)`, counts live only in numbers.md, and no
 * em dashes appear (company-brain AGENTS.md rules 1 to 4 and 8).
 */

export const FILL_IN = "(fill in)";
export const SOURCE = "passionseed.org admin";

export const PAGES = {
  log: "product-log.md",
  shift: "shift.md",
  numbers: "numbers.md",
} as const;

export interface PageEdit {
  path: string;
  apply: (content: string) => string;
  /** Every string this edit can insert, for the PII guard. */
  text: string[];
}

export interface RenderedEvent {
  summary: string;
  edits: PageEdit[];
}

// ---- Shared page helpers ------------------------------------------------

/** Sets the front-matter `updated:` date. */
export function setUpdated(content: string, today: string): string {
  return content.replace(/^(---\n[\s\S]*?^updated:\s*)\S+/m, `$1${today}`);
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function joinRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

/**
 * Updates the row whose first cell equals `key` in the table that starts at
 * `headerIndex`, or appends `cells` after the table's last row.
 * `merge` receives the existing cells (or null) and returns the new ones.
 */
function upsertTableRow(
  lines: string[],
  headerIndex: number,
  key: string,
  merge: (existing: string[] | null) => string[],
): string[] {
  let end = headerIndex + 1;
  while (end < lines.length && lines[end].trim().startsWith("|")) end++;
  for (let i = headerIndex + 2; i < end; i++) {
    const cells = splitRow(lines[i]);
    if (cells[0] === key) {
      const next = [...lines];
      next[i] = joinRow(merge(cells));
      return next;
    }
  }
  const next = [...lines];
  next.splice(end, 0, joinRow(merge(null)));
  return next;
}

function shiftLabel(round: number): string {
  return `shift[${round}]`;
}

function thb(value: number): string {
  return value === 0 ? "Free" : `฿${value.toLocaleString("en-US")}`;
}

// ---- product-log.md -----------------------------------------------------

/** Adds one dated line under the month heading, newest first. Idempotent per event. */
export function addLogLine(content: string, date: string, line: string, eventId: string): string {
  if (content.includes(eventId)) return content;
  const month = date.slice(0, 7);
  const entry = `- ${date} · ${line} (event \`${eventId}\`)`;
  let lines = content.split("\n");
  lines = lines.filter((l) => l.trim() !== "No entries yet.");

  const heading = lines.findIndex((l) => l.trim() === `## ${month}`);
  if (heading >= 0) {
    let at = heading + 1;
    while (at < lines.length && lines[at].trim() === "") at++;
    lines.splice(at, 0, entry);
    return lines.join("\n");
  }

  let logIndex = lines.findIndex((l) => l.trim() === "## Log");
  if (logIndex < 0) {
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    lines.push("", "## Log");
    logIndex = lines.length - 1;
  }
  let at = logIndex + 1;
  while (at < lines.length && lines[at].trim() === "") at++;
  const block = ["", `## ${month}`, "", entry];
  if (at < lines.length) block.push("");
  lines.splice(logIndex + 1, at - (logIndex + 1), ...block);
  return lines.join("\n").replace(/\n*$/, "\n");
}

// ---- shift.md -----------------------------------------------------------

export const ROUNDS_HEADING = "## Rounds in the web app";
const ROUNDS_INTRO =
  "Written automatically by the `web-sync` bot from admin actions on passionseed.org. Prices and counts are in [numbers.md](numbers.md).";
const ROUNDS_HEADER = ["Round", "Status", "Starts", "Days", "Closes", "Source", "As of"];
const ROUNDS_SEPARATOR = `|${ROUNDS_HEADER.map(() => "---").join("|")}|`;

export interface RoundFacts {
  status?: string;
  starts_on?: string;
  days?: number;
  closes_on?: string;
}

/** Upserts a round row in the shift.md rounds table, creating the section if needed. */
export function upsertRoundRow(
  content: string,
  roundLabel: string,
  facts: RoundFacts,
  source: string,
  asOf: string,
): string {
  let lines = content.replace(/\n*$/, "").split("\n");
  let heading = lines.findIndex((l) => l.trim() === ROUNDS_HEADING);
  if (heading < 0) {
    const section = [
      ROUNDS_HEADING,
      "",
      ROUNDS_INTRO,
      "",
      joinRow(ROUNDS_HEADER),
      ROUNDS_SEPARATOR,
      "",
    ];
    const before = lines.findIndex((l) => l.trim() === "## Open questions");
    if (before >= 0) {
      lines.splice(before, 0, ...section);
      heading = before;
    } else {
      lines.push("", ...section);
      heading = lines.length - section.length;
    }
  }
  let header = lines.findIndex((l, i) => i > heading && l.trim().startsWith("| Round |"));
  if (header < 0) {
    lines.splice(heading + 1, 0, "", joinRow(ROUNDS_HEADER), ROUNDS_SEPARATOR);
    header = heading + 2;
  }
  lines = upsertTableRow(lines, header, roundLabel, (existing) => {
    const old = existing ?? ROUNDS_HEADER.map(() => FILL_IN);
    return [
      roundLabel,
      facts.status ?? old[1] ?? FILL_IN,
      facts.starts_on ?? old[2] ?? FILL_IN,
      facts.days !== undefined ? String(facts.days) : (old[3] ?? FILL_IN),
      facts.closes_on ?? old[4] ?? FILL_IN,
      source,
      asOf,
    ];
  });
  return lines.join("\n") + "\n";
}

// ---- numbers.md ---------------------------------------------------------

/** Upserts a row in the main numbers.md table (the first `| Number |` table). */
export function upsertNumber(
  content: string,
  label: string,
  value: string,
  source: string,
  asOf: string,
): string {
  const lines = content.split("\n");
  const header = lines.findIndex((l) => l.trim().startsWith("| Number |"));
  if (header < 0) {
    const table = ["", "| Number | Value | Source | As of |", "|---|---|---|---|"];
    const trimmed = content.replace(/\n*$/, "");
    return [trimmed, ...table, joinRow([label, value, source, asOf])].join("\n") + "\n";
  }
  return upsertTableRow(lines, header, label, () => [label, value, source, asOf]).join("\n");
}

// ---- Event templates ----------------------------------------------------

const METRIC_LABELS: Record<string, string> = {
  entrants: "entrants",
  applications: "applications",
  accepted_applications: "accepted applications",
  paid_seats: "paid seats",
  seats: "seats",
  finished: "students who finished",
  certificates: "certificates issued",
  members: "members",
  enrollments: "enrollments",
};

const PROGRAM_LABELS: Record<string, string> = {
  shift: "SHIFT",
  pathlab: "PathLab",
  hackathon: "Hackathon",
  alumni: "Alumni community",
};

function eventDate(event: StoredBrainEvent, today: string): string {
  const date = new Date(event.created_at);
  if (Number.isNaN(date.getTime())) return today;
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

export function renderEvent(event: StoredBrainEvent, today: string): RenderedEvent {
  const date = eventDate(event, today);
  const source = `${SOURCE}, event ${event.id.slice(0, 8)}`;
  const edits: PageEdit[] = [];

  const log = (summary: string) => {
    edits.unshift({
      path: PAGES.log,
      text: [summary, event.id, date],
      apply: (c) => setUpdated(addLogLine(c, date, summary, event.id), today),
    });
    return { summary, edits };
  };
  const round = (label: string, facts: RoundFacts) => {
    const values = Object.values(facts)
      .filter((v) => v !== undefined)
      .map(String);
    edits.push({
      path: PAGES.shift,
      text: [label, source, ...values],
      apply: (c) => setUpdated(upsertRoundRow(c, label, facts, source, date), today),
    });
  };
  const number = (label: string, value: string) => {
    edits.push({
      path: PAGES.numbers,
      text: [label, value, source],
      apply: (c) => setUpdated(upsertNumber(c, label, value, source, date), today),
    });
  };

  switch (event.type) {
    case "shift_round_created": {
      const p = event.payload;
      const label = shiftLabel(p.round);
      const status = p.status === "published" ? "Published, open to join" : "Draft";
      round(label, { status, starts_on: p.starts_on, days: p.duration_days });
      const when = p.starts_on ? `, starts ${p.starts_on}` : "";
      const days = p.duration_days ? `, ${p.duration_days} days` : "";
      return log(`${label} round created in the web app${when}${days}`);
    }
    case "shift_round_published": {
      const label = shiftLabel(event.payload.round);
      round(label, { status: "Published, open to join" });
      return log(`${label} round published in the web app`);
    }
    case "shift_round_unpublished": {
      const label = shiftLabel(event.payload.round);
      round(label, { status: "Draft" });
      return log(`${label} round moved back to draft in the web app`);
    }
    case "shift_round_finished": {
      const label = shiftLabel(event.payload.round);
      round(label, { status: "Finished, archived" });
      return log(`${label} round archived in the web app`);
    }
    case "shift_registration_opened": {
      const label = shiftLabel(event.payload.round);
      round(label, { status: "Registration open" });
      return log(`${label} registration opened`);
    }
    case "shift_registration_closed": {
      const label = shiftLabel(event.payload.round);
      round(label, { status: "Registration closed" });
      return log(`${label} registration closed`);
    }
    case "shift_round_dates_changed": {
      const p = event.payload;
      const label = shiftLabel(p.round);
      round(label, { starts_on: p.starts_on, days: p.duration_days, closes_on: p.closes_on });
      const parts = [
        p.starts_on && `starts ${p.starts_on}`,
        p.duration_days && `${p.duration_days} days`,
        p.closes_on && `closes ${p.closes_on}`,
      ].filter(Boolean);
      return log(`${label} dates changed${parts.length ? `: ${parts.join(", ")}` : ""}`);
    }
    case "shift_price_changed": {
      const label = shiftLabel(event.payload.round);
      const price = thb(event.payload.price_thb);
      number(`${label} price per person`, price);
      return log(`${label} price set to ${price}`);
    }
    case "shift_camp_cohort_created": {
      const p = event.payload;
      round(`Camp: ${p.name}`, { status: "Camp cohort created", starts_on: p.starts_on });
      const when = p.starts_on ? `, starts ${p.starts_on}` : "";
      return log(`SHIFT camp cohort "${p.name}" created in the web app${when}`);
    }
    case "program_count_snapshot": {
      const p = event.payload;
      const scope =
        p.program === "shift" && p.round !== undefined
          ? shiftLabel(p.round)
          : `${PROGRAM_LABELS[p.program]}${p.round !== undefined ? ` round ${p.round}` : ""}`;
      const label = `${scope} ${METRIC_LABELS[p.metric]}`;
      const value = p.value.toLocaleString("en-US");
      number(label, value);
      return log(`${label}: ${value} (total)`);
    }
  }
}

// ---- New pages ----------------------------------------------------------

const PAGE_TITLES: Record<string, string> = {
  [PAGES.log]: "Product log",
  [PAGES.shift]: "Shift",
  [PAGES.numbers]: "Key numbers",
};

/** Header for a page that does not exist yet (company-brain rule 3). */
export function seedPage(path: string, today: string): string {
  const title = PAGE_TITLES[path] ?? path.replace(/\.md$/, "");
  const intro =
    path === PAGES.log
      ? "\nThe running log of what changed in the web app, written automatically by the `web-sync` bot, newest first.\n\n## Log\n"
      : "";
  return `---\ntitle: ${title}\nupdated: ${today}\n---\n\n# ${title}\n${intro}`;
}

/** Applies a page's edits in order, seeding the page first if it is missing. */
export function applyEdits(content: string, path: string, edits: PageEdit[], today: string): string {
  const base = content.trim() === "" ? seedPage(path, today) : content;
  return edits.reduce((page, edit) => edit.apply(page), base);
}
