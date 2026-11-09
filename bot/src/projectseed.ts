import type { Client } from "discord.js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { BotEnv } from "./env";
import { closeAllVoiceSessions, resolveCohortId } from "./db";
import { registerVoiceTracking, reconcileVoiceState } from "./voice";
import { startReminderLoop } from "./reminders";
import { registerDmGuard } from "./dm-guard";
import { registerInteractions } from "./commands";

/** ProjectSeed: voice hours, slot reminders, the DM guard and /stats. */
export async function startProjectSeed(
  client: Client,
  db: SupabaseClient,
  env: BotEnv
): Promise<{ stop: () => Promise<void> }> {
  const cohortId = await resolveCohortId(db, env.cohortSlug);
  console.log(`[projectseed] cohort ${env.cohortSlug} (${cohortId})`);

  registerVoiceTracking(client, db, env, cohortId);
  registerDmGuard(client);
  registerInteractions(client, db, cohortId);

  let reminderTimer: NodeJS.Timeout | null = null;

  client.once("clientReady", async () => {
    try {
      await reconcileVoiceState(client, db, env, cohortId);
    } catch (error) {
      console.error("[projectseed] voice reconcile failed:", error);
    }

    reminderTimer = startReminderLoop(client, db, env, cohortId);
    console.log(`[projectseed] reminder loop running every ${env.reminderIntervalMs}ms`);
  });

  return {
    async stop() {
      if (reminderTimer) clearInterval(reminderTimer);
      // Close open sessions on the way out. Without this every session stays
      // open until the next startup reconcile, and a redeploy would bank the
      // gap as time somebody spent in voice.
      await closeAllVoiceSessions(db, cohortId);
    },
  };
}
