import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  Routes,
  TextInputBuilder,
  TextInputStyle,
  type APIApplicationCommandOptionChoice,
  type APIApplicationCommandSubcommandOption,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";

import { refusePii } from "../../../../lib/elemental/core";
import { ElementalError } from "../api";
import { CANVAS_PENDING_FN, isWriting, tombstoneNote, writeNote, type PendingRow, type ResyncResult } from "../canvasWrite";
import type { TeamJson } from "../channels";
import { notify, say, type ComponentOrModal, type ElCtx, type ElementalFeature, type ElementalRuntime, type RepliableInteraction } from "../context";
import { CANVAS } from "../copy/canvas";
import { STAFF, staffErrorText } from "../copy/staff";
import { TESTER, testerErrorText, type TesterField } from "../copy/tester";
import { cid, isSnowflake, isUuid } from "../ids";
import { withRetry } from "../queue";
import { ELEMENTS, isElement, roleId, type ElementKey, type StaffRole } from "../roles";
import { canvasRefusal, canvasUrl, FRAME_ID, parseCanvasUrl, syncCanvasPin, type CanvasLinkResult, type PinOutcome } from "./canvas";
import {
  FIELD_MAX,
  FIELDS,
  MIRROR_ACTIONS,
  addedLines,
  canvasLine,
  checkValues,
  cleanField,
  deliverEntry,
  mirrorContent,
  mirrorRow,
  testerModal,
  type FieldProblem,
  type TesterAdded,
  type TesterEntry,
  type TesterValues,
} from "./tester";

/**
 * Staff tester and identity tools (E20), all under /el, every answer
 * ephemeral. Role gates (Host always passes; Judge never does):
 *
 * - Remove (el|rm|<entry>) and Reviewed (el|rv|<entry>), the buttons on each
 *   tester mirror post and on /el sample results: Host, Helper. Remove asks
 *   for a reason, un-counts the entry (elemental_bot_tester_remove), edits the
 *   post, then takes the note off the canvas (tombstoneNote, on the board's
 *   queue).
 * - /el sample n element: Host, Helper. Random entries nobody has reviewed or
 *   removed, one ephemeral message each, with the same two buttons.
 * - /el tester-add slot: Host, Helper. The Google Form fallback: the /tester
 *   form, logged by staff for the team at that plot, through the same
 *   pipeline (count, mirror, bell, canvas: deliverEntry).
 * - /el resync: Host. Retries canvas writes that failed or never ran.
 * - /el totals: Host. Tonight's numbers.
 * - /el link user registration position: Host. A lost or misused code: the
 *   same SQL path as /join, audited; then the Paid role.
 * - /el canvas-link slot url: Host. Links a team's canvas without the element
 *   and member checks; pins it in the team channel.
 * - /el whois user: Safety, Host. The registration id and position only, so
 *   the parent contact is looked up in the admin page. Never a name, school
 *   or contact.
 * - /el test-codes n: Host, only in a guild mapped to a rehearsal edition.
 * - /el dryrun-cleanup confirm: Host, only in a rehearsal guild, with the
 *   edition's name typed as the confirm: archives every team and deletes
 *   their channels.
 *
 * Every write is audited in SQL (actor = the staff member's Discord id).
 * Student text is never logged.
 *
 * It also listens for 'canvas.linked' (E17): after a link, the team's pending
 * notes are written onto the new frame at once (writeTeamPending).
 */

export const STAFF_CMD = "el";
export const SUB = {
  testerAdd: "tester-add",
  sample: "sample",
  resync: "resync",
  totals: "totals",
  link: "link",
  canvasLink: "canvas-link",
  whois: "whois",
  testCodes: "test-codes",
  cleanup: "dryrun-cleanup",
} as const;

/**
 * Custom-id actions this file owns: the mirror buttons (named in tester.ts,
 * handled here), the Remove reason form, the tester-add form and its
 * "fix and send again" button.
 */
export const ACTIONS = {
  remove: MIRROR_ACTIONS.remove,
  review: MIRROR_ACTIONS.review,
  removeReason: "st_rmwhy",
  testerAdd: "st_add",
  testerFix: "st_fix",
} as const;

/** Host and Helper (Host always passes a gate). */
export const TESTER_GATE: readonly StaffRole[] = ["helper"];
/** Host only. */
export const HOST_ONLY: readonly StaffRole[] = ["host"];
/** Safety and Host. */
export const WHOIS_GATE: readonly StaffRole[] = ["safety"];

export const OPT = {
  slot: "slot",
  n: "n",
  element: "element",
  user: "user",
  registration: "registration",
  position: "position",
  url: "url",
  confirm: "confirm",
} as const;

