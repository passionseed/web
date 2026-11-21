"use server";

/**
 * Admin-only actions on /shift/island. An admin resets their own island
 * progress, to replay onboarding and the quests from the start (testing
 * only), and reads the come-back report (schema 23): counts and nameless
 * lines, with an audited reveal of one line's writer for a safeguarding
 * concern. The database decides who is an admin (it refuses everyone else,
 * reviewers included) and only ever touches the caller's own rows; the
 * client never sends an actor. A reset refreshes the page; the client reloads
 * after clearing its own island keys. The report and the reveal never refresh.
 */

import { z } from "zod";

import { awayReportFrom, revealAwaySchema, revealedNameOf } from "@/lib/supabase/shift-quests/away";
import { VOICE_NAME_FALLBACK } from "@/lib/supabase/shift-quests/campfire";
import { questApi } from "@/lib/supabase/shift-quests/db";
import type { AwayReport } from "@/lib/supabase/shift-quests/playerTypes";
import type { IslandActionResult } from "@/lib/supabase/shift-quests/types";

import { withReader, withReadyViewer } from "./gate";

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

/**
 * The come-back report for admins (shift_quest_admin_away): consent, who is
 * away now, the DMs and the answers as counts ("1-2" for one or two), and the
 * lines of the last 90 days without names, by week. Null when the database
 * answered something else. A read: never refreshes.
 */
export async function loadAwayReport(): Promise<IslandActionResult<AwayReport | null>> {
  return withReader("loadAwayReport", resetSchema, {}, async ({ actor }) =>
    awayReportFrom(await questApi().call<unknown>("shift_quest_admin_away", actor)),
  );
}

/**
 * Who wrote one line, for a safeguarding concern only. The database audits
 * every reveal ('away_reveal', with the answer's id) and refuses everyone but
 * an admin. Nothing on the page changes, so it never refreshes.
 */
export async function revealAwayAnswer(id: string): Promise<IslandActionResult<{ name: string }>> {
  return withReader("revealAwayAnswer", revealAwaySchema, { id }, async ({ actor }, v) => {
    const name = revealedNameOf(await questApi().call<unknown>("shift_quest_admin_away_reveal", actor, v.id));
    // The island's fallback name when the database names nobody, as for a voice name.
    return { name: name ?? VOICE_NAME_FALLBACK };
  });
}
