# TCAS Database Design
**Date:** 2026-03-10  
**Status:** Approved

## Overview

Scrape all TCAS programs, universities, and admission rounds from the MyTCAS S3 API into a structured Supabase PostgreSQL database with semantic search via a self-hosted HuggingFace TEI server.

## Data Sources

| Endpoint | Purpose |
|---|---|
| `scrape/universities.json` | Master list of ~80 universities |
| `scrape/programs.json` | Master list of ~4,000 programs |
| `https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/ly-programs/{program_id}.json` | Historical min/max scores + score component weights |
| `https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/rounds/{program_id}.json` | Admission rounds per program |

## Schema: 3 Tables (Approach B — Semi-Normalized)

### `universities` (~80 rows)
- `university_id` — TCAS ID (e.g. `"001"`)
- `university_name`, `university_name_en`
- `university_type` — `"1"`=ทปอ, `"2"`=ราชภัฏ, `"3"`=ราชมงคล, `"4"`=เอกชน, `"5"`=สถาบัน
- `file_paths jsonb` — round PDF links per university

### `programs` (~4,000 rows)
- `program_id` — TCAS composite key (e.g. `"10010121302701A"`)
- `university_id` — FK → universities
- Faculty columns: `faculty_id`, `faculty_name`, `faculty_name_en`
- Field columns: `field_name`, `field_name_en`
- Program columns: `program_name`, `program_name_en`, `program_type`, `total_seats`, `cost`, `graduate_rate`
- Score history: `min_score`, `max_score`, `score_components jsonb`
- `search_text text GENERATED ALWAYS AS (...)` — concatenated for full-text
- `embedding vector(1024)` — bge-m3 semantic embedding

### `admission_rounds` (~12,000 rows) — primary query target
- `program_id` — FK → programs
- `university_id` — FK → universities (denormalized for query performance)
- `round_type` — `"1_2569"`, `"2_2569"`, `"3_2569"`, `"4_2569"`
- `round_number smallint GENERATED` — extracted from round_type (1–4)
- `academic_year text GENERATED` — extracted from round_type (`"2569"`)
- `project_id`, `project_name` — specific sub-project within round
- `receive_seats`, `min_gpax`, `min_total_score`
- `score_conditions jsonb`, `score_weights jsonb`
- Eligibility flags: `only_formal`, `only_international`, `only_vocational`, `only_non_formal`, `only_ged`, `grad_current`
- Interview: `interview_location`, `interview_date`, `interview_time`
- Portfolio: `folio_closed_date`, `folio_page_limit`
- `link`, `description`, `condition`
- Unique constraint: `(program_id, round_type, coalesce(project_id, ''))`

## Indexes

```sql
-- Pattern 1: rounds for a program
create index idx_rounds_program on admission_rounds(program_id);

-- Pattern 2: eligibility filter
create index idx_rounds_eligibility on admission_rounds(round_number, min_gpax);
create index idx_rounds_university on admission_rounds(university_id, round_number);

-- Pattern 3: browse programs by university/faculty
create index idx_programs_university on programs(university_id, faculty_id);

-- Semantic search (IVFFlat, lists=20 for ~4K rows)
create index idx_programs_embedding on programs
  using ivfflat (embedding vector_cosine_ops) with (lists = 20);

-- Full-text fallback
create index idx_programs_search_text on programs
  using gin (to_tsvector('simple', search_text));
```

## SQL Functions

| Function | Purpose |
|---|---|
| `search_programs(query_embedding vector(1024), threshold float, count int)` | Cosine similarity search |
| `find_eligible_rounds(gpax numeric, round smallint, university_id text, limit int)` | Filter rounds by eligibility |
| `search_programs_text(query text, count int)` | Thai full-text fallback |

## Semantic Search Stack

- **Model:** `BAAI/bge-m3` (1024 dims, multilingual incl. Thai)
- **Server:** `ghcr.io/huggingface/text-embeddings-inference:latest`
- **Endpoint:** `https://ai.passionseed.org/v1/embeddings` (POST, OpenAI-compatible)
- **Embedding text:** `program_name + program_name_en + faculty_name + faculty_name_en + field_name + field_name_en`
- **Batch size:** 64 programs per call

## Scraper Pipeline

### File structure
```
scrape/
├── programs.json              ← master list (exists)
├── universities.json          ← master list (exists)
├── scraper.ts                 ← fetch raw S3 data (update: add DB upsert)
├── seed-db.ts                 ← NEW: upsert universities + programs + rounds
├── generate-embeddings.ts     ← NEW: embedding pass via TEI
└── data/                      ← raw JSON cache
    └── {university_id}/
        └── {program_id}.json
```

### Two-pass pipeline

**Pass 1 — Scrape & seed DB** (`seed-db.ts`):
1. Upsert all universities from `universities.json`
2. For each program_id from `programs.json` (p-limit 10):
   - Fetch `/ly-programs/{id}.json` and `/rounds/{id}.json` in parallel
   - Upsert `programs` row
   - Bulk upsert `admission_rounds` rows
3. All upserts use `ON CONFLICT DO UPDATE`

**Pass 2 — Generate embeddings** (`generate-embeddings.ts`):
1. `SELECT program_id, search_text FROM programs WHERE embedding IS NULL`
2. Batch 64 rows → POST to TEI `/embed`
3. `UPDATE programs SET embedding = $1 WHERE program_id = $2`

### Upsert constraints
- `programs`: conflict on `program_id`
- `admission_rounds`: conflict on `(program_id, round_type, coalesce(project_id, ''))`
- `universities`: conflict on `university_id`

## Migration Plan

1. Enable `pgvector` extension
2. Drop `university_static_data`, `thailand_admission_plans` (migrate any manual data first)
3. Create `universities`, `programs`, `admission_rounds`
4. Add indexes + RLS policies
5. Create SQL functions
6. Run `seed-db.ts`
7. Run `generate-embeddings.ts`

## RLS

All three tables: public read (authenticated + anon), service_role write only.

## Existing Tables

| Table | Action |
|---|---|
| `university_static_data` | Drop — superseded by `programs` |
| `thailand_admission_plans` | Drop — superseded by `programs` |
| `university_insights_cache` | **Keep** — independent AI layer, no FK needed |
