/**
 * Pure helpers for a quest's SHIFT canvas: verify a link, cut a board down to
 * one canvas, read its notes for a quest, and build the quest card text that a
 * submission stores. Isomorphic on purpose (no server-only, no node:crypto):
 * the composer previews exactly the text the server will store, built by the
 * same function. No AI.
 *
 * Privacy: nothing returned here carries a user id, a version's author,
 * comments or anything outside the canvas frame. Note text never goes to logs.
 */
import { accessOf, isProjectFrame, type CanvasAccess } from "@/lib/whiteboard/canvas-access";
import {
  answerOf,
  hasUnsavedEdit,
  isShiftCardKind,
  readVersions,
  SHIFT_CARD_KINDS,
  shortTitle,
  zoneTitle,
  type ShiftCardKind,
} from "@/lib/whiteboard/shift-cards";
import type { BoardSummary, SummaryItem } from "@/lib/whiteboard/summary";
import {
  CARD_LIMITS,
  HINT_DETAIL,
  type ChecklistHint,
  type ContextRow,
  type GuideSpec,
  type HintRule,
  type PickableNote,
} from "@/lib/shift-island/quest-canvas";

type El = {
  id: string;
  type: string;
  isDeleted?: boolean;
  frameId?: string | null;
  containerId?: string | null;
  text?: string;
  originalText?: string | null;
  updated?: number;
  customData?: Record<string, unknown> | null;
};

const chars = (text: string) => Array.from(text).length;
/** Cuts to `max` code points (as Postgres counts characters). */
const cutChars = (text: string, max: number) => (text.length <= max ? text : Array.from(text).slice(0, max).join(""));
const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------------
// The link
// ---------------------------------------------------------------------------

/** What shift_quest_canvas_get returns (and the website stores on link). */
export interface CanvasLinkRow {
  board_id: string;
  frame_id: string;
  canvas_project: string;
}

export type LinkVerdict = "ok" | "gone" | "not_yours" | "retagged";

/** The live (not deleted) frame with this id, or null. */
export function liveFrame(elements: readonly unknown[], frameId: string): El | null {
  for (const raw of elements as El[]) {
    if (raw && raw.id === frameId && raw.type === "frame" && !raw.isDeleted) return raw;
  }
  return null;
}

/** Whether the user is the canvas's owner or on its team. Moderators are not (never canEditCanvas). */
export const onCanvasTeam = (access: CanvasAccess | null, userId: string): boolean =>
  !!access && !!userId && (access.owner === userId || access.editors.includes(userId));

/**
 * Re-checks a canvas link against the whiteboard, on every read and submit:
 * the board exists; the user owns the board or has a whiteboard_members row
 * (any role, no site-admin fallback); a live project frame with that id
 * exists; the canvas lists the user as owner or teammate; and its project tag
 * is still the one that was linked (else "retagged").
 */
export function verifyLink(input: {
  board: { owner_id: string; elements: readonly unknown[] } | null;
  isMember: boolean;
  userId: string;
  link: Pick<CanvasLinkRow, "frame_id" | "canvas_project">;
}): LinkVerdict {
  const { board, isMember, userId, link } = input;
  if (!board) return "gone";
  if (!userId || (board.owner_id !== userId && !isMember)) return "not_yours";
  const frame = liveFrame(Array.isArray(board.elements) ? board.elements : [], link.frame_id);
  if (!frame || !isProjectFrame(frame)) return "gone";
  if (!onCanvasTeam(accessOf(frame), userId)) return "not_yours";
  if (frame.customData?.project !== link.canvas_project) return "retagged";
  return "ok";
}

/**
 * One canvas out of a board: the frame, what is in it (frameId), and the text
 * bound to those (labels of notes). Deleted elements are left out. Its
 * summarizeElements output for the canvas equals the full board's, at a
 * fraction of the cost on a big board.
 */
