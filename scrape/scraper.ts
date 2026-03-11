import axios from "axios";
import fs from "fs/promises";
import path from "path";
import pLimit from "p-limit";
import { createClient } from "@supabase/supabase-js";

const PROGRAMS_JSON = path.resolve(__dirname, "programs.json");
const OUTPUT_ROOT = path.resolve(__dirname, "data");
const PROGRAM_ENDPOINT =
  "https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/ly-programs";
const ROUNDS_ENDPOINT =
  "https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/rounds";
const CONCURRENCY = 10;
const limit = pLimit(CONCURRENCY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ProgramEntry = {
  university_id: string;
  program_id: string;
  campus_id?: string;
  campus_name_th?: string;
  faculty_id?: string;
  faculty_name_th?: string;
  faculty_name_en?: string;
  field_name_th?: string;
  field_name_en?: string;
  program_name_th?: string;
  program_name_en?: string;
  program_type_id?: string;
  program_type_name_th?: string;
  number_acceptance_mko2?: number;
  cost?: string;
  graduate_rate?: string;
};

async function fetchJson(url: string) {
  const res = await axios.get(url, { timeout: 30_000 });
  return res.data;
}

async function upsertProgram(
  entry: ProgramEntry,
  lyData: any[],
  roundsData: any[]
): Promise<void> {
  const ly = lyData?.[0] ?? {};

  // Upsert program
  const { error: progErr } = await supabase.from("tcas_programs").upsert(
    {
      university_id: entry.university_id,
      program_id: entry.program_id,
      campus_id: entry.campus_id ?? null,
      campus_name: entry.campus_name_th ?? null,
      faculty_id: entry.faculty_id ?? null,
      faculty_name: entry.faculty_name_th ?? null,
      faculty_name_en: entry.faculty_name_en ?? null,
      field_name: entry.field_name_th ?? null,
      field_name_en: entry.field_name_en ?? null,
      program_name: entry.program_name_th ?? entry.program_id,
      program_name_en: entry.program_name_en ?? null,
      program_type: entry.program_type_id ?? null,
      program_type_name: entry.program_type_name_th ?? null,
      total_seats: entry.number_acceptance_mko2 ?? null,
      cost: entry.cost ?? null,
      graduate_rate: entry.graduate_rate ?? null,
      min_score: ly.min_score ?? null,
      max_score: ly.max_score ?? null,
      score_components: ly.scores ?? null,
      scraped_at: new Date().toISOString(),
    },
    { onConflict: "program_id" }
  );

  if (progErr) throw new Error(`program upsert: ${progErr.message}`);

  // Upsert rounds
  if (roundsData?.length) {
    const rows = roundsData.map((r: any) => ({
      program_id: r.program_id,
      university_id: r.university_id,
      project_id: r.project_id ?? null,
      project_name: r.project_name_th ?? null,
      round_type: r.type,
      receive_seats: r.receive_student_number ?? null,
      min_gpax: r.score_conditions?.min_gpax ?? r.min_gpax ?? null,
      min_total_score: r.min_total_score ?? null,
      score_conditions: r.score_conditions ?? null,
      score_weights: r.scores ?? null,
      only_formal: r.only_formal ?? null,
      only_international: r.only_international ?? null,
      only_vocational: r.only_vocational ?? null,
      only_non_formal: r.only_non_formal ?? null,
      only_ged: r.only_ged ?? null,
      grad_current: r.grad_current ?? null,
      interview_location: r.interview_location ?? null,
      interview_date: r.interview_date ?? null,
      interview_time: r.interview_time ?? null,
      folio_closed_date: r.folio?.closed_date ?? null,
      folio_page_limit: r.folio?.page_limit ?? null,
      link: r.link ?? null,
      description: r.description ?? null,
      condition: r.condition ?? null,
      scraped_at: new Date().toISOString(),
    }));

    // Deduplicate rows to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time"
    const uniqueRows = Array.from(
      new Map(
        rows.map((r) => [`${r.program_id}-${r.round_type}-${r.project_id}`, r])
      ).values()
    );

    const { error: roundErr } = await supabase
      .from("tcas_admission_rounds")
      .upsert(uniqueRows, { onConflict: "program_id,round_type,project_id" });

    if (roundErr) throw new Error(`rounds upsert: ${roundErr.message}`);
  }
}

async function processProgram(
  entry: ProgramEntry,
  index: number,
  total: number
): Promise<void> {
  const ticket = `[${index}/${total}] ${entry.program_id}`;

  try {
    console.log(`${ticket} fetching...`);
    const [lyData, roundsData] = await Promise.all([
      fetchJson(`${PROGRAM_ENDPOINT}/${entry.program_id}.json`).catch(() => []),
      fetchJson(`${ROUNDS_ENDPOINT}/${entry.program_id}.json`).catch(() => []),
    ]);

    // Save raw cache
    const dir = path.join(OUTPUT_ROOT, entry.university_id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, `${entry.program_id}.json`),
      JSON.stringify({ program: lyData, rounds: roundsData }, null, 2)
    );

    // Upsert to DB
    await upsertProgram(entry, lyData, roundsData);
    console.log(`${ticket} done`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${ticket} FAILED: ${msg}`);
  }
}

async function main() {
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });

  const raw = await fs.readFile(PROGRAMS_JSON, "utf-8");
  const programs: ProgramEntry[] = JSON.parse(raw);

  if (!programs.length) {
    console.log("No programs found.");
    return;
  }

  console.log(`Scraping ${programs.length} programs (concurrency ${CONCURRENCY})`);
  const tasks = programs.map((p, i) =>
    limit(() => processProgram(p, i + 1, programs.length))
  );
  await Promise.all(tasks);
  console.log("Scrape complete.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
