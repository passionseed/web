import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  LabelBuilder,
  ModalBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";

import { ElementalError } from "../api";
import { CANVAS_TARGET_FN, writeNote, type CanvasOutcome, type CanvasTarget } from "../canvasWrite";
import {
  notify,
  say,
  type ComponentOrModal,
  type ElCtx,
  type ElementalFeature,
  type ElementalRuntime,
  type RepliableInteraction,
} from "../context";
import { HANDIN, handinErrorText, shipNoteText, type HandinUrlProblem } from "../copy/handin";
import { cid, isUuid } from "../ids";
import { requirePaid } from "../roles";

/**
 * /handin (E30): the team's video link, to its canvas Ship zone. Built for the
 * case where the canvas is the hand-in place; harmless when that is not chosen
 * (the command only stores the link and writes a note).
 *
 * 1. In a team channel, /handin opens a form with one field: the video link.
 * 2. The submit is acknowledged privately, then the link is read here: https,
 *    YouTube, Google Drive or TikTok only, at most 500 characters (the same
 *    rules as elemental_bot_handin). A refused link never reaches the database
 *    and is never echoed; a button re-opens the form with it kept (memory only).
 * 3. elemental_bot_handin stores it with the time of the submit (the
 *    interaction's own timestamp, so a slow queue never makes a team late).
 *    After the edition's handin_due_at (Mon 7 Dec 23:00 Bangkok for the real
 *    edition) it is still accepted and flagged late. A resubmission replaces
 *    the link.
 * 4. The reply comes at once; then the 'ship' note is written to the linked
 *    frame's Ship zone (canvasWrite.writeNote, note id = the team id, on the
 *    board's queue). A resubmission rewrites that same note one version up.
 *    The reply is edited with the canvas line when the write finishes.
 * 5. A team that links its canvas after handing in gets the note then
 *    ('canvas.linked').
 *
 * Nothing about the link is logged. The bot never sends a DM.
 */

export const HANDIN_COMMAND = "handin";
export const HANDIN_FN = "elemental_bot_handin";

/** Custom-id actions: el|hdsave (the form's submit), el|hdfix (re-open the form after a refusal). */
export const ACTIONS = { save: "hdsave", fix: "hdfix" } as const;
export const URL_FIELD = "url";