export function frameElements(elements: readonly unknown[], frameId: string): El[] {
  const live = (elements as El[]).filter((e) => e && !e.isDeleted);
  const inFrame = new Set<string>();
  for (const e of live) if (e.id === frameId || e.frameId === frameId) inFrame.add(e.id);
  return live.filter((e) => inFrame.has(e.id) || (!!e.containerId && inFrame.has(e.containerId)));
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

/** A note with when it last changed, for picking a zone's latest note. Never leaves this module. */
type TimedNote = PickableNote & { updated: number };

const NOTE_KINDS = new Set<SummaryItem["kind"]>(["card", "sticky", "shape", "text"]);

/** A note's own text: the bound label's originalText ?? text (CardVersionsLayer's rule), or a text element's own. */
function rawTextOf(item: SummaryItem, el: El | undefined, label: El | undefined): string {
  const source = item.kind === "text" ? el : label;
  return source?.originalText ?? source?.text ?? "";
}

/**
 * Every written note in the canvas's zones, in reading order per zone (zones
 * in summary order). `kinds` limits the zones; null reads them all. The zone a
 * note sits in says what it is, so plain stickies count too.
 */
function zoneNotes(
  summary: BoardSummary,
  elements: readonly unknown[],
  frameId: string,
  access: CanvasAccess | null,
  kinds: readonly ShiftCardKind[] | null,
): TimedNote[] {
  const byId = new Map<string, El>();
  const labels = new Map<string, El>();
  for (const e of elements as El[]) {
    if (!e || e.isDeleted) continue;
    byId.set(e.id, e);
    if (e.type === "text" && e.containerId) labels.set(e.containerId, e);
  }
  const team = (createdBy: string | undefined) =>
    !createdBy || !access || createdBy === access.owner || access.editors.includes(createdBy);

  const out: TimedNote[] = [];
  for (const zone of summary.areas) {
    if (zone.parent !== frameId || !isShiftCardKind(zone.zone)) continue;
    const kind = zone.zone;
    if (kinds && !kinds.includes(kind)) continue;
    const dayValue = byId.get(zone.id)?.customData?.day;
    const day = typeof dayValue === "number" && Number.isInteger(dayValue) ? dayValue : null;

    for (const item of zone.items) {
      // An unwritten card has empty text in the summary; images carry no words to send.
      if (!item.text || !NOTE_KINDS.has(item.kind)) continue;
      const el = byId.get(item.id);
      if (!el) continue;
      const label = labels.get(item.id);
      const raw = rawTextOf(item, el, label);
      const tag = el.customData?.card;
      const cardKind = isShiftCardKind(tag) ? tag : null;
      const shown = cardKind ? answerOf(cardKind, raw) : raw.replace(/\r\n/g, "\n").trim();
      if (!shown) continue;
      const versions = item.kind === "text" ? [] : readVersions(el.customData);
      const version = versions.at(-1)?.v ?? null;
      const text = cutChars(shown, CARD_LIMITS.line);
      const history = versions
        .slice(-3)
        .reverse()
        .map((v) => {
          const why = v.why ? oneLine(v.why) : "";
          return { v: v.v, why: why ? cutChars(why, CARD_LIMITS.why) : null };
        });
      out.push({
        id: item.id,
        kind,
        day,
        zoneTitle: zone.title,
        text,
        version,
        editedSinceVersion: item.kind !== "text" && hasUnsavedEdit(el.customData, raw),
        history,
        byTeam: team(item.createdBy),
        pii: piiFlags(text) || history.some((h) => !!h.why && piiFlags(h.why)),
        hash: noteHash(version, raw),
        updated: Math.max(el.updated ?? 0, label?.updated ?? 0),
      });
    }
  }
  return out;
}

/** Field by field, so nothing else on a note can leave this module. */
const untimed = (n: TimedNote): PickableNote => ({
  id: n.id,
  kind: n.kind,
  day: n.day,
  zoneTitle: n.zoneTitle,
  text: n.text,
  version: n.version,
  editedSinceVersion: n.editedSinceVersion,
  history: n.history,
  byTeam: n.byTeam,
  pii: n.pii,
  hash: n.hash,
});

/** The written notes in the canvas's zones of these kinds (all zones when null), in reading order. */
export function canvasNotes(
  summary: BoardSummary,
  elements: readonly unknown[],
  frameId: string,
  access: CanvasAccess | null,
  kinds: readonly ShiftCardKind[] | null = null,
): PickableNote[] {
  return zoneNotes(summary, elements, frameId, access, kinds).map(untimed);
}

/** The newest note of a kind: the one changed last (its shape or its text), the later one on a tie. */
function latestOf(notes: TimedNote[]): TimedNote | null {
  let best: TimedNote | null = null;
  for (const n of notes) if (!best || n.updated >= best.updated) best = n;
  return best;
}

function evaluate(rule: HintRule, notes: TimedNote[]): { hinted: boolean; detail: string | null } {
  switch (rule.rule) {
    case "written": {
      const n = notes.filter((x) => x.kind === rule.zone).length;
      // No detail: the lit check and the context row above already say the note is there.
      return { hinted: n > 0, detail: null };
    }
    case "count": {
      const n = notes.filter((x) => x.kind === rule.zone).length;
      return n >= rule.min ? { hinted: true, detail: HINT_DETAIL.count(shortTitle(rule.zone), n) } : { hinted: false, detail: null };
    }
    case "version": {
      const v = notes.filter((x) => x.kind === rule.zone).reduce((max, x) => Math.max(max, x.version ?? 0), 0);
      return v >= rule.min ? { hinted: true, detail: HINT_DETAIL.version(shortTitle(rule.zone), v) } : { hinted: false, detail: null };
    }
    case "any": {
      for (const sub of rule.of) {
        const result = evaluate(sub, notes);
        if (result.hinted) return result;
      }
      return { hinted: false, detail: null };
    }
  }
}

/**
 * What one quest shows from the linked canvas: the "สำหรับโปรเจกต์คุณ" rows,
 * the checklist hints (a mentor still decides) and the notes the quest card
 * may use (only zones in guide.zones). `elements` may be the whole board or
 * frameElements of it; `summary` is summarizeElements of the same.
 */
export function buildContext(
  guide: GuideSpec,
  summary: BoardSummary,
  elements: readonly unknown[],
  frameId: string,
  access: CanvasAccess | null,
): { context: ContextRow[]; hints: ChecklistHint[]; notes: PickableNote[] } {
  const all = zoneNotes(summary, elements, frameId, access, null);

  const context: ContextRow[] = guide.context.map((spec) => {
    const ofKind = all.filter((n) => n.kind === spec.zone);
    if (spec.show === "count") {
      return { kind: spec.zone, label: spec.label, text: null, version: null, count: ofKind.length, noteId: null };
    }
    const latest = latestOf(ofKind);
    return {
      kind: spec.zone,
      label: spec.label,
      text: latest ? cutChars(latest.text, CARD_LIMITS.noteChars) : null,
      version: latest?.version ?? null,
      count: null,
      noteId: latest?.id ?? null,
    };
  });

  const hints: ChecklistHint[] = guide.checklist.map((item) =>
    item.hint ? { id: item.id, ...evaluate(item.hint, all) } : { id: item.id, hinted: false, detail: null },
  );

  const notes = all.filter((n) => guide.zones.includes(n.kind)).map(untimed);
  return { context, hints, notes };
}

/** The chosen notes, in the canvas's order (the same on the composer and the server). */
export function pickNotes<T extends { id: string }>(notes: readonly T[], ids: readonly string[]): T[] {
  const chosen = new Set(ids);
  return notes.filter((n) => chosen.has(n.id));
}

// ---------------------------------------------------------------------------
// Change detection
// ---------------------------------------------------------------------------

const MASK_53_HI = 0x1fffff;

/**
 * FNV-1a, 64-bit over UTF-8 bytes, cut to its low 53 bits, as hex. 16-bit
 * limbs keep it exact in doubles without BigInt. Change detection only, not
 * security: the server re-reads the canvas and builds the text itself.
 */
export function fnv1a53(input: string): string {
  const bytes = new TextEncoder().encode(input);
  // Offset basis 0xcbf29ce484222325, low limb first.
  let h0 = 0x2325;
  let h1 = 0x8422;
  let h2 = 0x9ce4;
  let h3 = 0xcbf2;
  for (let i = 0; i < bytes.length; i++) {
    h0 ^= bytes[i];
    // h *= 0x100000001b3 (2^40 + 0x1b3), mod 2^64.
    const t0 = h0 * 0x1b3;
    let t1 = h1 * 0x1b3;
    let t2 = h2 * 0x1b3 + (h0 << 8);
    let t3 = h3 * 0x1b3 + (h1 << 8);
    t1 += t0 >>> 16;
    h0 = t0 & 0xffff;
    t2 += t1 >>> 16;
    h1 = t1 & 0xffff;
    t3 += t2 >>> 16;
    h2 = t2 & 0xffff;
    h3 = t3 & 0xffff;
  }
  const hi = ((h3 << 16) | h2) >>> 0;
  const lo = ((h1 << 16) | h0) >>> 0;
  return ((hi & MASK_53_HI) * 0x1_0000_0000 + lo).toString(16);
}

/** A note's change marker: its newest version number and its text. */
export function noteHash(version: number | null, rawText: string): string {
  return fnv1a53(`${version ?? 0}|${rawText}`);
}

// ---------------------------------------------------------------------------
// Tester privacy (warn only, never strip)
// ---------------------------------------------------------------------------

const PII_PATTERNS: readonly RegExp[] = [
  // Thai mobiles: 06, 08 or 09 and 7 to 8 more digits, plain, spaced or dashed.
  /(?:^|\D)0[689](?:[ .-]?\d){7,8}(?!\d)/,
  // +66 numbers.
  /\+\s?66(?:[ .-]?\d){8,9}(?!\d)/,
  // Emails.
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  // LINE ids: "ไลน์ handle", "line: handle", "line id handle", "ID: handle".
  /ไลน์\s*(?:id\s*)?[:：=]?\s*@?[a-z0-9][a-z0-9._-]{2,}/i,
  /\bline\s*(?:id\s*)?(?:[:：=]\s*|@)@?[a-z0-9][a-z0-9._-]{2,}/i,
  /\bline\s*id\s+@?[a-z0-9][a-z0-9._-]{2,}/i,
  /\bid\s*[:：=]\s*@?[a-z0-9][a-z0-9._-]{2,}/i,
  // @handles (an email's @ is caught above).
  /(?:^|[^a-z0-9_.@])@[a-z0-9_][a-z0-9_.]{2,}/i,
  // Thai landlines: 02 to 07 and 7 more digits ("เบอร์ 02-123-4567").
  /(?:^|\D)0[2-7](?:[ .-]?\d){7}(?!\d)/,
  // Labelled social handles, the way students write a tester down: "ig mint.k", "fb: Mint", "tiktok: mintk".
  // No bare "x" or "tt": ordinary words would trip them.
  /(?:^|[^a-z])(?:ig|insta(?:gram)?|fb|facebook|tiktok|twitter)\s*[:：=]?\s*@?[a-z0-9_.]{3,}/i,
  /(?:ไอจี|อินสตา(?:แกรม)?|เฟส(?:บุ๊ก|บุ๊ค)?|ติ๊กต็อก|ติ๊กต๊อก|ทวิต(?:เตอร์)?)\s*[:：=]?\s*@?[a-z0-9_.]{3,}/i,
];

/** Thai digits as Arabic ones, so "๐๘๑ ๒๓๔ ๕๖๗๘" is read as a phone number. */
function arabicDigits(text: string): string {
  return text.replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - 0x0e50));
}

