# Team Direction Embeddings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins a holistic "where is each team heading?" view by embedding each team's combined submissions (team + individual member) across all activities into a single composite vector, then clustering those team-level vectors on a scatter plot.

**Problem:** Current embeddings are per-submission per-activity. There is no cross-activity team-level vector. Admins can only cluster submissions within a single activity — they cannot see how teams diverge or converge across the entire hackathon.

**Architecture:** New `hackathon_team_direction_embeddings` table stores one BGE-M3 vector per team. A `lib/embeddings/team-direction.ts` module collects all text from a team's submissions, concatenates it into a structured composite document, embeds it, and upserts the row. A new clustering pipeline and admin UI reuse the existing kmeans/UMAP infra to visualize team trajectories.

**Tech Stack:** Next.js 15 App Router, React, TypeScript, Tailwind CSS, Shadcn/ui, pgvector, BGE-M3 via TEI, existing `lib/clustering/*` modules

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/2026MMDD_hackathon_team_direction_embeddings.sql` | New table + clustering tables + RLS |
| Create | `lib/embeddings/team-direction.ts` | Collect team text → embed → upsert |
| Create | `scripts/backfill-team-direction-embeddings.ts` | One-shot backfill for all teams |
| Create | `lib/clustering/team-direction.ts` | Recluster team-direction vectors |
| Create | `app/api/admin/hackathon/team-directions/clusters/route.ts` | GET latest + POST recluster |
| Create | `components/admin/TeamDirectionClusterView.tsx` | Scatter plot + legend (reuse canvas pattern) |
| Create | `app/admin/hackathon/team-directions/page.tsx` | Page shell for the cluster view |
| Modify | `components/admin/HackathonNav.tsx` | Add "Team Directions" nav item |
| Modify | `app/api/hackathon/submit/route.ts` | Fire-and-forget team direction re-embed on submit |
| Modify | `app/api/admin/hackathon/submissions/[scope]/[id]/review/route.ts` | Re-embed after review status change |

---

## Task 1: Database migration — `hackathon_team_direction_embeddings` + clustering tables

**Files:**
- Create: `supabase/migrations/2026MMDD_hackathon_team_direction_embeddings.sql`

- [ ] **Step 1: Create `hackathon_team_direction_embeddings` table**

```sql
create table if not exists public.hackathon_team_direction_embeddings (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.hackathon_teams(id) on delete cascade,
  source_text text not null,
  text_hash   text not null,
  embedding   vector(1024) not null,
  model       text not null default 'BAAI/bge-m3',
  generated_at timestamptz not null default now(),
  unique (team_id)
);

create index if not exists hackathon_team_direction_embeddings_ivfflat
  on public.hackathon_team_direction_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 20);
```

One row per team. The `unique(team_id)` constraint means upserts replace the old vector whenever the team's composite text changes.

- [ ] **Step 2: Create `hackathon_team_direction_clusterings` table**

```sql
create table if not exists public.hackathon_team_direction_clusterings (
  id              uuid primary key default gen_random_uuid(),
  algorithm       text not null default 'kmeans',
  k               integer not null,
  sample_count    integer not null,
  created_at      timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  is_latest       boolean not null default true
);

-- Enforces at most one is_latest=true row globally (no activity_id scoping).
create unique index if not exists hackathon_team_direction_clusterings_latest_unique
  on public.hackathon_team_direction_clusterings((true)) where is_latest;
```

Only one `is_latest = true` row at a time — this is global across all teams.

- [ ] **Step 3: Create `hackathon_team_direction_clusters` and `hackathon_team_direction_cluster_assignments` tables**

```sql
create table if not exists public.hackathon_team_direction_clusters (
  id              uuid primary key default gen_random_uuid(),
  clustering_id   uuid not null references public.hackathon_team_direction_clusterings(id) on delete cascade,
  cluster_index   integer not null,
  label           text,
  summary         text,
  member_count    integer not null default 0,
  centroid        vector(1024),
  centroid_2d     vector(2),
  color           text,
  unique (clustering_id, cluster_index)
);