export const FN = {
  remove: "elemental_bot_tester_remove",
  review: "elemental_bot_tester_review",
  sample: "elemental_bot_tester_sample",
  testerAdd: "elemental_bot_tester_add_staff",
  totals: "elemental_bot_totals",
  link: "elemental_bot_staff_link",
  canvasOverride: "elemental_bot_canvas_override",
  teamGet: "elemental_bot_team_get",
  whois: "elemental_bot_whois",
  testCodes: "elemental_bot_test_codes",
  cleanup: "elemental_bot_dryrun_cleanup",
} as const;

export const SLOT_MAX = 200;
export const SAMPLE_MAX = 10;
export const SAMPLE_DEFAULT = 5;
export const CODES_MAX = 200;
export const POSITION_MAX = 10;
export const REASON_MAX = 200;
/** The reason form's one field. */
export const FIELD_REASON = "reason";
/** Rows /el resync reads (SQL's maximum). */
export const RESYNC_LIMIT = 500;
/** Discord's message cap is 2000; leave room. */
export const MESSAGE_BUDGET = 1_900;
/** Drafts of a refused tester-add form, kept in memory only. */
export const DRAFT_TTL_MS = 30 * 60_000;

const DISCORD_RETRY = { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 5_000 };

// ---------------------------------------------------------------------------
// Command definitions
// ---------------------------------------------------------------------------

const elementChoices: APIApplicationCommandOptionChoice<string>[] = ELEMENTS.map((e) => ({ name: STAFF.elementChoice(e), value: e }));

const slotOption = () =>
  ({ type: ApplicationCommandOptionType.Integer, name: OPT.slot, description: STAFF.optSlot, required: true, min_value: 1, max_value: SLOT_MAX }) as const;
const userOption = () => ({ type: ApplicationCommandOptionType.User, name: OPT.user, description: STAFF.optUser, required: true }) as const;

export const SUBCOMMANDS: APIApplicationCommandSubcommandOption[] = [
  { type: ApplicationCommandOptionType.Subcommand, name: SUB.testerAdd, description: STAFF.testerAddDescription, options: [slotOption()] },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: SUB.sample,
    description: STAFF.sampleDescription,
    options: [
      { type: ApplicationCommandOptionType.Integer, name: OPT.n, description: STAFF.optSampleN, required: false, min_value: 1, max_value: SAMPLE_MAX },
      { type: ApplicationCommandOptionType.String, name: OPT.element, description: STAFF.optElementFilter, required: false, choices: elementChoices },
    ],
  },
  { type: ApplicationCommandOptionType.Subcommand, name: SUB.resync, description: STAFF.resyncDescription },
  { type: ApplicationCommandOptionType.Subcommand, name: SUB.totals, description: STAFF.totalsDescription },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: SUB.link,
    description: STAFF.linkDescription,
    options: [
      userOption(),
      { type: ApplicationCommandOptionType.String, name: OPT.registration, description: STAFF.optRegistration, required: false, min_length: 36, max_length: 36 },
      { type: ApplicationCommandOptionType.Integer, name: OPT.position, description: STAFF.optPosition, required: false, min_value: 1, max_value: POSITION_MAX },
    ],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: SUB.canvasLink,
    description: STAFF.canvasLinkDescription,
    options: [
      slotOption(),
      { type: ApplicationCommandOptionType.String, name: OPT.url, description: STAFF.optUrl, required: true, min_length: 10, max_length: 500 },
    ],
  },
  { type: ApplicationCommandOptionType.Subcommand, name: SUB.whois, description: STAFF.whoisDescription, options: [userOption()] },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: SUB.testCodes,
    description: STAFF.testCodesDescription,
    options: [{ type: ApplicationCommandOptionType.Integer, name: OPT.n, description: STAFF.optCodesN, required: true, min_value: 1, max_value: CODES_MAX }],
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: SUB.cleanup,
    description: STAFF.cleanupDescription,
    options: [{ type: ApplicationCommandOptionType.String, name: OPT.confirm, description: STAFF.optConfirm, required: true, max_length: 64 }],
  },
];

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** A refusal shown to staff; nothing was written. */
class Refusal extends Error {
  constructor(public readonly text: string) {
    super("refused");
    this.name = "Refusal";
  }
}

/** The line for a known refusal (bot or SQL), or null for anything else. */
function refusalText(error: unknown): string | null {
  if (error instanceof Refusal) return error.text;
  if (!(error instanceof ElementalError)) return null;
  return staffErrorText(error.code, isSnowflake(error.detail) ? error.detail : undefined) ?? testerErrorText(error.code);
}

type Run<I> = (i: I, ctx: ElCtx, args: string[]) => Promise<void>;

/** Known refusals become an ephemeral line; anything else goes to the wrapper's error line. */
function guarded<I extends RepliableInteraction>(run: Run<I>): Run<I> {
  return async (i, ctx, args) => {
    try {
      await run(i, ctx, args);
    } catch (error) {
      const text = refusalText(error);
      if (text === null) throw error;
      await notify(i, text);
    }
  };
}

