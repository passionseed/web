import {
  buildNote,
  isPlacementObstacle,
  rewriteNote,
  type Box,
  type ElementalNoteKind,
  type ElementalNoteSource,
  type Note,
} from "../../../lib/elemental/canvas";
import type { ElementalRuntime } from "./context";
import { noteText } from "./copy/tester";

/**
 * The async canvas writer (E18): puts a note on a team's linked project
 * canvas after the database has already counted the entry. The bot builds the
 * note with lib/elemental/canvas and SQL writes it through
 * whiteboard_merge_elements (elemental_bot_canvas_write), as the board owner.
 *
 * - Runs on rt.queues.canvas keyed by board id, so two notes on one board
 *   never race for the same fractional index: each task re-reads the target
 *   (the board's last index) inside the queue.
 * - A note is built once per call. The queue's retry (429s, network errors)
 *   resends that same note, never a rebuilt one: a rewrite bumps the version
 *   from the saved copy, so a rebuilt retry after a write that did land would
 *   bump it twice. Resending the same elements is a no-op.
 * - Never throws for a write that cannot land: the outcome says why and SQL
 *   records 'failed' (or 'none') on the entry. /el resync and the periodic
 *   sweep (resyncPending) retry what is left.
 * - Logs carry codes only, never note text.
 *
 * Note ids: a tester entry id ('test'), a lesson progress id ('reference',
 * E21) or a team id after /handin ('ship', E30). Pass `text` for kinds other
 * than 'test' (the default text there is only a fallback).
 */

export const CANVAS_TARGET_FN = "elemental_bot_canvas_target";
export const CANVAS_WRITE_FN = "elemental_bot_canvas_write";
export const CANVAS_TOMBSTONE_FN = "elemental_bot_canvas_tombstone";
export const CANVAS_PENDING_FN = "elemental_bot_canvas_pending";

/** One element near the zone, as elemental_bot_canvas_target lists it. */
export interface NearbyElement extends Box {
  id: string;
  type: string;
  isDeleted: boolean;
  containerId: string | null;
  customData: Record<string, unknown>;
}

/** elemental_bot_canvas_target's reply. Fields after `linked` are present only when linked. */
export interface CanvasTarget {
  entry_id: string;
  kind: ElementalNoteKind;
  source: ElementalNoteSource;
  team_id: string;
  slot: number | null;
  element: string | null;
  project_name: string | null;
  live: boolean;
  removed: boolean;
  /** Tester entries only ('none' | 'pending' | 'written' | 'failed' | 'tombstoned'); null for other notes. */
  canvas_status: string | null;
  fields: Record<string, unknown>;
  note_ids: { rect: string; text: string };
  linked: boolean;
  board_id?: string;
  frame_id?: string;
  owner_id?: string;
  frame?: Box | null;
  zone?: Box | null;
  after_index?: string | null;
  nearby?: NearbyElement[];
  prev?: Note | null;
  prev_deleted?: boolean | null;
  prev_on_frame?: boolean | null;
}

/** elemental_bot_canvas_write / _canvas_tombstone's reply. */
export interface CanvasWriteResult {
  ok: boolean;
  status: string | null;
  reason: string | null;
  ids: string[] | null;
  dropped: unknown[];
  present: boolean | null;
}

export type CanvasOutcome =
  /** On the board (or already written before this call: `already`). */
  | { ok: true; status: "written"; boardId: string | null; already?: boolean }
  /** The team has no canvas yet: nothing to do until /canvas link. */
  | { ok: false; status: "none"; reason: "not_linked" }
  /** Not written on purpose: the entry was removed or the team is no longer live. */
  | { ok: false; status: "skipped"; reason: "removed" | "team_not_live" }
  /** Could not land; SQL marked the entry 'failed' (or it stays 'pending'). */
  | { ok: false; status: "failed"; reason: string };

export interface WriteOptions {
  /** The note's text from the target; defaults by kind (noteText for testers). */
  text?: (target: CanvasTarget) => string;
  /** Write even when the entry is already 'written' (a forced resync). */
  force?: boolean;
  /** Milliseconds for the elements' `updated`; defaults to now. */
  now?: () => number;
}

function code(error: unknown): string {
  const e = error as { code?: unknown; sqlstate?: unknown; status?: unknown; name?: unknown } | null;
  return String(e?.code ?? e?.sqlstate ?? e?.status ?? e?.name ?? "error");
}

