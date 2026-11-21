import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  LabelBuilder,
  ModalBuilder,
  Routes,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThreadAutoArchiveDuration,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
  type RESTPostAPIChannelMessageJSONBody,
} from "discord.js";

import { refusePii } from "../../../../lib/elemental/core";
import { ElementalError } from "../api";
import { resyncPending, writeEntry, type CanvasOutcome } from "../canvasWrite";
import {
  notify,
  say,
  type ComponentOrModal,
  type ElCtx,
  type ElementalFeature,
  type ElementalRuntime,
  type ElementalSettings,
  type RepliableInteraction,
} from "../context";
import { TESTER, mirrorLines, testerErrorText, type TesterField } from "../copy/tester";
import { cid, isSnowflake, isUuid } from "../ids";
import { withRetry, type RetryOptions } from "../queue";
import { isElement, requirePaid, type ElementKey } from "../roles";

/**
 * /tester, /tester-edit and /checkin (E18), in a team's own channel.
 *
 * /tester:
 * 1. Opens a form at once: who (general words), what they tried, a short
 *    quote, what the team changed, under a line saying no names, contacts or
 *    photos.
 * 2. The submit is acknowledged privately, then checked in the bot (required
 *    fields, lengths, refusePii) before any database or Discord call. A
 *    refusal names the field, never the text, and offers a button that
 *    re-opens the form with the text kept (in memory only).
 * 3. elemental_bot_tester_add counts it (SQL re-checks everything), and the
 *    person hears at once: counted n/cap, or saved but over the cap.
 * 4. Only then: the canvas note (canvasWrite.writeEntry, on the per-board
 *    queue) and the staff mirror post run; the reply is edited with the
 *    canvas line when the write finishes. A failed write never un-counts.
 * 5. The mirror goes to the element's thread in the staff mirror channel
 *    (Host, Helper, Mentor), with Remove and Reviewed buttons (el|rm|<id>,
 *    el|rv|<id>, handled by the staff tools, E20). Never the logger's name.
 * 6. The team's first counted entry emits 'tester.first' (the bell, E22).
 *
 * /tester-edit (or the Edit button on the reply): the person who logged it,
 * within 10 minutes; the same checks; the note is rewritten one version up.
 *
 * /checkin: one per team per Bangkok day; a repeat is a private no-op.
 *
 * Student text is never logged. The bot never sends a DM.
 */

export const TESTER_COMMAND = "tester";
export const EDIT_COMMAND = "tester-edit";
export const CHECKIN_COMMAND = "checkin";

/** Custom-id actions: el|tsadd, el|tssave|<entry>, el|tsedit|<entry>, el|tsfix|<entry or "new">. */
export const ACTIONS = {
  add: "tsadd",
  save: "tssave",
  edit: "tsedit",
  fix: "tsfix",
} as const;
/** The mirror's buttons; their handlers live in features/staff.ts (E20). */
export const MIRROR_ACTIONS = { remove: "rm", review: "rv" } as const;

export const TESTER_FN = "elemental_bot_tester_add";
export const TESTER_EDIT_FN = "elemental_bot_tester_edit";
export const CHECKIN_FN = "elemental_bot_checkin";

export const FIELDS: readonly TesterField[] = ["who", "tried", "quote", "changed"];
/** The same limits SQL enforces (elemental__tester_text). */
export const FIELD_MAX: Record<TesterField, number> = { who: 80, tried: 200, quote: 200, changed: 200 };
const REQUIRED: Record<TesterField, boolean> = { who: true, tried: true, quote: false, changed: false };

/** /tester-edit works this long after the entry was logged (SQL's own limit). */
export const EDIT_WINDOW_MS = 10 * 60_000;
/** Drafts, recent entries and mirror message ids are kept this long, in memory only. */
export const MEMORY_TTL_MS = 30 * 60_000;
/** The canvas sweep: first run after start, then this often. */
export const SWEEP_START_MS = 30_000;
export const SWEEP_INTERVAL_MS = 5 * 60_000;
/**
 * Rows the sweep reads per guild (SQL's maximum). Notes the sweep has given up
 * on stay in SQL's oldest-first list, so a small page could fill with them and
 * hide newer notes that still need writing.
 */
export const SWEEP_LIMIT = 500;

const MIRROR_RETRY: RetryOptions = { maxAttempts: 4, baseDelayMs: 1_000, maxDelayMs: 10_000 };

