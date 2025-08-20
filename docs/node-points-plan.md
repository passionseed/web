# Node-level Points & Grading Plan

Goal: Allow instructors to mark nodes/assessments as "graded", set `points_possible`, and allow graders to record `points_awarded` when grading submissions. Keep behavior backwards-compatible and add server + client validation to match DB constraints.

## High-level checklist

```markdown
- [ ] DB: add columns `node_assessments.points_possible`, `node_assessments.is_graded`, `submission_grades.points_awarded` and appropriate constraints/migrations
- [ ] Types: update `types/map.ts` with new fields
- [ ] Server: accept and validate `points_awarded` in grading APIs and auto-graders
- [ ] UI (Node editor): allow instructors to toggle "is graded" and set `points_possible`
- [ ] UI (Grader): show `points_possible` on grade dialog and collect `points_awarded`
- [ ] UI (Student): display points awarded in submission view and progress pages
- [ ] Tests: add unit tests for server validation and auto-grader behavior
- [ ] Docs & migration notes
- [ ] Rollout: migration + feature flag + minor analytics updates
```

## Motivation & constraints
- The DB should remain authoritative: points must be integers (>= 0). We'll enforce server-side validation and optional DB check constraints.
- Existing pass/fail workflow must continue to work. Adding points is an additive feature; if `is_graded` or `points_possible` are not set, behavior remains unchanged.
- Keep UI minimal and consistent with existing components.

## Database changes (migration)
Place a SQL migration under `supabase/migrations/` (or your migrations folder). Example migration:

```sql
-- migration: 2025xxxxxx_add_points_to_assessments_and_grades.sql
BEGIN;

ALTER TABLE public.node_assessments
  ADD COLUMN IF NOT EXISTS points_possible integer NULL,
  ADD COLUMN IF NOT EXISTS is_graded boolean NOT NULL DEFAULT false;

ALTER TABLE public.submission_grades
  ADD COLUMN IF NOT EXISTS points_awarded integer NULL;

-- Ensure non-negative points_awarded
ALTER TABLE public.submission_grades
  ADD CONSTRAINT IF NOT EXISTS submission_grades_points_check
  CHECK (points_awarded IS NULL OR points_awarded >= 0);

COMMIT;
```

Notes:
- We purposely keep `points_possible` nullable so older nodes are unaffected. `is_graded` defaults to false for explicit intent.
- If you want a hard DB constraint to ensure `points_awarded <= points_possible`, you can add a trigger. That is more complex and can be added later.

## Types changes
Update `types/map.ts`:

- NodeAssessment:
  - add `points_possible?: number | null`
  - (optional) use `is_graded?: boolean` if you prefer optional vs required

- SubmissionGrade:
  - add `points_awarded?: number | null`

Example diff (conceptual):
```ts
export interface NodeAssessment {
  id: string;
  node_id: string;
  assessment_type: AssessmentType;
  quiz_questions?: QuizQuestion[];
+  points_possible?: number | null;
+  is_graded?: boolean;
}

export interface SubmissionGrade {
  id: string;
  submission_id: string;
  graded_by: string | null;
  grade: Grade;
  rating?: number;
+  points_awarded?: number | null;
  comments?: string;
  graded_at: string;
}
```

## Server/API changes
Files to update (examples):
- `lib/supabase/grading.ts` — extend `gradeSubmission()` to accept `points_awarded?: number | null` and validate it
- `lib/supabase/assessment.ts` — when auto-grading quizzes, set `points_awarded` equal to the computed correct count or a scaled value
- API routes that accept grading JSON (if you have a `/api/grading` route) — ensure they accept `points_awarded`

Server validation rules:
- If `points_awarded` provided:
  - must be an integer (Number.isInteger)
  - must be >= 0
  - if `points_possible` is known (you may fetch it by assessment id), ensure `points_awarded <= points_possible` (optional but recommended)
- If `points_awarded` is omitted, store `NULL` in DB

API contract for grading endpoint (body JSON):
```json
{
  "submissionId": "uuid",
  "grade": "pass|fail",
  "comments": "string or null",
  "rating": 1|null,
  "points_awarded": 7|null,
  "progressId": "uuid"
}
```

Return shape: existing `SubmissionGrade` object with `points_awarded` populated.