/** Default note text by kind. Lesson and hand-in callers pass their own. */
export function defaultNoteText(target: CanvasTarget): string {
  const f = target.fields ?? {};
  const str = (v: unknown) => (typeof v === "string" ? v : v == null ? null : String(v));
  if (target.kind === "test") {
    return noteText({ who: str(f.who), tried: str(f.tried), quote: str(f.quote), changed: str(f.changed) });
  }
  if (target.kind === "ship") return str(f.url) ?? "";
  return str(f.answer) ?? "";
}

/**
 * The elements to write for a target, or null when nothing can be built (no
 * canvas, or the frame is gone). A saved copy on the linked frame is
 * rewritten in place (same ids, place and index, one version up); otherwise a
 * new note goes in the frame's zone for its kind (the frame when it has none),
 * indexed after the board's last index.
 */
export function planNote(target: CanvasTarget, text: string, now = Date.now()): Note | null {
  if (!target.linked || !target.frame_id || !target.owner_id) return null;
  if (target.prev && target.prev_on_frame) return rewriteNote(target.prev, text, now);
  const zoneBox = target.zone ?? target.frame ?? null;
  if (!zoneBox) return null;
  return buildNote({
    entryId: target.entry_id,
    kind: target.kind,
    source: target.source,
    text,
    frameId: target.frame_id,
    zoneBox,
    obstacles: (target.nearby ?? []).filter(isPlacementObstacle),
    afterIndex: target.after_index ?? null,
    ownerId: target.owner_id,
    now,
  });
}

/** Why a target needs no write, or null when it does. */
function skipFor(target: CanvasTarget, force: boolean): CanvasOutcome | null {
  if (!target.linked) return { ok: false, status: "none", reason: "not_linked" };
  if (target.removed) return { ok: false, status: "skipped", reason: "removed" };
  if (!target.live) return { ok: false, status: "skipped", reason: "team_not_live" };
  if (!force && target.kind === "test" && target.canvas_status === "written" && target.prev && !target.prev_deleted && target.prev_on_frame) {
    return { ok: true, status: "written", boardId: target.board_id ?? null, already: true };
  }
  return null;
}

function fromResult(result: CanvasWriteResult | null, boardId: string | null): CanvasOutcome {
  if (result?.ok) return { ok: true, status: "written", boardId };
  const reason = result?.reason ?? "no_reply";
  if (reason === "not_linked") return { ok: false, status: "none", reason };
  if (reason === "removed" || reason === "team_not_live") return { ok: false, status: "skipped", reason };
  return { ok: false, status: "failed", reason };
}

async function readTarget(rt: ElementalRuntime, guildId: string, noteId: string): Promise<CanvasTarget> {
  return rt.api.call<CanvasTarget>(CANVAS_TARGET_FN, guildId, noteId);
}

/** Notes being written now, per runtime, so the periodic sweep leaves them to their caller. */
const IN_FLIGHT = new WeakMap<ElementalRuntime, Map<string, number>>();

function inFlight(rt: ElementalRuntime): Map<string, number> {
  let map = IN_FLIGHT.get(rt);
  if (!map) IN_FLIGHT.set(rt, (map = new Map()));
  return map;
}

async function tracked<T>(rt: ElementalRuntime, key: string, run: () => Promise<T>): Promise<T> {
  const map = inFlight(rt);
  map.set(key, (map.get(key) ?? 0) + 1);
  try {
    return await run();
  } finally {
    const left = (map.get(key) ?? 1) - 1;
    if (left <= 0) map.delete(key);
    else map.set(key, left);
  }
}

export function isWriting(rt: ElementalRuntime, guildId: string, noteId: string): boolean {
  return inFlight(rt).has(`${guildId}:${noteId}`);
}

/**
 * Writes (or rewrites) the note for noteId on its team's canvas. Resolves
 * with the outcome; never rejects.
 */
export async function writeNote(rt: ElementalRuntime, guildId: string, noteId: string, opts: WriteOptions = {}): Promise<CanvasOutcome> {
  return tracked(rt, `${guildId}:${noteId}`, async () => {
    try {
      const first = await readTarget(rt, guildId, noteId);
      const skip = skipFor(first, Boolean(opts.force));
      if (skip || !first.board_id) return skip ?? { ok: false, status: "failed", reason: "no_board" };
      const boardId = first.board_id;
      let note: Note | null = null;
      return await rt.queues.canvas.run(boardId, async () => {
        if (!note) {
          // Inside the queue: earlier notes on this board have landed, so after_index is current.
          const target = await readTarget(rt, guildId, noteId);
          const skipNow = skipFor(target, Boolean(opts.force));
          if (skipNow) return skipNow;
          const text = (opts.text ?? defaultNoteText)(target);
          note = planNote(target, text, opts.now?.() ?? Date.now());
          if (!note) return { ok: false, status: "failed", reason: target.frame ? "no_zone" : "frame_gone" } as CanvasOutcome;
        }
        // The same note on every retry (see above). JSON text: SQL takes it as jsonb.
        const result = await rt.api.call<CanvasWriteResult>(CANVAS_WRITE_FN, guildId, noteId, JSON.stringify(note));
        const outcome = fromResult(result, boardId);
        if (!outcome.ok && outcome.status === "failed") console.error(`[elemental] canvas write not placed: ${outcome.reason}`);
        return outcome;
      });
    } catch (error) {
      console.error(`[elemental] canvas write failed: ${code(error)}`);
      return { ok: false, status: "failed", reason: code(error) };
    }
  });
}

