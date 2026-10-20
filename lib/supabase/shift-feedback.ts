import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Reads end-of-round SHIFT feedback for /admin/shift/feedback. The table is
 * admin-only under RLS and holds minors' answers, so only call this behind
 * the admin layout.
 */

export interface ShiftFeedbackRow {
  id: string;
  cohort: string;
  created_at: string;
  nickname: string;
  satisfaction: number;
  confidence: number;
  ownership: number;
  recommend: number;
  can_do_now: string;
  own_decision: string;
  motivation: string;
  most_valuable: string;
  change_next: string;
  price_fit: string;
  payer: string;
  next_steps: string[];
  /** Null on rows from before the alumni ask (2026-10-14). */
  continue_project: string | null;
  continue_project_note: string | null;
  available_days: string[] | null;
  /** Null on rows from before the community sign-up (2026-10-20). */
  community_signup: string | null;
  quote_mode: string | null;
  quote_name: string | null;
}

const COLUMNS =
  "id, cohort, created_at, nickname, satisfaction, confidence, ownership, recommend, can_do_now, own_decision, motivation, most_valuable, change_next, price_fit, payer, next_steps, continue_project, continue_project_note, available_days, quote_mode, quote_name";
/** Added by 20261020130000; read separately so the page still loads before it is applied. */
const COMMUNITY_COLUMN = "community_signup";

/** Newest first. Pass a cohort name ("SHIFT[1]") to keep one round. */
export async function listShiftFeedback(cohort?: string): Promise<ShiftFeedbackRow[]> {
  const select = (columns: string) => {
    const query = createAdminClient()
      .from("shift_feedback")
      .select(columns)
      .order("created_at", { ascending: false });
    return cohort ? query.eq("cohort", cohort) : query;
  };

  let { data, error } = await select(`${COLUMNS}, ${COMMUNITY_COLUMN}`);
  // 42703: column missing because the migration is not applied yet.
  if (error?.code === "42703") ({ data, error } = await select(COLUMNS));
  if (error) throw error;
  return ((data ?? []) as unknown as ShiftFeedbackRow[]).map((row) => ({
    ...row,
    community_signup: row.community_signup ?? null,
  }));
}