function errStatus(error: unknown): string {
  const e = error as { status?: unknown; code?: unknown; name?: unknown } | null;
  return String(e?.status ?? e?.code ?? e?.name ?? "error");
}

/** An answer after a database write: a failure to send it is logged, never thrown over the saved change. */
async function sayQuietly(i: RepliableInteraction, payload: Parameters<typeof say>[1]): Promise<void> {
  try {
    await say(i, payload);
  } catch (error) {
    console.error(`[elemental] staff reply not sent: ${errStatus(error)}`);
  }
}

function slotArg(i: ChatInputCommandInteraction): number {
  const slot = i.options.getInteger(OPT.slot, true);
  if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 1 || slot > SLOT_MAX) throw new Refusal(staffErrorText("team_not_found")!);
  return slot;
}

function elementArg(i: ChatInputCommandInteraction): ElementKey | null {
  const raw = i.options.getString(OPT.element, false);
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!value) return null;
  if (!isElement(value)) throw new Refusal(staffErrorText("bad_element")!);
  return value;
}

function userArg(i: ChatInputCommandInteraction): string {
  const user = i.options.getUser(OPT.user, true) as { id?: string; bot?: boolean } | null;
  if (!user || !isSnowflake(user.id) || user.bot) throw new Refusal(staffErrorText("bad_user")!);
  return user.id;
}

function chunk(lines: readonly string[], budget = MESSAGE_BUDGET): string[] {
  const out: string[] = [];
  let current = "";
  for (const line of lines) {
    if (current && current.length + 1 + line.length > budget) {
      out.push(current);
      current = "";
    }
    current = current ? `${current}\n${line}` : line;
  }
  if (current) out.push(current);
  return out;
}

/** One more private message after the answer. Mentions never ping. */
async function followUp(i: RepliableInteraction, payload: { content: string; components?: ActionRowBuilder<ButtonBuilder>[] }): Promise<void> {
  await i.followUp({ ...payload, allowedMentions: { parse: [] }, flags: MessageFlags.Ephemeral });
}

// ---------------------------------------------------------------------------
// Remove and Reviewed: the buttons on the mirror post (and on /el sample)
// ---------------------------------------------------------------------------

/** elemental_bot_tester_remove's reply: the entry plus what changed. */
export interface RemovedEntry extends TesterEntry {
  already: boolean;
  was_counted: boolean;
  team_total: number;
  lit: boolean;
}

export interface ReviewedEntry extends TesterEntry {
  already: boolean;
}

export function removeModal(entryId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(cid(ACTIONS.removeReason, entryId))
    .setTitle(STAFF.removeTitle.slice(0, 45))
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(STAFF.removeReasonLabel.slice(0, 45))
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(FIELD_REASON)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(REASON_MAX)
            .setPlaceholder(STAFF.removeReasonPlaceholder.slice(0, 100))
        )
    );
}

function textField(i: ModalSubmitInteraction, id: string): string {
  try {
    return i.fields.getTextInputValue(id) ?? "";
  } catch {
    return "";
  }
}

/** Remove button: the reason form is the acknowledgement. */
async function openRemove(i: ComponentOrModal, _ctx: ElCtx, args: string[]): Promise<void> {
  if (i.isModalSubmit()) return;
  if (!isUuid(args[0])) return notify(i, STAFF.staleButton);
  await i.showModal(removeModal(args[0]));
}

/** The reason form's submit: un-count, edit the post the button sat on, then the canvas. */
async function submitRemove(i: ComponentOrModal, ctx: ElCtx, args: string[]): Promise<void> {
  if (!i.isModalSubmit()) return;
  const entryId = args[0];
  if (!isUuid(entryId)) return notify(i, STAFF.staleButton);
  const reason = cleanField(textField(i, FIELD_REASON));
  if ([...reason].length > REASON_MAX) return notify(i, STAFF.reasonTooLong);
  // Staff text, but it is stored: no contacts in it either. Never echoed.
  if (reason && !refusePii({ reason }).ok) return notify(i, STAFF.reasonPii);

  const removed = await ctx.api.call<RemovedEntry>(FN.remove, ctx.guildId, entryId, ctx.userId, reason || null);
  if (!removed || !isUuid(removed.id)) throw new ElementalError("failed", undefined, FN.remove);

  await sayQuietly(i, {
    content: mirrorContent(removed, { removed: true }),
    components: [mirrorRow(removed.id, { removed: true, reviewed: Boolean(removed.reviewed) })],
  });
  // Always, even on a repeat: a tombstone that failed the first time is tried again.
  const tomb = await tombstoneNote(ctx.rt, ctx.guildId, removed.id, ctx.userId);
  const head = removed.already
    ? STAFF.alreadyRemoved
    : STAFF.removed({ slot: removed.slot, total: removed.team_total, cap: ctx.settings.testerCap, wasCounted: removed.was_counted, lit: removed.lit });
  await notify(i, [head, tomb.ok ? STAFF.tombstoned : STAFF.tombstoneFailed].join("\n"));
}

