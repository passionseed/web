import { createClient } from "@supabase/supabase-js";

const TEI_URL = process.env.TEI_URL ?? "https://ai.passionseed.org";
const BATCH_SIZE = 64;

const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(PROD_URL, PROD_KEY);

async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${TEI_URL}/v1/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: texts, model: "BAAI/bge-m3" }),
  });
  if (!res.ok) throw new Error(`TEI error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data.map((d: any) => d.embedding);
}

async function main() {
  while (true) {
    // Fetch all programs without embeddings (Supabase has a 1000 row limit per request)
    const { data: programs, error } = await supabase
      .from("tcas_programs")
      .select("program_id, search_text")
      .is("embedding", null)
      .limit(1000);

    if (error) throw error;
    if (!programs?.length) {
      console.log("All programs already have embeddings.");
      break;
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
  }

  console.log("Embedding generation complete.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
