/**
 * Backfill BGE-M3 embeddings for historical hackathon submissions that don't
 * yet have a row in `submission_embeddings`. Safe to re-run; skips submissions
 * whose text hash already matches.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-submission-embeddings.ts
 *   pnpm tsx scripts/backfill-submission-embeddings.ts --activity=<uuid>
 */

import { createClient } from "@supabase/supabase-js";
import { embedTexts, formatVectorLiteral, hashText } from "../lib/embeddings/bge";

const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!PROD_URL || !PROD_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(PROD_URL, PROD_KEY);
const BATCH = 32;

function parseArgs(): { activityId?: string } {
  const arg = process.argv.find((a) => a.startsWith("--activity="));
  return { activityId: arg?.split("=")[1] };
}

type Candidate = {
  scope: "hackathon_individual" | "hackathon_team";
  submissionId: string;
  activityId: string;
  text: string;
};

async function collectCandidates(activityId?: string): Promise<Candidate[]> {
  const [{ data: individual }, { data: team }, { data: existing }] = await Promise.all([
    admin
      .from("hackathon_phase_activity_submissions")
      .select("id, activity_id, text_answer, status")
      .neq("status", "draft")
      .not("text_answer", "is", null)
      .then((r) =>
        activityId ? { ...r, data: (r.data ?? []).filter((row) => row.activity_id === activityId) } : r
      ),
    admin
      .from("hackathon_phase_activity_team_submissions")
      .select("id, activity_id, text_answer, status")
      .neq("status", "draft")
      .not("text_answer", "is", null)
      .then((r) =>
        activityId ? { ...r, data: (r.data ?? []).filter((row) => row.activity_id === activityId) } : r
      ),
    admin.from("submission_embeddings").select(
      "hackathon_individual_submission_id, hackathon_team_submission_id, text_hash"
    ),
  ]);

  const existingHash = new Map<string, string>();
  for (const row of existing ?? []) {
    if (row.hackathon_individual_submission_id) {
      existingHash.set(`i:${row.hackathon_individual_submission_id}`, row.text_hash);
    }
    if (row.hackathon_team_submission_id) {
      existingHash.set(`t:${row.hackathon_team_submission_id}`, row.text_hash);
    }
  }

  const candidates: Candidate[] = [];
  for (const row of individual ?? []) {
    const text = (row.text_answer ?? "").trim();
    if (!text) continue;
    if (existingHash.get(`i:${row.id}`) === hashText(text)) continue;
    candidates.push({
      scope: "hackathon_individual",
      submissionId: row.id,
      activityId: row.activity_id,
      text,
    });
  }
  for (const row of team ?? []) {
    const text = (row.text_answer ?? "").trim();
    if (!text) continue;
    if (existingHash.get(`t:${row.id}`) === hashText(text)) continue;
    candidates.push({
      scope: "hackathon_team",
      submissionId: row.id,
      activityId: row.activity_id,
      text,
    });
  }
  return candidates;
}

async function main() {
  const { activityId } = parseArgs();
  console.log(`Collecting candidates${activityId ? ` for activity ${activityId}` : ""}...`);
  const candidates = await collectCandidates(activityId);
  console.log(`Found ${candidates.length} submissions needing embeddings`);

  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const texts = batch.map((c) => c.text);
    console.log(`[${i + batch.length}/${candidates.length}] embedding batch of ${batch.length}...`);
    const vectors = await embedTexts(texts);

    const rows = batch.map((c, idx) => {
      const col =
        c.scope === "hackathon_individual"
          ? "hackathon_individual_submission_id"
          : "hackathon_team_submission_id";
      return {
        scope: c.scope,
        activity_id: c.activityId,
        source_text: c.text,
        text_hash: hashText(c.text),
        embedding: formatVectorLiteral(vectors[idx]),
        [col]: c.submissionId,
      };
    });

    // Upsert per scope to respect partial unique indexes.
    const { error } = await admin
      .from("submission_embeddings")
      .upsert(rows, { onConflict: "hackathon_individual_submission_id" });
    if (error) {
      // Fall back to per-row upsert if bulk fails (mixed scopes).
      for (const row of rows) {
        const onConflict =
          row.scope === "hackathon_individual"
            ? "hackathon_individual_submission_id"
            : "hackathon_team_submission_id";
        const { error: rowErr } = await admin
          .from("submission_embeddings")
          .upsert(row, { onConflict });
        if (rowErr) console.error("upsert failed:", rowErr.message, row);
      }
    }
  }

  console.log("Backfill complete.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