create table if not exists public.hackathon_team_direction_cluster_assignments (
  id              uuid primary key default gen_random_uuid(),
  clustering_id   uuid not null references public.hackathon_team_direction_clusterings(id) on delete cascade,
  embedding_id    uuid not null references public.hackathon_team_direction_embeddings(id) on delete cascade,
  cluster_id      uuid not null references public.hackathon_team_direction_clusters(id) on delete cascade,
  projection_2d   vector(2),
  distance_to_centroid real,
  created_at      timestamptz not null default now(),
  unique (clustering_id, embedding_id)
);

create index if not exists hackathon_team_direction_cluster_assignments_cluster_idx
  on public.hackathon_team_direction_cluster_assignments(cluster_id);
```

- [ ] **Step 4: RLS — admin read, service_role write**

```sql
alter table public.hackathon_team_direction_embeddings enable row level security;
alter table public.hackathon_team_direction_clusterings enable row level security;
alter table public.hackathon_team_direction_clusters enable row level security;
alter table public.hackathon_team_direction_cluster_assignments enable row level security;

grant select on table public.hackathon_team_direction_embeddings to authenticated;
grant select on table public.hackathon_team_direction_clusterings to authenticated;
grant select on table public.hackathon_team_direction_clusters to authenticated;
grant select on table public.hackathon_team_direction_cluster_assignments to authenticated;

grant all on table public.hackathon_team_direction_embeddings to service_role;
grant all on table public.hackathon_team_direction_clusterings to service_role;
grant all on table public.hackathon_team_direction_clusters to service_role;
grant all on table public.hackathon_team_direction_cluster_assignments to service_role;

-- Admin-only read policies (same pattern as submission_embeddings)
create policy "Admins read hackathon team direction embeddings"
  on public.hackathon_team_direction_embeddings for select
  using (exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  ));

create policy "Admins read hackathon team direction clusterings"
  on public.hackathon_team_direction_clusterings for select
  using (exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  ));

create policy "Admins read hackathon team direction clusters"
  on public.hackathon_team_direction_clusters for select
  using (exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  ));

create policy "Admins read hackathon team direction cluster assignments"
  on public.hackathon_team_direction_cluster_assignments for select
  using (exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  ));
```

---

## Task 2: Team direction embedding module — `lib/embeddings/team-direction.ts`

**Files:**
- Create: `lib/embeddings/team-direction.ts`

This module collects all text a team has produced, builds a structured composite document, embeds it, and upserts the row.

- [ ] **Step 1: Create `collectTeamText` function**

Queries all team submissions + individual member submissions across all activities. Returns a single concatenated string structured as:

```
## Team: {team_name}

### Activity: {activity_title} (Team Submission)
{text_answer}

### Activity: {activity_title} (Individual — {member_name})
{text_answer}

