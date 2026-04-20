import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { embedText, formatVectorLiteral, hashText } from "./bge";

export type SubmissionEmbeddingScope = "hackathon_individual" | "hackathon_team";

type UpsertArgs = {
  scope: SubmissionEmbeddingScope;
  submissionId: string;
  activityId: string;
  text: string | null | undefined;
  /** Optional admin-scoped client; defaults to a fresh service-role client. */
  adminClient?: SupabaseClient;
};

/**
 * Embed a single submission with BGE-M3 and upsert the row in
 * `submission_embeddings`. No-ops when text is empty or identical to the
 * existing row (hash match) to save BGE/TEI calls on resubmissions.
 *
 * Callers should treat failures as non-fatal to the user submit flow; log and
 * continue. Use `fireAndForgetEmbedSubmission` for that pattern.
 */
export async function upsertSubmissionEmbedding(args: UpsertArgs): Promise<void> {
  const { scope, submissionId, activityId, text } = args;
  const trimmed = (text ?? "").trim();
  if (!trimmed) return;

  const admin = args.adminClient ?? createAdminClient();
  const targetColumn =
    scope === "hackathon_individual"
      ? "hackathon_individual_submission_id"
      : "hackathon_team_submission_id";

  const { data: existing } = await admin
    .from("submission_embeddings")
    .select("id, text_hash")
    .eq(targetColumn, submissionId)
    .maybeSingle();

  const newHash = hashText(trimmed);
  if (existing?.text_hash === newHash) return;

  const embedding = await embedText(trimmed);
  const vectorLiteral = formatVectorLiteral(embedding);

  const payload: Record<string, unknown> = {
    scope,
    activity_id: activityId,
    source_text: trimmed,
    text_hash: newHash,
    embedding: vectorLiteral,
    generated_at: new Date().toISOString(),
  };
  payload[targetColumn] = submissionId;

  if (existing) {
    const { error } = await admin
      .from("submission_embeddings")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await admin.from("submission_embeddings").insert(payload);
    if (error) throw error;
  }
}

/**
 * Fire-and-forget wrapper. Never awaits in the caller's critical path; errors
 * are swallowed after logging so that TEI outages cannot break submissions.
 */
export function fireAndForgetEmbedSubmission(args: UpsertArgs): void {
  void upsertSubmissionEmbedding(args).catch((err) => {
    console.error("[submission-embedding] background embed failed", {
      scope: args.scope,
      submissionId: args.submissionId,
      activityId: args.activityId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
