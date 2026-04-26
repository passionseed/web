import { createClient } from "@supabase/supabase-js";
import { collectTeamText, createTeamDirectionSnapshot } from "../lib/embeddings/team-direction";
import { extractTeamProfilesBatch } from "../lib/embeddings/profile-extractor";

const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!PROD_URL || !PROD_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const admin = createClient(PROD_URL, PROD_KEY);
const BATCH_SIZE = 5;

async function main() {
  const { data: teams } = await admin.from("hackathon_teams").select("id, name");
  if (!teams || teams.length === 0) {
    console.log("No teams found.");
    return;
  }

  console.log(`Backfilling ${teams.length} teams...`);

  console.log("Phase 1: Collecting team texts...");
  const teamTexts: { teamId: string; teamText: string }[] = [];
  for (const team of teams) {
    const text = await collectTeamText(team.id, admin);
    if (text) teamTexts.push({ teamId: team.id, teamText: text });
  }
  console.log(`  Collected text for ${teamTexts.length}/${teams.length} teams`);

  console.log("Phase 2: Extracting profiles in batches...");
  const profileMap = await extractTeamProfilesBatch(
    teamTexts.map((t) => ({ teamId: t.teamId, teamText: t.teamText }))
  );
  console.log(`  Extracted ${profileMap.size} profiles`);

  console.log("Phase 3: Creating snapshots...");
  let success = 0;
  let failed = 0;
  for (const { teamId, teamText } of teamTexts) {
    const profile = profileMap.get(teamId);
    if (!profile) {
      console.error(`  X No profile for ${teamId}`);
      failed++;
      continue;
    }
    try {
      await createTeamDirectionSnapshot(teamId, { adminClient: admin, profile });
      success++;
      process.stdout.write(`  OK ${success}/${teamTexts.length}\r`);
    } catch (err) {
      console.error(`  X ${teamId}:`, err);
      failed++;
    }
  }

  console.log(`\nBackfill complete: ${success} success, ${failed} failed`);
  console.log("Run reclustering manually: POST /api/admin/hackathon/team-directions/recluster");
}

main().catch(console.error);
