/**
 * EvidenceMaker: builds the write-up Markdown on the device. Nothing here is
 * uploaded; drafts live in GuideState.local (device only).
 */

export interface WriteupInput {
  roomTitle: string;
  /** YYYY-MM-DD, local date. */
  date: string;
  fields: readonly { label: string; value: string }[];
  fixedLines: readonly string[];
  /** Proof picks from the ladder level, as labels. */
  proof: readonly string[];
}

export const EMPTY_FIELD_TH = "(ยังไม่ได้เขียน)";

/** Thai + English Markdown, ready for Notion, Google Docs or a GitHub README. */
export function buildWriteupMarkdown(input: WriteupInput): string {
  const out: string[] = [`# Write-up: ${input.roomTitle}`, "", `วันที่ (Date): ${input.date}`, ""];
  for (const f of input.fields) {
    out.push(`## ${f.label}`, f.value.trim() || EMPTY_FIELD_TH, "");
  }
  if (input.proof.length) {
    out.push("## แผนของฉัน (My plan)", ...input.proof.map((p) => `- ${p}`), "");
  }
  for (const line of input.fixedLines) out.push(`> ${line}`);
  return out.join("\n").trimEnd() + "\n";
}

/** Local calendar date as YYYY-MM-DD (not UTC, so a late-night write-up keeps tonight's date). */
export function localIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type CopyOutcome = "copied" | "fallback";

/**
 * Tries the async clipboard; any failure (no API, IG in-app browser denial)
 * returns "fallback" so the caller shows a pre-selected textarea.
 */
export async function copyText(
  text: string,
  clipboard: { writeText(t: string): Promise<void> } | undefined = typeof navigator !== "undefined"
    ? navigator.clipboard
    : undefined
): Promise<CopyOutcome> {
  if (!clipboard?.writeText) return "fallback";
  try {
    await clipboard.writeText(text);
    return "copied";
  } catch {
    return "fallback";
  }
}
