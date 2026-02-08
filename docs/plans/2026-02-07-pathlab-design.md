# PathLab Design Document

**Date**: 2026-02-07
**Status**: Approved for implementation

---

## Overview

PathLab is a solo, self-paced exploration system within the existing Seeds infrastructure. Students discover paths, work through daily structured experiences, reflect at every step, and make intentional decisions about whether to continue, pause, or quit. Every interaction produces signal. Drop-offs are data, not failure.

PathLab lives inside `/app/seeds` as a seed type (`pathlab`), reusing the existing learning map + node infrastructure with a new day-based experience layer on top.

---

## Core Design Principles

- Friction where it creates signal, zero friction elsewhere
- Easy to start, easy to quit
- Mandatory reflection at decision points
- Asynchronous, self-owned pace (no deadlines, no social pressure, no comparison)
- Evidence over opinions, actions over quiz answers
- Drop-offs are data, not failure
- The system reveals, not recommends
- System decides nothing

---

## Data Model

### Modified Tables

#### `seeds` (add column)
```sql
ALTER TABLE seeds ADD COLUMN seed_type TEXT NOT NULL DEFAULT 'collaborative';
-- Values: 'collaborative' (existing behavior), 'pathlab' (solo self-paced)
```

### New Tables

#### `paths`
Extends a seed with PathLab-specific configuration.

```sql
CREATE TABLE paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id UUID NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
  total_days INT NOT NULL DEFAULT 5,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(seed_id)
);
```

#### `path_days`
Defines the day-by-day structure of a path.

```sql
CREATE TABLE path_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  context_text TEXT NOT NULL,              -- "Why today matters"
  reflection_prompts JSONB DEFAULT '[]',   -- custom prompts beyond defaults
  node_ids UUID[] NOT NULL DEFAULT '{}',   -- ordered map_node IDs for this day
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(path_id, day_number)
);
```

#### `path_enrollments`
Tracks a student's journey through a path.

```sql
CREATE TABLE path_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  path_id UUID NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
  current_day INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',   -- active, paused, quit, explored
  why_joined TEXT,                          -- captured at enrollment
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, path_id)
);
```

#### `path_reflections`
Daily reflection data captured after each day's action phase.

```sql
CREATE TABLE path_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES path_enrollments(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  energy_level INT NOT NULL CHECK (energy_level BETWEEN 1 AND 5),
  confusion_level INT NOT NULL CHECK (confusion_level BETWEEN 1 AND 5),
  interest_level INT NOT NULL CHECK (interest_level BETWEEN 1 AND 5),
  open_response TEXT,                      -- "What stood out to you?"
  decision TEXT NOT NULL,                  -- continue_now, continue_tomorrow, pause, quit
  time_spent_minutes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, day_number)
);
```

#### `path_exit_reflections`
Captured when a student chooses "This isn't for me."

```sql
CREATE TABLE path_exit_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES path_enrollments(id) ON DELETE CASCADE,
  trigger_day INT NOT NULL,
  reason_category TEXT NOT NULL,           -- boring, confusing, stressful, not_me
  interest_change TEXT NOT NULL,           -- more, less, same
  open_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id)
);
```

#### `path_end_reflections`
Captured when a student completes the entire path.

```sql
CREATE TABLE path_end_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES path_enrollments(id) ON DELETE CASCADE,
  overall_interest INT NOT NULL CHECK (overall_interest BETWEEN 1 AND 5),
  fit_level INT NOT NULL CHECK (fit_level BETWEEN 1 AND 5),
  surprise_response TEXT,                  -- "What surprised you most?"
  would_explore_deeper TEXT NOT NULL,      -- yes, maybe, no
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id)
);
```

#### `path_reports`
Admin-generated direction reports for parents.

