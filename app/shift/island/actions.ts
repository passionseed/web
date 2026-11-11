"use server";

/**
 * Every mutation on /shift/island. Each action re-derives who is asking from
 * the session (the client never sends an actor), validates its input against
 * the database's own caps, calls exactly one shift_quest_* function, and on
 * success refreshes the page so the same response carries the new island.
 * Logs carry the function name and SQLSTATE or a refusal code, never text a
 * student wrote.
 */

import { refresh } from "next/cache";
import { z } from "zod";

import { QuestDbError, QuestError, type QuestApi } from "@/bot/src/quests/api";
import { MAIN_MILESTONE_TAKE_THE_KEYS, ownershipRows, proofWithOwnership, type OwnershipRow } from "@/lib/shift-island/ownership";
import {
  CARD_REFLECTION_FALLBACK,
  MAIN_SLUGS,
  questGuideSpec,
  type CanvasChoice,
  type QuestCanvasContext,
} from "@/lib/shift-island/quest-canvas";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";
import * as canvas from "@/lib/supabase/shift-quests/canvas";
import { buildContext, buildSnapshot, canvasNotes, pickNotes, type CanvasLinkRow } from "@/lib/supabase/shift-quests/canvas-snapshot";
import { questApi } from "@/lib/supabase/shift-quests/db";
import { questErrorText } from "@/lib/supabase/shift-quests/errors";
import {
  TEXT_LIMITS,
  type IslandActionResult,
  type ProjectRoute,
  type QuestBoard,
  type QuestSubmitResult,
} from "@/lib/supabase/shift-quests/types";
import {
  askForHelpSchema,
  checkInSchema,
  chooseSideQuestSchema,
  createProjectSchema,
  linkCanvasSchema,
  loadQuestCanvasSchema,
  proposeQuestSchema,
  respondInviteSchema,
  resumeQuestSchema,
  setRestingSchema,
  setShowNameSchema,
  startMainQuestSchema,
  submitMainQuestSchema,
  submitProposedQuestSchema,
  submitQuestCardSchema,
  submitSideQuestSchema,
} from "@/lib/supabase/shift-quests/validate";
import { resolveIslandViewer } from "@/lib/supabase/shift-quests/viewer";

type Failure = Extract<IslandActionResult, { ok: false }>;

interface Caller {
  actor: string;
  name: string;
  /** The Supabase user id from getUser(), for whiteboard reads. Server-only, like actor. */
  userId: string;
}

interface SubmitRow {
  instance_id: string;
  revision: number | string;
  created?: boolean;
}

interface StartRow {
  instance_id: string;
  version: number;
  created: boolean;
}

type StartResult = { instanceId: string; version: number; created: boolean };

function failure(code: string, textCode: string = code): Failure {
  return { ok: false, code, error: questErrorText(textCode) };
}

/**
 * Refusals that mean the page is out of date (the board changed underneath,
 * or the viewer lost access). The page is refreshed in the same response, so
 * a stale tile or a gate card replaces what the student was looking at.
 */
const STALE_CODES: ReadonlySet<string> = new Set([
  "signed_out",
  "not_eligible",
  "not_started",
  "no_project",
  "milestone_open",
  "milestone_done",
  "milestone_appealed",
  "quest_done",
  "quest_locked",
  "quest_appealed",
  "not_repeatable",
  "template_unavailable",
  "stale_version",
  "bad_state",
  "not_found",
  // The page still says the project is linked to a canvas.
  "canvas_unlinked",
]);

function refused(code: string, textCode: string = code): Failure {
  if (STALE_CODES.has(code)) refresh();
  return failure(code, textCode);
}

/**
 * The shared gate: validate, resolve the viewer, run one database call, map
 * every failure to Thai, refresh on success. Only startIsland lets a viewer
 * who has not started through. A `read` never calls refresh(), not even on a
 * refusal: reads run from effects while a sheet is open, and a refresh there
 * would re-render the page under the student.
 */