/**
 * True when the text may hold a phone number (Thai digits too), an email, a
 * LINE id, a labelled IG, Facebook, TikTok or Twitter handle, or an @handle.
 * A warning only: nothing is ever stripped.
 */
export function piiFlags(text: string): boolean {
  const normal = arabicDigits(text);
  return PII_PATTERNS.some((pattern) => pattern.test(normal));
}

// ---------------------------------------------------------------------------
// The quest card text
// ---------------------------------------------------------------------------

export type SnapshotNote = Pick<PickableNote, "kind" | "day" | "text" | "version" | "history" | "byTeam"> &
  Partial<Pick<PickableNote, "editedSinceVersion">>;

/** One note of the quest card, as stored: the header, its words (cut to the budget) and its reason lines. */
export interface SnapshotBlock {
  kind: ShiftCardKind;
  day: number | null;
  header: string;
  body: string;
  whys: string[];
}

const CUT_MARK = "…(ตัด)";
/** Below this many characters per note, version lines give way to the notes' own words. */
const MIN_BODY = 60;
const ZONE_ORDER: readonly ShiftCardKind[] = SHIFT_CARD_KINDS;

/**
 * "💡 ไอเดีย v3", "📅 วันที่ 2", "🧪 ทดสอบ (โน้ตจากคนนอกทีม)": the zone's title
 * as on the whiteboard. Text edited after its newest saved version says so
 * ("💡 ไอเดีย v3 (แก้หลัง v3)"): the words stored are the edited ones.
 */