/** Reviewed button: marks the entry and redraws the post it sat on. */
async function runReview(i: ComponentOrModal, ctx: ElCtx, args: string[]): Promise<void> {
  const entryId = args[0];
  if (!isUuid(entryId)) return notify(i, STAFF.staleButton);
  const entry = await ctx.api.call<ReviewedEntry>(FN.review, ctx.guildId, entryId, ctx.userId);
  if (!entry || !isUuid(entry.id)) throw new ElementalError("failed", undefined, FN.review);
  // Saved in SQL: a post that cannot be edited (deleted, expired) must not read as a failure.
  await sayQuietly(i, {
    content: mirrorContent(entry, { reviewed: true }),
    components: [mirrorRow(entry.id, { reviewed: true, removed: Boolean(entry.removed) })],
  });
  if (entry.already) await notify(i, STAFF.alreadyReviewed);
}

// ---------------------------------------------------------------------------
// /el sample n element
// ---------------------------------------------------------------------------

/** One row of elemental_bot_tester_sample. No Discord ids. */
export interface SampleRow {
  entry_id: string;
  team_id: string;
  slot: number | null;
  element: string | null;
  project_name: string | null;
  who: string | null;
  tried: string | null;
  quote: string | null;
  changed: string | null;
  counted: boolean;
  created_at?: string;
}

export function sampleEntry(row: SampleRow): TesterEntry {
  return {
    id: row.entry_id,
    team_id: row.team_id,
    slot: row.slot,
    element: row.element,
    project_name: row.project_name,
    who: row.who,
    tried: row.tried,
    quote: row.quote,
    changed: row.changed,
    counted: row.counted,
    created_at: row.created_at,
    removed: false,
    reviewed: false,
  };
}

async function runSample(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const raw = i.options.getInteger(OPT.n, false);
  const n = typeof raw === "number" && Number.isInteger(raw) ? Math.max(1, Math.min(SAMPLE_MAX, raw)) : SAMPLE_DEFAULT;
  const element = elementArg(i);
  const rows = await ctx.api.rows<SampleRow>(FN.sample, ctx.guildId, ctx.userId, n, element);
  const entries = rows.filter((r) => isUuid(r.entry_id)).map(sampleEntry);
  if (entries.length === 0) return say(i, STAFF.sampleNone(element));
  await say(i, STAFF.sampleHeader(entries.length, element));
  // One message per entry, so Remove and Reviewed redraw only their own entry.
  for (const entry of entries) {
    await followUp(i, { content: mirrorContent(entry), components: [mirrorRow(entry.id)] });
  }
}

// ---------------------------------------------------------------------------
// /el tester-add slot: the /tester form, logged by staff for a team
// ---------------------------------------------------------------------------

const DRAFTS = new WeakMap<ElementalRuntime, Map<string, { values: TesterValues; at: number }>>();

function drafts(rt: ElementalRuntime): Map<string, { values: TesterValues; at: number }> {
  let map = DRAFTS.get(rt);
  if (!map) DRAFTS.set(rt, (map = new Map()));
  const now = Date.now();
  for (const [k, v] of map) if (now - v.at > DRAFT_TTL_MS) map.delete(k);
  return map;
}

const draftKey = (ctx: Pick<ElCtx, "guildId" | "userId">, slot: number) => `${ctx.guildId}:${ctx.userId}:${slot}`;

/** The /tester form with this file's custom id: el|st_add|<slot>. */
export function staffTesterModal(slot: number, values: Partial<TesterValues> | null = null): ModalBuilder {
  return testerModal({ values }).setCustomId(cid(ACTIONS.testerAdd, slot)).setTitle(STAFF.testerAddTitle(slot).slice(0, 45));
}

function readValues(i: ModalSubmitInteraction): TesterValues {
  const values = {} as TesterValues;
  for (const field of FIELDS) values[field] = cleanField(textField(i, field));
  return values;
}

function problemText(p: FieldProblem): string {
  const name = TESTER.fieldNames[p.field];
  if (p.problem === "missing") return STAFF.fieldMissing(name);
  if (p.problem === "too_long") return STAFF.fieldTooLong(name, FIELD_MAX[p.field]);
  return STAFF.fieldPii(name);
}

/** An SQL field refusal (missing_field, too_long, pii with DETAIL the field), or null. */
function sqlProblem(error: unknown): FieldProblem | null {
  if (!(error instanceof ElementalError)) return null;
  const problem = error.code === "missing_field" ? "missing" : error.code === "too_long" ? "too_long" : error.code === "pii" ? "pii" : null;
  if (!problem) return null;
  const field = (FIELDS as readonly string[]).includes(error.detail ?? "") ? (error.detail as TesterField) : "tried";
  return { field, problem };
}

function slotFrom(arg: string | undefined): number | null {
  const slot = Number(arg);
  return Number.isInteger(slot) && slot >= 1 && slot <= SLOT_MAX ? slot : null;
}

