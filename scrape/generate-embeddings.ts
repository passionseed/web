import { createClient } from "@supabase/supabase-js";

const TEI_URL = process.env.TEI_URL ?? "https://ai.passionseed.org";
const BATCH_SIZE = 64;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${TEI_URL}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: texts, normalize: true }),
  });
  if (!res.ok) throw new Error(`TEI error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  // Fetch all programs without embeddings
  const { data: programs, error } = await supabase
    .from("tcas_programs")
    .select("program_id, search_text")
    .is("embedding", null);

  if (error) throw error;
  if (!programs?.length) {
    console.log("All programs already have embeddings.");
    return;
  }

  console.log(`Generating embeddings for ${programs.length} programs...`);

  for (let i = 0; i < programs.length; i += BATCH_SIZE) {
    const batch = programs.slice(i, i + BATCH_SIZE);
    const texts = batch.map((p) => p.search_text ?? p.program_id);

    try {
      const embeddings = await getEmbeddings(texts);

      // Update each program with its embedding
      await Promise.all(
        batch.map((p, idx) =>
          supabase
            .from("tcas_programs")
            .update({ embedding: embeddings[idx] as any })
            .eq("program_id", p.program_id)
        )
      );

      console.log(
        `[${Math.min(i + BATCH_SIZE, programs.length)}/${programs.length}] embedded`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Batch ${i}-${i + BATCH_SIZE} failed: ${msg}`);
    }
  }

  console.log("Embedding generation complete.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
