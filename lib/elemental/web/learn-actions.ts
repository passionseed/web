"use server";

/**
 * Server actions for the Elemental lesson player (E28): who is watching, what
 * they saved, and saving one part.
 *
 * Identity: the viewer's Discord identity on their Supabase session
 * (extractDiscordIdentity). Without one, or without a claimed membership on a
 * live team, the viewer can only watch, and nothing is written. Every read
 * and write is service-role; the team always comes from elemental_members in
 * SQL, never from the client, and no Discord id leaves the server.
 *
 * Saving (elemental_web_lesson_answer, E21): the action works out whether the
 * part finishes the lesson, refuses contacts before any database call, and
 * maps SQL's 'el:<code>' errors. A do-it-now answer then goes on the team's
 * linked project canvas as a 'reference' note with source 'lesson', through
 * the same SQL the bot uses for /tester notes (elemental_bot_canvas_target,
 * then elemental_bot_canvas_write, which stamps the board owner and calls
 * whiteboard_merge_elements). The note's id is the progress row's, so saving
 * the part again rewrites the same note. A note that cannot be placed never
 * fails the save: the answer is already stored.
 *
 * Logs carry codes only, never answers or ids.
 */

import { refusePii, type PiiKind } from "@/lib/elemental/core";
import { buildNote, isPlacementObstacle, rewriteNote, type Box, type Note } from "@/lib/elemental/canvas";
import { extractDiscordIdentity } from "@/lib/projectseed/discord";
import { resolvePublicEdition, type ElementalPublicEdition } from "@/lib/supabase/elemental";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

import { checkAnswer, getLesson, isFinalPart, lessonNoteText } from "./lessons";

/** Why a viewer can only watch. */
export type LessonWatchReason = "signed_out" | "no_discord" | "not_claimed" | "no_team" | "unavailable";

/** What happened to a do-it-now note. 'none' for every other stop. */
export type LessonCanvasStatus = "none" | "written" | "not_linked" | "failed";

export type LessonSaveResult =
  | {
      ok: true;
      lessonId: string;
      part: number;
      /** This part finishes the lesson. */
      final: boolean;
      /** The viewer has finished this lesson (now or before). */
      finished: boolean;
      /** This save finished it for the first time. */
      firstFinish: boolean;
      /** This save earned the team its badge for the lesson (once per team and lesson). */
      badgeAwarded: boolean;
      canvas: LessonCanvasStatus;
    }
  /** Nothing was saved: the viewer can only watch. */
  | { ok: false; error: "watch_only"; reason: LessonWatchReason }
  /** The answer holds a contact. Re-open the form on `field`; never show the matched text. */
  | { ok: false; error: "pii"; field: "answer"; kind: PiiKind | null }
  | { ok: false; error: "bad_lesson" | "bad_part" | "bad_answer" }
  /** The database could not save it (down, or the migration is not applied). */
  | { ok: false; error: "unavailable" };

export interface LessonSaveInput {
  lessonId: string;
  part: number;
  /** The stop's answer (a choice's option id); omit or null on a last part without a stop. */
  answer?: string | null;
  /** 'elemental-2026' (default) or 'elemental-dryrun'. */
  edition?: string;
}

/** One saved part of the viewer's own progress. */
export interface LessonPartProgress {
  part: number;
  answer: string | null;
}

export interface LessonViewer {
  /** 'save' when answers are stored; 'watch' otherwise (see reason). */
  mode: "save" | "watch";
  reason: LessonWatchReason | null;
  /** The viewer's own saved parts and finished state, by lesson id. Empty when watching. */
  progress: Record<string, { parts: LessonPartProgress[]; finished: boolean }>;
}

type Admin = ReturnType<typeof createAdminClient>;
type Identity = { ok: true; discordUserId: string } | { ok: false; reason: LessonWatchReason };

const SQL_ERROR = /^el:([a-z_]+)$/;

/** The 'el:<code>' code of a database error, or null. */
function sqlCode(error: unknown): string | null {
  const message = (error as { message?: unknown } | null)?.message;
  const match = typeof message === "string" ? SQL_ERROR.exec(message.trim()) : null;
  return match ? match[1] : null;
}

/** A log-safe code for an error: never its message, which may quote data. */
function logCode(error: unknown): string {
  const e = error as { code?: unknown; name?: unknown } | null;
  return String(sqlCode(error) ?? e?.code ?? e?.name ?? "error");
}