function noteHeader(n: SnapshotNote): string {
  const edited = n.version && n.editedSinceVersion ? ` (แก้หลัง v${n.version})` : "";
  return zoneTitle(n.kind, n.day ?? undefined) + (n.version ? ` v${n.version}` : "") + edited + (n.byTeam ? "" : " (โน้ตจากคนนอกทีม)");
}

/** At most `limit` "v1 → v2 เปลี่ยนเพราะ: ..." lines, oldest first, from the newest versions with a reason. */
function whyLines(n: SnapshotNote, limit: number): string[] {
  const lines: string[] = [];
  for (let i = 0; i < n.history.length && lines.length < limit; i++) {
    const h = n.history[i];
    const why = h.why ? oneLine(h.why) : "";
    if (!why || h.v <= 1) continue;
    const previous = n.history[i + 1]?.v ?? h.v - 1;
    lines.push(`v${previous} → v${h.v} เปลี่ยนเพราะ: ${cutChars(why, CARD_LIMITS.why)}`);
  }
  return lines.reverse();
}

function cutBody(text: string, budget: number): { body: string; cut: boolean } {
  if (chars(text) <= budget) return { body: text, cut: false };
  const room = Math.max(0, budget - chars(CUT_MARK));
  return { body: `${cutChars(text, room).trimEnd()}${CUT_MARK}`, cut: true };
}

