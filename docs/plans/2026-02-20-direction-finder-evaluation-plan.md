# Direction Finder Analytics and Evaluation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a repeatable evaluation pipeline for `direction_finder_results` that produces user-understanding cohorts, recommendation quality signals, and performance improvements in one controlled pass.

**Architecture:** Keep Supabase as the source of truth for behavioral and recommendation telemetry, with a SQL-first analytics layer (`view`s + indexes + constraints) and small app-level instrumentation changes only where data is not being collected yet. Evaluate in three tracks: data integrity, quality outcomes, and system performance.

**Tech Stack:** Postgres/Supabase, SQL migrations, Next.js server actions/routes, TypeScript utilities.

---

### Task 1: Build a reproducible SQL validation baseline

**Files:**
- Create: `scripts/direction-finder-audit.sql`

**Step 1: Write SQL checks for row and schema health**
```sql
-- 1.1 Dataset shape
SELECT
  COUNT(*) AS total_rows,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(*) FILTER (WHERE result IS NULL) AS null_result,
  COUNT(*) FILTER (WHERE model_name IS NULL) AS null_model_name,
  COUNT(*) FILTER (WHERE chat_context IS NULL OR chat_context = '') AS empty_chat_context;

-- 1.2 Cache health
SELECT
  COUNT(*) FILTER (WHERE cache_key IS NULL) AS cache_key_null,
  COUNT(*) FILTER (WHERE is_cached = true) AS cached_rows,
  AVG(COALESCE(cache_hit_count, 0)) AS avg_cache_hits;
```

**Step 2: Write SQL checks for content consistency and latest state**
```sql
-- 1.3 Latest snapshot integrity
WITH latest AS (
  SELECT *, row_number() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM direction_finder_results
)
SELECT
  COUNT(*) FILTER (WHERE rn = 1 AND result IS NULL) AS latest_without_result,
  COUNT(*) FILTER (WHERE rn = 1 AND result IS NOT NULL) AS latest_with_result
FROM latest;

-- 1.4 JSON shape checks
SELECT
  COUNT(*) FILTER (WHERE answers IS NOT NULL AND jsonb_typeof(answers) = 'object') AS answers_obj,
  COUNT(*) FILTER (WHERE result IS NOT NULL AND jsonb_typeof(result) = 'object') AS result_obj,
  COUNT(*) FILTER (WHERE result->'vectors' IS NOT NULL AND jsonb_typeof(result->'vectors') = 'array') AS vectors_array,
  COUNT(*) FILTER (WHERE result->'programs' IS NOT NULL AND jsonb_typeof(result->'programs') = 'array') AS programs_array
FROM direction_finder_results;
```

**Step 3: Write a “must not regress” snapshot for baseline thresholds**
```text
Expected baseline (current dataset):
- null_result ratio: <= 20%
- null_model_name ratio: <= 90% (temporary baseline, should fall over time)
- latest_without_result: <= 20
```

### Task 2: Add migration-backed schema hardening (direction_finder_results)

**Files:**
- Create: `supabase/migrations/20260220000001_direction_finder_results_quality_indexes_and_constraints.sql`

**Step 1: Add missing performance indexes**
- `CREATE INDEX idx_direction_finder_user_created ON direction_finder_results (user_id, created_at DESC);`
- `CREATE INDEX idx_direction_finder_model_created ON direction_finder_results (model_name, created_at DESC) WHERE model_name IS NOT NULL;`
- `CREATE INDEX idx_direction_finder_result_created ON direction_finder_results ((result IS NOT NULL), created_at DESC);`

**Step 2: Add schema validation constraints with rollout-safe behavior**
- Add `CHECK` for `jsonb` shape only on non-null `result` rows.
- Add `NOT NULL` and/or `CHECK` for `answers` + `created_at` assumptions if missing/null not allowed by runtime requirements.
- Add `CHECK` that `is_cached = true` implies `cache_key IS NOT NULL`.
- Add `NOT VALID` constraints if legacy rows exist, then validate in later migration.

**Step 3: Grant and comment updates**
- Keep RLS untouched (not widening).
- Add inline table/column comments for newly added constraints/indexes.

### Task 3: Add user-understanding and quality scoring views

**Files:**
- Create: `supabase/migrations/20260220000002_direction_finder_analytics_views.sql`

**Step 1: Snapshot view for latest user state**
- Create/replace `direction_finder_user_latest` with one row per user:
  - latest result id/timestamps
  - latest run quality flags (`has_result`, `has_model_name`, `answer_keys_coverage`)
  - chat summary metrics (`chat_turns`, `context_len`, `days_since_prev`)

