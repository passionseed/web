"use server";

/**
 * An admin resets their own island progress on /shift/island, to replay
 * onboarding and the quests from the start (testing only). The database
 * decides who is an admin (shift_quest_admin_reset_self refuses everyone
 * else with not_authorized) and only ever touches the caller's own rows; the
 * client never sends an actor. On success the page refreshes; the client
 * reloads after clearing its own island keys.
 */

import { z } from "zod";

import { questApi } from "@/lib/supabase/shift-quests/db";
import type { IslandActionResult } from "@/lib/supabase/shift-quests/types";

import { withReadyViewer } from "./gate";

/** What the reset did, as the database answers it. */
export interface AdminResetResult {
  project: "archived" | "shared" | "none";
  quests: number;
  keptQuests: number;
}

const resetSchema = z.object({}).strict();

function normalize(raw: unknown): AdminResetResult {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const project = r.project === "archived" || r.project === "shared" ? r.project : "none";
  return { project, quests: Number(r.quests) || 0, keptQuests: Number(r.kept_quests) || 0 };
}

/** Resets the signed-in admin's own quests, journal and (when they are alone on it) project. */
export async function resetMyIsland(): Promise<IslandActionResult<AdminResetResult>> {
  return withReadyViewer("resetMyIsland", resetSchema, {}, async ({ actor }) =>
    normalize(await questApi().call("shift_quest_admin_reset_self", actor)),
  );
}