/**
 * The quest card as stored in the submission's evidence: deterministic and at
 * most 2000 code points. Line 1 names the canvas; then each note, in zone
 * order (problem, target, interview, reference, idea, test, pivot, ship,
 * daily), as a header ("🧪 ทดสอบ v2", "📅 วันที่ 2"), its words cut to the note budget with
 * "…(ตัด)", and at most two "เปลี่ยนเพราะ" lines. Budget per note =
 * min(400, floor((2000 - everything but the notes' words) / count)). Never
 * ids, authors or comments.
 */
export function buildSnapshot(
  canvasTitle: string,
  notes: readonly SnapshotNote[],
): { text: string; cut: boolean; length: number; blocks: SnapshotBlock[] } {
  const max = CARD_LIMITS.evidence;
  const title = cutChars(oneLine(canvasTitle) || "ไม่มีชื่อ", 80);
  const first = `การ์ดเควสต์จากแคนวาส: ${title}`;
  const sorted = notes
    .map((note, i) => ({ note, i }))
    .sort(
      (a, b) =>
        ZONE_ORDER.indexOf(a.note.kind) - ZONE_ORDER.indexOf(b.note.kind) ||
        (a.note.day ?? 0) - (b.note.day ?? 0) ||
        a.i - b.i,
    )
    .map(({ note }) => note);

  if (sorted.length === 0) return { text: first, cut: false, length: chars(first), blocks: [] };

  let whyLimit = 2;
  let budget = 0;
  let blocks: { kind: ShiftCardKind; day: number | null; header: string; whys: string[]; text: string }[] = [];
  for (;;) {
    blocks = sorted.map((n) => ({
      kind: n.kind,
      day: n.day ?? null,
      header: noteHeader(n),
      whys: whyLines(n, whyLimit),
      text: n.text.trim(),
    }));
    // Everything but the notes' words: line 1, each header and reason line, the line breaks.
    const overhead =
      chars(first) +
      blocks.reduce((sum, b) => sum + 2 + chars(b.header) + 1 + b.whys.reduce((s, w) => s + 1 + chars(w), 0), 0);
    budget = Math.min(CARD_LIMITS.noteChars, Math.floor((max - overhead) / blocks.length));
    if (budget >= MIN_BODY || whyLimit === 0) break;
    whyLimit -= 1;
  }

  let cut = whyLimit < 2 && sorted.some((n) => whyLines(n, 2).length > whyLines(n, whyLimit).length);
  const parts = [first];
  const out: SnapshotBlock[] = [];
  for (const b of blocks) {
    const body = cutBody(b.text, Math.max(budget, 0));
    cut ||= body.cut;
    parts.push([b.header, body.body, ...b.whys].join("\n"));
    out.push({ kind: b.kind, day: b.day, header: b.header, body: body.body, whys: b.whys });
  }
  let text = parts.join("\n\n");
  if (chars(text) > max) {
    // Only reachable with extreme headers; the budget above normally keeps it under.
    text = `${cutChars(text, max - chars(CUT_MARK))}${CUT_MARK}`;
    cut = true;
  }
  return { text, cut, length: chars(text), blocks: out };
}