async function withReadyViewer<S extends z.ZodTypeAny, T>(
  action: string,
  schema: S,
  input: unknown,
  run: (caller: Caller, input: z.output<S>) => Promise<T>,
  options: { allowNotStarted?: boolean; read?: boolean } = {}
): Promise<IslandActionResult<T>> {
  const refuse = options.read ? failure : refused;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return failure("invalid_input");

  const viewer = await resolveIslandViewer();
  switch (viewer.state) {
    case "signed_out":
    case "no_discord":
      return refuse("signed_out");
    case "unavailable":
      return failure("unavailable");
    case "not_eligible":
      return refuse("not_eligible", viewer.reason === "discord_unavailable" ? "discord_unavailable" : "not_eligible");
    case "not_started":
      if (!options.allowNotStarted) return refuse("not_started");
      break;
    case "ready":
      break;
  }

  let data: T;
  try {
    data = await run({ actor: viewer.actor, name: viewer.me.name, userId: viewer.userId }, parsed.data);
  } catch (error) {
    if (error instanceof QuestError) return refuse(error.code);
    if (error instanceof QuestDbError) {
      console.error(`[shift-island] ${action}: ${error.fn} failed (SQLSTATE ${error.sqlstate})`);
    } else {
      console.error(`[shift-island] ${action} failed: ${errorName(error)}`);
    }
    return failure("unknown");
  }

  if (!options.read) refresh();
  return { ok: true, data };
}

/** withReadyViewer for reads: the same gate and error mapping, never a refresh. */
function withReader<S extends z.ZodTypeAny, T>(
  action: string,
  schema: S,
  input: unknown,
  run: (caller: Caller, input: z.output<S>) => Promise<T>
): Promise<IslandActionResult<T>> {
  return withReadyViewer(action, schema, input, run, { read: true });
}

/** startIsland takes no input; anything a client sends is ignored. */
const noInput = z.unknown().transform(() => null);

function submitted(row: SubmitRow): QuestSubmitResult {
  return { instanceId: row.instance_id, revision: Number(row.revision), created: row.created === true };
}

function started(row: StartRow): StartResult {
  return { instanceId: row.instance_id, version: Number(row.version), created: row.created === true };
}

/** An error's class name for logs, never its message. */
function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

/** Start once (the island's welcome). Idempotent in the database. */
export async function startIsland(): Promise<IslandActionResult> {
  return withReadyViewer(
    "startIsland",
    noInput,
    undefined,
    async ({ actor, name }) => {
      await questApi().call("shift_quest_start", actor, name, false);
      return null;
    },
    { allowNotStarted: true }
  );
}

/** Claim a plot: a new project, its plot on the island, and the caller as its first member. */
export async function createProject(input: {
  name: string;
  route: ProjectRoute;
  ambition?: string | null;
}): Promise<IslandActionResult<{ projectId: string }>> {
  return withReadyViewer("createProject", createProjectSchema, input, async ({ actor }, v) => {
    const projectId = await questApi().call<string>("shift_quest_project_create", actor, v.name, v.route, v.ambition);
    return { projectId };
  });
}

export async function respondInvite(input: { projectId: string; accept: boolean }): Promise<IslandActionResult> {
  return withReadyViewer("respondInvite", respondInviteSchema, input, async ({ actor }, v) => {
    await questApi().call("shift_quest_project_respond", actor, v.projectId, v.accept);
    return null;
  });
}

/** The daily tap (no note), or a private one-line note. Neither grows the tree. */
export async function checkIn(input?: {
  note?: string | null;
}): Promise<IslandActionResult<{ kind: "tap" | "note"; tapsToday: number }>> {
  return withReadyViewer("checkIn", checkInSchema, input, async ({ actor }, v) => {
    const row = await questApi().call<{ kind: "tap" | "note"; taps_today: number }>(
      "shift_quest_checkin",
      actor,
      v.note
    );
    return { kind: row.kind === "note" ? "note" : "tap", tapsToday: Number(row.taps_today) || 0 };
  });
}

export async function setResting(input: { on: boolean }): Promise<IslandActionResult<{ paused: number; resumed: number }>> {
  return withReadyViewer("setResting", setRestingSchema, input, async ({ actor }, v) => {
    const row = await questApi().call<{ paused: number; resumed: number }>("shift_quest_rest", actor, v.on);
    return { paused: Number(row.paused) || 0, resumed: Number(row.resumed) || 0 };
  });
}

/** Consent to show the project's name on the island (shown once every teammate agrees). */
export async function setShowName(input: {
  projectId: string;
  show: boolean;
}): Promise<IslandActionResult<{ nameVisible: boolean }>> {
  return withReadyViewer("setShowName", setShowNameSchema, input, async ({ actor }, v) => {
    const row = await questApi().call<{ project_name_visible: boolean }>(
      "shift_quest_island_optin",
      actor,
      v.projectId,
      v.show
    );
    return { nameVisible: row.project_name_visible === true };
  });
}

/** shift_quest_ownership_get: the current project's ownership checklist, or null without a project. */
async function ownershipOf(api: QuestApi, actor: string): Promise<OwnershipRow[] | null> {
  return ownershipRows(await api.call<unknown>("shift_quest_ownership_get", actor));
}

