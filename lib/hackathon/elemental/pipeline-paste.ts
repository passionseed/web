import {
  looksLikePhoneNumber,
  PIPELINE_KINDS,
  pipelineCreateSchema,
  type PipelineCreateInput,
  type PipelineKind,
} from "./pipeline";

/**
 * Parse a list pasted from a spreadsheet (tab-separated) or a CSV
 * (comma-separated) into pipeline rows. Columns, in order:
 *
 *   kind, name, organisation, why_fit, reach
 *
 * A header row is optional; when present it can name the columns in any
 * order, in English or Thai, and with no name column the organisation is
 * the name. Without one, the kind column may be left out of the whole paste,
 * or left empty on a row, and those rows take the board's active tab.
 * Quoted cells may hold commas, tabs and line breaks. Any cell that looks
 * like a phone number is blanked, with a warning, because the pipeline never
 * stores personal numbers. Pure, so it is tested.
 */

export type PasteColumn = "kind" | "name" | "organisation" | "why_fit" | "reach";

export type PastedRow = {
  line: number;
  input: PipelineCreateInput;
};

export type PasteError = { line: number; message: string };

export type PasteWarning = { line: number; message: string };

export type PasteResult = {
  rows: PastedRow[];
  errors: PasteError[];
  /** Cells that were blanked because they looked like a phone number. */
  warnings: PasteWarning[];
  hadHeader: boolean;
};

const ORDER: PasteColumn[] = ["kind", "name", "organisation", "why_fit", "reach"];

const HEADER_ALIASES: Record<string, PasteColumn> = {
  kind: "kind",
  type: "kind",
  name: "name",
  organisation: "organisation",
  organization: "organisation",
  org: "organisation",
  company: "organisation",
  "why fit": "why_fit",
  why: "why_fit",
  fit: "why_fit",
  reach: "reach",
  channel: "reach",
  link: "reach",
  contact: "reach",
  // Thai headers, as the team writes them in Google Sheets.
  ประเภท: "kind",
  ชื่อ: "name",
  องค์กร: "organisation",
  บริษัท: "organisation",
  หน่วยงาน: "organisation",
  ชื่อองค์กร: "organisation",
  เหตุผล: "why_fit",
  ทำไม: "why_fit",
  ช่องทาง: "reach",
  ลิงก์: "reach",
  ลิ้งก์: "reach",
  ติดต่อ: "reach",
  ช่องทางติดต่อ: "reach",
  ชื่อสปอนเซอร์: "name",
  ชื่อผู้สนับสนุน: "name",
  ชื่อวิทยากร: "name",
  ชื่อพาร์ทเนอร์: "name",
  ชื่อบริษัท: "organisation",
  "company name": "organisation",
};

/** Thai (and spoken English) words for each kind. */
const KIND_ALIASES: Record<string, PipelineKind> = {
  สปอนเซอร์: "sponsor",
  ผู้สนับสนุน: "sponsor",
  พาร์ทเนอร์: "partner",
  พาร์ทเนอร์ส: "partner",
  พันธมิตร: "partner",
  วิทยากร: "speaker",
  ผู้พูด: "speaker",
  สปีกเกอร์: "speaker",
};

/** "Sponsors", " speaker ", "วิทยากร" -> the kind; anything else -> null. */
export function parseKind(raw: string): PipelineKind | null {
  const t = raw.trim().toLowerCase();
  if (KIND_ALIASES[t]) return KIND_ALIASES[t];
  const v = t.replace(/s$/, "");
  return (PIPELINE_KINDS as readonly string[]).includes(v) ? (v as PipelineKind) : null;
}

/** Name and kind, the way duplicates are matched: trimmed, lower-case. */
export function duplicateKey(row: { name: string; kind: PipelineKind }): string {
  return `${row.kind}\u0000${row.name.trim().toLowerCase()}`;
}

/**
 * Split rows into new ones and ones already on the board (same name and
 * kind), also dropping repeats inside the paste itself. Order is kept.
 */
export function splitDuplicates<T extends { name: string; kind: PipelineKind }>(
  rows: readonly T[],
  existing: readonly { name: string; kind: PipelineKind }[],
): { fresh: T[]; duplicates: T[] } {
  const seen = new Set(existing.map(duplicateKey));
  const fresh: T[] = [];
  const duplicates: T[] = [];
  for (const r of rows) {
    const k = duplicateKey(r);
    if (seen.has(k)) duplicates.push(r);
    else {
      seen.add(k);
      fresh.push(r);
    }
  }
  return { fresh, duplicates };
}

type RawRecord = { line: number; cells: string[] };

/** Index of the quote that closes a quoted cell opened at `open`, or -1. */
function closingQuote(text: string, open: number): number {
  for (let j = open + 1; j < text.length; j++) {
    if (text[j] !== '"') continue;
    if (text[j + 1] === '"') {
      j++;
      continue;
    }
    return j;
  }
  return -1;
}

/**
 * Split pasted text into records in one quote-aware pass, the way Google
 * Sheets and Excel write the clipboard: a cell that starts with a double
 * quote runs to its closing quote, may hold the delimiter and line breaks,
 * and "" inside it is one quote. A quote with no closing partner is kept as
 * text. Each record remembers the line it starts on.
 */