## UI changes
Where to change
- Node editor (instructor-facing): likely `components/map/NodeEditorPanel.tsx` or similar
  - Add a toggle `is_graded` (checkbox)
  - Add a number input `points_possible` (integer >= 1)
  - Persist via existing `batchUpdateMap()` or the node update endpoint

- Grading dialog: `app/map/[id]/grading/grade-submission-form.tsx`
  - If `node_assessments.points_possible` or `is_graded` is present, render a number input for `Points awarded`.
  - Validate it client-side: integer, 0 <= points_awarded <= points_possible
  - Send `points_awarded` along with grade/rating/comments to `gradeSubmission()` server call

- Submission display: `components/map/SubmissionItem.tsx` (attachment)
  - Currently shows {grade.rating}/5. Add points display when `grade.points_awarded` or `node_assessments.points_possible` is present.
  - Example render: `Points: 7 / 10` (or `7 points` if points_possible unknown)

Example UI behavior in grading form (small UX notes):
- Show `Points possible: 10` as a read-only label if node defines it
- Provide input for `Points awarded` defaulted to previous grade.points_awarded or blank
- If `is_graded === false` but instructor tries to award points, show a gentle warning and allow it (or disallow based on product decision)

## Auto-grader updates
- `lib/supabase/assessment.ts` already computes integer 1–5 rating for quizzes; extend logic to also compute `points_awarded` as the number of correct answers (or scaled points)
- Insert `points_awarded` when creating auto-grade entries for quiz submissions

## Tests
Suggested tests to add/update
- Unit tests for `lib/supabase/grading.ts`:
  - Accept valid points_awarded within 0..points_possible
  - Reject non-integer points (e.g., 3.5) and negative numbers
  - Reject points greater than points_possible if you enforce that
- Integration tests for API route that handles grading
- UI tests (React Testing Library) for grade dialog to ensure validation prevents invalid input

## Rollout plan
1. Add migration and types. Deploy server code that tolerates nullable `points_awarded` (no UI yet). This is safe because it only adds nullable columns.
2. Deploy server validation and API acceptance for `points_awarded`.
3. Release Node Editor UI so instructors can set `points_possible` (behind feature flag if desired).
4. Release Grading UI changes to collect `points_awarded`.
5. Monitor for errors and database constraint violations.

## Backwards compatibility & migration notes
- Because `points_possible` and `points_awarded` are nullable and `is_graded` defaults false, no existing data is affected.
- If you want to backfill `points_possible` for existing nodes, create a follow-up migration with sensible defaults.

## Developer checklist (deltas & files likely to edit)
- [ ] `supabase/migrations/2025xxxx_add_points.sql` — migration
- [ ] `types/map.ts` — type updates
- [ ] `lib/supabase/grading.ts` — signature and validation
- [ ] `lib/supabase/assessment.ts` — auto-grade points_awarded set
- [ ] `app/map/[id]/grading/grade-submission-form.tsx` — collect and validate `points_awarded`
- [ ] `components/map/NodeEditorPanel.tsx` — add UI for `is_graded` + `points_possible`
- [ ] `components/map/SubmissionItem.tsx` — display points (update UI shown in attachments)
- [ ] tests/* — unit & integration tests

## Example server-side validation pseudo-code
```ts
function validatePoints(points: number | null | undefined, pointsPossible?: number | null) {
  if (points === null || points === undefined) return null;
  const num = Number(points);
  if (!Number.isInteger(num) || num < 0) throw new Error('points_awarded must be non-negative integer or null');
  if (typeof pointsPossible === 'number' && pointsPossible !== null && num > pointsPossible) {
    throw new Error('points_awarded cannot exceed points_possible');
  }
  return num;
}
```

## UX copy suggestions
- Node Editor: "Graded assessment" toggle with helper text: "Enable grading for this node; instructors can set how many points this assessment is worth."
- Points input placeholder: "Points possible (integer)"
- Grader dialog: label `Points awarded (0 - {points_possible})` and validation error `Must be an integer between 0 and {points_possible}`.

---

If you'd like, I can proceed to implement these changes incrementally. Tell me which of the following you want next and I'll start:

- A) Create the SQL migration + update `types/map.ts` + server validation in `lib/supabase/grading.ts` (safe first step)
- B) Implement the UI pieces (Node editor + grading form + display) after A is done
- C) Create PR-ready patches for all files (migration, types, server, UI) in one go

Which option should I start with?