/**
 * One of the seven main quests: proof plus one reflection, for a mentor to
 * confirm. Quest 5 (ถือกุญแจเอง) carries the ownership checklist as it is at
 * this moment, read here on the server and added under the student's proof,
 * so the evidence cannot change after review. Too long together: text_too_long,
 * never a cut.
 */
export async function submitMainQuest(input: {
  milestone: number;
  proof: string;
  reflection: string;
  artifactUrl?: string | null;
}): Promise<IslandActionResult<QuestSubmitResult>> {
  return withReadyViewer("submitMainQuest", submitMainQuestSchema, input, async ({ actor }, v) => {
    const api = questApi();
    let proof = v.proof;
    if (v.milestone === MAIN_MILESTONE_TAKE_THE_KEYS) {
      const rows = await ownershipOf(api, actor);
      const withChecklist = proofWithOwnership(v.proof, rows ?? [], TEXT_LIMITS.proof);
      if (withChecklist == null) throw new QuestError("text_too_long");
      proof = withChecklist;
    }
    const row = await api.call<SubmitRow>(
      "shift_quest_milestone_submit",
      actor,
      v.milestone,
      proof,
      v.reflection,
      v.artifactUrl
    );
    return submitted(row);
  });
}

/** Quest 5's checklist for the quest page, read-only (it is ticked in Discord). Null without a project. */
export async function loadOwnership(): Promise<IslandActionResult<OwnershipRow[] | null>> {
  return withReader("loadOwnership", noInput, undefined, async ({ actor }) => ownershipOf(questApi(), actor));
}

/** Start a main quest without sending anything yet, so it shows as the student's active quest. */
export async function startMainQuest(input: { milestone: number }): Promise<IslandActionResult<StartResult>> {
  return withReadyViewer("startMainQuest", startMainQuestSchema, input, async ({ actor }, v) => {
    return started(await questApi().call<StartRow>("shift_quest_milestone_start", actor, v.milestone));
  });
}

/** Resume one paused quest of the student's own, of any kind. */
export async function resumeQuest(input: { instanceId: string }): Promise<IslandActionResult<{ version: number }>> {
  return withReadyViewer("resumeQuest", resumeQuestSchema, input, async ({ actor }, v) => {
    const version = await questApi().call<number>("shift_quest_resume", actor, v.instanceId);
    return { version: Number(version) };
  });
}

export async function chooseSideQuest(input: { templateId: string }): Promise<IslandActionResult<StartResult>> {
  return withReadyViewer("chooseSideQuest", chooseSideQuestSchema, input, async ({ actor }, v) => {
    return started(await questApi().call<StartRow>("shift_quest_side_choose", actor, v.templateId));
  });
}

export async function submitSideQuest(input: {
  templateId: string;
  proof: string;
  reflection: string;
  artifactUrl?: string | null;
}): Promise<IslandActionResult<QuestSubmitResult>> {
  return withReadyViewer("submitSideQuest", submitSideQuestSchema, input, async ({ actor }, v) => {
    const row = await questApi().call<SubmitRow>(
      "shift_quest_side_submit",
      actor,
      v.templateId,
      v.proof,
      v.reflection,
      v.artifactUrl
    );
    return submitted(row);
  });
}

/** The student's own quest; a mentor agrees its scope in Discord. */
export async function proposeQuest(input: {
  title: string;
  goal: string;
  criteria: string;
  nextStep: string;
  why?: string | null;
}): Promise<IslandActionResult<{ instanceId: string }>> {
  return withReadyViewer("proposeQuest", proposeQuestSchema, input, async ({ actor }, v) => {
    const instanceId = await questApi().call<string>(
      "shift_quest_propose",
      actor,
      v.title,
      v.why,
      v.goal,
      v.criteria,
      v.nextStep
    );
    return { instanceId };
  });
}

export async function submitProposedQuest(input: {
  instanceId: string;
  version: number;
  proof: string;
  reflection: string;
  artifactUrl?: string | null;
}): Promise<IslandActionResult<QuestSubmitResult>> {
  return withReadyViewer("submitProposedQuest", submitProposedQuestSchema, input, async ({ actor }, v) => {
    // Visible to reviewers only, no contributors: the same submit the bot's milestone flow makes.
    const row = await questApi().call<{ revision: number | string }>(
      "shift_quest_submit",
      actor,
      v.instanceId,
      v.version,
      v.proof,
      v.reflection,
      v.artifactUrl,
      "reviewers",
      null,
      []
    );
    return { instanceId: v.instanceId, revision: Number(row.revision), created: false };
  });
}