function tokenize(text: string, delimiter: "\t" | ","): RawRecord[] {
  const records: RawRecord[] = [];
  let cells: string[] = [];
  let cur = "";
  let line = 1;
  let recordLine = 1;
  let i = 0;
  const endCell = () => {
    cells.push(cur);
    cur = "";
  };
  const endRecord = () => {
    endCell();
    records.push({ line: recordLine, cells });
    cells = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' && cur.trim() === "") {
      const close = closingQuote(text, i);
      if (close !== -1) {
        const inner = text.slice(i + 1, close);
        cur = inner.replace(/""/g, '"');
        line += (inner.match(/\n/g) ?? []).length;
        i = close + 1;
        continue;
      }
    }
    if (ch === delimiter) {
      endCell();
    } else if (ch === "\n") {
      endRecord();
      line += 1;
      recordLine = line;
    } else {
      cur += ch;
    }
    i++;
  }
  endRecord();
  return records;
}

/** Split one CSV line, honouring double quotes ("a, b" stays one cell; "" is a quote). */
export function splitCsvLine(line: string): string[] {
  return tokenize(line, ",")[0].cells;
}

/** The column a header cell names: the whole cell, or any part of "Name / ชื่อ" or "ชื่อ (Name)". */
function headerColumn(cell: string): PasteColumn | null {
  const norm = (v: string) => v.trim().toLowerCase().replace(/[_\s]+/g, " ");
  const whole = HEADER_ALIASES[norm(cell)];
  if (whole) return whole;
  for (const part of cell.split(/[/()|]/)) {
    const hit = HEADER_ALIASES[norm(part)];
    if (hit) return hit;
  }
  return null;
}

/**
 * The first row is a header when it names the name column, when two or more
 * cells name known columns, or when every filled cell names one.
 */
function headerMap(cells: string[]): (PasteColumn | null)[] | null {
  const mapped = cells.map(headerColumn);
  const known = mapped.filter(Boolean).length;
  const filled = cells.filter((c) => c.trim() !== "").length;
  return mapped.includes("name") || known >= 2 || (known > 0 && known === filled) ? mapped : null;
}

export function parsePipelinePaste(text: string, defaultKind: PipelineKind): PasteResult {
  const normalised = text.replace(/\r\n?/g, "\n");
  const delimiter = normalised.includes("\t") ? "\t" : ",";
  const records = tokenize(normalised, delimiter)
    .map((r) => ({ line: r.line, cells: r.cells.map((c) => c.trim()) }))
    .filter((r) => r.cells.some((c) => c !== ""));
  if (records.length === 0) return { rows: [], errors: [], warnings: [], hadHeader: false };

  const header = headerMap(records[0].cells);
  const body = header ? records.slice(1) : records;

  // Without a header, decide once for the whole paste whether the first
  // column is the kind, so every row is read the same way: yes when a row
  // has all five columns, when a row leaves the first cell empty, or when
  // most rows start with a known kind.
  const hasKindColumn =
    header !== null ||
    body.some((r) => r.cells.length >= ORDER.length) ||
    body.some((r) => r.cells[0] === "" && r.cells.length >= 2) ||
    body.filter((r) => parseKind(r.cells[0] ?? "") !== null).length * 2 > body.length;

  const rows: PastedRow[] = [];
  const errors: PasteError[] = [];
  const warnings: PasteWarning[] = [];

  for (const { cells: rawCells, line } of body) {
    // Blank anything that reads as a phone number, in every column.
    let blanked = 0;
    const cells = rawCells.map((c) => {
      if (c && looksLikePhoneNumber(c)) {
        blanked += 1;
        return "";
      }
      return c;
    });
    if (blanked > 0) {
      warnings.push({
        line,
        message: `${blanked === 1 ? "A phone number was" : `${blanked} phone numbers were`} removed. Use a public page or channel instead.`,
      });
    }
    const record: Partial<Record<PasteColumn, string>> = {};

    if (header) {
      header.forEach((col, i) => {
        if (col && cells[i] !== undefined && record[col] === undefined) record[col] = cells[i];
      });
    } else {
      const order = hasKindColumn ? ORDER : ORDER.slice(1);
      order.forEach((col, i) => {
        if (cells[i] !== undefined) record[col] = cells[i];
      });
    }

    // An empty kind takes the active tab; any other text must be a kind.
    let kind = defaultKind;
    if (record.kind) {
      const k = parseKind(record.kind);
      if (!k) {
        errors.push({ line, message: `"${record.kind}" is not a kind (sponsor, partner or speaker)` });
        continue;
      }
      kind = k;
    }

    // A header with an organisation column and no name column: the organisation is the name.
    const orgAsName = header !== null && !header.includes("name");
    const parsed = pipelineCreateSchema.safeParse({
      kind,
      name: (orgAsName ? record.organisation : record.name) ?? "",
      organisation: orgAsName ? undefined : record.organisation,
      why_fit: record.why_fit,
      reach: record.reach,
    });
    if (!parsed.success) {
      errors.push({ line, message: parsed.error.issues[0]?.message ?? "Row is not valid" });
      continue;
    }
    rows.push({ line, input: parsed.data });
  }

  return { rows, errors, warnings, hadHeader: header !== null };
}