async function openTesterAdd(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const slot = slotArg(i);
  await i.showModal(staffTesterModal(slot, drafts(ctx.rt).get(draftKey(ctx, slot))?.values ?? null));
}

async function openTesterFix(i: ComponentOrModal, ctx: ElCtx, args: string[]): Promise<void> {
  if (i.isModalSubmit()) return;
  const slot = slotFrom(args[0]);
  if (slot === null) return notify(i, STAFF.staleButton);
  await i.showModal(staffTesterModal(slot, drafts(ctx.rt).get(draftKey(ctx, slot))?.values ?? null));
}

/** Keeps the text (memory only), names the field, offers the form again. */
async function refuseFields(i: RepliableInteraction, ctx: ElCtx, slot: number, values: TesterValues, p: FieldProblem): Promise<void> {
  drafts(ctx.rt).set(draftKey(ctx, slot), { values, at: Date.now() });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(cid(ACTIONS.testerFix, slot)).setLabel(STAFF.fixButton).setStyle(ButtonStyle.Primary)
  );
  await say(i, { content: problemText(p), components: [row] });
}

function testerAddView(slot: number, added: TesterAdded, canvas: string): string {
  return [STAFF.testerAdded(slot), ...addedLines(added), canvas].join("\n");
}

async function submitTesterAdd(i: ComponentOrModal, ctx: ElCtx, args: string[]): Promise<void> {
  if (!i.isModalSubmit()) return;
  const slot = slotFrom(args[0]);
  if (slot === null) return notify(i, STAFF.staleButton);
  const values = readValues(i);
  const local = checkValues(values);
  if (local) return refuseFields(i, ctx, slot, values, local);

  let added: TesterAdded;
  try {
    added = await ctx.api.call<TesterAdded>(FN.testerAdd, ctx.guildId, ctx.userId, slot, values.who, values.tried, values.quote || null, values.changed || null);
  } catch (error) {
    const p = sqlProblem(error);
    if (p) return refuseFields(i, ctx, slot, values, p);
    throw error;
  }
  if (!added || !isUuid(added.id)) throw new ElementalError("failed", undefined, FN.testerAdd);
  drafts(ctx.rt).delete(draftKey(ctx, slot));

  // The answer first; the mirror, the bell and the canvas follow (as /tester).
  await sayQuietly(i, testerAddView(slot, added, added.canvas_linked ? TESTER.canvasPending : TESTER.canvasNotLinked));
  await deliverEntry(ctx.rt, ctx.settings, added, {
    onCanvas: (outcome) => sayQuietly(i, testerAddView(slot, added, canvasLine(outcome))),
  });
}

// ---------------------------------------------------------------------------
// /el resync: canvas writes that failed or never ran
// ---------------------------------------------------------------------------

/**
 * Which rows /el resync retries (elemental_bot_canvas_pending lists more):
 * - a note to write whose canvas_status is 'failed', 'none' or 'pending';
 * - a removed entry's note to take off when it is 'failed', 'pending' or
 *   still 'written'.
 * 'pending' is retried too: a write that threw before SQL saw it (database
 * busy, frame gone) leaves the row 'pending', and the 5-minute sweep in
 * tester.ts gives up on it after AUTO_ATTEMPTS, so without this only a bot
 * restart would write it. A note whose writer is running right now is
 * skipped by resyncNow (isWriting), and note ids are fixed per entry, so a
 * retry never writes a second note. 'written' notes of live entries are
 * never listed.
 */
export function shouldRetry(row: Pick<PendingRow, "action" | "canvas_status">): boolean {
  if (row.action === "tombstone") return row.canvas_status === "failed" || row.canvas_status === "pending" || row.canvas_status === "written";
  return row.canvas_status === "failed" || row.canvas_status === "none" || row.canvas_status === "pending";
}

/** Retries what shouldRetry picks, oldest first; a note being written right now is skipped. Never rejects for one note. */
export async function resyncNow(rt: ElementalRuntime, guildId: string, limit = RESYNC_LIMIT): Promise<ResyncResult & { listed: number }> {
  const rows = await rt.api.rows<PendingRow>(CANVAS_PENDING_FN, guildId, limit);
  const result = { written: 0, tombstoned: 0, failed: 0, skipped: 0, listed: rows.length };
  for (const row of rows) {
    if (!isUuid(row.entry_id) || !shouldRetry(row) || isWriting(rt, guildId, row.entry_id)) {
      result.skipped += 1;
      continue;
    }
    if (row.action === "tombstone") {
      const t = await tombstoneNote(rt, guildId, row.entry_id, null);
      if (t.ok) result.tombstoned += 1;
      else result.failed += 1;
      continue;
    }
    const w = await writeNote(rt, guildId, row.entry_id);
    if (w.ok) result.written += 1;
    else if (w.status === "failed") result.failed += 1;
    else result.skipped += 1;
  }
  return result;
}