/** "I'm stuck": a request to the community help room or the mentors' queue. Group spaces only, never a DM. */
export async function askForHelp(input: {
  summary: string;
  visibility: "community" | "mentors";
  instanceId?: string | null;
}): Promise<IslandActionResult<{ helpId: string }>> {
  return withReadyViewer("askForHelp", askForHelpSchema, input, async ({ actor }, v) => {
    const helpId = await questApi().call<string>(
      "shift_quest_help_create",
      actor,
      v.summary,
      v.visibility,
      "student",
      v.instanceId
    );
    return { helpId };
  });
}

// ---------------------------------------------------------------------------
// SHIFT canvas link and quest cards (wave 3)
//
// The quest project links to one SHIFT canvas on the whiteboard; the link is
// never trusted: every read and submit re-reads the canvas with the service
// role (only after resolveIslandViewer returned ready) and re-checks that the
// student owns it or is on its team (lib/supabase/shift-quests/canvas.ts). The
// browser sends ids, hashes, one line and one link; the server builds the
// card text itself and stores it through the existing submit functions.
// ---------------------------------------------------------------------------

/** shift_quest_canvas_get: the current project's link, or null. */
async function canvasLinkOf(api: QuestApi, actor: string): Promise<CanvasLinkRow | null> {
  const row = await api.call<CanvasLinkRow | null>("shift_quest_canvas_get", actor);
  if (!row || typeof row !== "object") return null;
  return typeof row.board_id === "string" && typeof row.frame_id === "string" && typeof row.canvas_project === "string"
    ? { board_id: row.board_id, frame_id: row.frame_id, canvas_project: row.canvas_project }
    : null;
}

/** Logs a whiteboard failure by step and code only (never note text or messages). */
function logCanvasFailure(action: string, error: unknown): void {
  const code = error instanceof canvas.CanvasReadError ? `${error.step} ${error.code}` : errorName(error);
  console.error(`[shift-island] ${action}: whiteboard read failed (${code})`);
}

function canvasUnavailable(action: string, error: unknown): QuestError {
  logCanvasFailure(action, error);
  return new QuestError("canvas_unavailable");
}

/**
 * The quest's template slug, from the server's own data: a main quest's from
 * its milestone, a side quest's from the caller's board. Proposed quests take
 * no notes.
 */
async function questSlug(api: QuestApi, actor: string, ref: BoardRef): Promise<string> {
  switch (ref.kind) {
    case "main":
      return MAIN_SLUGS[ref.milestone];
    case "side": {
      const board = await api.call<QuestBoard>("shift_quest_board", actor);
      const side = (Array.isArray(board?.side) ? board.side : []).find((s) => s.template_id === ref.templateId);
      if (!side) throw new QuestError("template_unavailable");
      return side.slug;
    }
    case "proposed":
      throw new QuestError("note_not_allowed");
  }
}

/** The student's own SHIFT canvases (owner or teammate), for the picker. Loads boards: call when it opens. */
export async function listMyCanvases(): Promise<IslandActionResult<CanvasChoice[]>> {
  return withReader("listMyCanvases", noInput, undefined, async ({ actor, userId }) => {
    const api = questApi();
    const [link, choices] = await Promise.all([
      canvasLinkOf(api, actor),
      canvas.listMyCanvases(userId, null).catch((error: unknown) => {
        throw canvasUnavailable("listMyCanvases", error);
      }),
    ]);
    return choices.map((c) => ({ ...c, linked: !!link && c.boardId === link.board_id && c.frameId === link.frame_id }));
  });
}

/** Links the quest project to one of the student's own canvases, with the project tag it has now. */
export async function linkCanvas(input: { boardId: string; frameId: string }): Promise<IslandActionResult> {
  return withReadyViewer("linkCanvas", linkCanvasSchema, input, async ({ actor, userId }, v) => {
    const checked = await canvas.checkCanvasForLink(userId, v.boardId, v.frameId).catch((error: unknown) => {
      throw canvasUnavailable("linkCanvas", error);
    });
    if (checked.verdict === "not_yours") throw new QuestError("canvas_not_yours");
    if (checked.verdict !== "ok" || !checked.project) throw new QuestError("canvas_gone");
    await questApi().call("shift_quest_canvas_link", actor, v.boardId, v.frameId, checked.project);
    return null;
  });
}

