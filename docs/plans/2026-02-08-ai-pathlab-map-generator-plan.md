# AI PathLab Map Generator Implementation Plan

**Date**: 2026-02-08  
**Status**: Ready for implementation

---

## Overview

Build an AI-assisted generator that creates a complete PathLab exploration from a short admin prompt.  
The generator must produce a valid:

- `seed` (`seed_type = pathlab`)
- `path` and `path_days`
- learning map node graph (`map_nodes`, `node_paths`)
- node content (`node_content`)
- node assessments (`node_assessments`, `quiz_questions`)

Output should be editable before publish and safe-by-default.

---

## Product Goals

- Reduce PathLab setup time from hours to minutes.
- Produce structurally valid day-based experiences (not just text blobs).
- Keep humans in control: admins review/edit before student exposure.
- Reuse existing map + pathlab infrastructure in this codebase.

## Non-Goals (v1)

- Auto-publishing without admin approval.
- Fully autonomous grading or recommendation logic.
- Personalized generation per student.

---

## User Flow

1. Admin opens seed creation flow.
2. Admin chooses `PathLab` + clicks `Generate with AI`.
3. Admin enters:
   - topic
   - audience/age range
   - difficulty
   - day count
   - tone
   - constraints (optional)
4. System generates a draft PathLab package.
5. Admin reviews in builder-like UI:
   - day contexts
   - node sequence
   - content + assessments
6. Admin can regenerate all/day/node or manually edit.
7. Admin saves and publishes.

---

## System Design

### 1) Generation Contract (JSON Schema First)

Create strict schema for LLM output:

- `seed`: `title`, `slogan`, `description`, `category_name`
- `path`: `total_days`
- `days[]`:
  - `day_number`
  - `context_text`
  - `reflection_prompts[]`
  - `node_keys[]` (ordered references)
- `nodes[]`:
  - `key` (stable local ID)
  - `title`, `instructions`, `difficulty`
  - `content[]` with supported types (`text`, `video`, `pdf`, `image`, `resource_link`)
  - `assessment` (`text_answer`, `quiz`, `file_upload`, `checklist`, or none)
- `edges[]`:
  - `source_key`, `destination_key`

Use schema validation before any DB writes.

### 2) Generator Pipeline

1. Validate admin auth/role.
2. Build prompt pack from user inputs + platform constraints.
3. Call LLM and require JSON response.
4. Parse + validate schema.
5. Apply quality checks:
   - day/node count alignment
   - no orphan nodes
   - DAG (no cycles)
   - each day has actionable nodes
   - assessment mix sanity
6. Persist draft atomically:
   - create seed + map
   - create nodes/content/assessments/edges
   - create path + path_days
7. Return draft IDs + summary.

### 3) Save Model

v1 strategy:

- Persist directly to regular tables but mark seed as draft in `metadata` (or add explicit `status` later).
- Use transaction-style rollback logic in route (if any step fails, delete created entities).

v2 strategy (optional):

- Add `pathlab_generation_jobs` and `pathlab_generation_artifacts` for full audit/versioning.

---

## API Design

### `POST /api/pathlab/generate`

Request:

- `topic`
- `audience`
- `difficulty`
- `totalDays`
- `tone`
- `constraints` (optional)
- `categoryId` (optional)

Response:

- `seedId`
- `mapId`
- `pathId`
- `dayCount`
- `nodeCount`
- `warnings[]`

### `POST /api/pathlab/generate/regenerate`

Modes:

- `scope = all`
- `scope = day` + `dayNumber`
- `scope = node` + `nodeId|nodeKey`

Returns patched draft data only for selected scope.

### `POST /api/pathlab/generate/validate`

Runs structural and pedagogical checks on edited draft before publish.

---

## UI Plan

### Generation Entry

Add to admin seed flow:

- Toggle/button: `Generate with AI`
- Input form for generation parameters

### Draft Review Screen

Reuse PathLab builder concepts with AI helpers:

- day timeline
- node list/ordering
- per-node editor
- regenerate buttons:
  - whole path
  - day
  - node
- warnings panel (validation output)