export type TesterValues = Record<TesterField, string>;

/** The entry as SQL returns it (elemental__entry_json). Never the logger. */
export interface TesterEntry {
  id: string;
  entry_id?: string;
  team_id: string;
  slot: number | null;
  element: string | null;
  project_name: string | null;
  source?: string;
  who: string | null;
  tried: string | null;
  quote: string | null;
  changed: string | null;
  counted: boolean;
  created_at?: string;
  edited_at?: string | null;
  removed?: boolean;
  reviewed?: boolean;
  canvas_status?: string;
}

/** elemental_bot_tester_add's reply. */
export interface TesterAdded extends TesterEntry {
  first_counted: boolean;
  team_total: number;
  edition_total?: number;
  cap: number;
  canvas_linked: boolean;
  repeated?: boolean;
}

/** elemental_bot_tester_edit's reply. */
export interface TesterEdited extends TesterEntry {
  rewrite: boolean;
}

// ---------------------------------------------------------------------------
// Memory per runtime: drafts (a refused form's text), each person's latest
// entry (for /tester-edit), mirror message ids (to edit them), element threads.
// ---------------------------------------------------------------------------

interface Recent {
  entryId: string;
  values: TesterValues;
  createdAt: number;
}

interface State {
  drafts: Map<string, { values: TesterValues; at: number }>;
  recent: Map<string, Recent>;
  mirrors: Map<string, { threadId: string; messageId: string; at: number }>;
  threads: Map<string, string>;
  threadLookups: Map<string, Promise<string | null>>;
}

const STATES = new WeakMap<ElementalRuntime, State>();

function state(rt: ElementalRuntime): State {
  let s = STATES.get(rt);
  if (!s) {
    s = { drafts: new Map(), recent: new Map(), mirrors: new Map(), threads: new Map(), threadLookups: new Map() };
    STATES.set(rt, s);
  }
  return s;
}

function sweepMemory(s: State, now = Date.now()): void {
  for (const [k, v] of s.drafts) if (now - v.at > MEMORY_TTL_MS) s.drafts.delete(k);
  for (const [k, v] of s.recent) if (now - v.createdAt > MEMORY_TTL_MS) s.recent.delete(k);
  for (const [k, v] of s.mirrors) if (now - v.at > MEMORY_TTL_MS) s.mirrors.delete(k);
}

const personKey = (ctx: Pick<ElCtx, "guildId" | "userId">) => `${ctx.guildId}:${ctx.userId}`;
const draftKey = (ctx: Pick<ElCtx, "guildId" | "userId">, entryId: string | null) => `${personKey(ctx)}:${entryId ?? "new"}`;

function saveDraft(ctx: ElCtx, entryId: string | null, values: TesterValues): void {
  const s = state(ctx.rt);
  sweepMemory(s);
  s.drafts.set(draftKey(ctx, entryId), { values, at: Date.now() });
}

function takeDraft(ctx: ElCtx, entryId: string | null): TesterValues | null {
  const d = state(ctx.rt).drafts.get(draftKey(ctx, entryId));
  return d && Date.now() - d.at <= MEMORY_TTL_MS ? d.values : null;
}

function clearDraft(ctx: ElCtx, entryId: string | null): void {
  state(ctx.rt).drafts.delete(draftKey(ctx, entryId));
}

function valuesOf(entry: Pick<TesterEntry, TesterField>): TesterValues {
  return { who: entry.who ?? "", tried: entry.tried ?? "", quote: entry.quote ?? "", changed: entry.changed ?? "" };
}

function remember(ctx: ElCtx, entry: TesterEntry): void {
  const s = state(ctx.rt);
  sweepMemory(s);
  const created = entry.created_at ? Date.parse(entry.created_at) : NaN;
  s.recent.set(personKey(ctx), { entryId: entry.id, values: valuesOf(entry), createdAt: Number.isFinite(created) ? created : Date.now() });
}

/** Tests only. */
export function testerMemory(rt: ElementalRuntime) {
  const s = state(rt);
  return { drafts: s.drafts, recent: s.recent, mirrors: s.mirrors, threads: s.threads };
}

// ---------------------------------------------------------------------------
// The form and the checks that run before any call
// ---------------------------------------------------------------------------

