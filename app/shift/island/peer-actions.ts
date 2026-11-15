"use server";

/**
 * The peer check on /shift/island (schema 15,
 * 20261115140000_shift_quest_peer_check). Feedback only: a peer ticks the
 * done-when items they think are met and leaves one line; a mentor still
 * decides and only a mentor's approval grows the tree. Every rule is in the
 * database (who is a peer, consent, one check per peer, ten a day, who reads
 * the checks); these actions re-derive the caller from the session through
 * the shared gate (./gate.ts) and never refresh the page (a sheet is open).
 * Logs carry codes only, never a student's words.
 */

import { refresh } from "next/cache";
import { z } from "zod";

import { QuestDbError, QuestError } from "@/bot/src/quests/api";
import { questApi } from "@/lib/supabase/shift-quests/db";
import { questErrorText } from "@/lib/supabase/shift-quests/errors";
import { listFrom, peerAvailable, queueFrom, viewFrom } from "@/lib/supabase/shift-quests/peer";
import type { PeerList, PeerQueueItem, PeerView } from "@/lib/supabase/shift-quests/peerTypes";
import type { IslandActionResult } from "@/lib/supabase/shift-quests/types";
import {
  hidePeerCheckSchema,
  loadPeerCheckSchema,
  loadPeerChecksSchema,
  sendPeerCheckSchema,
  setPeerOpenSchema,
} from "@/lib/supabase/shift-quests/validate";
import { resolveIslandViewer } from "@/lib/supabase/shift-quests/viewer";

import { errorName, failure, withReader } from "./gate";

/** The queue takes no input; anything a client sends is ignored. */
const noInput = z.unknown().transform(() => null);

/** What the caller can check now, oldest first (none on an older database). */
export async function loadPeerQueue(): Promise<IslandActionResult<PeerQueueItem[]>> {
  return withReader("loadPeerQueue", noInput, undefined, async ({ actor }) => {
    const api = questApi();
    if (!(await peerAvailable(api))) return [];
    return queueFrom(await api.call<unknown>("shift_quest_peer_queue", actor));
  });
}

/** One submission as a peer sees it: the quest, the work and its photos, no name, no team. */
export async function loadPeerCheck(input: { submissionId: string }): Promise<IslandActionResult<PeerView>> {
  return withReader("loadPeerCheck", loadPeerCheckSchema, input, async ({ actor }, v) => {
    const api = questApi();
    if (!(await peerAvailable(api))) throw new QuestError("feature_unavailable");
    const view = await viewFrom(await api.call<unknown>("shift_quest_peer_view", actor, v.submissionId));
    if (!view) throw new QuestError("not_found");
    return view;
  });
}

/** The caller's check: ticked item ids and one line. The database refuses a second one, a decided one, the eleventh today. */
export async function sendPeerCheck(input: {
  submissionId: string;
  ticked: string[];
  line: string;
}): Promise<IslandActionResult<{ id: string }>> {
  return withReader("sendPeerCheck", sendPeerCheckSchema, input, async ({ actor }, v) => {
    const api = questApi();
    if (!(await peerAvailable(api))) throw new QuestError("feature_unavailable");
    const row = await api.call<{ id: string }>("shift_quest_peer_check", actor, v.submissionId, v.ticked, v.line);
    return { id: row.id };
  });
}

/** The peer checks of one quest's latest submission, for its team (null for anyone else or an older database). */
export async function loadPeerChecks(input: { instanceId: string }): Promise<IslandActionResult<PeerList | null>> {
  return withReader("loadPeerChecks", loadPeerChecksSchema, input, async ({ actor }, v) => {
    const api = questApi();
    if (!(await peerAvailable(api))) return null;
    return listFrom(await api.call<unknown>("shift_quest_peer_list", actor, v.instanceId));
  });
}

/** Opens (or closes) the caller's own pending submission to peers. The written form calls it right after a send. */
export async function setPeerOpen(input: { submissionId: string; open: boolean }): Promise<IslandActionResult<{ open: boolean }>> {
  return withReader("setPeerOpen", setPeerOpenSchema, input, async ({ actor }, v) => {
    const api = questApi();
    if (!(await peerAvailable(api))) throw new QuestError("feature_unavailable");
    const row = await api.call<{ peer_open: boolean }>("shift_quest_peer_open", actor, v.submissionId, v.open);
    return { open: row.peer_open === true };
  });
}

/**
 * A mentor hides (or shows again) one peer check, from the web review page.
 * Reviewers who never ran /start still review, so this takes a started or
 * not-started viewer; the database refuses anyone who is not a reviewer or
 * admin. Refreshes the review page on success.
 */
export async function hidePeerCheck(input: { checkId: string; hide: boolean }): Promise<IslandActionResult<{ hidden: boolean }>> {
  const parsed = hidePeerCheckSchema.safeParse(input);
  if (!parsed.success) return failure("invalid_input");
  const viewer = await resolveIslandViewer();
  if (viewer.state !== "ready" && viewer.state !== "not_started") return failure("not_authorized");
  try {
    const row = await questApi().call<{ hidden: boolean }>("shift_quest_peer_hide", viewer.actor, parsed.data.checkId, parsed.data.hide);
    refresh();
    return { ok: true, data: { hidden: row.hidden === true } };
  } catch (error) {
    if (error instanceof QuestError) return { ok: false, code: error.code, error: questErrorText(error.code) };
    console.error(
      `[shift-island] hidePeerCheck failed (${error instanceof QuestDbError ? `SQLSTATE ${error.sqlstate}` : errorName(error)})`,
    );
    return failure("unknown");
  }
}

