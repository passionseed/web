# TCAS Database Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scrape all TCAS programs, universities, and admission rounds from the MyTCAS S3 API into Supabase with semantic search via a self-hosted TEI server running BAAI/bge-m3.

**Architecture:** Three-table schema (`universities` → `programs` → `admission_rounds`), two-pass pipeline (scrape+seed, then embed), SQL functions for all three query patterns (semantic, eligibility, full-text).

**Tech Stack:** TypeScript, Supabase (pgvector), `@supabase/supabase-js`, `p-limit`, native `fetch`, TEI at `https://mail.passionseed.org`

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install required packages**

```bash
pnpm add axios p-limit
pnpm add -D tsx
```

**Step 2: Verify scraper compiles**

```bash
npx tsx --version
```

Expected: tsx version printed, no errors.

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add axios, p-limit, tsx for scraper pipeline"
```

---

## Task 2: Database migration — create schema

**Files:**
- Create: `supabase/migrations/20260310100000_tcas_schema.sql`

**Step 1: Write the migration**

```sql
-- Enable pgvector
create extension if not exists vector;

-- Drop old tables (data is superseded)
drop table if exists public.university_static_data cascade;
drop table if exists public.thailand_admission_plans cascade;

-- 1. universities
create table if not exists public.universities (
  id                 uuid primary key default gen_random_uuid(),
  university_id      text not null unique,
  university_name    text not null,
  university_name_en text,
  university_type    text,
  file_paths         jsonb not null default '{}',
  scraped_at         timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- 2. programs
create table if not exists public.programs (
  id               uuid primary key default gen_random_uuid(),
  university_id    text not null references public.universities(university_id),
  program_id       text not null unique,
  campus_id        text,
  campus_name      text,
  faculty_id       text,
  faculty_name     text,
  faculty_name_en  text,
  field_name       text,
  field_name_en    text,
  program_name     text not null,
  program_name_en  text,
  program_type     text,
  program_type_name text,
  total_seats      integer,
  cost             text,
  graduate_rate    text,
  min_score        numeric,
  max_score        numeric,
  score_components jsonb,
  search_text      text generated always as (
    coalesce(program_name, '') || ' ' ||
    coalesce(program_name_en, '') || ' ' ||
    coalesce(faculty_name, '') || ' ' ||
    coalesce(faculty_name_en, '') || ' ' ||
    coalesce(field_name, '') || ' ' ||
    coalesce(field_name_en, '')
  ) stored,
  embedding        vector(1024),
  scraped_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 3. admission_rounds
create table if not exists public.admission_rounds (
  id                  uuid primary key default gen_random_uuid(),
  program_id          text not null references public.programs(program_id),
  university_id       text not null references public.universities(university_id),
  project_id          text,
  project_name        text,
  round_type          text not null,
  round_number        smallint generated always as (
    cast(split_part(round_type, '_', 1) as smallint)
  ) stored,
  academic_year       text generated always as (
    split_part(round_type, '_', 2)
  ) stored,
  receive_seats       integer,
  min_gpax            numeric,
  min_total_score     numeric,
  score_conditions    jsonb,
  score_weights       jsonb,
  only_formal         smallint,
  only_international  smallint,
  only_vocational     smallint,
  only_non_formal     smallint,
  only_ged            smallint,
  grad_current        boolean,
  interview_location  text,
  interview_date      text,
  interview_time      text,
  folio_closed_date   text,
  folio_page_limit    text,
  link                text,
  description         text,
  condition           text,
  scraped_at          timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint rounds_unique unique (program_id, round_type, project_id)
);

-- Indexes
create index idx_rounds_program     on public.admission_rounds(program_id);
create index idx_rounds_eligibility on public.admission_rounds(round_number, min_gpax);
create index idx_rounds_university  on public.admission_rounds(university_id, round_number);
create index idx_programs_university on public.programs(university_id, faculty_id);
create index idx_programs_embedding on public.programs
  using ivfflat (embedding vector_cosine_ops) with (lists = 20);
create index idx_programs_search_text on public.programs
  using gin (to_tsvector('simple', search_text));

-- Updated_at triggers
create trigger set_updated_at before update on public.universities
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.programs
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.admission_rounds
  for each row execute function public.handle_updated_at();

-- RLS
alter table public.universities      enable row level security;
alter table public.programs          enable row level security;
alter table public.admission_rounds  enable row level security;

create policy "public_read" on public.universities
  for select to authenticated, anon using (true);
create policy "public_read" on public.programs
  for select to authenticated, anon using (true);
create policy "public_read" on public.admission_rounds
  for select to authenticated, anon using (true);

create policy "service_write" on public.universities
  for all to service_role using (true) with check (true);
create policy "service_write" on public.programs
  for all to service_role using (true) with check (true);
create policy "service_write" on public.admission_rounds
  for all to service_role using (true) with check (true);
```

**Step 2: Apply migration locally**

```bash
npx supabase db push --local
```

Expected: migration applied, no errors.

**Step 3: Commit**

```bash
git add supabase/migrations/20260310100000_tcas_schema.sql
git commit -m "feat: add universities, programs, admission_rounds schema with pgvector"
```

---

## Task 3: Database migration — SQL search functions

**Files:**
- Create: `supabase/migrations/20260310100001_tcas_search_functions.sql`

**Step 1: Write the migration**

```sql
-- Semantic search via vector cosine similarity
create or replace function public.search_programs(
  query_embedding vector(1024),
  match_threshold float default 0.7,
  match_count     int default 20
)
returns table (
  program_id      text,
  program_name    text,
  program_name_en text,
  faculty_name    text,
  university_name text,
  university_id   text,
  similarity      float
)
language sql stable security definer
as $$
  select
    p.program_id,
    p.program_name,
    p.program_name_en,
    p.faculty_name,
    u.university_name,
    u.university_id,
    1 - (p.embedding <=> query_embedding) as similarity
  from public.programs p
  join public.universities u on u.university_id = p.university_id
  where p.embedding is not null
    and 1 - (p.embedding <=> query_embedding) > match_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

-- Eligibility search: find rounds matching user's GPAX
create or replace function public.find_eligible_rounds(
  user_gpax         numeric,
  user_round        smallint default null,
  user_university_id text default null,
  result_limit      int default 50
)
returns table (
  round_id        uuid,
  program_id      text,
  program_name    text,
  faculty_name    text,
  university_name text,
  university_id   text,
  round_number    smallint,
  project_name    text,
  receive_seats   integer,
  min_gpax        numeric,
  score_weights   jsonb,
  link            text
)
language sql stable security definer
as $$
  select
    ar.id,
    ar.program_id,
    p.program_name,
    p.faculty_name,
    u.university_name,
    u.university_id,
    ar.round_number,
    ar.project_name,
    ar.receive_seats,
    ar.min_gpax,
    ar.score_weights,
    ar.link
  from public.admission_rounds ar
  join public.programs p on p.program_id = ar.program_id
  join public.universities u on u.university_id = ar.university_id
  where (ar.min_gpax is null or ar.min_gpax <= user_gpax)
    and (user_round is null or ar.round_number = user_round)
    and (user_university_id is null or ar.university_id = user_university_id)
  order by ar.receive_seats desc nulls last, ar.min_gpax desc
  limit result_limit;
$$;

-- Full-text fallback for Thai keyword search
create or replace function public.search_programs_text(
  query       text,
  match_count int default 20
)
returns table (
  program_id      text,
  program_name    text,
  faculty_name    text,
  university_name text,
  rank            float
)
language sql stable security definer
as $$
  select
    p.program_id,
    p.program_name,
    p.faculty_name,
    u.university_name,
    ts_rank(to_tsvector('simple', p.search_text), plainto_tsquery('simple', query)) as rank
  from public.programs p
  join public.universities u on u.university_id = p.university_id
  where to_tsvector('simple', p.search_text) @@ plainto_tsquery('simple', query)
  order by rank desc
  limit match_count;
$$;
```

**Step 2: Apply migration**

```bash
npx supabase db push --local
```

Expected: 3 functions created, no errors.

**Step 3: Commit**

```bash
git add supabase/migrations/20260310100001_tcas_search_functions.sql
git commit -m "feat: add search_programs, find_eligible_rounds, search_programs_text SQL functions"
```

---

## Task 4: Update `scraper.ts` — add DB upsert

**Files:**
- Modify: `scrape/scraper.ts`

The existing scraper fetches raw data and saves to `scrape/data/`. Update it to also upsert into Supabase using `@supabase/supabase-js` with `service_role` key.

**Step 1: Add Supabase client to scraper**

Replace contents of `scrape/scraper.ts`:

```typescript
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
  const { error: progErr } = await supabase.from("programs").upsert(
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

    const { error: roundErr } = await supabase
      .from("admission_rounds")
      .upsert(rows, { onConflict: "program_id,round_type,project_id" });

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
```

**Step 2: Commit**

```bash
git add scrape/scraper.ts
git commit -m "feat: update scraper to upsert programs and admission_rounds into Supabase"
```

---

## Task 5: Create `scrape/seed-universities.ts`

Universities (~80 rows) are seeded separately since they're a prerequisite for programs FK.

**Files:**
- Create: `scrape/seed-universities.ts`

**Step 1: Write the script**

```typescript
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
    .from("universities")
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
```

**Step 2: Run it**

```bash
npx tsx scrape/seed-universities.ts
```

Expected: `Seeded 80 universities.` (or similar count)

**Step 3: Commit**

```bash
git add scrape/seed-universities.ts
git commit -m "feat: add seed-universities script"
```

---

## Task 6: Create `scrape/generate-embeddings.ts`

**Files:**
- Create: `scrape/generate-embeddings.ts`

**Step 1: Write the script**

```typescript
import { createClient } from "@supabase/supabase-js";

const TEI_URL = process.env.TEI_URL ?? "https://mail.passionseed.org";
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
    .from("programs")
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
            .from("programs")
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
```

**Step 2: Test against live TEI server**

```bash
curl -sk https://mail.passionseed.org/embed \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"inputs": ["คณะวิศวกรรมศาสตร์"], "normalize": true}' | python3 -c "
import json,sys; d=json.load(sys.stdin); print(f'dims: {len(d[0])}')
"
```

Expected: `dims: 1024`

**Step 3: Run embedding generation** (after scraper has populated programs)

```bash
npx tsx scrape/generate-embeddings.ts
```

Expected: progress logs, no errors.

**Step 4: Commit**

```bash
git add scrape/generate-embeddings.ts
git commit -m "feat: add generate-embeddings script using TEI bge-m3"
```

---

## Task 7: Full pipeline run

Run in order:

```bash
# 1. Seed universities first (FK prerequisite)
npx tsx scrape/seed-universities.ts

# 2. Scrape + seed all programs and rounds (~4K programs, ~10min)
npx tsx scrape/scraper.ts

# 3. Generate embeddings (separate pass, ~64 per call)
npx tsx scrape/generate-embeddings.ts
```

**Verify in Supabase:**

```sql
select count(*) from universities;       -- ~80
select count(*) from programs;           -- ~4000
select count(*) from admission_rounds;   -- ~12000
select count(*) from programs where embedding is null;  -- 0 (after embed pass)
```

**Test semantic search:**

```sql
-- Run via Supabase SQL editor with a pre-fetched embedding
select * from search_programs(
  '[0.1, 0.2, ...]'::vector(1024),  -- replace with real embedding
  0.7, 5
);
```

**Test eligibility search:**

```sql
select * from find_eligible_rounds(3.5, 3, null, 10);
-- Expected: round 3 programs requiring GPAX ≤ 3.5
```

**Step: Commit final verification**

```bash
git add .
git commit -m "chore: verify TCAS pipeline end-to-end"
```

---

## Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
TEI_URL=https://mail.passionseed.org   # optional, this is the default
```

Make sure these are in `.env.local` before running any scrape scripts.
