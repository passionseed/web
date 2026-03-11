import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const raw = await fs.readFile(
    path.resolve(__dirname, "universities.json"),
    "utf-8"
  );
  const universities = JSON.parse(raw);

  const rows = universities.map((u: any) => ({
    university_id: u.university_id,
    university_name: u.university_name,
    university_name_en: u.university_name_en ?? null,
    university_type: u.university_type ?? null,
    file_paths: {
      round_1: u.file_path_1 ?? null,
      round_2: u.file_path_2 ?? null,
      round_3: u.file_path_3 ?? null,
      round_4: u.file_path_4 ?? null,
      handicap: u.file_path_handicap ?? null,
    },
  }));

  const { error } = await supabase
    .from("tcas_universities")
    .upsert(rows, { onConflict: "university_id" });

  if (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} universities.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
