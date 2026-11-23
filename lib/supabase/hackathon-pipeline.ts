import { createAdminClient } from "@/utils/supabase/admin";
import {
  buildPipelineWrite,
  clearsOpenPlanProblem,
  patchClearsPlan,
  type PipelineCreateInput,
  type PipelineItem,
  type PipelineUpdateInput,
} from "@/lib/hackathon/elemental/pipeline";
import { splitDuplicates } from "@/lib/hackathon/elemental/pipeline-paste";

/**
 * The hackathon sponsor / partner / speaker pipeline (hackathon_pipeline).
 * Every call uses the service role; the admin page and API routes call
 * requireAdmin() first.
 */

export const PIPELINE_MIGRATION = "20261121150000_hackathon_pipeline.sql";

const COLUMNS =
  "id, event_slug, kind, name, organisation, element, stage, owner, amount_thb, why_fit, reach, next_step, next_step_due, notes, position, in_kind, stage_changed_at, last_touched_at, updated_by, created_at, updated_at";

/** The table is missing: the migration has not been applied yet. */
export class PipelineNotSetUpError extends Error {
  constructor(message = `hackathon_pipeline is missing; apply ${PIPELINE_MIGRATION}`) {
    super(message);
    this.name = "PipelineNotSetUpError";
  }
}

/** The change breaks a pipeline rule that needs the current row to check (answered as 400). */
export class PipelineRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineRuleError";
  }
}

type DbError = { code?: string; message?: string } | null;

function check(error: DbError): void {
  if (!error) return;
  // 42P01 from Postgres, PGRST205 from PostgREST's schema cache.
  if (error.code === "42P01" || error.code === "PGRST205") throw new PipelineNotSetUpError();
  throw error;
}

export async function listPipeline(eventSlug: string): Promise<PipelineItem[]> {
  const { data, error } = await createAdminClient()
    .from("hackathon_pipeline")
    .select(COLUMNS)
    .eq("event_slug", eventSlug)
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(2000);
  check(error);
  return (data ?? []) as PipelineItem[];
}

export async function createPipelineItem(
  eventSlug: string,
  input: PipelineCreateInput,
  userId: string,
): Promise<PipelineItem> {
  const { data, error } = await createAdminClient()
    .from("hackathon_pipeline")
    .insert({ ...input, event_slug: eventSlug, created_by: userId })
    .select(COLUMNS)
    .single();
  check(error);
  return data as PipelineItem;
}

/**
 * Add many rows at once. Rows whose name and kind are already on the board
 * (trimmed, any case), and repeats inside the list, are skipped and counted.
 */
export async function importPipelineItems(
  eventSlug: string,
  rows: PipelineCreateInput[],
  userId: string,
): Promise<{ items: PipelineItem[]; skipped: number }> {
  const db = createAdminClient();
  const { data: existing, error: readError } = await db
    .from("hackathon_pipeline")
    .select("name, kind")
    .eq("event_slug", eventSlug)
    .limit(5000);
  check(readError);
  const { fresh, duplicates } = splitDuplicates(rows, (existing ?? []) as Pick<PipelineItem, "name" | "kind">[]);
  if (fresh.length === 0) return { items: [], skipped: duplicates.length };

  const { data, error } = await db
    .from("hackathon_pipeline")
    .insert(fresh.map((r) => ({ ...r, event_slug: eventSlug, created_by: userId })))
    .select(COLUMNS);
  check(error);
  return { items: (data ?? []) as PipelineItem[], skipped: duplicates.length };
}

type CurrentRow = Pick<PipelineItem, "stage" | "notes" | "next_step" | "next_step_due">;

/**
 * Returns null when no row has that id. Reads the row first when the stage,
 * the notes or the plan depend on it, so stage_changed_at moves only on a
 * real change, a reason is appended to the notes, never written over them,
 * and an open conversation never loses its next step (PipelineRuleError).
 */
export async function updatePipelineItem(
  eventSlug: string,
  id: string,
  patch: PipelineUpdateInput,
): Promise<PipelineItem | null> {
  const db = createAdminClient();
  let current: CurrentRow | null = null;
  if (patch.stage || patch.append_note || patchClearsPlan(patch)) {
    const { data, error } = await db
      .from("hackathon_pipeline")
      .select("stage, notes, next_step, next_step_due")
      .eq("id", id)
      .eq("event_slug", eventSlug)
      .maybeSingle();
    check(error);
    if (!data) return null;
    current = data as CurrentRow;
    const problem = clearsOpenPlanProblem(current, patch);
    if (problem) throw new PipelineRuleError(problem);
  }

  const { data, error } = await db
    .from("hackathon_pipeline")
    .update(buildPipelineWrite(current, patch, new Date()))
    .eq("id", id)
    .eq("event_slug", eventSlug)
    .select(COLUMNS)
    .maybeSingle();
  check(error);
  return (data as PipelineItem | null) ?? null;
}

/** Returns false when no row has that id. */
export async function deletePipelineItem(eventSlug: string, id: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("hackathon_pipeline")
    .delete()
    .eq("id", id)
    .eq("event_slug", eventSlug)
    .select("id");
  check(error);
  return Boolean(data && data.length > 0);
}