...
```

Implementation:
1. Fetch team name from `hackathon_teams`
2. Fetch all `hackathon_phase_activity_team_submissions` for the team (non-draft), joining `hackathon_phase_activities(title)`
3. Fetch all member participant_ids from `hackathon_team_members`
4. Fetch all `hackathon_phase_activity_submissions` for those participant_ids (non-draft), joining `hackathon_phase_activities(title)` and `hackathon_participants(name)`
5. Sort by activity display_order, then team submissions before individual
6. Concatenate into the structured format above
7. Return the composite text (empty string if no submissions)

- [ ] **Step 2: Create `upsertTeamDirectionEmbedding` function**

```typescript
export async function upsertTeamDirectionEmbedding(
  teamId: string,
  adminClient?: SupabaseClient
): Promise<void>
```

1. Call `collectTeamText(teamId, adminClient)`
2. If empty, return (no-op)
3. Hash the text with `hashText()`
4. Check existing row in `hackathon_team_direction_embeddings` for this team_id
5. If hash matches, return (dedup — same as `submission_embeddings` pattern)
6. Call `embedText()` from `lib/embeddings/bge.ts`
7. Upsert the row (insert or update by team_id)

- [ ] **Step 3: Create `fireAndForgetTeamDirectionEmbed` wrapper**

Same pattern as `fireAndForgetEmbedSubmission` — swallows errors after logging so TEI outages don't break the submit flow.

```typescript
export function fireAndForgetTeamDirectionEmbed(
  teamId: string,
  adminClient?: SupabaseClient
): void {
  void upsertTeamDirectionEmbedding(teamId, adminClient).catch((err) => {
    console.error("[team-direction-embedding] background embed failed", {
      teamId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
```

---

## Task 3: Backfill script — `scripts/backfill-team-direction-embeddings.ts`

**Files:**
- Create: `scripts/backfill-team-direction-embeddings.ts`

Usage: `pnpm tsx scripts/backfill-team-direction-embeddings.ts`

- [ ] **Step 1: Implement backfill script**

1. Fetch all team IDs from `hackathon_teams`
2. For each team, call `collectTeamText()` to get composite text
3. Fetch existing `hackathon_team_direction_embeddings` rows and build a hash map
4. Filter to teams whose text hash differs from existing (or has no row)
5. Batch embed with `embedTexts()` (batch size 16 — composite texts are longer)
6. Upsert rows into `hackathon_team_direction_embeddings`
7. Log progress: `[12/45] embedding team "Team Alpha"...`

---

## Task 4: Team direction clustering — `lib/clustering/team-direction.ts`

**Files:**
- Create: `lib/clustering/team-direction.ts`

- [ ] **Step 1: Create `reclusterTeamDirections` function**

Follows the same pattern as `reclusterActivity` in `lib/clustering/run.ts` but operates on `hackathon_team_direction_embeddings` instead of `submission_embeddings`:

1. Fetch all rows from `hackathon_team_direction_embeddings`
2. Parse vectors
3. Run `suggestClusterCount()` + `runKMeans()` from `lib/clustering/kmeans.ts`
4. Run `project2D()` from `lib/clustering/umap.ts`
5. Flip previous `is_latest` in `hackathon_team_direction_clusterings`
6. Insert new clustering row
7. Insert cluster rows into `hackathon_team_direction_clusters`
8. Insert assignment rows into `hackathon_team_direction_cluster_assignments`
9. Return `{ clusteringId, k, sampleCount }`

---

## Task 5: Admin API — `app/api/admin/hackathon/team-directions/clusters/route.ts`

**Files:**
- Create: `app/api/admin/hackathon/team-directions/clusters/route.ts`

- [ ] **Step 1: Implement GET handler**

Same auth check as the activity clusters route (`requireAdminUser`). Returns:

```json
{
  "clustering": { "id", "k", "sample_count", "created_at", "algorithm" } | null,
  "clusters": [{ "id", "cluster_index", "label", "summary", "member_count", "color" }],
  "points": [{
    "assignmentId", "clusterId", "embeddingId",
    "teamId", "teamName", "snippet",
    "x", "y", "distance"
  }]
}
```

Query flow:
1. Fetch latest `hackathon_team_direction_clusterings` where `is_latest = true`
2. If none, return empty payload
3. Fetch clusters + assignments, joining `hackathon_team_direction_embeddings` → `hackathon_teams(id, name)`
4. Map to response shape with 2D projection coordinates and text snippet (first 240 chars)

- [ ] **Step 2: Implement POST handler**

Calls `reclusterTeamDirections({ createdByUserId })` and returns the result.

---

## Task 6: Admin UI — `TeamDirectionClusterView` component

**Files:**
- Create: `components/admin/TeamDirectionClusterView.tsx`

- [ ] **Step 1: Build the scatter plot component**

Reuse the exact same canvas-based scatter plot pattern from `SubmissionClusterView.tsx`:
- Fetch from `/api/admin/hackathon/team-directions/clusters`
- Canvas rendering with pan/zoom (same `transform` state + mouse handlers)
- Cluster legend sidebar (same layout)
- Hover popover showing team name + text snippet (instead of submission scope)
- Recluster button triggering POST

Key differences from `SubmissionClusterView`:
- No `activityId` prop — this is global
- Hover popover shows "Team: {teamName}" instead of "Individual/Team submission"
- Points represent teams, not individual submissions

---

## Task 7: Wire into hackathon admin nav

**Files:**
- Create: `app/admin/hackathon/team-directions/page.tsx`
- Modify: `components/admin/HackathonNav.tsx`

- [ ] **Step 1: Create the page shell**

Same pattern as `app/admin/hackathon/activities/[activityId]/clusters/page.tsx`:

```typescript
import { TeamDirectionClusterView } from "@/components/admin/TeamDirectionClusterView";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function TeamDirectionsPage() {
  await requireAdmin();
  return (
    <div className="container mx-auto space-y-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Team Directions</h1>
        <p className="text-sm text-muted-foreground">
          Where each team is heading — semantic clusters of all combined submissions per team.
        </p>
      </div>
      <TeamDirectionClusterView />
    </div>
  );
}
```

- [ ] **Step 2: Add nav item to `HackathonNav`**

Add `{ href: "/admin/hackathon/team-directions", label: "Team Directions" }` to the `HACKATHON_ITEMS` array in `components/admin/HackathonNav.tsx`.

---

## Task 8: Trigger re-embedding on submit and review

**Files:**
- Modify: `app/api/hackathon/submit/route.ts`
- Modify: `app/api/admin/hackathon/submissions/[scope]/[id]/review/route.ts`

- [ ] **Step 1: Fire-and-forget on submission**

In the submit route, after the existing `fireAndForgetEmbedSubmission` call, add:

```typescript
import { fireAndForgetTeamDirectionEmbed } from "@/lib/embeddings/team-direction";

// After successful submission upsert:
fireAndForgetTeamDirectionEmbed(teamId);
```

Resolve `teamId` from the submission context:
- For team-scoped submissions: `teamId` is already available
- For individual-scoped submissions: look up the participant's team via `hackathon_team_members`

- [ ] **Step 2: Fire-and-forget on review status change**

In the review route, after persisting the review, look up the team for the submission and call `fireAndForgetTeamDirectionEmbed(teamId)`. This ensures the composite text (which doesn't change on review) stays current — but more importantly, it's a natural trigger point if we later include review feedback in the composite text.

---

## Design Decisions

1. **Composite text, not mean-pooled vectors.** Concatenating all submission text into one document and embedding it produces a single coherent vector that captures thematic direction. Mean-pooling existing per-submission vectors would lose cross-activity relationships that BGE-M3 can capture from the full context.

2. **Separate tables, not reusing `submission_embeddings`.** Team direction embeddings are a fundamentally different entity (one per team, cross-activity) vs. submission embeddings (one per submission, per-activity). Separate `hackathon_team_direction_*` tables keep queries clean and avoid scope confusion.

3. **Hash-based dedup.** Same pattern as existing submission embeddings — if the composite text hasn't changed (SHA-256 match), skip the TEI call. This makes re-runs and triggers idempotent.

4. **Fire-and-forget triggers.** Team direction embedding is non-critical to the submit flow. TEI outages should never block students from submitting. The backfill script handles catch-up.

5. **Global clustering (no activity_id).** Unlike submission clusters which are per-activity, team direction clusters are global — one scatter plot showing all teams' trajectories across the entire hackathon.

---

## Rollout

1. Run migration
2. Run `pnpm tsx scripts/backfill-team-direction-embeddings.ts` to embed all existing teams
3. Deploy code — new submissions auto-trigger re-embedding
4. Admin clicks "Recluster" in the new Team Directions view to generate the first clustering