export function testerModal(opts: { entryId?: string | null; values?: Partial<TesterValues> | null } = {}): ModalBuilder {
  const entryId = opts.entryId ?? null;
  const labels = FIELDS.map((field) => {
    const input = new TextInputBuilder()
      .setCustomId(field)
      .setStyle(field === "who" ? TextInputStyle.Short : TextInputStyle.Paragraph)
      .setRequired(REQUIRED[field])
      .setMaxLength(FIELD_MAX[field])
      .setPlaceholder(TESTER.placeholders[field].slice(0, 100));
    const value = opts.values?.[field]?.slice(0, FIELD_MAX[field]);
    if (value) input.setValue(value);
    return new LabelBuilder().setLabel(TESTER.labels[field].slice(0, 45)).setTextInputComponent(input);
  });
  return new ModalBuilder()
    .setCustomId(entryId ? cid(ACTIONS.save, entryId) : cid(ACTIONS.add))
    .setTitle((entryId ? TESTER.modalTitleEdit : TESTER.modalTitle).slice(0, 45))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(TESTER.modalNote))
    .addLabelComponents(...labels);
}

/** Spaces collapsed and trimmed, as SQL's elemental__tester_text does. */
export function cleanField(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim();
}

function readValues(i: ModalSubmitInteraction): TesterValues {
  const get = (id: string) => {
    try {
      return i.fields.getTextInputValue(id) ?? "";
    } catch {
      return "";
    }
  };
  return { who: cleanField(get("who")), tried: cleanField(get("tried")), quote: cleanField(get("quote")), changed: cleanField(get("changed")) };
}

export type FieldProblem = { field: TesterField; problem: "missing" | "too_long" | "pii" };

/** The bot's own checks, in field order: required, length, then contacts. Never returns the text. */
export function checkValues(values: TesterValues): FieldProblem | null {
  for (const field of FIELDS) {
    if (REQUIRED[field] && !values[field]) return { field, problem: "missing" };
    if (values[field].length > FIELD_MAX[field]) return { field, problem: "too_long" };
  }
  const pii = refusePii<TesterField>({ who: values.who, tried: values.tried, quote: values.quote, changed: values.changed });
  return pii.ok ? null : { field: pii.field, problem: "pii" };
}

function problemText(p: FieldProblem): string {
  const name = TESTER.fieldNames[p.field];
  if (p.problem === "missing") return TESTER.missing(name);
  if (p.problem === "too_long") return TESTER.tooLong(name, FIELD_MAX[p.field]);
  return TESTER.pii(name);
}

/** An SQL field refusal (missing_field, too_long, pii with DETAIL the field), or null. */
function sqlProblem(error: unknown): FieldProblem | null {
  if (!(error instanceof ElementalError)) return null;
  const field = (FIELDS as readonly string[]).includes(error.detail ?? "") ? (error.detail as TesterField) : null;
  const problem = error.code === "missing_field" ? "missing" : error.code === "too_long" ? "too_long" : error.code === "pii" ? "pii" : null;
  if (!problem) return null;
  return { field: field ?? "tried", problem };
}

function fixRow(entryId: string | null): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(cid(ACTIONS.fix, entryId ?? "new")).setLabel(TESTER.fixButton).setStyle(ButtonStyle.Primary)
  );
}

/** Keeps the text, names the field, offers the form again. */
async function refuse(i: RepliableInteraction, ctx: ElCtx, entryId: string | null, values: TesterValues, p: FieldProblem): Promise<void> {
  saveDraft(ctx, entryId, values);
  await say(i, { content: problemText(p), components: [fixRow(entryId)] });
}

/** Cheap check before the form: the channel sits in an element category. Unknown → SQL decides. */
function inTeamCategory(i: ChatInputCommandInteraction, settings: ElementalSettings): boolean {
  const channel = (i as unknown as { channel?: { parentId?: string | null } | null }).channel;
  const parentId = channel?.parentId;
  const categories = Object.values(settings.elementCategories).flatMap((ids) => ids ?? []);
  if (parentId === undefined || categories.length === 0) return true;
  return parentId !== null && categories.includes(parentId);
}

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

export function canvasLine(outcome: CanvasOutcome): string {
  if (outcome.ok) return TESTER.canvasWritten;
  if (outcome.status === "none") return TESTER.canvasNotLinked;
  if (outcome.status === "skipped" && outcome.reason === "removed") return TESTER.canvasRemoved;
  return TESTER.canvasFailed;
}

