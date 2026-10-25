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
  alumni: "alumni.md",
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

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Saturday" for "2026-10-17". */
function weekday(isoDate: string): string {
  return WEEKDAYS[new Date(`${isoDate}T00:00:00Z`).getUTCDay()];
}

/** "19:00 to 21:00", "from 19:00", or undefined before a time is set. */
function timeRange(start?: string, end?: string): string | undefined {
  if (!start) return undefined;
  return end ? `${start} to ${end}` : `from ${start}`;
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

// ---- Bot-owned section tables (shift.md, alumni.md) -----------------------

interface SectionTable {
  heading: string;
  intro: string;
  header: string[];
  /** The bot adds its section above this heading when the page has it. */
  before: string;
}

/**
 * Upserts the row keyed by `key` in a bot-owned table, creating the section
 * if needed. `merge` gets the existing cells, or `(fill in)` for a new row.
 */
function upsertSectionRow(
  content: string,
  table: SectionTable,
  key: string,
  merge: (old: string[]) => string[],
): string {
  const headerRow = joinRow(table.header);
  const separator = `|${table.header.map(() => "---").join("|")}|`;
  let lines = content.replace(/\n*$/, "").split("\n");
  let heading = lines.findIndex((l) => l.trim() === table.heading);
  if (heading < 0) {
    const section = [table.heading, "", table.intro, "", headerRow, separator, ""];
    const before = lines.findIndex((l) => l.trim() === table.before);
    if (before >= 0) {
      lines.splice(before, 0, ...section);
      heading = before;
    } else {
      lines.push("", ...section);
      heading = lines.length - section.length;
    }
  }
  const firstCell = `| ${table.header[0]} |`;
  let header = lines.findIndex((l, i) => i > heading && l.trim().startsWith(firstCell));
  if (header < 0) {
    lines.splice(heading + 1, 0, "", headerRow, separator);
    header = heading + 2;
  }
  lines = upsertTableRow(lines, header, key, (existing) =>
    merge(existing ?? table.header.map(() => FILL_IN)),
  );
  return lines.join("\n") + "\n";
}

// ---- shift.md -----------------------------------------------------------

export const ROUNDS_HEADING = "## Rounds in the web app";
const ROUNDS_TABLE: SectionTable = {
  heading: ROUNDS_HEADING,
  intro:
    "Written automatically by the `web-sync` bot from admin actions on passionseed.org. Prices and counts are in [numbers.md](numbers.md).",
  header: ["Round", "Status", "Starts", "Days", "Closes", "Source", "As of"],
  before: "## Open questions",
};

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
  return upsertSectionRow(content, ROUNDS_TABLE, roundLabel, (old) => [
    roundLabel,
    facts.status ?? old[1] ?? FILL_IN,
    facts.starts_on ?? old[2] ?? FILL_IN,
    facts.days !== undefined ? String(facts.days) : (old[3] ?? FILL_IN),
    facts.closes_on ?? old[4] ?? FILL_IN,
    source,
    asOf,
  ]);
}

// ---- alumni.md ----------------------------------------------------------

export const SESSIONS_HEADING = "## Sessions in the web app";
const SESSIONS_TABLE: SectionTable = {
  heading: SESSIONS_HEADING,
  intro:
    "Written automatically by the `web-sync` bot from the alumni calendar admin on passionseed.org (passionseed.org/shift/alumni). Times are Bangkok time. RSVP counts are in [numbers.md](numbers.md).",
  header: ["Session", "Title", "Time", "Status", "Source", "As of"],
  before: "## Open questions",
};

/** The weekly series row's key in the sessions table. */
export const WEEKLY_SERIES = "Weekly series";

export interface SessionFacts {
  title?: string;
  time?: string;
  status?: string;
}

/** Upserts a row (a session date, or the weekly series) in the alumni.md sessions table. */
export function upsertSessionRow(
  content: string,
  key: string,
  facts: SessionFacts,
  source: string,
  asOf: string,
): string {
  return upsertSectionRow(content, SESSIONS_TABLE, key, (old) => [
    key,
    facts.title ?? old[1] ?? FILL_IN,
    facts.time ?? old[2] ?? FILL_IN,
    facts.status ?? old[3] ?? FILL_IN,
    source,
    asOf,
  ]);
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
  gallery_products: "products published in the gallery",
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
  const session = (key: string, facts: SessionFacts) => {
    const values = Object.values(facts).filter((v): v is string => v !== undefined);
    edits.push({
      path: PAGES.alumni,
      text: [key, source, ...values],
      apply: (c) => setUpdated(upsertSessionRow(c, key, facts, source, date), today),
    });
  };
  const number = (label: string, value: string) => {
    edits.push({
      path: PAGES.numbers,
      text: [label, value, source],
      apply: (c) => setUpdated(upsertNumber(c, label, value, source, date), today),
    });
  };
  const rsvps = (sessionDate: string, value: number | undefined) => {
    if (value !== undefined) number(`Alumni session ${sessionDate} RSVPs`, value.toLocaleString("en-US"));
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
    case "hackathon_team_invites_opened":
      return log("Hackathon team invite links turned on in the admin");
    case "hackathon_team_invites_closed":
      return log("Hackathon team invite links turned off in the admin");
    case "alumni_schedule_changed": {
      const p = event.payload;
      const every = `${weekday(p.first_date)} from ${p.first_date}`;
      const time = timeRange(p.start_time, p.end_time);
      session(WEEKLY_SERIES, { title: `Every ${every}`, time, status: "Scheduled" });
      return log(`Alumni weekly session set to every ${every}${time ? `, ${time}` : ""}`);
    }
    case "alumni_session_created": {
      const p = event.payload;
      const time = timeRange(p.start_time, p.end_time);
      session(p.date, { title: p.title, time, status: "One-off event" });
      const what = p.title ? `: ${p.title}` : "";
      return log(`Alumni event added on ${weekday(p.date)} ${p.date}${what}`);
    }
    case "alumni_session_changed": {
      const p = event.payload;
      const time = timeRange(p.start_time, p.end_time);
      session(p.date, { title: p.title, time, status: "Scheduled" });
      rsvps(p.date, p.rsvps);
      const parts = [p.title, time].filter(Boolean);
      return log(`Alumni session on ${weekday(p.date)} ${p.date} updated${parts.length ? `: ${parts.join(", ")}` : ""}`);
    }
    case "alumni_session_cancelled": {
      const p = event.payload;
      session(p.date, { title: p.title, status: "Cancelled" });
      rsvps(p.date, p.rsvps);
      return log(`Alumni session on ${weekday(p.date)} ${p.date} cancelled`);
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
  [PAGES.alumni]: "Alumni community",
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
