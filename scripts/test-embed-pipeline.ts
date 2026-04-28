import { createAdminClient } from "./utils/supabase/admin";
import { enqueueEmbedJob } from "./lib/embeddings/jobs";
import { createTeamDirectionSnapshot, collectTeamText } from "./lib/embeddings/team-direction";

async function test() {
  const admin = createAdminClient();
  
  console.log("1. Checking hackathon_teams table...");
  const { data: teams, error: teamsError } = await admin
    .from("hackathon_teams")
    .select("id, name")
    .limit(3);
  
  if (teamsError) {
    console.error("teams error:", teamsError);
  } else {
    console.log(`Found ${teams?.length ?? 0} teams:`, teams);
  }
  
  console.log("\n2. Checking team_direction_embed_jobs table...");
  const { data: jobs, error: jobsError } = await admin
    .from("team_direction_embed_jobs")
    .select("count")
    .limit(1);
  
  if (jobsError) {
    console.error("jobs error:", jobsError);
  } else {
    console.log("jobs table OK");
  }
  
  console.log("\n3. Testing enqueueEmbedJob...");
  if (teams && teams.length > 0) {
    try {
      const jobId = await enqueueEmbedJob(teams[0].id, "manual", admin);
      console.log("Enqueued job:", jobId);
    } catch (err) {
      console.error("Enqueue failed:", err);
    }
  }
  
  console.log("\n4. Testing collectTeamText...");
  if (teams && teams.length > 0) {
    try {
      const text = await collectTeamText(teams[0].id, admin);
      console.log("Collected text length:", text.length);
      console.log("First 200 chars:", text.slice(0, 200));
    } catch (err) {
      console.error("collectTeamText failed:", err);
    }
  }
}

test().catch(console.error);