function editRow(entryId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(cid(ACTIONS.edit, entryId)).setLabel(TESTER.editButton).setStyle(ButtonStyle.Secondary)
  );
}

export function addedLines(added: TesterAdded): string[] {
  const lines: string[] = [];
  if (added.repeated) lines.push(TESTER.repeated);
  lines.push(added.counted ? TESTER.counted(added.team_total, added.cap) : TESTER.notCounted(added.cap));
  return lines;
}

function addedView(added: TesterAdded, line: string) {
  return { content: [...addedLines(added), line].join("\n"), components: [editRow(added.id)] };
}

function editedView(edited: TesterEdited, line: string | null) {
  return { content: [TESTER.edited, ...(line ? [line] : [])].join("\n"), components: [editRow(edited.id)] };
}

// ---------------------------------------------------------------------------
// The staff mirror: one thread per element in settings.channels.mirror
// ---------------------------------------------------------------------------

export interface MirrorState {
  edited?: boolean;
  removed?: boolean;
  reviewed?: boolean;
}

/** The mirror post's text: plot, element, project and the entry. No Discord id, never the logger. */
export function mirrorContent(entry: TesterEntry, st: MirrorState = {}): string {
  const removed = st.removed ?? entry.removed ?? false;
  const reviewed = st.reviewed ?? entry.reviewed ?? false;
  const status = [
    removed ? TESTER.mirrorRemoved : entry.counted ? TESTER.mirrorCounted : TESTER.mirrorNotCounted,
    entry.source === "staff" ? TESTER.mirrorStaffSource : null,
    st.edited || entry.edited_at ? TESTER.mirrorEdited : null,
    reviewed ? TESTER.mirrorReviewed : null,
  ].filter(Boolean);
  return [TESTER.mirrorHead(entry.slot, entry.element, entry.project_name), ...mirrorLines(entry), status.join(" · "), `-# ${entry.id}`]
    .filter(Boolean)
    .join("\n");
}

/** Remove (el|rm|<id>) and Reviewed (el|rv|<id>); E20 handles both and re-renders with mirrorContent. */
export function mirrorRow(entryId: string, st: MirrorState = {}): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(cid(MIRROR_ACTIONS.remove, entryId))
      .setLabel(TESTER.removeButton)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(Boolean(st.removed)),
    new ButtonBuilder()
      .setCustomId(cid(MIRROR_ACTIONS.review, entryId))
      .setLabel(TESTER.reviewedButton)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(Boolean(st.reviewed || st.removed))
  );
}

export function mirrorBody(entry: TesterEntry, st: MirrorState = {}): RESTPostAPIChannelMessageJSONBody {
  const removed = st.removed ?? entry.removed;
  const reviewed = st.reviewed ?? entry.reviewed;
  return {
    content: mirrorContent(entry, st),
    components: [mirrorRow(entry.id, { ...st, removed, reviewed }).toJSON()],
    allowed_mentions: { parse: [] },
  };
}

type ThreadList = { threads?: { id?: string; parent_id?: string | null; name?: string }[] } | null;

function errStatus(error: unknown): string {
  const e = error as { status?: unknown; code?: unknown; name?: unknown } | null;
  return String(e?.status ?? e?.code ?? e?.name ?? "error");
}

async function findOrCreateThread(rt: ElementalRuntime, guildId: string, mirrorId: string, element: ElementKey): Promise<string | null> {
  const name = TESTER.threadName(element).slice(0, 100);
  const match = (list: ThreadList) => list?.threads?.find((t) => t.parent_id === mirrorId && t.name === name && isSnowflake(t.id))?.id ?? null;
  const active = (await withRetry(() => rt.client.rest.get(Routes.guildActiveThreads(guildId)), MIRROR_RETRY)) as ThreadList;
  let id = match(active);
  if (!id) {
    // An archived thread wakes up when the bot posts in it.
    const archived = (await withRetry(() => rt.client.rest.get(Routes.channelThreads(mirrorId, "public")), MIRROR_RETRY).catch(
      () => null
    )) as ThreadList;
    id = match(archived);
  }
  if (!id) {
    const made = (await withRetry(
      () =>
        rt.client.rest.post(Routes.threads(mirrorId), {
          body: { name, type: ChannelType.PublicThread, auto_archive_duration: ThreadAutoArchiveDuration.OneWeek },
        }),
      MIRROR_RETRY
    )) as { id?: string } | null;
    id = isSnowflake(made?.id) ? made.id : null;
  }
  return id;
}

