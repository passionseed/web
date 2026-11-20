/**
 * Puts text typed on the sponsor deck's local edit mode back into
 * SponsorDeck.tsx. Pure: takes the source and the edits, returns the new
 * source and what happened to each edit. Used only by the dev-only route
 * app/api/dev/sponsor-deck/route.ts.
 *
 * Two kinds of edit:
 * - "text": a piece of text on the page. It's found in the source as a
 *   string literal or JSX text. Text built from code (facts.ts, template
 *   strings, upper-cased labels) isn't found and is reported, not guessed.
 * - "fill": a yellow (fill in: ...) marker. <Fill>before</Fill> is replaced
 *   with the typed value.
 *
 * `nth` is which match to change when the same text appears more than once,
 * counted in page order (the source is in the same order for these).
 */

export type DeckEdit = { kind: "text" | "fill"; before: string; after: string; nth: number };
export type DeckEditResult = { before: string; after: string; ok: boolean; reason?: string };

export const MAX_EDITS = 200;
export const MAX_LENGTH = 2000;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Blanks out comment lines so text in comments is never matched. */
function maskComments(src: string): string {
  return src
    .split("\n")
    .map((line) => {
      const t = line.trimStart();
      const comment = t.startsWith("//") || t.startsWith("/*") || t.startsWith("*") || t.startsWith("{/*");
      return comment ? " ".repeat(line.length) : line;
    })
    .join("\n");
}

function prevChar(src: string, i: number): string {
  let j = i - 1;
  while (j >= 0 && /\s/.test(src[j])) j--;
  return j >= 0 ? src[j] : "";
}

function nextChar(src: string, i: number): string {
  let j = i;
  while (j < src.length && /\s/.test(src[j])) j++;
  return j < src.length ? src[j] : "";
}

/**
 * Writes `value` for a spot whose preceding character is `before`:
 * a string literal, a template literal, or JSX text. Returns null when the
 * value can't be written there safely.
 */
function encode(value: string, before: string): string | null {
  if (before === '"') return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  if (before === "`") return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  // JSX text: these characters would turn into code.
  if (/[{}<>]/.test(value)) return null;
  return value;
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

export function applyDeckEdits(src: string, edits: DeckEdit[]): { text: string; results: DeckEditResult[] } {
  let text = src;
  const results: DeckEditResult[] = [];

  for (const edit of edits) {
    const before = clean(edit.before);
    const after = clean(edit.after);
    const result = (ok: boolean, reason?: string) => results.push({ before, after, ok, reason });

    if (!before || before === after) continue;
    if (!after) {
      result(false, "ว่างไม่ได้ ถ้าต้องการลบข้อความนี้ ให้บอก Claude");
      continue;
    }

    const masked = maskComments(text);
    const matches: { start: number; end: number; open: string }[] = [];

    if (edit.kind === "fill") {
      const re = new RegExp(`<Fill>\\s*${escapeRegExp(before)}\\s*</Fill>`, "g");
      for (let m = re.exec(masked); m; m = re.exec(masked)) {
        matches.push({ start: m.index, end: m.index + m[0].length, open: prevChar(masked, m.index) });
      }
    } else {
      const pattern = before.split(" ").map(escapeRegExp).join("\\s+");
      const re = new RegExp(pattern, "g");
      for (let m = re.exec(masked); m; m = re.exec(masked)) {
        const start = m.index;
        const end = start + m[0].length;
        const open = prevChar(masked, start);
        const close = nextChar(masked, end);
        // Whole string literals or whole runs of JSX text only.
        const okOpen = ['"', "`", ">", "}"].includes(open);
        const okClose = ['"', "`", "<", "{"].includes(close);
        if (okOpen && okClose) matches.push({ start, end, open });
      }
    }

    const target = matches[edit.nth] ?? (matches.length === 1 ? matches[0] : undefined);
    if (!target) {
      result(
        false,
        matches.length === 0
          ? "ข้อความนี้มาจากข้อมูลกลาง (facts.ts) หรือสร้างจากโค้ด แก้ตรงนี้ไม่ได้ ให้บอก Claude"
          : "หาตำแหน่งในไฟล์ไม่เจอ ให้บอก Claude",
      );
      continue;
    }

    let replacement: string | null;
    if (edit.kind === "fill") {
      // A prop or expression needs a string literal; JSX children take text.
      replacement = "{([,?:=".includes(target.open) ? JSON.stringify(after) : encode(after, ">");
    } else {
      replacement = encode(after, target.open);
    }
    if (replacement === null) {
      result(false, "มีเครื่องหมาย { } < > ที่ใช้ตรงนี้ไม่ได้");
      continue;
    }

    text = text.slice(0, target.start) + replacement + text.slice(target.end);
    result(true);
  }

  return { text, results };
}
