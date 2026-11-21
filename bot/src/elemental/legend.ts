import { escapeMarkdown } from "discord.js";

import { isElementKey, type ElementKey } from "../../../lib/elemental/core/index";
import { SCHEDULE } from "./copy/schedule";

/**
 * The campfire legend: one line per live team, "NN · element · project",
 * in slot order. It is the plot sign the picture cannot carry (the island
 * draws digits only), read out at the campfire's screen share.
 *
 * Built from elemental_bot_island_state rows, which carry no Discord id and
 * no member: only slot, element and project name reach a line. The project
 * name is the team's own (SQL refused contacts when it was set); it is put on
 * one line, cut to 60 characters and markdown-escaped, and every send goes
 * with allowed_mentions {parse: []}, so an "@everyone" in a name pings no one.
 *
 * Discord caps a message at 2,000 characters. Lines are packed into messages
 * under that; past MAX_LEGEND_MESSAGES the legend goes as one .txt file
 * instead, so 175 teams never flood the channel.
 */

export const MESSAGE_LIMIT = 2_000;
/** More messages than this and the legend becomes a .txt attachment. */
export const MAX_LEGEND_MESSAGES = 6;
export const LEGEND_FILE = "legend.txt";
/** The longest project name SQL accepts (bad_project_name past 60). */
const NAME_MAX = 60;

/** One island_state row, as far as the legend reads it. */
export interface LegendRow {
  slot: number;
  element: ElementKey;
  projectName: string;
}

/** island_state rows to legend rows: live plots only, valid slot and element, no repeated slot, slot order. */
export function legendRows(rows: readonly unknown[]): LegendRow[] {
  const seen = new Set<number>();
  const out: LegendRow[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const slot = r.slot;
    if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 1 || slot > 200 || seen.has(slot)) continue;
    if (!isElementKey(r.element)) continue;
    seen.add(slot);
    out.push({ slot, element: r.element, projectName: typeof r.project_name === "string" ? r.project_name : "" });
  }
  return out.sort((a, b) => a.slot - b.slot);
}

/**
 * The project name on one line: no line breaks or control characters, spaces
 * collapsed, at most 60 characters. A mention token (<@id>, <#id>, <@&id>)
 * would show a member's or role's name, and a bare 17-20 digit run could be a
 * Discord id, so neither survives.
 */
export function oneLine(name: string): string {
  const flat = name
    .replace(/<(?:@[!&]?|#)\d+>/g, "@")
    .replace(/\d{17,}/g, "#")
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [...flat].slice(0, NAME_MAX).join("");
}

export function slotLabel(slot: number): string {
  return String(slot).padStart(2, "0");
}

/** "07 · ไฟ · project" for a message (markdown-escaped name). */
export function legendLine(row: LegendRow): string {
  const name = escapeMarkdown(oneLine(row.projectName)) || "-";
  return `${slotLabel(row.slot)} · ${SCHEDULE.legendElement(row.element)} · ${name}`;
}

/** The same line for the .txt file: the name as typed (on one line), no escapes. */
export function legendFileLine(row: LegendRow): string {
  return `${slotLabel(row.slot)} · ${SCHEDULE.legendElement(row.element)} · ${oneLine(row.projectName) || "-"}`;
}

/** Packs lines into messages of at most limit characters (a line is never split; one longer than limit is cut). */
export function packLines(lines: readonly string[], limit: number = MESSAGE_LIMIT): string[] {
  const messages: string[] = [];
  let current = "";
  for (const raw of lines) {
    const line = raw.length > limit ? raw.slice(0, limit) : raw;
    if (!current) current = line;
    else if (current.length + 1 + line.length <= limit) current += `\n${line}`;
    else {
      messages.push(current);
      current = line;
    }
  }
  if (current) messages.push(current);
  return messages;
}

export type Legend =
  | { kind: "messages"; messages: string[] }
  | { kind: "file"; summary: string; file: { name: string; data: Buffer } };

/** The legend for these rows: up to MAX_LEGEND_MESSAGES messages, else one .txt file. Empty island: no messages. */
export function buildLegend(rows: readonly LegendRow[], opts: { limit?: number; maxMessages?: number } = {}): Legend {
  const messages = packLines(rows.map(legendLine), opts.limit ?? MESSAGE_LIMIT);
  if (messages.length <= (opts.maxMessages ?? MAX_LEGEND_MESSAGES)) return { kind: "messages", messages };
  const text = `${rows.map(legendFileLine).join("\n")}\n`;
  return { kind: "file", summary: SCHEDULE.legendFile(rows.length), file: { name: LEGEND_FILE, data: Buffer.from(text, "utf8") } };
}
