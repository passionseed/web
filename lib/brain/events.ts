import { createAdminClient } from "@/utils/supabase/admin";

import { parseBrainEvent, type BrainEvent } from "./schema";

export type { BrainEvent, BrainEventType, StoredBrainEvent } from "./schema";

/**
 * Records an app event in the `brain_events` outbox for the brain-sync cron.
 * Validates against the allowlist (unknown keys are stripped) and never
 * throws: a failure here must not break the admin action that called it.
 */
export async function recordBrainEvent(event: BrainEvent, source?: string): Promise<void> {
  try {
    const parsed = parseBrainEvent(event);
    if (!parsed) {
      console.warn("[brain events] rejected event:", event?.type);
      return;
    }
    const { error } = await createAdminClient()
      .from("brain_events")
      .insert({ type: parsed.type, payload: parsed.payload, source: source ?? null });
    if (error) console.error("[brain events] insert failed:", error.message);
  } catch (error) {
    console.error("[brain events] failed:", error);
  }
}

/** Looks up a SHIFT round's number, for actions whose result has only the id. */
export async function shiftRoundNumber(roundId: string): Promise<number | null> {
  try {
    const { data } = await createAdminClient()
      .from("shift_rounds")
      .select("number")
      .eq("id", roundId)
      .maybeSingle();
    return typeof data?.number === "number" ? data.number : null;
  } catch {
    return null;
  }
}

/** Bangkok calendar date (YYYY-MM-DD) of a timestamp. */
export function bangkokDate(value: string | Date): string | undefined {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}
