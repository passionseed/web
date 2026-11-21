import { ApplicationCommandOptionType, type APIApplicationCommandSubcommandOption, type ChatInputCommandInteraction } from "discord.js";

import { bangkokDay, bangkokTime } from "../../../../lib/elemental/core";
import { ElementalError, type ElementalApi } from "../api";
import { say, type ElCtx, type ElementalFeature } from "../context";
import { EXPORT_COPY } from "../copy/export";
import type { StaffRole } from "../roles";

/**
 * /el export (E29): one CSV row per live team for the judging sheet's Teams
 * tab (company-brain private/hackathon-december-2026-judging.md, "The sheet":
 * no student names or schools, only team IDs and project names).
 *
 * Host only (Judge refused, like every other staff tool). The file goes back
 * ephemerally, so only the Host who ran it sees it, whatever channel it was
 * run in; they download it and import it into the sheet.
 *
 * Reads only, through functions that already exist (no new SQL):
 * - elemental_bot_island_state(edition): live teams with slot, element,
 *   project name and counted testers (no Discord ids);
 * - elemental_bot_canvas_target(guild, team_id): a team that handed in has a
 *   'ship' note whose fields are {url, at, late}; one that has not raises
 *   el:entry_not_found. Called one team at a time, so the bot's small pool
 *   (2 connections) always has one free for students.
 *
 * Only the seven columns below are written, picked field by field: nothing
 * else the functions return (owner ids, board ids, member lists) can reach
 * the file.
 */

export const STAFF_CMD = "el";
export const SUB = "export";
/** Host only: Host always passes a gate, and "host" is the only role listed. */
export const HOST_ONLY: readonly StaffRole[] = ["host"];

/** The Teams tab's columns, in order. */
export const COLUMNS = ["team_id", "slot", "project", "element", "counted_testers", "handin_url", "handin_late"] as const;
export type Column = (typeof COLUMNS)[number];
export type ExportRow = Record<Column, string | number | boolean | null>;

/** What elemental_bot_island_state returns per live team. */
export interface IslandRow {
  team_id: string;
  slot: number;
  element: string;
  project_name: string;
  status?: string;
  counted: number;
}

export interface Handin {
  url: string;
  late: boolean;
}

/** A 'ship' note target (elemental_bot_canvas_target with a team id); only fields is read. */
interface ShipTarget {
  kind?: string;
  fields?: { url?: unknown; late?: unknown } | null;
}

/** The team's hand-in, or null when it has none. Any other failure is thrown: a sheet with silent gaps is worse than none. */
export async function readHandin(api: ElementalApi, guildId: string, teamId: string): Promise<Handin | null> {
  let target: ShipTarget | null;
  try {
    target = await api.call<ShipTarget | null>("elemental_bot_canvas_target", guildId, teamId);
  } catch (error) {
    if (error instanceof ElementalError && error.code === "entry_not_found") return null;
    throw error;
  }
  if (!target || target.kind !== "ship") return null;
  const url = target.fields?.url;
  if (typeof url !== "string" || !url) return null;
  return { url, late: target.fields?.late === true };
}

/** Rows for every live team, ordered by slot. */
export async function exportRows(api: ElementalApi, guildId: string, edition: string): Promise<ExportRow[]> {
  const teams = await api.rows<IslandRow>("elemental_bot_island_state", edition);
  const sorted = [...teams].sort((a, b) => Number(a.slot) - Number(b.slot));
  const rows: ExportRow[] = [];
  for (const team of sorted) {
    // Sequential on purpose (see the header): at most one pool connection.
    const handin = await readHandin(api, guildId, team.team_id);
    rows.push({
      team_id: team.team_id,
      slot: team.slot,
      project: team.project_name,
      element: team.element,
      counted_testers: Number(team.counted) || 0,
      handin_url: handin?.url ?? null,
      // Empty when there is no hand-in, so "not handed in" never reads as "on time".
      handin_late: handin ? handin.late : null,
    });
  }
  return rows;
}

/** Leading characters a spreadsheet would run as a formula (CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

/** One CSV field (RFC 4180): formula-looking text gets a leading apostrophe, then quoting when needed. */
export function csvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  let s = value.replace(/\r\n?/g, "\n");
  if (FORMULA_START.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * The whole file: a UTF-8 byte-order mark (so Excel reads Thai project names;
 * Google Sheets ignores it), the header, one line per row, CRLF line ends.
 */
export function toCsv(rows: readonly ExportRow[]): string {
  const lines = [COLUMNS.join(","), ...rows.map((row) => COLUMNS.map((c) => csvField(row[c])).join(","))];
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** elemental-teams-<edition>-<YYYYMMDD>-<HHMM>.csv, Bangkok time. */
export function fileName(edition: string, at: Date = new Date()): string {
  const safe = edition.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "edition";
  return `elemental-teams-${safe}-${bangkokDay(at).replace(/-/g, "")}-${bangkokTime(at).replace(":", "")}.csv`;
}

export const SUBCOMMANDS: APIApplicationCommandSubcommandOption[] = [
  { type: ApplicationCommandOptionType.Subcommand, name: SUB, description: EXPORT_COPY.description },
];

async function runExport(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const edition = ctx.settings.edition;
  const rows = await exportRows(ctx.api, ctx.guildId, edition);
  const handins = rows.filter((r) => r.handin_url);
  const late = handins.filter((r) => r.handin_late === true);
  await say(i, {
    content: rows.length ? EXPORT_COPY.ready({ teams: rows.length, handins: handins.length, late: late.length, edition }) : EXPORT_COPY.empty,
    files: [{ attachment: Buffer.from(toCsv(rows), "utf8"), name: fileName(edition) }],
  });
}

export const feature: ElementalFeature = {
  name: "export",
  staffSubcommands: SUBCOMMANDS,
  commandHandlers: {
    [`${STAFF_CMD} ${SUB}`]: { ack: "ephemeral", gate: HOST_ONLY, run: runExport },
  },
};