export async function unlinkCanvas(): Promise<IslandActionResult> {
  return withReadyViewer("unlinkCanvas", noInput, undefined, async ({ actor }) => {
    await questApi().call("shift_quest_canvas_unlink", actor);
    return null;
  });
}

/**
 * What one quest shows from the linked canvas. The slug only picks the guide
 * (the student's own notes either way); submitQuestCard resolves it itself.
 * A whiteboard failure is {state: "error"}, so the sheet still works.
 */
export async function loadQuestCanvas(input: {
  ref: BoardRef;
  slug: string | null;
}): Promise<IslandActionResult<QuestCanvasContext>> {
  return withReader("loadQuestCanvas", loadQuestCanvasSchema, input, async ({ actor, userId }, v): Promise<QuestCanvasContext> => {
    const guide = questGuideSpec({ kind: v.ref.kind, slug: v.slug });
    if (guide.zones.length === 0) return { state: "no_zones" };
    const link = await canvasLinkOf(questApi(), actor);
    if (!link) return { state: "unlinked" };
    try {
      const read = await canvas.readLinkedCanvas(userId, link);
      if (read.state === "not_yours") return { state: "not_yours" };
      if (read.state === "gone") return { state: "gone", candidates: read.candidates };
      const { context, hints, notes } = buildContext(guide, read.summary, read.elements, read.frameId, read.access);
      return {
        state: "ready",
        canvas: { title: read.title, boardTitle: read.boardTitle, lastEdited: read.lastEdited },
        context,
        hints,
        notes,
      };
    } catch (error) {
      logCanvasFailure("loadQuestCanvas", error);
      return { state: "error" };
    }
  });
}

/**
 * Sends a quest card: the chosen notes' text, re-read from the canvas and
 * snapshotted into the submission (so it cannot change after review), plus an
 * optional line and link, through the existing submit functions. Refuses
 * canvas_unlinked, canvas_gone, canvas_not_yours, note_not_allowed (a note
 * from a zone this quest does not use, a note by someone outside the canvas
 * team, or a quest without zones) and
 * notes_changed (a note edited, re-versioned or removed since the card was
 * built). `version` is accepted for the contract; the main and side submit
 * functions take none.
 */
export async function submitQuestCard(input: {
  ref: BoardRef;
  slug: string | null;
  version?: number | null;
  notes: { id: string; hash: string }[];
  line?: string | null;
  link?: string | null;
}): Promise<IslandActionResult<QuestSubmitResult>> {
  return withReadyViewer("submitQuestCard", submitQuestCardSchema, input, async ({ actor, userId }, v) => {
    const api = questApi();
    const slug = await questSlug(api, actor, v.ref);
    const guide = questGuideSpec({ kind: v.ref.kind, slug });
    if (guide.zones.length === 0) throw new QuestError("note_not_allowed");

    const link = await canvasLinkOf(api, actor);
    if (!link) throw new QuestError("canvas_unlinked");
    const read = await canvas.readLinkedCanvas(userId, link).catch((error: unknown) => {
      throw canvasUnavailable("submitQuestCard", error);
    });
    if (read.state === "not_yours") throw new QuestError("canvas_not_yours");
    if (read.state === "gone") throw new QuestError("canvas_gone");

    // Every written note in the canvas's zones, then the asked ones checked against it.
    const all = canvasNotes(read.summary, read.elements, read.frameId, read.access);
    const byId = new Map(all.map((n) => [n.id, n]));
    for (const asked of v.notes) {
      const note = byId.get(asked.id);
      if (!note) throw new QuestError("notes_changed");
      if (!guide.zones.includes(note.kind)) throw new QuestError("note_not_allowed");
      // Someone else's words (outside the canvas team) are never the student's evidence.
      if (!note.byTeam) throw new QuestError("note_not_allowed");
    }
    if (v.notes.some((asked) => byId.get(asked.id)!.hash !== asked.hash)) throw new QuestError("notes_changed");

    const chosen = pickNotes(all, v.notes.map((n) => n.id));
    const evidence = buildSnapshot(read.title, chosen).text;
    const reflection = v.line ?? CARD_REFLECTION_FALLBACK;
    const ref = v.ref;
    if (ref.kind === "main") {
      return submitted(
        await api.call<SubmitRow>("shift_quest_milestone_submit", actor, ref.milestone, evidence, reflection, v.link)
      );
    }
    if (ref.kind === "side") {
      return submitted(
        await api.call<SubmitRow>("shift_quest_side_submit", actor, ref.templateId, evidence, reflection, v.link)
      );
    }
    throw new QuestError("note_not_allowed");
  });
}
