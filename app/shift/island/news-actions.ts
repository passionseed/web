"use server";

/**
 * Staff controls for the AI island news (ข่าวเกาะ) on /shift/island. The
 * database decides who is staff (reviewer or admin, shift_quest_digest_hide
 * refuses everyone else with not_authorized); the client never sends an
 * actor. On success the page refreshes, so the news sheet and plot cards
 * show the change in the same response.
 */

import { z } from "zod";

import { questApi } from "@/lib/supabase/shift-quests/db";
import type { IslandActionResult } from "@/lib/supabase/shift-quests/types";

import { withReadyViewer } from "./gate";

const hideTeamNewsSchema = z.object({
  slot: z.number().int().min(1).max(999),
  hidden: z.boolean(),
  reason: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((r) => (r ? r : null)),
});

/** Hides a team's AI summary from the island and the Discord digest, or shows it again. */
export async function hideTeamNews(input: { slot: number; hidden: boolean; reason?: string | null }): Promise<IslandActionResult<null>> {
  return withReadyViewer("hideTeamNews", hideTeamNewsSchema, input, async ({ actor }, { slot, hidden, reason }) => {
    await questApi().call("shift_quest_digest_hide", actor, slot, hidden, reason);
    return null;
  });
}
