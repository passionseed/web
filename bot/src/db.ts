import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { BotEnv } from "./env";

/**
 * Service-role client. The bot is the only writer of voice sessions and
 * reminder logs, and every function it calls is granted to `service_role`
 * alone — see `20260801000000_projectseed_bot_rpcs.sql` for why the web app's
 * equivalents cannot be reused.
 */
export function createDb(env: Pick<BotEnv, "supabaseUrl" | "supabaseServiceKey">): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface DueReminder {
  participant_id: string;
  discord_user_id: string | null;
  display_name: string | null;
  slot_start_at: string;
  day_of_week: number;
  hour_of_day: number;
  participant_count: number;
  wants_dm: boolean;
  wants_channel: boolean;
}

export interface DiscordUserStats {
  participant_id: string;
  display_name: string | null;
  project_title: string | null;
  tags: string[];
  planned_slots: number;
  recorded_seconds: number;
  session_count: number;
  kept_slot_count: number;
  last_seen_at: string | null;
}

export async function resolveCohortId(
  db: SupabaseClient,
  slug: string
): Promise<string> {
  const { data, error } = await db
    .from("pseed_cohorts")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`Failed to resolve cohort: ${error.message}`);
  if (!data) throw new Error(`No active cohort with slug "${slug}"`);
  return data.id as string;
}

export async function voiceJoin(
  db: SupabaseClient,
  cohortId: string,
  discordUserId: string,
  channelId: string
): Promise<void> {
  const { error } = await db.rpc("pseed_voice_join", {
    p_cohort_id: cohortId,
    p_discord_user_id: discordUserId,
    p_channel_id: channelId,
  });
  if (error) console.error("[voice] join failed:", error.message);
}

export async function voiceLeave(
  db: SupabaseClient,
  discordUserId: string
): Promise<void> {
  const { error } = await db.rpc("pseed_voice_leave", {
    p_discord_user_id: discordUserId,
  });
  if (error) console.error("[voice] leave failed:", error.message);
}

export async function closeAllVoiceSessions(
  db: SupabaseClient,
  cohortId: string
): Promise<number> {
  const { data, error } = await db.rpc("pseed_voice_close_all", {
    p_cohort_id: cohortId,
  });
  if (error) {
    console.error("[voice] close-all failed:", error.message);
    return 0;
  }
  return (data as number) ?? 0;
}

export async function fetchDueReminders(
  db: SupabaseClient,
  cohortId: string
): Promise<DueReminder[]> {
  const { data, error } = await db.rpc("pseed_due_reminders", {
    p_cohort_id: cohortId,
  });
  if (error) {
    console.error("[reminders] query failed:", error.message);
    return [];
  }
  return (data as DueReminder[]) ?? [];
}

export async function logReminder(
  db: SupabaseClient,
  participantId: string,
  slotStartAt: string,
  channel: "dm" | "channel"
): Promise<void> {
  const { error } = await db.rpc("pseed_log_reminder", {
    p_participant_id: participantId,
    p_slot_start_at: slotStartAt,
    p_channel: channel,
  });
  if (error) console.error("[reminders] log failed:", error.message);
}

export async function fetchStats(
  db: SupabaseClient,
  cohortId: string,
  discordUserId: string
): Promise<DiscordUserStats | null> {
  const { data, error } = await db.rpc("pseed_stats_for_discord_user", {
    p_cohort_id: cohortId,
    p_discord_user_id: discordUserId,
  });

  if (error) {
    console.error("[stats] query failed:", error.message);
    return null;
  }
  return (data as DiscordUserStats[])?.[0] ?? null;
}
