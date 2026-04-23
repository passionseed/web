/**
 * Backfill BGE-M3 embeddings for hackathon team direction composites.
 * Safe to re-run; skips teams whose text hash already matches.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-team-direction-embeddings.ts
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
const BATCH = 16;

type Candidate = { teamId: string; text: string };

async function collectCandidates(): Promise<Candidate[]> {
  const [{ data: teams }, { data: teamSubs }, { data: individualSubs }, { data: members }, { data: existing }] =
    await Promise.all([
      admin.from("hackathon_teams").select("id, name"),
      admin
        .from("hackathon_phase_activity_team_submissions")
        .select("team_id, text_answer, hackathon_phase_activities(title, display_order)")
        .neq("status", "draft"),
      admin
        .from("hackathon_phase_activity_submissions")
        .select("participant_id, text_answer, hackathon_phase_activities(title, display_order), hackathon_participants(name)")
        .neq("status", "draft"),
      admin.from("hackathon_team_members").select("team_id, participant_id"),
      admin.from("hackathon_team_direction_embeddings").select("team_id, text_hash"),
    ]);

  const existingHash = new Map<string, string>();
  for (const row of existing ?? []) existingHash.set(row.team_id, row.text_hash);

  const membersByTeam = new Map<string, string[]>();
  for (const m of members ?? []) {
    const arr = membersByTeam.get(m.team_id) ?? [];
    arr.push(m.participant_id);
    membersByTeam.set(m.team_id, arr);
  }

  const teamSubsByTeam = new Map<string, any[]>();
  for (const s of teamSubs ?? []) {
    if (!s.text_answer?.trim()) continue;
    const arr = teamSubsByTeam.get(s.team_id) ?? [];
    arr.push(s);
    teamSubsByTeam.set(s.team_id, arr);
  }

  const indivSubsByParticipant = new Map<string, any[]>();
  for (const s of individualSubs ?? []) {
    if (!s.text_answer?.trim()) continue;
    const arr = indivSubsByParticipant.get(s.participant_id) ?? [];
    arr.push(s);
    indivSubsByParticipant.set(s.participant_id, arr);
  }

  const candidates: Candidate[] = [];

  for (const team of teams ?? []) {
    const tSubs = (teamSubsByTeam.get(team.id) ?? [])
      .sort((a: any, b: any) => (a.hackathon_phase_activities?.display_order ?? 0) - (b.hackathon_phase_activities?.display_order ?? 0));

    const pIds = membersByTeam.get(team.id) ?? [];
    const iSubs = pIds
      .flatMap((pid) => indivSubsByParticipant.get(pid) ?? [])
      .sort((a: any, b: any) => (a.hackathon_phase_activities?.display_order ?? 0) - (b.hackathon_phase_activities?.display_order ?? 0));

    if (tSubs.length === 0 && iSubs.length === 0) continue;

    const parts: string[] = [`## Team: ${team.name}`];
    for (const s of tSubs) {
      const title = s.hackathon_phase_activities?.title ?? "Activity";
      parts.push(`\n### ${title} (Team)\n${s.text_answer.trim()}`);
    }
    for (const s of iSubs) {
      const title = s.hackathon_phase_activities?.title ?? "Activity";
      const name = s.hackathon_participants?.name ?? "Member";
      parts.push(`\n### ${title} (${name})\n${s.text_answer.trim()}`);
    }

    const text = parts.join("\n").trim();
    if (!text) continue;
    if (existingHash.get(team.id) === hashText(text)) continue;
    candidates.push({ teamId: team.id, text });
  }

  return candidates;
}

async function main() {
  console.log("Collecting candidates...");
  const candidates = await collectCandidates();
  console.log(`Found ${candidates.length} teams needing embeddings`);

  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const texts = batch.map((c) => c.text);
    console.log(`[${i + batch.length}/${candidates.length}] embedding batch of ${batch.length}...`);
    const vectors = await embedTexts(texts);

    const rows = batch.map((c, idx) => ({
      team_id: c.teamId,
      source_text: c.text,
      text_hash: hashText(c.text),
      embedding: formatVectorLiteral(vectors[idx]),
      generated_at: new Date().toISOString(),
    }));

    const { error } = await admin
      .from("hackathon_team_direction_embeddings")
      .upsert(rows, { onConflict: "team_id" });
    if (error) {
      for (const row of rows) {
        const { error: rowErr } = await admin
          .from("hackathon_team_direction_embeddings")
          .upsert(row, { onConflict: "team_id" });
        if (rowErr) console.error("upsert failed:", rowErr.message, row.team_id);
      }
    }
  }

  console.log("Backfill complete.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
