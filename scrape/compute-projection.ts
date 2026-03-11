import { createClient } from "@supabase/supabase-js";
import { UMAP } from "umap-js";

const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(PROD_URL, PROD_KEY);

async function main() {
  console.log("Fetching embeddings from production...");
  
  // Fetch all programs with embeddings
  const { data: programs, error } = await supabase
    .from("tcas_programs")
    .select("program_id, embedding")
    .not("embedding", "is", null);

  if (error) throw error;
  if (!programs?.length) {
    console.log("No programs with embeddings found.");
    return;
  }

  console.log(`Computing 2D projection for ${programs.length} programs using UMAP...`);

  const embeddings = programs.map(p => p.embedding as number[]);
  
  const umap = new UMAP({
    nComponents: 2,
    nNeighbors: 15,
    minDist: 0.1,
  });

  const projection = umap.fit(embeddings);

  console.log("Updating production database with 2D coordinates...");

  // Batch update (100 at a time)
  const BATCH_SIZE = 100;
  for (let i = 0; i < programs.length; i += BATCH_SIZE) {
    const batch = programs.slice(i, i + BATCH_SIZE);
    const updates = batch.map((p, idx) => {
      const coords = projection[i + idx];
      return supabase
        .from("tcas_programs")
        .update({ projection_2d: coords as any })
        .eq("program_id", p.program_id);
    });

    await Promise.all(updates);
    console.log(`Progress: ${Math.min(i + BATCH_SIZE, programs.length)}/${programs.length}`);
  }

  console.log("Projection complete.");
}

main().catch(console.error);