/** The signed-in viewer's Discord id. Reads the session only: no database call. */
async function viewerIdentity(): Promise<Identity> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: "signed_out" };
    const discord = extractDiscordIdentity(user);
    if (!discord) return { ok: false, reason: "no_discord" };
    return { ok: true, discordUserId: discord.userId };
  } catch (error) {
    console.error(`[elemental-learn] session read failed: ${logCode(error)}`);
    return { ok: false, reason: "signed_out" };
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

// ---------------------------------------------------------------------------
// Canvas: a do-it-now answer as a 'reference' note.

/** elemental_bot_canvas_target's reply, the fields this file reads. */
interface CanvasTarget {
  kind: string;
  live: boolean;
  linked: boolean;
  frame_id?: string;
  owner_id?: string;
  frame?: Box | null;
  zone?: Box | null;
  after_index?: string | null;
  nearby?: (Box & { type: string; isDeleted?: boolean; containerId?: string | null; customData?: Record<string, unknown> })[];
  prev?: Note | null;
  prev_on_frame?: boolean | null;
}

/**
 * The note to write: the saved copy rewritten in place when it is on the
 * linked frame, else a new note in the frame's 'reference' zone (the frame
 * when it has none). The same rule as the bot's planNote (E18).
 */
function planLessonNote(entryId: string, target: CanvasTarget, text: string): Note | null {
  if (!target.linked || !target.frame_id || !target.owner_id) return null;
  if (target.prev && target.prev_on_frame) return rewriteNote(target.prev, text);
  const zoneBox = target.zone ?? target.frame ?? null;
  if (!zoneBox) return null;
  return buildNote({
    entryId,
    kind: "reference",
    source: "lesson",
    text,
    frameId: target.frame_id,
    zoneBox,
    obstacles: (target.nearby ?? []).filter(isPlacementObstacle),
    afterIndex: target.after_index ?? null,
    ownerId: target.owner_id,
  });
}

/** The guild the edition's bot functions key on (one guild per edition). */
async function guildOf(db: Admin, edition: ElementalPublicEdition): Promise<string | null> {
  const { data, error } = await db.from("elemental_settings").select("guild_id").eq("edition", edition).limit(1).maybeSingle();
  if (error) throw error;
  return isObject(data) && typeof data.guild_id === "string" ? data.guild_id : null;
}

/** Writes the progress row's note on the team's canvas. Never throws. */
async function writeLessonNote(db: Admin, edition: ElementalPublicEdition, progressId: string, text: string): Promise<LessonCanvasStatus> {
  try {
    const guildId = await guildOf(db, edition);
    if (!guildId) {
      console.error("[elemental-learn] canvas note not placed: no_guild");
      return "failed";
    }
    const args = { p_guild_id: guildId, p_entry_id: progressId };
    const { data: target, error: targetError } = await db.rpc("elemental_bot_canvas_target", args);
    if (targetError) throw targetError;
    if (!isObject(target)) return "failed";
    const t = target as unknown as CanvasTarget;
    if (!t.linked) return "not_linked";
    if (!t.live || t.kind !== "reference") return "failed";
    const note = planLessonNote(progressId, t, text);
    if (!note) {
      console.error(`[elemental-learn] canvas note not placed: ${t.frame ? "no_zone" : "frame_gone"}`);
      return "failed";
    }
    const { data: result, error: writeError } = await db.rpc("elemental_bot_canvas_write", { ...args, p_elements: note });
    if (writeError) throw writeError;
    if (isObject(result) && result.ok === true) return "written";
    const reason = isObject(result) && typeof result.reason === "string" ? result.reason : "no_reply";
    if (reason === "not_linked") return "not_linked";
    console.error(`[elemental-learn] canvas note not placed: ${reason}`);
    return "failed";
  } catch (error) {
    console.error(`[elemental-learn] canvas note failed: ${logCode(error)}`);
    return "failed";
  }
}

// ---------------------------------------------------------------------------

/**
 * Saves one part of a lesson for the signed-in viewer. Order: the lesson and
 * answer are checked, then contacts are refused, then the session is read;
 * only a viewer with a Discord identity reaches the database.
 */
export async function saveLessonAnswer(input: LessonSaveInput): Promise<LessonSaveResult> {
  const raw: Partial<Record<keyof LessonSaveInput, unknown>> = isObject(input) ? input : {};
  const lesson = getLesson(raw.lessonId);
  if (!lesson) return { ok: false, error: "bad_lesson" };
  const checked = checkAnswer(lesson, raw.part, raw.answer);
  if (!checked.ok) return checked;
  const part = raw.part as number;

  const pii = refusePii({ answer: checked.answer });
  if (!pii.ok) return { ok: false, error: "pii", field: "answer", kind: pii.kind };

  const viewer = await viewerIdentity();
  if (!viewer.ok) return { ok: false, error: "watch_only", reason: viewer.reason };

  const edition = resolvePublicEdition(raw.edition);
  const final = isFinalPart(lesson, part);
  let db: Admin;
  try {
    db = createAdminClient();
  } catch (error) {
    console.error(`[elemental-learn] save failed: ${logCode(error)}`);
    return { ok: false, error: "unavailable" };
  }
  let data: unknown;
  try {
    const reply = await db.rpc("elemental_web_lesson_answer", {
      p_edition: edition,
      p_discord_user_id: viewer.discordUserId,
      p_lesson_id: lesson.id,
      p_part: part,
      p_answer: checked.answer,
      p_final: final,
    });
    if (reply.error) throw reply.error;
    data = reply.data;
  } catch (error) {
    const code = sqlCode(error);
    if (code === "not_claimed" || code === "no_team") return { ok: false, error: "watch_only", reason: code };
    if (code === "pii") {
      const hint = (error as { hint?: unknown }).hint;
      const kind = typeof hint === "string" && ["email", "url", "phone", "line", "social", "handle"].includes(hint) ? (hint as PiiKind) : null;
      return { ok: false, error: "pii", field: "answer", kind };
    }
    if (code === "bad_lesson" || code === "bad_part" || code === "bad_answer") return { ok: false, error: code };
    if (code === "bad_user") return { ok: false, error: "watch_only", reason: "no_discord" };
    console.error(`[elemental-learn] save failed: ${logCode(error)}`);
    return { ok: false, error: "unavailable" };
  }

  const row = isObject(data) ? data : {};
  const progressId = typeof row.progress_id === "string" ? row.progress_id : null;
  let canvas: LessonCanvasStatus = "none";
  if (checked.stop?.kind === "do_it_now" && checked.answer && progressId) {
    canvas = isObject(row.canvas) ? await writeLessonNote(db, edition, progressId, lessonNoteText(lesson, checked.answer)) : "not_linked";
  }
  return {
    ok: true,
    lessonId: lesson.id,
    part,
    final,
    finished: row.final === true && row.finished_at != null,
    firstFinish: row.first_finish === true,
    badgeAwarded: row.badge_awarded === true,
    canvas,
  };
}

const WATCH = (reason: LessonWatchReason): LessonViewer => ({ mode: "watch", reason, progress: {} });

/**
 * Who is watching and what they saved: 'save' with their own progress when
 * they are a claimed member on a live team, else 'watch' with the reason.
 * Without a Discord identity on the session there is no database call.
 */
export async function getLessonViewer(input?: { edition?: string }): Promise<LessonViewer> {
  const viewer = await viewerIdentity();
  if (!viewer.ok) return WATCH(viewer.reason);
  const edition = resolvePublicEdition(isObject(input) ? input.edition : undefined);
  try {
    const db = createAdminClient();
    const { data: member, error: memberError } = await db
      .from("elemental_members")
      .select("id, team_id")
      .eq("edition", edition)
      .eq("discord_user_id", viewer.discordUserId)
      .maybeSingle();
    if (memberError) throw memberError;
    if (!isObject(member) || typeof member.id !== "string") return WATCH("not_claimed");
    if (typeof member.team_id !== "string") return WATCH("no_team");
    const { data: team, error: teamError } = await db
      .from("elemental_teams")
      .select("status")
      .eq("id", member.team_id)
      .eq("edition", edition)
      .maybeSingle();
    if (teamError) throw teamError;
    // elemental__is_live (E09).
    if (!isObject(team) || (team.status !== "active" && team.status !== "channel_pending")) return WATCH("no_team");

    const { data: rows, error: rowsError } = await db
      .from("elemental_lesson_progress")
      .select("lesson_id, part, answer, final, finished_at")
      .eq("edition", edition)
      .eq("member_id", member.id);
    if (rowsError) throw rowsError;
    const progress: LessonViewer["progress"] = {};
    for (const r of Array.isArray(rows) ? rows : []) {
      if (!isObject(r) || typeof r.lesson_id !== "string" || typeof r.part !== "number") continue;
      const entry = (progress[r.lesson_id] ??= { parts: [], finished: false });
      entry.parts.push({ part: r.part, answer: typeof r.answer === "string" ? r.answer : null });
      if (r.final === true && r.finished_at != null) entry.finished = true;
    }
    for (const entry of Object.values(progress)) entry.parts.sort((a, b) => a.part - b.part);
    return { mode: "save", reason: null, progress };
  } catch (error) {
    console.error(`[elemental-learn] viewer read failed: ${logCode(error)}`);
    return WATCH("unavailable");
  }
}