**Step 2: Recommendability view for engagement and output quality**
- Create/replace `direction_finder_recommendability_stats`:
  - Top vectors/programs by user and by model
  - median/top match score by vector rank
  - repeated recommendations spread

**Step 3: Drift-and-retry cohort view**
- Create/replace `direction_finder_retry_cohorts`:
  - users with repeated identical `answers_hash`
  - max retries per hash
  - whether cached result was served

### Task 4: Backfill and normalization tasks

**Files:**
- Create: `scripts/direction-finder-backfill.sql`

**Step 1: Backfill missing `model_name` where derivable**
- Fill from `chat_context`/debug payloads if available.
- Identify hard cases for manual triage.

**Step 2: Populate `cache_key` for non-null rows if missing but answer hash exists**
- Use deterministic generator `md5(answers::text) || '_' || coalesce(model_name,'unknown')`.

**Step 3: Emit unresolved rows report**
- Output `user_id`, `id`, `created_at`, and missing field list for operations review.

### Task 5: Ensure runtime writes metrics and result quality fields consistently

**Files:**
- Modify: `app/actions/save-direction.ts`
- Modify: `app/api/direction/process/[jobId]/route.ts`
- Modify: `lib/utils/metrics-collector.ts`
- Modify: `app/actions/admin/direction-finder.ts` (if admin actions use the pipeline)

**Step 1: Guarantee `model_name` persistence on save-paths**
- Pass down explicit `model_name` from direction generation path when saving final result.
- Ensure `model_name` is never dropped between steps.

**Step 2: Add generation-level timing and status metrics writes**
- Record step times and aggregate total time.
- Populate `cache_hit`, `retry_count`, `conversation_turn_count`, `error_message`, timeout/rate-limit flags into `direction_finder_metrics`.

**Step 3: Add user feedback hooks for result quality**
- Add a minimal optional call path to set `user_rating` and `user_feedback` in `direction_finder_metrics` after result consumption.

### Task 6: Build a production-ready dashboard query pack

**Files:**
- Create: `scripts/direction-finder-dashboard.sql`
- Create: `docs/direction-finder-dashboard.sql.md` (query index + interpretation)

**Step 1: Create weekly dashboard query set**
- Volume: usage by day/user/unique models.
- Quality: null-result rate, result-shape completeness.
- Performance: p50/p95/p99 by model, timeout/rate-limit counts.
- Cache: hit ratios by answers_hash/window and key collisions.

**Step 2: Add “action” thresholds**
- Red: cache hit ratio < 5%, latest null-result rows > 10%, p95 latency > target.
- Amber: 5–15% regression from previous week.
- Green: sustained improvements for 2 consecutive weeks.

### Task 7: Add lightweight verification and rollback scripts

**Files:**
- Create: `scripts/run-direction-finder-healthcheck.sh`

**Step 1: Define verification gates**
- Run `direction-finder-audit.sql` and fail if any hard gate fails.

**Step 2: Define soft gates for rollout**
- `model_name` populated on latest rows should improve week-over-week.
- `latest_with_result` should increase by at least N% after each release.

### Task 8: Deploy sequence and monitoring cadence

**Files:**
- Update: `docs/plans/2026-02-20-direction-finder-evaluation-plan.md` (keep as living doc)

**Step 1: Rollout order (single release)**
1. Apply index/constraint migration.
2. Apply analytics view migration.
3. Run validation queries.
4. Deploy app metric write updates.
5. Run backfill + dashboard first snapshot.

**Step 2: Weekly rhythm**
- Weekly runbook: execute `run-direction-finder-healthcheck.sh`, store output in `notes.md`.
- Review action items for each threshold breach.

---

### Suggested verification commands

- `node -e "console.log('Run SQL pack in Supabase SQL editor or via mcp supabase-ps')"` (placeholder for local workflow)
- `supabase db push` (or your normal migration command)
- `pnpm test` (when/if any UI regression tests are added)

### Commit strategy

- Commit every 1–2 tasks.
- Include query evidence summary in commit message body.

Plan complete and saved to `docs/plans/2026-02-20-direction-finder-evaluation-plan.md`. Two execution options:

1. Subagent-Driven (this session) - dispatch fresh subagent per task, review between tasks, fast iteration

2. Parallel Session (separate) - open new session with `superpowers:executing-plans`, run tasks in batch with checkpoints