```sql
CREATE TABLE path_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES path_enrollments(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  report_data JSONB NOT NULL,              -- computed trends, insights
  report_text TEXT,                        -- admin-edited narrative
  share_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### RLS Policies

- Students can read/write their own enrollments, reflections, and exit reflections
- Students can read path and path_day data for paths they're enrolled in
- Admins can read all data, generate reports
- Reports with share_token are publicly readable (no auth required)

---

## UX Flow

### 1. Discovery (Seeds Gallery)

The seeds gallery at `/app/seeds` gets a filter/tab system:
- **Workshops** (collaborative seeds, existing behavior)
- **PathLab** (solo explorations)

PathLab seed cards show:
- Title, slogan, category
- Duration: "5-day exploration"
- No participant count, no room code

### 2. Path Detail (`/app/seeds/[id]`)

For PathLab seeds, the detail page shows:
- Description of what the path explores
- Brief explanation of how it works (the daily ritual)
- Duration: "5 days, ~30 min each"
- **"Begin Path"** button

On "Begin Path":
- Show a single input: "What made you curious about this?" (captures `why_joined`)
- Create `path_enrollment`
- Auto-enroll user in the underlying learning map
- Redirect to the daily experience

### 3. Daily Experience (`/app/seeds/pathlab/[enrollmentId]`)

Single-screen experience with 4 sequential phases:

#### Phase 1: Context
- Card displaying "Why today matters" text
- Day indicator (subtle, e.g., "Day 3")
- "Got it" button to proceed

#### Phase 2: Action
- The actual node content + assessment from the learning map
- Reuses existing NodePanel/content display components
- No map graph view - just the content, stripped down
- Student completes the task and submits

#### Phase 3: Reflection
After submission, the reflection form appears:
- Energy level (1-5 slider): "How's your energy?"
- Confusion level (1-5 slider): "How confused are you?"
- Interest level (1-5 slider): "How interested are you?"
- Open text: "What stood out to you?"

#### Phase 4: Decision Gate
"What's next?" with 4 clear options:

1. **"Next day"** - Immediately unlocks and starts the next day. For students in flow.
2. **"Continue tomorrow"** - Saves progress. Default engaged-but-done-for-now option.
3. **"Explore something else first"** - Status = `paused`. Returns to PathLab gallery. Can resume anytime.
4. **"This isn't for me"** - Triggers exit reflection flow.

**Critical**: Never auto-advance. The student always makes an intentional decision.

### 4. Exit Reflection (inline)

Triggered when student chooses "This isn't for me":

- Message: "Quitting is a valid outcome. Before you go:"
- Reason category (radio buttons): boring / confusing / stressful / not me
- Interest change (radio buttons): more interest / less interest / same
- Optional open text
- "Finish" button
- Status = `quit`

### 5. Path Completion

After the last day's reflection (no decision gate on final day):

1. **Trend Summary** - Visual display of energy/interest/confusion trends across all days. "Here's what you discovered about yourself."
2. **End Reflection** (mandatory):
   - Overall interest (1-5): "How interested are you in this area now?"
   - Fit (1-5): "How well did this fit how you like to think and work?"
   - "What surprised you most?" (text)
   - "Would you explore deeper in this area?" (yes / maybe / no)
3. Status = `explored`

### Completion States

| State | Meaning |
|-------|---------|
| `active` | Currently working through the path |
| `paused` | Chose "Explore something else first" |
| `quit` | Chose "This isn't for me" + completed exit reflection |
| `explored` | Finished all days + completed end reflection |

Badge label: **"Explored"** (not "Completed")

---

## Admin System

### Path Builder (`/app/seeds/[id]/pathlab-builder`)

Visual day timeline editor:

- **Day cards** in sequence: Day 1 -> Day 2 -> ... -> Day N
- Each day card:
  - Context text field ("Why today matters")
  - Node selector: drag/assign map nodes from the linked learning map
  - Custom reflection prompt (optional, beyond the default 3 scales)
- "Add Day" button
- Reorder via drag-and-drop
- Preview button (walk through as student would see it)

**The builder does NOT handle:**
- Node content editing (stays in Map Editor)
- Assessment configuration (stays in Map Editor)
- Only manages: day ordering, context text, reflection customization, node-to-day mapping

### Student Analytics (`/app/seeds/[id]/reports`)

For admin viewing of PathLab seed data:

**Student List Table:**
- Name, status (active/paused/quit/explored), current day, enrolled date

**Student Detail View (click a student):**
- Day-by-day timeline with energy/confusion/interest mini-charts
- Trend line graph of 3 metrics over days
- Time spent per day
- Exit reflection data (if quit)
- End reflection data (if explored)

### Direction Report Generation

- Admin clicks "Generate Report" on a student's detail view
- Pre-filled template based on data:
  - What the student did (days completed, total time)
  - Energy peaks and dips
  - Interest trend direction
  - Quit reason (if applicable)
  - End reflection summary (if completed)
- Admin edits the narrative text
- "Create shareable link" -> generates unique `share_token`
- Public page at `/report/[shareToken]` - read-only, no login required

---

## Technical Architecture

### New Files

**Database:**
- `supabase/migrations/XXXXXX_create_pathlab_tables.sql`

**Types:**
- `types/pathlab.ts` - All PathLab type definitions

**Data Access:**
- `lib/supabase/pathlab.ts` - Path CRUD, enrollment, day data
- `lib/supabase/pathlab-reflections.ts` - Reflection capture and retrieval
- `lib/supabase/pathlab-reports.ts` - Report generation and sharing

**Pages:**
- `app/seeds/pathlab/[enrollmentId]/page.tsx` - Daily experience
- `app/seeds/[id]/pathlab-builder/page.tsx` - Admin day builder
- `app/seeds/[id]/reports/page.tsx` - Admin student analytics
- `app/report/[shareToken]/page.tsx` - Public report view

**Components:**
- `components/pathlab/PathLabExperience.tsx` - Main daily flow orchestrator
- `components/pathlab/ContextPhase.tsx` - "Why today matters" display
- `components/pathlab/ReflectionForm.tsx` - 3 sliders + open text
- `components/pathlab/DecisionGate.tsx` - 4 decision options
- `components/pathlab/ExitReflection.tsx` - Quit flow
- `components/pathlab/EndReflection.tsx` - Completion flow
- `components/pathlab/TrendSummary.tsx` - Visual trend display
- `components/pathlab/PathDayBuilder.tsx` - Admin day configuration
- `components/pathlab/StudentDetail.tsx` - Admin student analytics
- `components/pathlab/ReportGenerator.tsx` - Admin report creation

**API Routes:**
- `app/api/pathlab/enroll/route.ts` - Create enrollment
- `app/api/pathlab/reflect/route.ts` - Submit reflection
- `app/api/pathlab/reports/route.ts` - Generate report

### Modified Files

- `seeds` table migration (add `seed_type` column)
- `components/seeds/SeedGallery.tsx` - Add PathLab filter/tab
- `app/seeds/[id]/page.tsx` - PathLab variant of detail page
- `components/seeds/CreateSeedModal.tsx` - PathLab creation option
- `components/seeds/GameBoxCard.tsx` - PathLab card style variant

---

## Implementation Phases

### Phase 1: Day Flow + Decision Gates (Core Loop)
- Database migration (all tables)
- Path enrollment flow (begin path + why_joined)
- Daily experience page with 4 phases
- Decision gate with 4 options
- Seeds gallery PathLab tab

### Phase 2: Reflection + Quit System
- Reflection form component
- Exit reflection flow
- End reflection component
- Trend summary visualization
- Enrollment status management (pause/quit/explored)

### Phase 3: Admin Analytics + Reports
- Student list and detail views
- Trend charts
- Report generation with editable template
- Shareable public report page

### Phase 4: Path Builder
- Day timeline builder UI
- Node-to-day mapping
- Context text editor
- Preview mode

### Future (not in initial build)
- AI-powered assignment checking
- Auto-generated report drafts from reflection data
- "Try a different path" smart recommendations based on exit data
- Parent account dashboard
- Longitudinal directional fingerprint across multiple paths
- Counselor access with evidence summaries

---

## What This System Avoids (by design)

- Personality tests
- Career matching algorithms
- "You should be X" recommendations
- Leaderboards
- Pass/fail grading
- Deadlines
- Social comparison
- Auto-advancing

These destroy trust and long-term credibility. PathLab is a mirror, not a judge.