/**
 * After a canvas link (/canvas link or /el canvas-link), SQL has marked every
 * entry of the team 'pending': write them onto the new frame now instead of
 * waiting for the sweep. Never rejects.
 */
export async function writeTeamPending(rt: ElementalRuntime, guildId: string, teamId: string): Promise<number> {
  let written = 0;
  try {
    const rows = await rt.api.rows<PendingRow>(CANVAS_PENDING_FN, guildId, RESYNC_LIMIT);
    for (const row of rows) {
      if (row.team_id !== teamId || row.action !== "write" || !isUuid(row.entry_id) || isWriting(rt, guildId, row.entry_id)) continue;
      if ((await writeNote(rt, guildId, row.entry_id)).ok) written += 1;
    }
  } catch (error) {
    console.error(`[elemental] canvas notes after a link not written (${errStatus(error)})`);
  }
  return written;
}

async function runResync(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const result = await resyncNow(ctx.rt, ctx.guildId);
  if (result.written + result.tombstoned + result.failed === 0 && result.skipped === 0) return say(i, STAFF.resyncNone);
  await say(i, STAFF.resyncDone(result));
}

// ---------------------------------------------------------------------------
// /el totals
// ---------------------------------------------------------------------------

export interface Totals {
  edition: string;
  day: string;
  helped: number;
  helped_today: number;
  checked_in: number;
  teams_total: number;
  top_element: string | null;
  levels: Partial<Record<ElementKey, number>>;
  deltas: Partial<Record<ElementKey, number>>;
  teams: Partial<Record<ElementKey, number>>;
}

const n0 = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function totalsText(t: Totals): string {
  return [
    `**${STAFF.totalsHead(String(t.day ?? "").slice(0, 10))}**`,
    STAFF.totalsHelped(n0(t.helped), n0(t.helped_today)),
    STAFF.totalsCheckedIn(n0(t.checked_in), n0(t.teams_total)),
    STAFF.totalsTop(t.top_element ?? null),
    ...ELEMENTS.map((element) =>
      STAFF.totalsElement({ element, level: n0(t.levels?.[element]), delta: n0(t.deltas?.[element]), teams: n0(t.teams?.[element]) })
    ),
  ].join("\n");
}

async function runTotals(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const totals = await ctx.api.call<Totals>(FN.totals, ctx.settings.edition);
  if (!totals) throw new ElementalError("failed", undefined, FN.totals);
  await say(i, totalsText(totals));
}

// ---------------------------------------------------------------------------
// /el link user registration position
// ---------------------------------------------------------------------------

export interface LinkedMember {
  member_id: string;
  edition: string;
  edition_kind: "event" | "rehearsal";
  already: boolean;
  is_staff: boolean;
}

type PaidOutcome = "added" | "missing" | "failed";

async function addPaid(ctx: ElCtx, userId: string): Promise<PaidOutcome> {
  const paid = roleId(ctx.settings, "paid");
  if (!paid) return "missing";
  try {
    await withRetry(() => ctx.rt.client.rest.put(Routes.guildMemberRole(ctx.guildId, userId, paid), { reason: STAFF.linkReason }), DISCORD_RETRY);
    return "added";
  } catch (error) {
    console.error(`[elemental] /el link: Paid role not added (${errStatus(error)})`);
    return "failed";
  }
}

async function runLink(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const userId = userArg(i);
  const registration = i.options.getString(OPT.registration, false)?.trim() || null;
  const position = i.options.getInteger(OPT.position, false);
  const hasPosition = typeof position === "number";
  if (Boolean(registration) !== hasPosition) throw new Refusal(STAFF.linkNeedsBoth);
  if (registration && !isUuid(registration)) throw new Refusal(STAFF.linkBadRegistration);
  if (hasPosition && (!Number.isInteger(position) || position < 1 || position > POSITION_MAX)) throw new Refusal(staffErrorText("registration_not_found")!);

  const member = await ctx.api.call<LinkedMember>(FN.link, ctx.guildId, ctx.userId, userId, registration?.toLowerCase() ?? null, hasPosition ? position : null);
  if (!member) throw new ElementalError("failed", undefined, FN.link);
  if (!registration || !hasPosition) {
    await say(i, STAFF.linkedStaff(userId));
    return;
  }
  const paid = await addPaid(ctx, userId);
  const paidLine = paid === "added" ? STAFF.paidAdded : paid === "missing" ? STAFF.paidMissing : STAFF.paidFailed;
  await say(i, [STAFF.linked({ userId, registrationId: registration.toLowerCase(), position, already: member.already === true }), paidLine].join("\n"));
}

// ---------------------------------------------------------------------------
// /el canvas-link slot url
// ---------------------------------------------------------------------------

const PIN_LINE: Record<PinOutcome, string> = STAFF.pinLine;