/** The element's thread in the mirror channel: cached, else found by name, else made (one lookup at a time). */
async function elementThread(rt: ElementalRuntime, guildId: string, mirrorId: string, element: ElementKey): Promise<string | null> {
  const s = state(rt);
  const key = `${guildId}:${mirrorId}:${element}`;
  const cached = s.threads.get(key);
  if (cached) return cached;
  const running = s.threadLookups.get(key);
  if (running) return running;
  const lookup = findOrCreateThread(rt, guildId, mirrorId, element)
    .then((id) => {
      if (id) s.threads.set(key, id);
      return id;
    })
    .finally(() => s.threadLookups.delete(key));
  s.threadLookups.set(key, lookup);
  return lookup;
}

function forgetThread(rt: ElementalRuntime, guildId: string, mirrorId: string, element: ElementKey): void {
  state(rt).threads.delete(`${guildId}:${mirrorId}:${element}`);
}

const UNKNOWN_CHANNEL = 10003;

/**
 * Posts (or, after an edit, updates) the entry in its element's mirror
 * thread. No mirror channel in settings: nothing is posted. Returns where it
 * went, or null. Never rejects.
 */
export async function postMirror(rt: ElementalRuntime, settings: ElementalSettings, entry: TesterEntry, st: MirrorState = {}): Promise<{ threadId: string; messageId: string } | null> {
  const mirrorId = settings.channels.mirror;
  if (!mirrorId) return null;
  const s = state(rt);
  try {
    const known = s.mirrors.get(entry.id);
    if (known && st.edited) {
      try {
        await withRetry(() => rt.client.rest.patch(Routes.channelMessage(known.threadId, known.messageId), { body: mirrorBody(entry, st) }), MIRROR_RETRY);
        known.at = Date.now();
        return { threadId: known.threadId, messageId: known.messageId };
      } catch (error) {
        console.error(`[elemental] mirror edit failed, posting again: ${errStatus(error)}`);
      }
    }
    const element = isElement(entry.element) ? entry.element : null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const threadId = element ? await elementThread(rt, settings.guildId, mirrorId, element) : mirrorId;
      if (!threadId) return null;
      try {
        const sent = (await withRetry(() => rt.client.rest.post(Routes.channelMessages(threadId), { body: mirrorBody(entry, st) }), MIRROR_RETRY)) as {
          id?: string;
        } | null;
        if (!isSnowflake(sent?.id)) return null;
        sweepMemory(s);
        s.mirrors.set(entry.id, { threadId, messageId: sent.id, at: Date.now() });
        return { threadId, messageId: sent.id };
      } catch (error) {
        const e = error as { status?: number; code?: number };
        // The thread was deleted: find or make it again, once.
        if (element && attempt === 0 && (e?.status === 404 || e?.code === UNKNOWN_CHANNEL)) {
          forgetThread(rt, settings.guildId, mirrorId, element);
          continue;
        }
        throw error;
      }
    }
    return null;
  } catch (error) {
    console.error(`[elemental] mirror post failed: ${errStatus(error)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// After the count: mirror, bell event, canvas. Shared with /el tester-add (E20).
// ---------------------------------------------------------------------------

export interface DeliverOptions {
  /** Called with the canvas outcome (the /tester reply edits its line). */
  onCanvas?: (outcome: CanvasOutcome) => Promise<void> | void;
}

/**
 * Everything after an entry is counted, run only after the person has their
 * answer: the mirror post, 'tester.first' on a team's first counted entry, and
 * the canvas note. Each part fails alone; never rejects.
 */
export async function deliverEntry(rt: ElementalRuntime, settings: ElementalSettings, added: TesterAdded, opts: DeliverOptions = {}): Promise<void> {
  const mirror = added.repeated ? Promise.resolve(null) : postMirror(rt, settings, added);
  const bell =
    added.first_counted && !added.repeated
      ? rt.events.emit("tester.first", { guildId: settings.guildId, edition: settings.edition, teamId: added.team_id, entryId: added.id })
      : Promise.resolve();
  const canvas = added.canvas_linked
    ? writeEntry(rt, settings.guildId, added.id).then(async (outcome) => {
        try {
          await opts.onCanvas?.(outcome);
        } catch (error) {
          console.error(`[elemental] canvas callback failed: ${errStatus(error)}`);
        }
      })
    : Promise.resolve();
  await Promise.allSettled([mirror, bell, canvas]);
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** An answer after the database write: a failure to send it is logged, never thrown over the saved entry. */
async function sayQuietly(i: RepliableInteraction, payload: Parameters<typeof say>[1]): Promise<void> {
  try {
    await say(i, payload);
  } catch (error) {
    console.error(`[elemental] tester reply not sent: ${errStatus(error)}`);
  }
}

async function openTester(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  requirePaid(ctx);
  if (!inTeamCategory(i, ctx.settings)) {
    await notify(i, TESTER.notTeamChannel);
    return;
  }
  await i.showModal(testerModal({ values: takeDraft(ctx, null) }));
}

/** Says the edit window is closed when we know it is; otherwise opens the edit form. */
async function openEdit(i: ChatInputCommandInteraction | ComponentOrModal, ctx: ElCtx, entryId: string): Promise<void> {
  if (i.isModalSubmit()) return;
  const recent = state(ctx.rt).recent.get(personKey(ctx));
  const known = recent?.entryId === entryId ? recent : null;
  if (known && Date.now() - known.createdAt > EDIT_WINDOW_MS) {
    await notify(i, TESTER.editClosed);
    return;
  }
  await i.showModal(testerModal({ entryId, values: takeDraft(ctx, entryId) ?? known?.values ?? null }));
}

async function runEditCommand(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  const recent = state(ctx.rt).recent.get(personKey(ctx));
  if (!recent) {
    await notify(i, TESTER.noRecent);
    return;
  }
  await openEdit(i, ctx, recent.entryId);
}

async function submitNew(i: ComponentOrModal, ctx: ElCtx): Promise<void> {
  if (!i.isModalSubmit()) return;
  const values = readValues(i);
  const local = checkValues(values);
  if (local) return refuse(i, ctx, null, values, local);
  if (!ctx.channelId) return notify(i, TESTER.notTeamChannel);

  let added: TesterAdded;
  try {
    added = await ctx.api.call<TesterAdded>(
      TESTER_FN,
      ctx.guildId,
      ctx.channelId,
      ctx.userId,
      values.who,
      values.tried,
      values.quote || null,
      values.changed || null
    );
  } catch (error) {
    const p = sqlProblem(error);
    if (p) return refuse(i, ctx, null, values, p);
    const text = error instanceof ElementalError ? testerErrorText(error.code) : null;
    if (text) return notify(i, text);
    throw error;
  }
  if (!added || !isUuid(added.id)) throw new ElementalError("failed", undefined, TESTER_FN);
  clearDraft(ctx, null);
  remember(ctx, added);

  // The answer first; nothing after this may replace it with an error. The
  // entry counts even if the answer cannot be sent (an expired interaction),
  // so the mirror and the canvas still follow.
  await sayQuietly(i, addedView(added, added.canvas_linked ? TESTER.canvasPending : TESTER.canvasNotLinked));
  await deliverEntry(ctx.rt, ctx.settings, added, {
    onCanvas: (outcome) => sayQuietly(i, addedView(added, canvasLine(outcome))),
  });
}

async function submitEdit(i: ComponentOrModal, ctx: ElCtx, args: string[]): Promise<void> {
  if (!i.isModalSubmit()) return;
  const entryId = args[0];
  if (!isUuid(entryId)) return notify(i, TESTER.entryNotFound);
  const values = readValues(i);
  const local = checkValues(values);
  if (local) return refuse(i, ctx, entryId, values, local);

  let edited: TesterEdited;
  try {
    edited = await ctx.api.call<TesterEdited>(
      TESTER_EDIT_FN,
      ctx.guildId,
      entryId,
      ctx.userId,
      values.who,
      values.tried,
      values.quote || null,
      values.changed || null
    );
  } catch (error) {
    const p = sqlProblem(error);
    if (p) return refuse(i, ctx, entryId, values, p);
    const text = error instanceof ElementalError ? testerErrorText(error.code) : null;
    if (text) return notify(i, text);
    throw error;
  }
  if (!edited || !isUuid(edited.id)) throw new ElementalError("failed", undefined, TESTER_EDIT_FN);
  clearDraft(ctx, entryId);
  const s = state(ctx.rt);
  const recent = s.recent.get(personKey(ctx));
  if (recent?.entryId === edited.id) recent.values = valuesOf(edited);

  const pending = edited.rewrite ? TESTER.canvasPending : edited.canvas_status === "none" ? TESTER.canvasNotLinked : null;
  await sayQuietly(i, editedView(edited, pending));
  const mirror = postMirror(ctx.rt, ctx.settings, edited, { edited: true });
  // force: a write that read the old text just before this edit may have
  // landed after it and marked the entry 'written'; the edit always rewrites
  // from the saved copy (one version up), so the board shows the new text.
  const canvas = edited.rewrite
    ? writeEntry(ctx.rt, ctx.guildId, edited.id, { force: true }).then((outcome) => sayQuietly(i, editedView(edited, canvasLine(outcome))))
    : Promise.resolve();
  await Promise.allSettled([mirror, canvas]);
}

interface CheckinReply {
  team_id: string;
  slot: number | null;
  day: string;
  already: boolean;
}

async function runCheckin(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  if (!ctx.channelId) return notify(i, TESTER.notTeamChannel);
  let reply: CheckinReply;
  try {
    reply = await ctx.api.call<CheckinReply>(CHECKIN_FN, ctx.guildId, ctx.channelId, ctx.userId);
  } catch (error) {
    const text = error instanceof ElementalError ? testerErrorText(error.code) : null;
    if (text) return notify(i, text);
    throw error;
  }
  // A repeat changes nothing and stays private; the first one shows in the team channel.
  if (reply?.already) return notify(i, TESTER.alreadyCheckedIn);
  await say(i, TESTER.checkedIn(reply?.slot ?? null));
}

// ---------------------------------------------------------------------------
// The canvas sweep on start: notes left pending or failed (a restart, a link
// made after entries were logged) are written again, a few tries each.
// ---------------------------------------------------------------------------

export async function sweepCanvas(rt: ElementalRuntime): Promise<void> {
  for (const guildId of rt.env.guildIds) {
    try {
      const settings = await rt.settings.get(guildId);
      if (!settings) continue;
      await resyncPending(rt, guildId, { auto: true, limit: SWEEP_LIMIT });
    } catch (error) {
      console.error(`[elemental] canvas sweep failed: ${errStatus(error)}`);
    }
  }
}

export const feature: ElementalFeature = {
  name: "tester",
  commands: [
    { name: TESTER_COMMAND, description: TESTER.testerDescription.slice(0, 100) },
    { name: EDIT_COMMAND, description: TESTER.editDescription.slice(0, 100) },
    { name: CHECKIN_COMMAND, description: TESTER.checkinDescription.slice(0, 100) },
  ],
  commandHandlers: {
    [TESTER_COMMAND]: { ack: "modal", run: openTester },
    [EDIT_COMMAND]: { ack: "modal", run: runEditCommand },
    [CHECKIN_COMMAND]: { ack: "public", run: runCheckin },
  },
  actions: {
    // Form submits: private acks, so a refusal never shows in the team channel.
    [ACTIONS.add]: { ack: "ephemeral", run: (i, ctx) => submitNew(i, ctx) },
    [ACTIONS.save]: { ack: "ephemeral", run: (i, ctx, args) => submitEdit(i, ctx, args) },
    // Buttons that open a form: the modal is the ack.
    [ACTIONS.edit]: {
      ack: "modal",
      run: async (i, ctx, args) => {
        if (!isUuid(args[0])) return notify(i, TESTER.entryNotFound);
        await openEdit(i, ctx, args[0]);
      },
    },
    [ACTIONS.fix]: {
      ack: "modal",
      run: async (i, ctx, args) => {
        if (i.isModalSubmit()) return;
        const entryId = isUuid(args[0]) ? args[0] : null;
        if (entryId) return openEdit(i, ctx, entryId);
        await i.showModal(testerModal({ values: takeDraft(ctx, null) }));
      },
    },
  },
  start(rt) {
    let running = false;
    const tick = () => {
      if (running) return;
      running = true;
      void sweepCanvas(rt).finally(() => {
        running = false;
      });
    };
    const first = setTimeout(tick, SWEEP_START_MS);
    first.unref?.();
    const timer = setInterval(tick, SWEEP_INTERVAL_MS);
    timer.unref?.();
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  },
};
