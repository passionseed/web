import type { SupabaseClient } from "@supabase/supabase-js";

import { bangkokToday } from "@/lib/content/shift-cohort";
import {
  MAX_RANGES,
  addDays,
  distinctWindows,
  mergeRanges,
  pickBounds,
  windowDemand,
  type DateRange,
  type ShiftInterest,
  type WindowDemand,
} from "@/lib/shift/interest";

/**
 * Server-only reads and writes for shift_interest. Callers pass the
 * service-role client: the table has RLS on and no policies.
 */

export interface ShiftInterestRow {
  id: string;
  ig_handle: string;
  nickname: string;
  stage: string;
  email: string | null;
  problem: string | null;
  free_ranges: DateRange[];
  source: string | null;
  status: "waiting" | "invited" | "confirmed" | "declined";
  round_number: number | null;
  submissions: number;
  created_at: string;
  updated_at: string;
}

const UNIQUE_VIOLATION = "23505";

/**
 * One row per IG handle. The form has no login, so a repeat submission
 * cannot prove it comes from the same person: it may only add free dates
 * to the existing row. Contact details, nickname and problem are never
 * overwritten by an anonymous request. Returns whether a row already existed
 * (for the staff notification only; never send it back to the client).
 */
export async function saveShiftInterest(
  supabase: SupabaseClient,
  interest: ShiftInterest,
): Promise<{ existed: boolean }> {
  const addRanges = async () => {
    const { data: existing, error: readError } = await supabase
      .from("shift_interest")
      .select("id, submissions, free_ranges")
      .eq("ig_handle", interest.igHandle)
      .maybeSingle();
    if (readError) throw readError;
    if (!existing) return false;
    const merged = mergeRanges([...(existing.free_ranges as DateRange[]), ...interest.freeRanges]);
    // Past the cap, keep what was there rather than drop someone's dates.
    if (merged.length > MAX_RANGES) return true;
    const { error } = await supabase
      .from("shift_interest")
      .update({
        free_ranges: merged,
        submissions: existing.submissions + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
    return true;
  };

  if (await addRanges()) return { existed: true };

  const { error } = await supabase.from("shift_interest").insert({
    ig_handle: interest.igHandle,
    nickname: interest.nickname,
    stage: interest.stage,
    email: interest.email,
    problem: interest.problem,
    free_ranges: interest.freeRanges,
    committed: interest.committed,
    consent: interest.consent,
    source: interest.source,
  });
  if (!error) return { existed: false };
  // Two submissions raced; the other one inserted first.
  if (error.code === UNIQUE_VIOLATION && (await addRanges())) return { existed: true };
  throw error;
}

export async function listShiftInterest(supabase: SupabaseClient): Promise<ShiftInterestRow[]> {
  const { data, error } = await supabase
    .from("shift_interest")
    .select("id, ig_handle, nickname, stage, email, problem, free_ranges, source, status, round_number, submissions, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ShiftInterestRow[];
}

/** Windows from the earliest day anyone could still start, for people still waiting. */
export function demandFor(rows: readonly ShiftInterestRow[], today = bangkokToday()): WindowDemand[] {
  const waiting = rows.filter((row) => row.status === "waiting" || row.status === "invited");
  // Staff read this to plan, so count from tomorrow, not from the pick lead.
  const bounds = { start: addDays(today, 1), end: pickBounds(today).end };
  return windowDemand(waiting.map((row) => row.free_ranges), bounds);
}

export function topWindows(rows: readonly ShiftInterestRow[], limit = 5): WindowDemand[] {
  return distinctWindows(demandFor(rows), limit);
}
