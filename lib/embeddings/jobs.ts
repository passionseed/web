import { createAdminClient } from "@/utils/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EmbedJobStatus = "pending" | "processing" | "completed" | "failed";
export type TriggerSource = "submission" | "review" | "backfill" | "manual";

export interface EmbedJob {
  id: string;
  team_id: string;
  status: EmbedJobStatus;
  trigger_source: TriggerSource;
  attempts: number;
  max_attempts: number;
  error: string | null;
  scheduled_at: string;
  processing_started_at: string | null;
  processed_by: string | null;
  completed_at: string | null;
}

const PROCESSOR_ID = `embed-processor-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
const MAX_PROCESSING_MS = 5 * 60 * 1000;

export async function enqueueEmbedJob(
  teamId: string,
  triggerSource: TriggerSource = "submission",
  adminClient?: SupabaseClient
): Promise<string> {
  const admin = adminClient ?? createAdminClient();

  await admin
    .from("team_direction_embed_jobs")
    .update({ status: "failed", error: "superseded by newer job" })
    .eq("team_id", teamId)
    .eq("status", "pending");

  const { data, error } = await admin
    .from("team_direction_embed_jobs")
    .insert({
      team_id: teamId,
      trigger_source: triggerSource,
      status: "pending",
      scheduled_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[enqueueEmbedJob] Supabase error:", JSON.stringify(error, null, 2));
    throw new Error(
      `Failed to enqueue embed job for team ${teamId}: ${error.message ?? JSON.stringify(error)}`
    );
  }
  return data.id as string;
}

export async function claimJob(
  jobId: string,
  adminClient?: SupabaseClient
): Promise<boolean> {
  const admin = adminClient ?? createAdminClient();

  const { data, error } = await admin
    .from("team_direction_embed_jobs")
    .update({
      status: "processing",
      processing_started_at: new Date().toISOString(),
      processed_by: PROCESSOR_ID,
      error: null,
    })
    .eq("id", jobId)
    .eq("status", "pending")
    .select("id");

  if (error) throw error;
  return Boolean(data && data.length > 0);
}

export async function completeJob(
  jobId: string,
  adminClient?: SupabaseClient
): Promise<void> {
  const admin = adminClient ?? createAdminClient();

  const { error } = await admin
    .from("team_direction_embed_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      processing_started_at: null,
      processed_by: null,
      error: null,
    })
    .eq("id", jobId)
    .eq("status", "processing");

  if (error) throw error;
}

export async function failJob(
  jobId: string,
  errorMessage: string,
  adminClient?: SupabaseClient
): Promise<void> {
  const admin = adminClient ?? createAdminClient();
  const safeError = errorMessage.slice(0, 1200);

  const { data: current } = await admin
    .from("team_direction_embed_jobs")
    .select("attempts")
    .eq("id", jobId)
    .single();

  const { error } = await admin
    .from("team_direction_embed_jobs")
    .update({
      status: "failed",
      attempts: (current?.attempts ?? 0) + 1,
      error: safeError,
      processing_started_at: null,
      processed_by: null,
    })
    .eq("id", jobId)
    .eq("status", "processing");

  if (error) throw error;
}

export async function getJob(jobId: string, adminClient?: SupabaseClient): Promise<EmbedJob | null> {
  const admin = adminClient ?? createAdminClient();
  const { data, error } = await admin
    .from("team_direction_embed_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error || !data) return null;
  return data as EmbedJob;
}

export async function getNextPendingJob(adminClient?: SupabaseClient): Promise<EmbedJob | null> {
  const admin = adminClient ?? createAdminClient();

  const cutoff = new Date(Date.now() - MAX_PROCESSING_MS).toISOString();
  const { data, error } = await admin
    .from("team_direction_embed_jobs")
    .select("*")
    .or(`status.eq.pending,and(status.eq.processing,processing_started_at.lt.${cutoff})`)
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as EmbedJob;
}