/** A tester entry's note (kind 'test'). */
export function writeEntry(rt: ElementalRuntime, guildId: string, entryId: string, opts: WriteOptions = {}): Promise<CanvasOutcome> {
  return writeNote(rt, guildId, entryId, opts);
}

export type TombstoneOutcome = { ok: boolean; status: string | null; reason: string | null };

/**
 * Takes a note off the canvas (after elemental_bot_tester_remove), on the
 * board's queue when the team has a canvas. Never rejects.
 */
export async function tombstoneNote(rt: ElementalRuntime, guildId: string, noteId: string, actorId: string | null = null): Promise<TombstoneOutcome> {
  return tracked(rt, `${guildId}:${noteId}`, async () => {
    try {
      const target = await readTarget(rt, guildId, noteId);
      const run = async () => {
        const r = await rt.api.call<CanvasWriteResult>(CANVAS_TOMBSTONE_FN, guildId, noteId, actorId);
        return { ok: Boolean(r?.ok), status: r?.status ?? null, reason: r?.reason ?? null };
      };
      const outcome = target.linked && target.board_id ? await rt.queues.canvas.run(target.board_id, run) : await run();
      if (!outcome.ok) console.error(`[elemental] canvas tombstone not placed: ${outcome.reason ?? "unknown"}`);
      return outcome;
    } catch (error) {
      console.error(`[elemental] canvas tombstone failed: ${code(error)}`);
      return { ok: false, status: null, reason: code(error) };
    }
  });
}

export interface PendingRow {
  entry_id: string;
  team_id: string;
  slot: number | null;
  action: "write" | "tombstone";
  canvas_status: string;
}

export interface ResyncResult {
  written: number;
  tombstoned: number;
  failed: number;
  skipped: number;
}

export interface ResyncOptions {
  /** 1..500 rows (SQL's bound). Default 100. */
  limit?: number;
  /**
   * The periodic sweep: leaves notes being written now alone, and gives up on
   * a note after AUTO_ATTEMPTS failed sweeps in this process (staff /el resync
   * passes auto=false and always tries).
   */
  auto?: boolean;
}

export const AUTO_ATTEMPTS = 3;
const AUTO_FAILS = new WeakMap<ElementalRuntime, Map<string, number>>();

/**
 * Retries every canvas write or tombstone SQL says is left
 * (elemental_bot_canvas_pending), oldest first. For /el resync (E20) and the
 * sweep on start. Never rejects for one note; rejects only when the pending
 * list itself cannot be read.
 */
export async function resyncPending(rt: ElementalRuntime, guildId: string, opts: ResyncOptions = {}): Promise<ResyncResult> {
  const limit = Math.max(1, Math.min(500, Math.trunc(opts.limit ?? 100)));
  const rows = await rt.api.rows<PendingRow>(CANVAS_PENDING_FN, guildId, limit);
  const fails = AUTO_FAILS.get(rt) ?? new Map<string, number>();
  AUTO_FAILS.set(rt, fails);
  const result: ResyncResult = { written: 0, tombstoned: 0, failed: 0, skipped: 0 };
  for (const row of rows) {
    const key = `${guildId}:${row.entry_id}`;
    if (opts.auto && (isWriting(rt, guildId, row.entry_id) || (fails.get(key) ?? 0) >= AUTO_ATTEMPTS)) {
      result.skipped += 1;
      continue;
    }
    if (row.action === "tombstone") {
      const t = await tombstoneNote(rt, guildId, row.entry_id, null);
      if (t.ok) {
        result.tombstoned += 1;
        fails.delete(key);
      } else {
        result.failed += 1;
        fails.set(key, (fails.get(key) ?? 0) + 1);
      }
      continue;
    }
    const w = await writeNote(rt, guildId, row.entry_id);
    if (w.ok) {
      result.written += 1;
      fails.delete(key);
    } else if (w.status === "failed") {
      result.failed += 1;
      fails.set(key, (fails.get(key) ?? 0) + 1);
    } else {
      result.skipped += 1;
    }
  }
  return result;
}