async function runCanvasLink(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const slot = slotArg(i);
  const parsed = parseCanvasUrl(i.options.getString(OPT.url, false));
  if (!parsed.ok) throw new Refusal(CANVAS.url[parsed.problem]);

  let result: CanvasLinkResult;
  try {
    result = await ctx.api.call<CanvasLinkResult>(FN.canvasOverride, ctx.guildId, ctx.userId, slot, parsed.boardId, parsed.frameId);
  } catch (error) {
    const text = canvasRefusal(error);
    if (text) throw new Refusal(text);
    throw error;
  }
  if (!result || !isUuid(result.team_id)) throw new ElementalError("failed", undefined, FN.canvasOverride);

  const boardId = isUuid(result.board_id) ? result.board_id : parsed.boardId;
  const frameId = typeof result.frame_id === "string" && FRAME_ID.test(result.frame_id) ? result.frame_id : parsed.frameId;
  const teamSlot = typeof result.slot === "number" ? result.slot : slot;
  const url = canvasUrl(boardId, frameId);

  try {
    // _canvas_override names no channel: the team's own row does.
    let pinLine: string = STAFF.canvasNoChannel;
    try {
      const team = await ctx.api.call<TeamJson | null>(FN.teamGet, ctx.guildId, result.team_id);
      if (team && isSnowflake(team.channel_id)) {
        pinLine = PIN_LINE[await syncCanvasPin(ctx.rt, team.channel_id, { url, slot: teamSlot, linkedBy: null })];
      }
    } catch (error) {
      console.error(`[elemental] /el canvas-link: team channel not read (${errStatus(error)})`);
      pinLine = PIN_LINE.failed;
    }
    const lines = result.already
      ? [STAFF.canvasAlready, `<${url}>`, pinLine]
      : [STAFF.canvasLinked(teamSlot), `<${url}>`, ...(result.replaced ? [STAFF.canvasReplaced] : []), pinLine, CANVAS.reload];
    await sayQuietly(i, lines.join("\n"));
  } finally {
    // Committed in SQL (entries marked 'pending'): the canvas writer must hear about it.
    if (!result.already) {
      await ctx.rt.events.emit("canvas.linked", {
        guildId: ctx.guildId,
        edition: ctx.settings.edition,
        teamId: result.team_id,
        slot: teamSlot,
        boardId,
        frameId,
        replaced: result.replaced ? { boardId: result.replaced.board_id, frameId: result.replaced.frame_id } : null,
        via: "staff",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// /el whois user
// ---------------------------------------------------------------------------

/** What elemental_bot_whois returns. Only registration_id and position are ever shown. */
export interface WhoisReply {
  claimed: boolean;
  is_staff?: boolean;
  registration_id?: string | null;
  position?: number | null;
}

/** The answer, built from an allowlist of fields: whatever else SQL returns never reaches Discord. */
export function whoisText(userId: string, reply: WhoisReply | null): string {
  if (!reply || reply.claimed !== true) return STAFF.whoisNotClaimed(userId);
  const registrationId = isUuid(reply.registration_id) ? reply.registration_id : null;
  if (!registrationId) return reply.is_staff ? STAFF.whoisStaff(userId) : STAFF.whoisRehearsal(userId);
  const position = typeof reply.position === "number" && Number.isInteger(reply.position) ? reply.position : null;
  return STAFF.whois({ userId, registrationId, position });
}

async function runWhois(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const userId = userArg(i);
  const reply = await ctx.api.call<WhoisReply | null>(FN.whois, ctx.guildId, ctx.userId, userId);
  await say(i, whoisText(userId, reply));
}

// ---------------------------------------------------------------------------
// Rehearsal only: /el test-codes n and /el dryrun-cleanup confirm
// ---------------------------------------------------------------------------

/** Refused before any database call unless this guild's edition is a rehearsal (SQL refuses again). */
function requireRehearsal(ctx: ElCtx): void {
  if (ctx.settings.editionKind !== "rehearsal") throw new Refusal(STAFF.rehearsalOnly);
}

async function runTestCodes(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  requireRehearsal(ctx);
  const n = i.options.getInteger(OPT.n, true);
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > CODES_MAX) throw new Refusal(staffErrorText("bad_count")!);
  const rows = await ctx.api.rows<{ code: string }>(FN.testCodes, ctx.guildId, ctx.userId, n);
  const codes = rows.map((r) => r.code).filter((c): c is string => typeof c === "string" && /^[A-Z0-9]{4,16}$/.test(c));
  if (codes.length === 0) return say(i, STAFF.codesNone);
  // Code blocks of whole lines, each message under Discord's cap.
  const blocks = chunk(codes, MESSAGE_BUDGET - 100).map((body) => `\`\`\`\n${body}\n\`\`\``);
  await say(i, `${STAFF.codesHead(codes.length, ctx.settings.edition)}\n${blocks[0]}`);
  for (const block of blocks.slice(1)) await followUp(i, { content: block });
}

interface CleanupReply {
  edition: string;
  teams: { team_id: string; slot: number | null; channel_id: string | null }[];
}

export type DeleteOutcome = "deleted" | "failed";

/** Deletes one team channel on the guild's channel queue. A channel already gone counts as deleted. */
function deleteChannel(rt: ElementalRuntime, guildId: string, channelId: string): Promise<DeleteOutcome> {
  return rt.queues.channels
    .run(guildId, async () => {
      try {
        await rt.client.rest.delete(Routes.channel(channelId), { reason: STAFF.cleanupReason });
      } catch (error) {
        if ((error as { status?: number } | null)?.status === 404) return "deleted" as const;
        throw error;
      }
      return "deleted" as const;
    })
    .catch((error: unknown): DeleteOutcome => {
      console.error(`[elemental] dry-run cleanup: channel not deleted (${errStatus(error)})`);
      return "failed";
    });
}

async function runCleanup(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  requireRehearsal(ctx);
  const confirm = (i.options.getString(OPT.confirm, true) ?? "").trim();
  if (confirm !== ctx.settings.edition) throw new Refusal(STAFF.cleanupBadConfirm(ctx.settings.edition));

  const reply = await ctx.api.call<CleanupReply>(FN.cleanup, ctx.guildId, ctx.userId, confirm);
  const teams = Array.isArray(reply?.teams) ? reply.teams : [];
  // Only team channels SQL named; never a shared channel or a category from settings.
  const keep = new Set<string>([...Object.values(ctx.settings.channels), ...Object.values(ctx.settings.elementCategories).flat()].filter(Boolean) as string[]);
  const channelIds = [...new Set(teams.map((t) => t.channel_id).filter((id): id is string => isSnowflake(id) && !keep.has(id)))];
  const outcomes = await Promise.all(channelIds.map((id) => deleteChannel(ctx.rt, ctx.guildId, id)));
  // The teams are archived now, so a second run will not list these again: name them.
  const failedIds = channelIds.filter((_, k) => outcomes[k] === "failed");
  await sayQuietly(
    i,
    STAFF.cleanupDone({ teams: teams.length, deleted: outcomes.filter((o) => o === "deleted").length, failed: failedIds.length, failedIds })
  );
}

// ---------------------------------------------------------------------------
// The feature
// ---------------------------------------------------------------------------

function command(gate: readonly StaffRole[], run: (i: ChatInputCommandInteraction, ctx: ElCtx) => Promise<void>, ack: "ephemeral" | "modal" = "ephemeral") {
  const safe = guarded<ChatInputCommandInteraction>((i, ctx) => run(i, ctx));
  return { ack, gate, run: (i: ChatInputCommandInteraction, ctx: ElCtx) => safe(i, ctx, []) };
}

export const feature: ElementalFeature = {
  name: "staff",
  staffSubcommands: SUBCOMMANDS,
  events: {
    // E17 emits it after a new link or relink (member or staff); nothing else listens for it.
    "canvas.linked": async (payload, rt) => {
      await writeTeamPending(rt, payload.guildId, payload.teamId);
    },
  },
  commandHandlers: {
    // The form is the acknowledgement; the gate still runs first.
    [`${STAFF_CMD} ${SUB.testerAdd}`]: command(TESTER_GATE, openTesterAdd, "modal"),
    [`${STAFF_CMD} ${SUB.sample}`]: command(TESTER_GATE, runSample),
    [`${STAFF_CMD} ${SUB.resync}`]: command(HOST_ONLY, runResync),
    [`${STAFF_CMD} ${SUB.totals}`]: command(HOST_ONLY, runTotals),
    [`${STAFF_CMD} ${SUB.link}`]: command(HOST_ONLY, runLink),
    [`${STAFF_CMD} ${SUB.canvasLink}`]: command(HOST_ONLY, runCanvasLink),
    [`${STAFF_CMD} ${SUB.whois}`]: command(WHOIS_GATE, runWhois),
    [`${STAFF_CMD} ${SUB.testCodes}`]: command(HOST_ONLY, runTestCodes),
    [`${STAFF_CMD} ${SUB.cleanup}`]: command(HOST_ONLY, runCleanup),
  },
  actions: {
    // On the mirror post (Host, Helper, Mentor see it; Host and Helper may act).
    [ACTIONS.remove]: { ack: "modal", gate: TESTER_GATE, run: guarded(openRemove) },
    // Submitted from the post's button: "update" edits that post.
    [ACTIONS.removeReason]: { ack: "update", gate: TESTER_GATE, run: guarded(submitRemove) },
    [ACTIONS.review]: { ack: "update", gate: TESTER_GATE, run: guarded(runReview) },
    [ACTIONS.testerAdd]: { ack: "ephemeral", gate: TESTER_GATE, run: guarded(submitTesterAdd) },
    [ACTIONS.testerFix]: { ack: "modal", gate: TESTER_GATE, run: guarded(openTesterFix) },
  },
};
