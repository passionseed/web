# PathLab All Activities Editing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Seed/PathLab builder correctly load, edit, and save all activity/content shapes used by current migrations, without data loss.

**Architecture:** Move the editor from a single-format/single-content model to an activity-content collection model driven by `path_content[]` + optional `path_assessment`. Introduce deterministic mapping between DB records and UI blocks, and ensure save is transactional enough to avoid partial destructive writes.

**Tech Stack:** Next.js App Router, React client components, Supabase (`path_activities`, `path_content`, `path_assessments`), TypeScript.

---

## What the migration proves (scope baseline)

From `supabase/migrations/20260320175400_web_developer_pathlab_seed.sql`, activities include:
- Multi-content activities (for example `text` + multiple `resource_link` rows).
- Content types: `npc_chat`, `ai_chat`, `text`, `resource_link`, `daily_prompt`, `reflection_card`.
- Metadata-heavy content bodies (`jsonb` payloads).

Current editor mismatches:
- `components/pathlab/PathActivityEditor.tsx` treats activity as one format + one content row.
- On edit-save, it deletes all existing content/assessment and recreates one shape.
- `daily_prompt` is configured as assessment-only in UI, but seeded data stores it as `path_content`.
- `reflection_card` is present in DB but missing in format selection.
- Timeline components still reference removed `activity_type`.

---

### Task 1: Define canonical activity editing model

**Files:**
- Modify: `types/pathlab-content.ts`
- Modify: `types/pathlab.ts`

**Step 1: Add explicit builder editing types**
- Introduce helper types for builder-only editing:
  - `BuilderContentBlock` (mirrors each `path_content` row)
  - `BuilderAssessmentConfig` (optional)
  - `BuilderActivityDraft` (title, instructions, required, estimate, blocks[], assessment)

**Step 2: Add DB-to-builder mapping utility types**
- Ensure type-safe conversion for:
  - `FullPathActivity -> BuilderActivityDraft`
  - `BuilderActivityDraft -> API payloads`

**Step 3: Keep backward compatibility**
- Do not break existing `FullPathActivity`.
- Add new types only; no table assumptions beyond current schema.

---

### Task 2: Replace single-format editor behavior with block-based editing

**Files:**
- Modify: `components/pathlab/PathActivityEditor.tsx`

**Step 1: Initialize from all content rows**
- Build local editor state from every `activity.path_content` row (ordered by `display_order`).
- Preserve each row’s `content_type`, title/url/body/metadata.

**Step 2: Support all content types used now**
- Ensure selectable/editable blocks include at least:
  - `text`, `resource_link`, `video`, `short_video`, `canva_slide`, `image`, `pdf`
  - `daily_prompt`, `reflection_card`, `emotion_check`, `progress_snapshot`
  - `ai_chat`, `npc_chat`

**Step 3: Fix `daily_prompt` and `reflection_card` semantics**
- Treat `daily_prompt` as content (`path_content`) in builder.
- Add `reflection_card` UI path (body + metadata prompts).
- Keep assessment-only types exclusively in `path_assessments`.

**Step 4: Preserve optional assessment attachment**
- For content activities, retain optional assessment creation/editing.
- Prevent invalid assessment types that violate DB constraints.

---

### Task 3: Safe save strategy (no content loss)

**Files:**
- Modify: `components/pathlab/PathActivityEditor.tsx`
- Modify: `app/api/pathlab/content/route.ts` (if needed for bulk upsert)
- Modify: `lib/supabase/pathlab-activities.ts` (if needed for helper functions)

**Step 1: Avoid destructive “delete all then recreate one”**
- Replace with deterministic sync:
  - Update existing content rows by ID.
  - Insert new rows.
  - Delete only removed rows.
  - Reindex `display_order`.

**Step 2: Validate before mutation**
- Block save on invalid/empty required fields per block type.
- Keep draft mode, but never erase valid existing rows during failed save.

**Step 3: Keep assessment sync explicit**
- If assessment exists and still enabled -> update.
- If removed in UI -> delete assessment.
- If added -> create.

---

### Task 4: Clean up removed `activity_type` usage in builder UI

**Files:**
- Modify: `components/pathlab/PageBuilder/PageTimeline.tsx`
- Modify: `components/pathlab/PathDayBuilder.tsx`
- Modify: `components/pathlab/PageBuilder/ActivityLibrary.tsx`
- Modify: `app/api/pathlab/library/route.ts` (if required by `ActivityLibrary`)

**Step 1: Replace display label source**
- Derive activity label from:
  - primary content type (`path_content[0]?.content_type`) OR
  - assessment type.

**Step 2: Remove stale `PathActivityType` coupling**
- Eliminate compile/runtime references to removed schema field.
- Keep badges/icons using content/assessment categories.

**Step 3: Ensure both builders render same labels**
- Align `PathDayBuilder` and `PageTimeline` badge logic.

---

### Task 5: Cover migration-shaped regression tests

**Files:**
- Create/Modify: `lib/expert-interview/pathlab-transformer.test.ts` (or nearby existing pathlab tests)
- Create: `components/pathlab/__tests__/PathActivityEditor.test.tsx` (if test setup exists)

**Step 1: Add data fixtures matching seed migration**
- Include activity fixture with:
  - multiple content rows,
  - `daily_prompt` as content,
  - `reflection_card`,
  - `ai_chat`/`npc_chat` metadata.

**Step 2: Add edit-save invariants**
- Editing one block does not delete other blocks.
- Save preserves count/order/content types.
- `daily_prompt` remains in `path_content`, not reassigned to assessment.

**Step 3: Add UI smoke checks**
- Existing seeded activities open editor without errors.
- All supported types show editable controls.

---

### Task 6: Manual verification checklist

**Files:**
- No code file (execution checklist)

**Step 1: Open builder for seeded path**
- Visit `/seeds/<seedId>/pathlab-builder`.

**Step 2: Verify representative activities**
- Edit:
  - Day 1 Tool Setup (`text + links`)
  - Day 2 Project Brief (`daily_prompt`)
  - Day 2 or 4 reflection (`reflection_card`)
  - AI chat activity
  - NPC chat activity

**Step 3: Save + reload**
- Confirm no content rows disappear.
- Confirm order remains stable.
- Confirm student view still renders activity.

---

### Risk notes

- Highest risk: accidental content deletion when transitioning save strategy.
- Secondary risk: UI complexity growth in `PathActivityEditor`; consider extracting per-type block editors.
- Migration data has inconsistent npc payload shapes (`role/content` vs `sender/text`); editor should preserve raw JSON rather than normalizing destructively.

---

### Recommended approach

1. **Primary (recommended):** Block-based editor + non-destructive sync (Tasks 1-4), then tests and manual validation (Tasks 5-6).
   - Pros: fixes root cause and future-proofs new content types.
   - Cons: larger refactor.

2. **Short-term patch:** Add missing types (`reflection_card`, correct `daily_prompt` handling) and stop deleting all rows on save by disabling edits for multi-content activities.
   - Pros: quick mitigation.
   - Cons: still incomplete and frustrating UX.

3. **Hybrid rollout:** Ship short-term patch first, then block editor in follow-up.
   - Pros: fast safety + long-term fix.
   - Cons: two change waves.

**Recommendation:** Option 1, because your seeded curriculum already depends on mixed-content activities and metadata-rich types; partial fixes will continue to break authoring.
