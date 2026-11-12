import { createAdminClient } from "@/utils/supabase/admin";
import type { VoiceRosterStudent, VoiceSpanRow } from "@/lib/shift/voiceSummary";
import type { VoiceWindow } from "@/lib/shift/voiceWindow";

/**
 * Reads SHIFT voice participation for /admin/shift/voice. Minors' behavioural
 * data: service-role reads, so only call this behind requireAdmin().
 */

const PAGE = 1000;

/** Thrown when the table is missing because the migration is not applied yet. */
export class ShiftVoiceNotSetUpError extends Error {}

/** Non-declined applications for a round, as the expected roster. */
export async function loadShiftVoiceRoster(cohort: string): Promise<VoiceRosterStudent[]> {
  const { data, error } = await createAdminClient()
    .from("shift_applications")
    .select("id, nickname, full_name, discord_user_id, paid_at")
    .eq("cohort", cohort)
    .neq("status", "declined")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    applicationId: row.id as string,
    name: ((row.nickname as string | null)?.trim() || (row.full_name as string | null)?.trim() || "Unnamed") as string,
    discordUserId: (row.discord_user_id as string | null) ?? null,
    paid: Boolean(row.paid_at),
  }));
}

/** Every span of the round that overlaps the window, oldest first. */
export async function listShiftVoiceSpans(cohort: string, window: VoiceWindow): Promise<VoiceSpanRow[]> {
  const db = createAdminClient();
  const rows: VoiceSpanRow[] = [];

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db
      .from("shift_voice_spans")
      .select("discord_user_id, display_name, started_at, seen_at, ended_at, mic_open, streaming, camera, is_join")
      .eq("cohort", cohort)
      .lt("started_at", window.to.toISOString())
      // seen_at is every row's end, open or closed.
      .gt("seen_at", window.from.toISOString())
      .order("started_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) {
      // 42P01 from Postgres, PGRST205 from PostgREST's schema cache.
      if (error.code === "42P01" || error.code === "PGRST205") throw new ShiftVoiceNotSetUpError(error.message);
      throw error;
    }
    rows.push(...((data ?? []) as VoiceSpanRow[]));
    if (!data || data.length < PAGE) return rows;
  }
}
