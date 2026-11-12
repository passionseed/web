/**
 * Card copy checks for `radar:dump` and the card-copy jest test (spec 7.1).
 * Pure: takes a dump-shaped field, returns findings.
 */
import { findDashes } from "../../../lib/radar-guide/thai-copy";
import type { RadarCardRow } from "../../../lib/radar-guide/types";

export interface CopyFinding {
  /** Where the text lives, for example `cards[40:salaryProgression].content_th.levels.0.salary`. */
  path: string;
  char: string;
  context: string;
  /** True for cards with `is_hidden`; they never render, so these are warnings. */
  hidden: boolean;
}

interface FieldLike {
  name_th?: string | null;
  tagline_th?: string | null;
  radar_cards: Pick<RadarCardRow, "kind" | "position" | "is_hidden" | "content_th">[];
}

/** Every string inside a JSON value, with its dotted path. */
export function stringLeaves(value: unknown, path: string): Array<{ path: string; text: string }> {
  if (typeof value === "string") return [{ path, text: value }];
  if (Array.isArray(value)) return value.flatMap((item, i) => stringLeaves(item, `${path}.${i}`));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      stringLeaves(child, `${path}.${key}`)
    );
  }
  return [];
}

/**
 * Dashes (em, en and their look-alikes) in `name_th`, `tagline_th` and every
 * string in every card's `content_th`. URLs are skipped: a dash in a link is
 * not copy.
 */
export function findCardCopyDashes(field: FieldLike): CopyFinding[] {
  const findings: CopyFinding[] = [];
  const check = (path: string, text: string | null | undefined, hidden: boolean) => {
    if (!text || /^https?:\/\//.test(text)) return;
    for (const hit of findDashes(text)) findings.push({ path, char: hit.char, context: hit.context, hidden });
  };
  check("name_th", field.name_th, false);
  check("tagline_th", field.tagline_th, false);
  for (const card of field.radar_cards) {
    const base = `cards[${card.position}:${card.kind}].content_th`;
    for (const leaf of stringLeaves(card.content_th, base)) check(leaf.path, leaf.text, Boolean(card.is_hidden));
  }
  return findings;
}

export function formatFinding(finding: CopyFinding): string {
  const code = finding.char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0");
  return `${finding.path}: U+${code} in "…${finding.context}…"${finding.hidden ? " (hidden card)" : ""}`;
}