/** The same limit and hosts as elemental_bot_handin (supabase/migrations/20261123100100_elemental_testers_canvas.sql). */
export const HANDIN_URL_MAX = 500;
export const HANDIN_HOSTS: ReadonlySet<string> = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "drive.google.com",
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
]);
/** SQL's format check: https, no userinfo, no whitespace anywhere. */
const SQL_FORMAT = /^https:\/\/[^\s/?#@]+([/?#]\S*)?$/;
/** SQL's host: lowercased, port 443 allowed, any other port refused. */
const SQL_HOST = /^https:\/\/([^/?#:]+)(?::443)?(?:[/?#]|$)/;
/** Text longer than this is not read at all. */
const MAX_INPUT = 2_000;
/** Drafts (a refused link) are kept this long, in memory only. */
export const DRAFT_TTL_MS = 30 * 60_000;

export type ParsedHandinUrl = { ok: true; url: string } | { ok: false; problem: HandinUrlProblem };

const fail = (problem: HandinUrlProblem): ParsedHandinUrl => ({ ok: false, problem });

/**
 * Reads a pasted video link. Tolerates spaces around it, Discord's <...>
 * wrapper, words around the link, http:// (sent as https://) and a missing
 * scheme on a known host. Then applies exactly SQL's rules, so a link that
 * passes here is one elemental_bot_handin accepts.
 */
export function parseHandinUrl(input: unknown): ParsedHandinUrl {
  let text = typeof input === "string" ? input.trim() : "";
  if (!text) return fail("empty");
  if (text.length > MAX_INPUT) return fail("too_long");
  // "our video: https://..." pasted with words around it: the first token that looks like a link.
  if (/\s/.test(text)) {
    text = text.split(/\s+/).find((token) => /^<?(https?:\/\/|[a-z0-9-]+(\.[a-z0-9-]+)+\/)/i.test(token)) ?? text;
  }
  if (text.startsWith("<") && text.endsWith(">")) text = text.slice(1, -1).trim();
  if (/^https?:\/\//i.test(text)) {
    text = `https://${text.replace(/^https?:\/\//i, "")}`;
  } else if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) {
    // "youtu.be/abc" without a scheme; plain words stay as they are and fail below.
    const host = /^([a-z0-9-]+(\.[a-z0-9-]+)+)([/?#]|$)/i.exec(text)?.[1]?.toLowerCase();
    if (host && HANDIN_HOSTS.has(host)) text = `https://${text}`;
  }
  if (text.length > HANDIN_URL_MAX) return fail("too_long");
  if (!SQL_FORMAT.test(text)) return fail("format");
  const host = SQL_HOST.exec(text)?.[1]?.toLowerCase();
  if (!host || !HANDIN_HOSTS.has(host)) return fail("host");
  return { ok: true, url: text };
}

/** elemental_bot_handin's reply. */
export interface HandinReply {
  team_id: string;
  slot: number | null;
  url: string;
  /** When the student submitted (ISO). */
  at: string;
  late: boolean;
  due_at: string | null;
  resubmitted: boolean;
  /** The 'ship' note's id: the team id. */
  note_id: string;
  canvas_linked: boolean;
}

/** When the person pressed submit: the interaction's own timestamp (now when it has none). */
export function submittedAt(i: { createdTimestamp?: number } | null | undefined, now = Date.now()): string {
  const ts = i?.createdTimestamp;
  return new Date(typeof ts === "number" && Number.isFinite(ts) ? ts : now).toISOString();
}

// ---------------------------------------------------------------------------
// Drafts: a refused link, so the form re-opens with it (per runtime, memory only)
// ---------------------------------------------------------------------------

const DRAFTS = new WeakMap<ElementalRuntime, Map<string, { url: string; at: number }>>();

function drafts(rt: ElementalRuntime): Map<string, { url: string; at: number }> {
  let map = DRAFTS.get(rt);
  if (!map) DRAFTS.set(rt, (map = new Map()));
  return map;
}

const draftKey = (ctx: Pick<ElCtx, "guildId" | "userId">) => `${ctx.guildId}:${ctx.userId}`;

function saveDraft(ctx: ElCtx, url: string): void {
  const map = drafts(ctx.rt);
  const now = Date.now();
  for (const [k, v] of map) if (now - v.at > DRAFT_TTL_MS) map.delete(k);
  map.set(draftKey(ctx), { url: url.slice(0, MAX_INPUT), at: now });
}

function takeDraft(ctx: ElCtx): string | null {
  const d = drafts(ctx.rt).get(draftKey(ctx));
  return d && Date.now() - d.at <= DRAFT_TTL_MS ? d.url : null;
}

function clearDraft(ctx: ElCtx): void {
  drafts(ctx.rt).delete(draftKey(ctx));
}

// ---------------------------------------------------------------------------
// The form, the channel check and the replies
// ---------------------------------------------------------------------------

export function handinModal(value?: string | null): ModalBuilder {
  const input = new TextInputBuilder()
    .setCustomId(URL_FIELD)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(HANDIN_URL_MAX)
    .setPlaceholder(HANDIN.urlPlaceholder.slice(0, 100));
  const kept = value?.slice(0, HANDIN_URL_MAX);
  if (kept) input.setValue(kept);
  return new ModalBuilder()
    .setCustomId(cid(ACTIONS.save))
    .setTitle(HANDIN.modalTitle.slice(0, 45))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(HANDIN.modalNote))
    .addLabelComponents(new LabelBuilder().setLabel(HANDIN.urlLabel.slice(0, 45)).setTextInputComponent(input));
}

function fixRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(cid(ACTIONS.fix)).setLabel(HANDIN.fixButton).setStyle(ButtonStyle.Primary)
  );
}

/** Keeps what was typed, says why (never echoing it), offers the form again. */
async function refuse(i: RepliableInteraction, ctx: ElCtx, raw: string, text: string): Promise<void> {
  saveDraft(ctx, raw);
  await say(i, { content: text, components: [fixRow()] });
}

/**
 * Cheap check before the form: not one of the shared channels from settings,
 * and inside an element category when categories are set. Unknown → SQL decides.
 */
function inTeamChannel(i: ChatInputCommandInteraction, ctx: ElCtx): boolean {
  if (!ctx.channelId) return false;
  if (Object.values(ctx.settings.channels).includes(ctx.channelId)) return false;
  const channel = (i as unknown as { channel?: { parentId?: string | null } | null }).channel;
  const parentId = channel?.parentId;
  const categories = Object.values(ctx.settings.elementCategories).flatMap((ids) => ids ?? []);
  if (parentId === undefined || categories.length === 0) return true;
  return parentId !== null && categories.includes(parentId);
}

export function canvasLine(outcome: CanvasOutcome): string {
  if (outcome.ok) return HANDIN.canvasWritten;
  if (outcome.status === "none") return HANDIN.canvasNotLinked;
  if (outcome.status === "skipped") return HANDIN.canvasNotLive;
  return HANDIN.canvasFailed;
}

/** The private answer: received (when), on time or late, replaced, and the canvas line. */
export function handinLines(reply: HandinReply, canvas: string): string {
  return [
    HANDIN.received(reply.at),
    reply.late ? HANDIN.late(reply.due_at) : HANDIN.onTime,
    reply.resubmitted ? HANDIN.resubmitted : null,
    canvas,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function status(error: unknown): string {
  const e = error as { status?: unknown; code?: unknown; name?: unknown } | null;
  return String(e?.status ?? e?.code ?? e?.name ?? "error");
}

/** An answer after the database write: a failure to send it is logged, never thrown over the saved link. */
async function sayQuietly(i: RepliableInteraction, content: string): Promise<void> {
  try {
    await say(i, { content, components: [] });
  } catch (error) {
    console.error(`[elemental] handin reply not sent: ${status(error)}`);
  }
}

// ---------------------------------------------------------------------------
// The canvas note
// ---------------------------------------------------------------------------

/**
 * Writes (or rewrites, one version up) the team's 'ship' note. The note id is
 * the team id; its text comes from what SQL holds now, so the latest link
 * always wins. Never rejects.
 */
export function writeShipNote(rt: ElementalRuntime, guildId: string, teamId: string): Promise<CanvasOutcome> {
  return writeNote(rt, guildId, teamId, { text: (target: CanvasTarget) => shipNoteText(target.fields ?? {}) });
}

/**
 * After /canvas link: a team that handed in before it had a canvas gets its
 * note now. Teams with no hand-in are left alone (SQL: entry_not_found).
 */
export async function onCanvasLinked(rt: ElementalRuntime, guildId: string, teamId: string): Promise<CanvasOutcome | null> {
  if (!isUuid(teamId)) return null;
  try {
    const target = await rt.api.call<CanvasTarget>(CANVAS_TARGET_FN, guildId, teamId);
    if (target?.kind !== "ship") return null;
  } catch (error) {
    if (error instanceof ElementalError && error.code === "entry_not_found") return null;
    console.error(`[elemental] handin note check failed: ${status(error)}`);
    return null;
  }
  return writeShipNote(rt, guildId, teamId);
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function openHandin(i: ChatInputCommandInteraction, ctx: ElCtx): Promise<void> {
  requirePaid(ctx);
  if (!inTeamChannel(i, ctx)) {
    await notify(i, HANDIN.notTeamChannel);
    return;
  }
  await i.showModal(handinModal(takeDraft(ctx)));
}

function readUrl(i: ModalSubmitInteraction): string {
  try {
    return i.fields.getTextInputValue(URL_FIELD) ?? "";
  } catch {
    return "";
  }
}

async function submitHandin(i: ComponentOrModal, ctx: ElCtx): Promise<void> {
  if (!i.isModalSubmit()) return;
  const raw = readUrl(i);
  const parsed = parseHandinUrl(raw);
  if (!parsed.ok) return refuse(i, ctx, raw, HANDIN.url[parsed.problem]);
  if (!ctx.channelId || Object.values(ctx.settings.channels).includes(ctx.channelId)) return notify(i, HANDIN.notTeamChannel);

  let reply: HandinReply;
  try {
    reply = await ctx.api.call<HandinReply>(HANDIN_FN, ctx.guildId, ctx.channelId, parsed.url, submittedAt(i), ctx.userId);
  } catch (error) {
    if (error instanceof ElementalError) {
      const text = handinErrorText(error.code, error.detail);
      if (text && error.code === "bad_url") return refuse(i, ctx, raw, text);
      if (text) return notify(i, text);
    }
    throw error;
  }
  if (!reply || !isUuid(reply.note_id)) throw new ElementalError("failed", undefined, HANDIN_FN);
  clearDraft(ctx);

  // The answer first; the canvas follows and edits it.
  await sayQuietly(i, handinLines(reply, reply.canvas_linked ? HANDIN.canvasPending : HANDIN.canvasNotLinked));
  if (!reply.canvas_linked) return;
  const outcome = await writeShipNote(ctx.rt, ctx.guildId, reply.note_id);
  await sayQuietly(i, handinLines(reply, canvasLine(outcome)));
}

/** Tests only. */
export function handinDrafts(rt: ElementalRuntime): Map<string, { url: string; at: number }> {
  return drafts(rt);
}

export const feature: ElementalFeature = {
  name: "handin",
  commands: [{ name: HANDIN_COMMAND, description: HANDIN.commandDescription.slice(0, 100) }],
  commandHandlers: {
    [HANDIN_COMMAND]: { ack: "modal", run: openHandin },
  },
  actions: {
    // The form's submit: a private ack, so a refusal never shows in the team channel.
    [ACTIONS.save]: { ack: "ephemeral", run: (i, ctx) => submitHandin(i, ctx) },
    // The button that re-opens the form: the modal is the ack.
    [ACTIONS.fix]: {
      ack: "modal",
      run: async (i, ctx) => {
        if (i.isModalSubmit()) return;
        await i.showModal(handinModal(takeDraft(ctx)));
      },
    },
  },
  events: {
    "canvas.linked": async (payload, rt) => {
      await onCanvasLinked(rt, payload.guildId, payload.teamId);
    },
  },
};