### Publish Gate

Require successful validation before enabling publish.

---

## Safety + Quality Guardrails

- Block unsafe content categories.
- Enforce age-appropriate language guidance in system prompt.
- Limit required time load per day (soft caps).
- Prevent recommendation-style claims; keep exploratory framing.
- Require at least one reflection prompt per day.
- Sanitize generated markdown/html via existing sanitization paths.

---

## Files to Add / Modify

### New

- `app/api/pathlab/generate/route.ts`
- `app/api/pathlab/generate/regenerate/route.ts`
- `app/api/pathlab/generate/validate/route.ts`
- `lib/ai/pathlab-generator.ts`
- `lib/ai/pathlab-generator-schema.ts`
- `lib/ai/pathlab-generator-prompts.ts`
- `lib/pathlab/generation-quality.ts`
- `types/pathlab-generator.ts`
- `components/pathlab/PathLabGenerateModal.tsx`
- `components/pathlab/GeneratedPathReview.tsx`

### Modify

- `components/seeds/CreateSeedModal.tsx` (AI generation entry point)
- `app/seeds/[id]/pathlab-builder/page.tsx` (review + regenerate hooks)
- `app/api/seeds/create/route.ts` (optional shared create helpers extraction)
- `lib/supabase/pathlab.ts` (helpers for generated path persistence)

### Optional Migration (v2)

- `supabase/migrations/XXXXXX_create_pathlab_generation_jobs.sql`
  - `pathlab_generation_jobs`
  - `pathlab_generation_artifacts`

---

## Prompting Strategy

### Multi-pass Generation

1. Plan pass: day arc + learning objectives.
2. Structure pass: nodes + edges + day-node mapping.
3. Content pass: node materials + assessments.
4. Polish pass: seed copy and day context clarity.

### Determinism

- Use low temperature for structure passes.
- Slightly higher temperature for wording polish.
- Keep schema constraints in every pass.

---

## Validation Rules (Minimum)

- `totalDays` equals number of `days`.
- `day_number` is continuous from `1..N`.
- Every `node_key` referenced by day exists in `nodes`.
- Every node assigned to at least one day.
- Edge endpoints exist.
- No cycles in edges.
- Assessment payload matches assessment type.
- Reflection prompts array is non-empty per day.

---

## Testing Plan

### Unit

- Schema validation tests (valid/invalid payloads).
- Graph validator tests (cycle/orphan detection).
- Node/day alignment tests.

### Integration

- End-to-end generation route success path.
- Failure rollback path (partial write prevention).
- Regenerate day/node preserves unaffected data.

### Manual QA

- Generate across 3 topics and 3 age bands.
- Verify workload/day pacing.
- Verify builder editability and publish flow.

---

## Rollout Plan

### Phase 1 (internal)

- Feature flag enabled for admins only.
- Collect generation logs and validation failures.

### Phase 2 (limited beta)

- Allow selected instructors.
- Add regenerate day/node controls.

### Phase 3 (general admin release)

- Default available for all admins.
- Add analytics dashboard for generator quality metrics.

---

## Success Metrics

- Median time to first publishable PathLab draft.
- Percent of generations passing validation without manual structural edits.
- Publish rate from generated drafts.
- Regeneration frequency per draft.
- Post-publish student outcomes (start/quit/explored rates).

---

## Implementation Checklist

### Phase A: Contract + Service

- [ ] Define `types/pathlab-generator.ts`
- [ ] Implement `lib/ai/pathlab-generator-schema.ts`
- [ ] Implement `lib/ai/pathlab-generator.ts`
- [ ] Add `POST /api/pathlab/generate`

### Phase B: Draft Review UX

- [ ] Add `PathLabGenerateModal`
- [ ] Add review panel with warnings
- [ ] Add publish gate

### Phase C: Regeneration + Validation

- [ ] Add regenerate APIs
- [ ] Add validate API
- [ ] Add day/node scoped regenerate controls

### Phase D: Observability + Rollout

- [ ] Add generation logging
- [ ] Add quality metrics
- [ ] Launch behind feature flag

