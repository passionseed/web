import { createAdminClient } from "@/utils/supabase/admin";

/** Gives up on an event after this many failed pushes. */
export const MAX_ATTEMPTS = 5;

export interface OutboxRow {
  id: string;
  type: string;
  payload: unknown;
  created_at: string;
  attempts: number | null;
}

/** Unsent events that still have attempts left, oldest first. */
export async function loadUnsentBrainEvents(limit: number): Promise<OutboxRow[]> {
  const { data, error } = await createAdminClient()
    .from("brain_events")
    .select("id, type, payload, created_at, attempts")
    .is("sent_at", null)
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`load brain_events failed: ${error.message}`);
  return (data ?? []) as OutboxRow[];
}

export async function markBrainEventsSent(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await createAdminClient()
    .from("brain_events")
    .update({ sent_at: new Date().toISOString(), last_error: null })
    .in("id", ids);
  if (error) throw new Error(`mark brain_events sent failed: ${error.message}`);
}

/** Records a failure. `giveUp` jumps straight to MAX_ATTEMPTS (bad data, PII). */
export async function markBrainEventFailed(
  row: OutboxRow,
  message: string,
  giveUp = false,
): Promise<void> {
  const attempts = giveUp ? MAX_ATTEMPTS : (row.attempts ?? 0) + 1;
  const { error } = await createAdminClient()
    .from("brain_events")
    .update({ attempts, last_error: message.slice(0, 500) })
    .eq("id", row.id);
  if (error) console.error("[brain sync] could not record failure:", error.message);
}
