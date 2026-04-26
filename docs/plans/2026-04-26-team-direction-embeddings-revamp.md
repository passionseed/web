# Team Direction Embeddings Revamp — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the fragile fire-and-forget embedding pipeline into a bulletproof job-queue system with multi-aspect team profiles, temporal tracking, smart auto-labeled clustering, semantic search, RAG-powered insights, and a rich interactive admin dashboard.

**Architecture:** Simple job queue for embedding (status/attempts/error — no multi-step pipeline needed since embedding is <1s). Add lightweight AI profile extraction that structures team submissions into mission/tech/market aspects before embedding, enabling semantic search and RAG. Store temporal snapshots with auto-pruning (last 3 per team). Replace static K-means with auto-labeled hierarchical clustering. Decouple reclustering from embedding to prevent thundering herd. Build a searchable, filterable admin UI with an "Ask AI" RAG panel.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Shadcn/ui, Supabase (PostgreSQL + pgvector), BGE-M3 via TEI, AI SDK (`ai` package with `generateObject`), existing `lib/clustering/*` modules, Canvas API for scatter plots

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260426_team_direction_embed_jobs.sql` | Job queue + snapshots + search cache tables |
| Create | `lib/embeddings/jobs.ts` | Job queue operations (enqueue, claim, complete, fail) |
| Create | `lib/embeddings/profile-extractor.ts` | AI-powered team profile extraction |
| Create | `lib/embeddings/search.ts` | Semantic search over team embeddings |
| Create | `lib/embeddings/rag.ts` | RAG pipeline for team insights |
| Create | `lib/clustering/auto-label.ts` | LLM-powered cluster auto-labeling |
| Create | `lib/clustering/hierarchical.ts` | Hierarchical clustering option |
| Create | `app/api/embeddings/enqueue/route.ts` | Create embedding job |
| Create | `app/api/embeddings/process/[jobId]/route.ts` | Process embedding job step-by-step |
| Create | `app/api/embeddings/status/[jobId]/route.ts` | Poll job status |
| Create | `app/api/admin/hackathon/team-directions/search/route.ts` | Semantic search API |
| Create | `app/api/admin/hackathon/team-directions/rag/route.ts` | RAG question-answering API |
| Create | `app/api/admin/hackathon/team-directions/snapshots/route.ts` | Temporal snapshot API |
| Modify | `lib/embeddings/team-direction.ts` | Replace fire-and-forget with job enqueue |
| Modify | `lib/embeddings/bge.ts` | Add batch embedding with progress callback |
| Modify | `lib/clustering/team-direction.ts` | Add auto-labeling hook, hierarchical option |
| Modify | `app/api/admin/hackathon/team-directions/clusters/route.ts` | Add auto-labeling after recluster |
| Create | `app/api/admin/hackathon/team-directions/recluster/route.ts` | Scheduled reclustering trigger |
| Modify | `app/api/hackathon/submit/route.ts` | Enqueue embed job instead of fire-and-forget |
| Modify | `app/api/admin/hackathon/submissions/[scope]/[id]/review/route.ts` | Enqueue embed job on review |
| Modify | `app/api/admin/hackathon/team-directions/clusters/route.ts` | Add hierarchical clusters endpoint |
| Create | `components/admin/TeamDirectionDashboard.tsx` | Main dashboard shell |
| Create | `components/admin/TeamDirectionSearch.tsx` | Semantic search + filters |
| Create | `components/admin/TeamDirectionRagPanel.tsx` | Ask AI RAG panel |
| Create | `components/admin/TeamDirectionTimeline.tsx` | Temporal trajectory view |
| Create | `components/admin/TeamDirectionCompare.tsx` | Team comparison mode |
| Modify | `components/admin/TeamDirectionClusterView.tsx` | Add auto-labels, hover details, click-to-expand |
| Modify | `app/admin/hackathon/team-directions/page.tsx` | New dashboard shell |

---

## Task 1: Database Migration — Job Queue + Snapshots + Search Cache

**Files:**
- Create: `supabase/migrations/20260426_team_direction_embed_jobs.sql`

### Step 1: Create `team_direction_embed_jobs` table

```sql
-- Simple job queue for team direction embedding with retry support
-- NOTE: Intentionally simple — embedding is <1s, no need for multi-step pipeline
CREATE TABLE IF NOT EXISTS public.team_direction_embed_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  trigger_source TEXT NOT NULL DEFAULT 'submission' CHECK (trigger_source IN ('submission', 'review', 'backfill', 'manual')),
  
  -- Retry tracking
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processed_by TEXT, -- processor ID for claim lock
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_direction_embed_jobs_status_idx 
  ON public.team_direction_embed_jobs(status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS team_direction_embed_jobs_team_idx 
  ON public.team_direction_embed_jobs(team_id);
```

### Step 2: Create `hackathon_team_direction_snapshots` table

```sql
-- Temporal snapshots for tracking team direction evolution
CREATE TABLE IF NOT EXISTS public.hackathon_team_direction_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES public.hackathon_program_phases(id) ON DELETE SET NULL,
  
  -- Structured profile (extracted by AI)
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Multi-aspect embeddings
  mission_embedding VECTOR(1024),
  tech_embedding VECTOR(1024),
  market_embedding VECTOR(1024),
  composite_embedding VECTOR(1024) NOT NULL,
  
  -- Metadata
  source_text TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'BAAI/bge-m3',
  
  -- Temporal tracking
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_latest BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_direction_snapshots_team_idx 
  ON public.hackathon_team_direction_snapshots(team_id);
CREATE INDEX IF NOT EXISTS team_direction_snapshots_latest_idx 
  ON public.hackathon_team_direction_snapshots(team_id) WHERE is_latest = true;
CREATE INDEX IF NOT EXISTS team_direction_snapshots_phase_idx 
  ON public.hackathon_team_direction_snapshots(phase_id);

-- Trigger: Retain only last 3 snapshots per team to prevent storage explosion
CREATE OR REPLACE FUNCTION prune_old_snapshots()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.hackathon_team_direction_snapshots
  WHERE team_id = NEW.team_id
    AND id NOT IN (
      SELECT id FROM public.hackathon_team_direction_snapshots
      WHERE team_id = NEW.team_id
      ORDER BY snapshot_at DESC
      LIMIT 3
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prune_snapshots ON public.hackathon_team_direction_snapshots;
CREATE TRIGGER trigger_prune_snapshots
  AFTER INSERT ON public.hackathon_team_direction_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION prune_old_snapshots();
```

### Step 3: Create `team_direction_search_cache` table

```sql
-- Cache for frequently accessed team direction data (denormalized for fast search)
CREATE TABLE IF NOT EXISTS public.team_direction_search_cache (
  team_id UUID PRIMARY KEY REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  
  -- Denormalized profile fields
  mission TEXT,
  target_market TEXT,
  tech_stack TEXT[],
  business_model TEXT,
  stage TEXT,
  
  -- Latest snapshot reference
  latest_snapshot_id UUID REFERENCES public.hackathon_team_direction_snapshots(id),
  latest_embedding_id UUID REFERENCES public.hackathon_team_direction_embeddings(id),
  
  -- Cluster info (denormalized)
  cluster_id UUID,
  cluster_label TEXT,
  cluster_color TEXT,
  
  -- Search metadata
  search_text TSVECTOR, -- full-text search vector
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_direction_search_cache_cluster_idx 
  ON public.team_direction_search_cache(cluster_id);
CREATE INDEX IF NOT EXISTS team_direction_search_cache_text_idx 
  ON public.team_direction_search_cache USING GIN(search_text);
```

### Step 4: Add RLS and grants

```sql
ALTER TABLE public.team_direction_embed_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_team_direction_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_direction_search_cache ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.team_direction_embed_jobs TO service_role;
GRANT ALL ON public.hackathon_team_direction_snapshots TO service_role;
GRANT ALL ON public.team_direction_search_cache TO service_role;

-- Admin read policies
CREATE POLICY "Admins read embed jobs" ON public.team_direction_embed_jobs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins read snapshots" ON public.hackathon_team_direction_snapshots FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "Admins read search cache" ON public.team_direction_search_cache FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
```

### Step 5: Run migration locally

```bash
supabase db push --local
```

---

## Task 2: Job Queue Module — `lib/embeddings/jobs.ts`

**Files:**
- Create: `lib/embeddings/jobs.ts`

### Step 1: Create job queue operations

```typescript
import { createAdminClient } from "@/utils/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EmbedJobStatus = "pending" | "processing" | "completed" | "failed";
export type EmbedJobStep = "profile" | "embedding";
export type TriggerSource = "submission" | "review" | "backfill" | "manual";

export interface EmbedJob {
  id: string;
  team_id: string;
  status: EmbedJobStatus;
  trigger_source: TriggerSource;
  attempts: number;
  max_attempts: number;
  error: string | null;
  scheduled_at: string;
  processing_started_at: string | null;
  processed_by: string | null;
  completed_at: string | null;
}

const PROCESSOR_ID = `embed-processor-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
const MAX_PROCESSING_MS = 5 * 60 * 1000; // 5 minutes

export async function enqueueEmbedJob(
  teamId: string,
  triggerSource: TriggerSource = "submission",
  adminClient?: SupabaseClient
): Promise<string> {
  const admin = adminClient ?? createAdminClient();
  
  // Cancel any pending jobs for this team to avoid duplicate work
  await admin
    .from("team_direction_embed_jobs")
    .update({ status: "failed", error: "superseded by newer job" })
    .eq("team_id", teamId)
    .eq("status", "pending");
  
  const { data, error } = await admin
    .from("team_direction_embed_jobs")
    .insert({
      team_id: teamId,
      trigger_source: triggerSource,
      status: "pending",
      scheduled_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  
  if (error) throw error;
  return data.id as string;
}

export async function claimJob(
  jobId: string,
  adminClient?: SupabaseClient
): Promise<boolean> {
  const admin = adminClient ?? createAdminClient();
  
  const { data, error } = await admin
    .from("team_direction_embed_jobs")
    .update({
      status: "processing",
      processing_started_at: new Date().toISOString(),
      processed_by: PROCESSOR_ID,
      error: null,
    })
    .eq("id", jobId)
    .eq("status", "pending")
    .select("id");
  
  if (error) throw error;
  return Boolean(data && data.length > 0);
}

export async function completeJob(
  jobId: string,
  adminClient?: SupabaseClient
): Promise<void> {
  const admin = adminClient ?? createAdminClient();
  
  const { error } = await admin
    .from("team_direction_embed_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      processing_started_at: null,
      processed_by: null,
      error: null,
    })
    .eq("id", jobId)
    .eq("status", "processing");
  
  if (error) throw error;
}

export async function failJob(
  jobId: string,
  errorMessage: string,
  adminClient?: SupabaseClient
): Promise<void> {
  const admin = adminClient ?? createAdminClient();
  const safeError = errorMessage.slice(0, 1200);
  
  // Increment attempts manually (avoid RPC dependency)
  const { data: current } = await admin
    .from("team_direction_embed_jobs")
    .select("attempts")
    .eq("id", jobId)
    .single();
  
  const { error } = await admin
    .from("team_direction_embed_jobs")
    .update({
      status: "failed",
      attempts: (current?.attempts ?? 0) + 1,
      error: safeError,
      processing_started_at: null,
      processed_by: null,
    })
    .eq("id", jobId)
    .eq("status", "processing");
  
  if (error) throw error;
}

export async function getJob(jobId: string, adminClient?: SupabaseClient): Promise<EmbedJob | null> {
  const admin = adminClient ?? createAdminClient();
  const { data, error } = await admin
    .from("team_direction_embed_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  
  if (error || !data) return null;
  return data as EmbedJob;
}

export async function getNextPendingJob(adminClient?: SupabaseClient): Promise<EmbedJob | null> {
  const admin = adminClient ?? createAdminClient();
  
  // Find jobs that are pending OR stuck in processing for too long
  const cutoff = new Date(Date.now() - MAX_PROCESSING_MS).toISOString();
  const { data, error } = await admin
    .from("team_direction_embed_jobs")
    .select("*")
    .or(`status.eq.pending,and(status.eq.processing,processing_started_at.lt.${cutoff})`)
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .single();
  
  if (error || !data) return null;
  return data as EmbedJob;
}
```

### Step 2: Write test for job queue

```typescript
// lib/embeddings/__tests__/jobs.test.ts
import { enqueueEmbedJob, claimJob, completeJob, getJob } from "../jobs";
import { createAdminClient } from "@/utils/supabase/admin";

describe("embed job queue", () => {
  it("should enqueue a job", async () => {
    const jobId = await enqueueEmbedJob("test-team-id", "manual");
    expect(jobId).toBeDefined();
    
    const job = await getJob(jobId);
    expect(job).not.toBeNull();
    expect(job?.status).toBe("pending");
  });
  
  it("should claim a job with compare-and-swap", async () => {
    const jobId = await enqueueEmbedJob("test-team-id", "manual");
    const claimed = await claimJob(jobId);
    expect(claimed).toBe(true);
    
    // Second claim should fail (already processing)
    const claimed2 = await claimJob(jobId);
    expect(claimed2).toBe(false);
  });
  
  it("should complete a job", async () => {
    const jobId = await enqueueEmbedJob("test-team-id", "manual");
    await claimJob(jobId);
    await completeJob(jobId);
    
    const job = await getJob(jobId);
    expect(job?.status).toBe("completed");
    expect(job?.processing_started_at).toBeNull();
  });
});
```

### Step 3: Run test

```bash
pnpm test lib/embeddings/__tests__/jobs.test.ts
```

---

## Task 3: Team Profile Extractor — `lib/embeddings/profile-extractor.ts`

**Files:**
- Create: `lib/embeddings/profile-extractor.ts`

### Step 1: Create profile extraction using AI SDK

```typescript
import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/modelRegistry";

export interface TeamProfile {
  mission: string;
  targetMarket: string;
  techStack: string[];
  businessModel: string;
  keyHypotheses: string[];
  stage: "idea" | "validation" | "building" | "launched";
  milestones: { phase: string; summary: string }[];
}

const profileSchema = z.object({
  mission: z.string().describe("The core problem the team is solving, in one sentence"),
  targetMarket: z.string().describe("Who the team is serving"),
  techStack: z.array(z.string()).describe("Technologies, tools, or platforms mentioned"),
  businessModel: z.string().describe("How they plan to make money or sustain"),
  keyHypotheses: z.array(z.string()).describe("Key assumptions they're testing"),
  stage: z.enum(["idea", "validation", "building", "launched"]).describe("Current progress stage"),
  milestones: z.array(z.object({
    phase: z.string(),
    summary: z.string(),
  })).describe("Key milestones or achievements by phase"),
});

export async function extractTeamProfile(
  teamText: string,
  modelName?: string
): Promise<TeamProfile> {
  const { object } = await generateObject({
    model: getModel(modelName),
    schema: profileSchema,
    prompt: `Extract a structured profile from this hackathon team's submissions.

Analyze the team's combined submissions and extract:
1. Mission: What problem are they solving?
2. Target Market: Who are they serving?
3. Tech Stack: What technologies are they using?
4. Business Model: How do they plan to sustain/make money?
5. Key Hypotheses: What assumptions are they testing?
6. Stage: idea (just concept), validation (testing assumptions), building (developing MVP), or launched (has users)?
7. Milestones: Key achievements or deliverables by phase

Team Submissions:
${teamText.slice(0, 8000)}

Be concise but specific. If information is missing, make reasonable inferences or use empty values.`,
  });
  
  return object;
}
```

### Step 2: Batch profile extraction for backfill (saves ~80% of LLM latency)

```typescript
export async function extractTeamProfilesBatch(
  teams: { teamId: string; teamText: string }[],
  modelName?: string
): Promise<Map<string, TeamProfile>> {
  if (teams.length === 0) return new Map();
  if (teams.length === 1) {
    const profile = await extractTeamProfile(teams[0].teamText, modelName);
    return new Map([[teams[0].teamId, profile]]);
  }

  // Batch up to 5 teams per LLM call to stay within context limits
  const BATCH_SIZE = 5;
  const results = new Map<string, TeamProfile>();

  for (let i = 0; i < teams.length; i += BATCH_SIZE) {
    const batch = teams.slice(i, i + BATCH_SIZE);
    const context = batch
      .map((t, idx) => `TEAM ${idx + 1} (ID: ${t.teamId}):\n${t.teamText.slice(0, 2000)}`)
      .join("\n\n---\n\n");

    const { object } = await generateObject({
      model: getModel(modelName),
      schema: z.object({
        profiles: z.array(z.object({
          team_id: z.string(),
          mission: z.string(),
          targetMarket: z.string(),
          techStack: z.array(z.string()),
          businessModel: z.string(),
          keyHypotheses: z.array(z.string()),
          stage: z.enum(["idea", "validation", "building", "launched"]),
          milestones: z.array(z.object({ phase: z.string(), summary: z.string() })),
        })).describe(`Profiles for ${batch.length} teams`),
      }),
      prompt: `Extract structured profiles for ${batch.length} hackathon teams.

${context}

Return a profile for EVERY team listed above. Use the team_id from the context.`,
    });

    for (const profile of object.profiles) {
      results.set(profile.team_id, profile);
    }
  }

  return results;
}
```

### Step 3: Create embedding text formatter for multi-aspect vectors

```typescript
export function formatMissionText(profile: TeamProfile): string {
  return `Mission: ${profile.mission}. Target: ${profile.targetMarket}. Stage: ${profile.stage}.`;
}

export function formatTechText(profile: TeamProfile): string {
  return `Technologies: ${profile.techStack.join(", ")}. Business model: ${profile.businessModel}.`;
}

export function formatMarketText(profile: TeamProfile): string {
  return `Market: ${profile.targetMarket}. Model: ${profile.businessModel}. Hypotheses: ${profile.keyHypotheses.join("; ")}.`;
}
```

---

## Task 4: Multi-Aspect Embedding Upsert — Modify `lib/embeddings/team-direction.ts`

**Files:**
- Modify: `lib/embeddings/team-direction.ts`

### Step 1: Replace single-vector upsert with multi-aspect snapshot

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { embedTexts, formatVectorLiteral, hashText } from "./bge";
import { extractTeamProfile, formatMissionText, formatTechText, formatMarketText } from "./profile-extractor";
import type { TeamProfile } from "./profile-extractor";

export async function collectTeamText(teamId: string, client?: SupabaseClient): Promise<string> {
  // ... keep existing implementation unchanged ...
}

export interface TeamDirectionSnapshot {
  id: string;
  team_id: string;
  profile: TeamProfile;
  mission_embedding: number[];
  tech_embedding: number[];
  market_embedding: number[];
  composite_embedding: number[];
  source_text: string;
  text_hash: string;
}

export async function createTeamDirectionSnapshot(
  teamId: string,
  opts: {
    adminClient?: SupabaseClient;
    profile?: TeamProfile; // Pre-extracted profile (for batch backfill)
  } = {}
): Promise<TeamDirectionSnapshot> {
  const admin = opts.adminClient ?? createAdminClient();
  
  // 1. Collect raw text
  const sourceText = await collectTeamText(teamId, admin);
  if (!sourceText) {
    throw new Error(`No submission text found for team ${teamId}`);
  }
  
  // 2. Extract structured profile (or use pre-extracted for batch backfill)
  const profile = opts.profile ?? await extractTeamProfile(sourceText);
  
  // 3. Prepare aspect texts
  const missionText = formatMissionText(profile);
  const techText = formatTechText(profile);
  const marketText = formatMarketText(profile);
  
  // 4. Embed all aspects + composite in one batch
  const [missionEmbed, techEmbed, marketEmbed, compositeEmbed] = await embedTexts([
    missionText,
    techText,
    marketText,
    sourceText,
  ]);
  
  // 5. Insert snapshot
  const textHash = hashText(sourceText);
  const { data: snapshot, error } = await admin
    .from("hackathon_team_direction_snapshots")
    .insert({
      team_id: teamId,
      profile: profile as any,
      mission_embedding: formatVectorLiteral(missionEmbed),
      tech_embedding: formatVectorLiteral(techEmbed),
      market_embedding: formatVectorLiteral(marketEmbed),
      composite_embedding: formatVectorLiteral(compositeEmbed),
      source_text: sourceText,
      text_hash: textHash,
      is_latest: true,
    })
    .select("*")
    .single();
  
  if (error) throw error;
  
  // 6. Mark previous snapshots as not latest
  await admin
    .from("hackathon_team_direction_snapshots")
    .update({ is_latest: false })
    .eq("team_id", teamId)
    .neq("id", snapshot.id);
  
  // 7. Also update the legacy embeddings table for backward compat
  await admin
    .from("hackathon_team_direction_embeddings")
    .upsert({
      team_id: teamId,
      source_text: sourceText,
      text_hash: textHash,
      embedding: formatVectorLiteral(compositeEmbed),
      generated_at: new Date().toISOString(),
    }, { onConflict: "team_id" });
  
  // 8. Update search cache
  await updateSearchCache(teamId, profile, snapshot.id, admin);
  
  return {
    id: snapshot.id as string,
    team_id: teamId,
    profile,
    mission_embedding: missionEmbed,
    tech_embedding: techEmbed,
    market_embedding: marketEmbed,
    composite_embedding: compositeEmbed,
    source_text: sourceText,
    text_hash: textHash,
  };
}

async function updateSearchCache(
  teamId: string,
  profile: TeamProfile,
  snapshotId: string,
  admin: SupabaseClient
): Promise<void> {
  // Get team name
  const { data: team } = await admin
    .from("hackathon_teams")
    .select("name")
    .eq("id", teamId)
    .single();
  
  // Build search text
  const searchText = [
    team?.name,
    profile.mission,
    profile.targetMarket,
    ...profile.techStack,
    profile.businessModel,
    ...profile.keyHypotheses,
  ].filter(Boolean).join(" ");
  
  await admin
    .from("team_direction_search_cache")
    .upsert({
      team_id: teamId,
      team_name: team?.name ?? "Unknown",
      mission: profile.mission,
      target_market: profile.targetMarket,
      tech_stack: profile.techStack,
      business_model: profile.businessModel,
      stage: profile.stage,
      latest_snapshot_id: snapshotId,
      search_text: searchText,
      updated_at: new Date().toISOString(),
    }, { onConflict: "team_id" });
}
```

### Step 2: Remove old fire-and-forget, add job-based wrapper

```typescript
// DEPRECATED: Use enqueueEmbedJob instead
export function fireAndForgetTeamDirectionEmbed(teamId: string, adminClient?: SupabaseClient): void {
  console.warn("fireAndForgetTeamDirectionEmbed is deprecated. Use enqueueEmbedJob from lib/embeddings/jobs.ts");
  // Import dynamically to avoid circular dependency
  import("./jobs").then(({ enqueueEmbedJob }) => {
    enqueueEmbedJob(teamId, "submission", adminClient).catch((err) => {
      console.error("[team-direction-embedding] failed to enqueue job", { teamId, error: err });
    });
  });
}
```

---

## Task 5: Semantic Search — `lib/embeddings/search.ts`

**Files:**
- Create: `lib/embeddings/search.ts`

### Step 1: Create semantic search over team embeddings

```typescript
import { createAdminClient } from "@/utils/supabase/admin";
import { embedText } from "./bge";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SearchResult {
  team_id: string;
  team_name: string;
  mission: string;
  similarity: number;
  cluster_label?: string;
  cluster_color?: string;
}

export async function searchTeamDirections(
  query: string,
  opts: {
    aspect?: "mission" | "tech" | "market" | "composite";
    limit?: number;
    filterClusterId?: string;
    adminClient?: SupabaseClient;
  } = {}
): Promise<SearchResult[]> {
  const admin = opts.adminClient ?? createAdminClient();
  const aspect = opts.aspect ?? "composite";
  const limit = opts.limit ?? 10;
  
  // 1. Embed the query
  const queryVector = await embedText(query);
  const vectorLiteral = `[${queryVector.join(",")}]`;
  
  // 2. Select embedding column based on aspect
  const embeddingColumn = aspect === "mission" ? "mission_embedding" 
    : aspect === "tech" ? "tech_embedding"
    : aspect === "market" ? "market_embedding"
    : "composite_embedding";
  
  // 3. Query with cosine similarity
  let dbQuery = admin
    .from("hackathon_team_direction_snapshots")
    .select(`
      team_id,
      profile->mission,
      hackathon_teams!inner(name),
      ${embeddingColumn} <-> ${vectorLiteral}::vector as distance
    `)
    .eq("is_latest", true)
    .order("distance", { ascending: true })
    .limit(limit);
  
  const { data, error } = await dbQuery;
  if (error) throw error;
  
  // 4. Join with search cache for cluster info
  const teamIds = (data ?? []).map((d: any) => d.team_id);
  const { data: cacheData } = await admin
    .from("team_direction_search_cache")
    .select("team_id, cluster_label, cluster_color")
    .in("team_id", teamIds);
  
  const cacheByTeam = new Map((cacheData ?? []).map((c: any) => [c.team_id, c]));
  
  return (data ?? []).map((row: any) => {
    const cache = cacheByTeam.get(row.team_id);
    return {
      team_id: row.team_id,
      team_name: row.hackathon_teams?.name ?? "Unknown",
      mission: row.profile?.mission ?? "",
      similarity: 1 - (row.distance ?? 0), // Convert distance to similarity
      cluster_label: cache?.cluster_label,
      cluster_color: cache?.cluster_color,
    };
  });
}

export async function findSimilarTeams(
  teamId: string,
  opts: {
    aspect?: "mission" | "tech" | "market" | "composite";
    limit?: number;
    adminClient?: SupabaseClient;
  } = {}
): Promise<SearchResult[]> {
  const admin = opts.adminClient ?? createAdminClient();
  const aspect = opts.aspect ?? "composite";
  const limit = (opts.limit ?? 5) + 1; // +1 to exclude self
  
  // Get team's embedding
  const embeddingColumn = aspect === "mission" ? "mission_embedding" 
    : aspect === "tech" ? "tech_embedding"
    : aspect === "market" ? "market_embedding"
    : "composite_embedding";
  
  const { data: teamSnapshot } = await admin
    .from("hackathon_team_direction_snapshots")
    .select(embeddingColumn)
    .eq("team_id", teamId)
    .eq("is_latest", true)
    .single();
  
  if (!teamSnapshot) return [];
  
  // Use vector as query
  const vectorLiteral = teamSnapshot[embeddingColumn] as string;
  
  const { data, error } = await admin
    .from("hackathon_team_direction_snapshots")
    .select(`
      team_id,
      profile->mission,
      hackathon_teams!inner(name),
      ${embeddingColumn} <-> '${vectorLiteral}'::vector as distance
    `)
    .eq("is_latest", true)
    .neq("team_id", teamId)
    .order("distance", { ascending: true })
    .limit(limit);
  
  if (error) throw error;
  
  return (data ?? []).map((row: any) => ({
    team_id: row.team_id,
    team_name: row.hackathon_teams?.name ?? "Unknown",
    mission: row.profile?.mission ?? "",
    similarity: 1 - (row.distance ?? 0),
  }));
}
```

---

## Task 6: RAG Pipeline — `lib/embeddings/rag.ts`

**Files:**
- Create: `lib/embeddings/rag.ts`

### Step 1: Create RAG pipeline for team insights

```typescript
import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/modelRegistry";
import { searchTeamDirections } from "./search";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RagResult {
  answer: string;
  citedTeams: { team_id: string; team_name: string; mission: string; relevance: string }[];
  followUpQuestions: string[];
}

export async function askTeamDirections(
  question: string,
  opts: {
    aspect?: "mission" | "tech" | "market" | "composite";
    topK?: number;
    modelName?: string;
    adminClient?: SupabaseClient;
  } = {}
): Promise<RagResult> {
  const topK = opts.topK ?? 8;
  
  // 1. Retrieve relevant teams via semantic search
  const searchResults = await searchTeamDirections(question, {
    aspect: opts.aspect,
    limit: topK,
    adminClient: opts.adminClient,
  });
  
  // 2. Fetch full profiles for top results
  const admin = opts.adminClient ?? (await import("@/utils/supabase/admin")).createAdminClient();
  const teamIds = searchResults.map((r) => r.team_id);
  
  const { data: snapshots } = await admin
    .from("hackathon_team_direction_snapshots")
    .select("team_id, profile, source_text")
    .eq("is_latest", true)
    .in("team_id", teamIds);
  
  const snapshotByTeam = new Map((snapshots ?? []).map((s: any) => [s.team_id, s]));
  
  // 3. Build context
  const context = searchResults.map((result) => {
    const snapshot = snapshotByTeam.get(result.team_id);
    return `
Team: ${result.team_name}
Mission: ${snapshot?.profile?.mission ?? result.mission}
Tech: ${(snapshot?.profile?.tech_stack ?? []).join(", ")}
Market: ${snapshot?.profile?.target_market ?? ""}
Model: ${snapshot?.profile?.business_model ?? ""}
Submissions: ${(snapshot?.source_text ?? "").slice(0, 500)}
`;
  }).join("\n---\n");
  
  // 4. Generate answer with citations
  const { object } = await generateObject({
    model: getModel(opts.modelName),
    schema: z.object({
      answer: z.string().describe("Comprehensive answer to the question"),
      citedTeamIds: z.array(z.string()).describe("Team IDs cited in the answer"),
      followUpQuestions: z.array(z.string()).describe("3 follow-up questions the user might ask"),
    }),
    prompt: `Answer this question about hackathon teams using the provided context.

Question: ${question}

Context (top ${topK} relevant teams):
${context}

Instructions:
- Be specific and cite team names in your answer
- If the context doesn't fully answer the question, say so
- Highlight interesting patterns, similarities, or contrasts between teams
- Keep the answer concise but informative
- Suggest 3 natural follow-up questions`,
  });
  
  // 5. Map cited team IDs to full info
  const citedTeams = object.citedTeamIds
    .map((id) => {
      const result = searchResults.find((r) => r.team_id === id);
      return result ? {
        team_id: id,
        team_name: result.team_name,
        mission: result.mission,
        relevance: `${(result.similarity * 100).toFixed(1)}% match`,
      } : null;
    })
    .filter(Boolean) as RagResult["citedTeams"];
  
  return {
    answer: object.answer,
    citedTeams,
    followUpQuestions: object.followUpQuestions,
  };
}
```

---

## Task 7: Auto-Labeling Clustering — `lib/clustering/auto-label.ts`

**Files:**
- Create: `lib/clustering/auto-label.ts`

### Step 1: Create LLM-powered cluster auto-labeling

```typescript
import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/modelRegistry";
import { createAdminClient } from "@/utils/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ClusterLabel {
  label: string;
  summary: string;
  keywords: string[];
}

export async function autoLabelCluster(
  clusterId: string,
  opts: {
    modelName?: string;
    adminClient?: SupabaseClient;
  } = {}
): Promise<ClusterLabel> {
  const admin = opts.adminClient ?? createAdminClient();
  
  // Fetch top teams in this cluster by proximity to centroid
  const { data: assignments } = await admin
    .from("hackathon_team_direction_cluster_assignments")
    .select(`
      distance_to_centroid,
      hackathon_team_direction_embeddings!inner(
        team_id,
        source_text,
        hackathon_teams!inner(name)
      )
    `)
    .eq("cluster_id", clusterId)
    .order("distance_to_centroid", { ascending: true })
    .limit(5);
  
  const teams = (assignments ?? []).map((a: any) => ({
    name: a.hackathon_team_direction_embeddings.hackathon_teams.name,
    text: a.hackathon_team_direction_embeddings.source_text.slice(0, 400),
  }));
  
  const { object } = await generateObject({
    model: getModel(opts.modelName),
    schema: z.object({
      label: z.string().describe("Short label (2-4 words) for this cluster"),
      summary: z.string().describe("One sentence describing what teams in this cluster have in common"),
      keywords: z.array(z.string()).describe("3-5 keywords that characterize this cluster"),
    }),
    prompt: `Label this cluster of hackathon teams based on their submissions.

Teams in cluster:
${teams.map((t) => `- ${t.name}: ${t.text}`).join("\n")}

Provide a concise label, summary, and keywords.`,
  });
  
  // Update cluster in DB
  await admin
    .from("hackathon_team_direction_clusters")
    .update({
      label: object.label,
      summary: object.summary,
    })
    .eq("id", clusterId);
  
  return object;
}

/**
 * Label all clusters in a single LLM call — much cheaper than N separate calls.
 * Cost: ~$0.01 per recluster (vs $0.08 for 8 separate calls).
 */
export async function autoLabelAllClusters(
  clusteringId: string,
  opts: {
    modelName?: string;
    adminClient?: SupabaseClient;
  } = {}
): Promise<ClusterLabel[]> {
  const admin = opts.adminClient ?? createAdminClient();
  
  // Fetch all clusters with their top teams
  const { data: clusters } = await admin
    .from("hackathon_team_direction_clusters")
    .select("id, cluster_index")
    .eq("clustering_id", clusteringId)
    .order("cluster_index", { ascending: true });
  
  if (!clusters || clusters.length === 0) return [];
  
  // Fetch top 3 teams per cluster in one query
  const { data: assignments } = await admin
    .from("hackathon_team_direction_cluster_assignments")
    .select(`
      cluster_id,
      distance_to_centroid,
      hackathon_team_direction_embeddings!inner(
        team_id,
        source_text,
        hackathon_teams!inner(name)
      )
    `)
    .in("cluster_id", clusters.map((c: any) => c.id))
    .order("distance_to_centroid", { ascending: true });
  
  // Group by cluster
  const teamsByCluster = new Map<string, { name: string; text: string }[]>();
  for (const a of assignments ?? []) {
    const cid = a.cluster_id as string;
    if (!teamsByCluster.has(cid)) teamsByCluster.set(cid, []);
    const arr = teamsByCluster.get(cid)!;
    if (arr.length < 3) {
      arr.push({
        name: a.hackathon_team_direction_embeddings.hackathon_teams.name,
        text: a.hackathon_team_direction_embeddings.source_text.slice(0, 300),
      });
    }
  }
  
  // Build batched prompt
  const clusterDescriptions = clusters.map((c: any) => {
    const teams = teamsByCluster.get(c.id as string) ?? [];
    return `Cluster ${c.cluster_index + 1}:\n${teams.map((t) => `- ${t.name}: ${t.text}`).join("\n")}`;
  }).join("\n\n---\n\n");
  
  const { object } = await generateObject({
    model: getModel(opts.modelName),
    schema: z.object({
      clusters: z.array(z.object({
        cluster_index: z.number().describe("The cluster index (0-based)"),
        label: z.string().describe("Short label (2-4 words)"),
        summary: z.string().describe("One sentence describing what teams have in common"),
        keywords: z.array(z.string()).describe("3-5 keywords"),
      })).describe("Labels for ALL clusters"),
    }),
    prompt: `Label these hackathon team clusters. Each cluster contains teams with similar submission themes.

${clusterDescriptions}

Provide a label, summary, and keywords for EVERY cluster listed above.`,
  });
  
  // Update all clusters in DB
  for (const label of object.clusters) {
    const cluster = clusters.find((c: any) => c.cluster_index === label.cluster_index);
    if (cluster) {
      await admin
        .from("hackathon_team_direction_clusters")
        .update({
          label: label.label,
          summary: label.summary,
        })
        .eq("id", cluster.id as string);
    }
  }
  
  return object.clusters;
}
```

---

## Task 8: Hierarchical Clustering — `lib/clustering/hierarchical.ts`

**Files:**
- Create: `lib/clustering/hierarchical.ts`

### Step 1: Add hierarchical clustering option

```typescript
import { createAdminClient } from "@/utils/supabase/admin";
import { parseEmbedding } from "./team-direction";
import { cosineDistance } from "./kmeans";
import { project2D } from "./umap";
import { clusterColor } from "./colors";
import { formatVectorLiteral } from "@/lib/embeddings/bge";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface HierarchicalCluster {
  id: string;
  level: number; // 0 = macro, 1 = meso, 2 = micro
  parent_id: string | null;
  cluster_index: number;
  member_count: number;
  centroid: number[];
  centroid_2d: number[] | null;
  color: string;
}

export async function reclusterTeamDirectionsHierarchical(opts: {
  levels?: number[]; // e.g., [3, 6, 12] for macro/meso/micro
  createdByUserId?: string | null;
  adminClient?: SupabaseClient;
}): Promise<{ clusteringId: string; clusters: HierarchicalCluster[] }> {
  const admin = opts.adminClient ?? createAdminClient();
  const levels = opts.levels ?? [3, 6, 12];
  
  // Fetch embeddings
  const { data: rows } = await admin
    .from("hackathon_team_direction_embeddings")
    .select("id, embedding, source_text");
  
  const embeddings = (rows ?? []) as { id: string; embedding: string | number[]; source_text: string }[];
  const vectors = embeddings.map((e) => parseEmbedding(e.embedding));
  
  // Run K-means at each level
  const { runKMeans } = await import("./kmeans");
  
  const allClusters: HierarchicalCluster[] = [];
  let previousAssignments: number[] = [];
  
  for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
    const k = levels[levelIdx];
    if (vectors.length < k) continue;
    
    const { centroids, assignments } = runKMeans(vectors, k);
    const projections = centroids.length > 0 ? project2D(centroids) : [];
    
    for (let i = 0; i < centroids.length; i++) {
      allClusters.push({
        id: `level-${levelIdx}-cluster-${i}`, // Will be replaced with DB UUID
        level: levelIdx,
        parent_id: levelIdx > 0 ? findParentCluster(i, assignments, previousAssignments, levels[levelIdx - 1]) : null,
        cluster_index: i,
        member_count: assignments.filter((a) => a === i).length,
        centroid: centroids[i],
        centroid_2d: projections[i] ?? null,
        color: clusterColor(i + levelIdx * 100), // Offset to avoid color collision
      });
    }
    
    previousAssignments = assignments;
  }
  
  // TODO: Store in DB with proper parent relationships
  // For now, return structure for frontend use
  return { clusteringId: "hierarchical-temp", clusters: allClusters };
}

function findParentCluster(
  currentIndex: number,
  currentAssignments: number[],
  previousAssignments: number[],
  previousK: number
): string | null {
  // Find which previous cluster contains the most members of this cluster
  const memberIndices = currentAssignments
    .map((a, idx) => (a === currentIndex ? idx : -1))
    .filter((idx) => idx !== -1);
  
  const parentCounts = new Array(previousK).fill(0);
  for (const idx of memberIndices) {
    parentCounts[previousAssignments[idx]]++;
  }
  
  const maxParent = parentCounts.indexOf(Math.max(...parentCounts));
  return maxParent >= 0 ? `level-${maxParent}` : null;
}
```

---

## Task 9: API Routes — Job Queue

**Files:**
- Create: `app/api/embeddings/enqueue/route.ts`
- Create: `app/api/embeddings/process/[jobId]/route.ts`
- Create: `app/api/embeddings/status/[jobId]/route.ts`

### Step 9a: Enqueue endpoint

```typescript
// app/api/embeddings/enqueue/route.ts
import { NextResponse } from "next/server";
import { enqueueEmbedJob } from "@/lib/embeddings/jobs";

export async function POST(request: Request) {
  try {
    const { teamId, triggerSource = "manual" } = await request.json();
    
    if (!teamId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }
    
    const jobId = await enqueueEmbedJob(teamId, triggerSource as any);
    
    return NextResponse.json({
      jobId,
      status: "pending",
      message: "Job created. Poll /api/embeddings/status/{jobId} for results.",
    });
  } catch (error) {
    console.error("Error enqueueing embed job:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
```

### Step 9b: Process endpoint

```typescript
// app/api/embeddings/process/[jobId]/route.ts
import { NextResponse } from "next/server";
import { getJob, claimJob, completeJob, failJob } from "@/lib/embeddings/jobs";
import { createTeamDirectionSnapshot } from "@/lib/embeddings/team-direction";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const job = await getJob(jobId);
    
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    
    if (job.status === "completed" || job.status === "failed") {
      return NextResponse.json({ jobId, status: job.status, message: "Job already finalized" });
    }
    
    // Claim job (compare-and-swap: only claim if still pending)
    const claimed = await claimJob(jobId);
    if (!claimed) {
      return NextResponse.json(
        { jobId, status: "processing", message: "Job already being processed" },
        { status: 202 }
      );
    }
    
    try {
      // Single step: collect text → extract profile → embed → snapshot
      await createTeamDirectionSnapshot(job.team_id);
      await completeJob(jobId);
      
      // NOTE: Reclustering is decoupled. It runs on a schedule (e.g., every 1hr)
      // or can be triggered manually via POST /api/admin/hackathon/team-directions/clusters
      // This prevents thundering herd when many teams submit at once.
      
      return NextResponse.json({
        jobId,
        status: "completed",
        message: "Snapshot created successfully",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await failJob(jobId, message);
      return NextResponse.json(
        { jobId, status: "failed", error: message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing embed job:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Step 9c: Status endpoint

```typescript
// app/api/embeddings/status/[jobId]/route.ts
import { NextResponse } from "next/server";
import { getJob } from "@/lib/embeddings/jobs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const job = await getJob(jobId);
    
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      attempts: job.attempts,
      error: job.error,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    });
  } catch (error) {
    console.error("Error fetching embed job status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## Task 10: API Routes — Search + RAG

**Files:**
- Create: `app/api/admin/hackathon/team-directions/search/route.ts`
- Create: `app/api/admin/hackathon/team-directions/rag/route.ts`

### Step 10a: Search endpoint

```typescript
// app/api/admin/hackathon/team-directions/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchTeamDirections, findSimilarTeams } from "@/lib/embeddings/search";
import { requireAdminUser } from "@/lib/admin/requireAdmin";

export async function GET(request: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const aspect = searchParams.get("aspect") as any;
  const teamId = searchParams.get("teamId");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  
  if (!query && !teamId) {
    return NextResponse.json({ error: "q or teamId required" }, { status: 400 });
  }
  
  try {
    let results;
    if (teamId) {
      results = await findSimilarTeams(teamId, { aspect, limit });
    } else {
      results = await searchTeamDirections(query!, { aspect, limit });
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
```

### Step 10b: RAG endpoint

```typescript
// app/api/admin/hackathon/team-directions/rag/route.ts
import { NextResponse } from "next/server";
import { askTeamDirections } from "@/lib/embeddings/rag";
import { requireAdminUser } from "@/lib/admin/requireAdmin";

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  
  try {
    const { question, aspect, topK } = await request.json();
    
    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    
    const result = await askTeamDirections(question, { aspect, topK });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("RAG error:", error);
    return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
  }
}
```

---

## Task 11: Admin Dashboard UI Components

**Files:**
- Create: `components/admin/TeamDirectionDashboard.tsx`
- Create: `components/admin/TeamDirectionSearch.tsx`
- Create: `components/admin/TeamDirectionRagPanel.tsx`
- Modify: `components/admin/TeamDirectionClusterView.tsx`

### Step 11a: Main dashboard shell

```typescript
// components/admin/TeamDirectionDashboard.tsx
"use client";

import { useState } from "react";
import { TeamDirectionClusterView } from "./TeamDirectionClusterView";
import { TeamDirectionSearch } from "./TeamDirectionSearch";
import { TeamDirectionRagPanel } from "./TeamDirectionRagPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TeamDirectionDashboard() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="clusters" className="w-full">
        <TabsList>
          <TabsTrigger value="clusters">Cluster Map</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="insights">Ask AI</TabsTrigger>
        </TabsList>
        
        <TabsContent value="clusters">
          <TeamDirectionClusterView 
            onSelectTeam={setSelectedTeamId}
            selectedTeamId={selectedTeamId}
          />
        </TabsContent>
        
        <TabsContent value="search">
          <TeamDirectionSearch onSelectTeam={setSelectedTeamId} />
        </TabsContent>
        
        <TabsContent value="insights">
          <TeamDirectionRagPanel />
        </TabsContent>
      </Tabs>
      
      {selectedTeamId && (
        <TeamDetailSidebar teamId={selectedTeamId} onClose={() => setSelectedTeamId(null)} />
      )}
    </div>
  );
}
```

### Step 11b: Search component

```typescript
// components/admin/TeamDirectionSearch.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";

interface SearchResult {
  team_id: string;
  team_name: string;
  mission: string;
  similarity: number;
  cluster_label?: string;
  cluster_color?: string;
}

export function TeamDirectionSearch({ onSelectTeam }: { onSelectTeam: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [aspect, setAspect] = useState<"composite" | "mission" | "tech" | "market">("composite");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/hackathon/team-directions/search?q=${encodeURIComponent(query)}&aspect=${aspect}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search teams by mission, tech, market..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <select
          value={aspect}
          onChange={(e) => setAspect(e.target.value as any)}
          className="border rounded px-2"
        >
          <option value="composite">All</option>
          <option value="mission">Mission</option>
          <option value="tech">Tech</option>
          <option value="market">Market</option>
        </select>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="grid gap-2">
        {results.map((result) => (
          <Card
            key={result.team_id}
            className="p-4 cursor-pointer hover:bg-muted transition-colors"
            onClick={() => onSelectTeam(result.team_id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{result.team_name}</h3>
                <p className="text-sm text-muted-foreground">{result.mission}</p>
              </div>
              <div className="flex items-center gap-2">
                {result.cluster_label && (
                  <Badge style={{ backgroundColor: result.cluster_color }}>
                    {result.cluster_label}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {(result.similarity * 100).toFixed(0)}% match
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Step 11c: RAG panel

```typescript
// components/admin/TeamDirectionRagPanel.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";

interface RagMessage {
  role: "user" | "assistant";
  content: string;
  citations?: { team_name: string; relevance: string }[];
  followUpQuestions?: string[];
}

export function TeamDirectionRagPanel() {
  const [messages, setMessages] = useState<RagMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage: RagMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/admin/hackathon/team-directions/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input }),
      });
      
      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.answer,
        citations: data.citedTeams,
        followUpQuestions: data.followUpQuestions,
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I couldn't process that question. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="h-[500px] overflow-y-auto space-y-4 border rounded-lg p-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Ask anything about the teams...<br />
            <span className="text-xs">e.g., "Which teams are working on climate?" or "Find teams using AI for education"</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <Card key={i} className={`p-3 ${msg.role === "user" ? "ml-8 bg-primary/5" : "mr-8"}`}>
            <p className="text-sm">{msg.content}</p>
            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                <span className="font-medium">Sources:</span>{" "}
                {msg.citations.map((c) => `${c.team_name} (${c.relevance})`).join(", ")}
              </div>
            )}
            {msg.followUpQuestions && (
              <div className="mt-2 flex flex-wrap gap-2">
                {msg.followUpQuestions.map((q, qi) => (
                  <button
                    key={qi}
                    onClick={() => setInput(q)}
                    className="text-xs text-primary hover:underline"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </Card>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Input
          placeholder="Ask about teams..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={loading}
        />
        <Button onClick={handleSubmit} disabled={loading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

## Task 12: Update Submit + Review Triggers

**Files:**
- Modify: `app/api/hackathon/submit/route.ts`
- Modify: `app/api/admin/hackathon/submissions/[scope]/[id]/review/route.ts`

### Step 12a: Replace fire-and-forget with job enqueue in submit route

In `app/api/hackathon/submit/route.ts`, replace:

```typescript
// OLD:
import { fireAndForgetTeamDirectionEmbed } from "@/lib/embeddings/team-direction";
// ...
fireAndForgetTeamDirectionEmbed(membership.team_id);

// NEW:
import { enqueueEmbedJob } from "@/lib/embeddings/jobs";
// ...
// After team submission save:
await enqueueEmbedJob(membership.team_id, "submission");

// After individual submission save (if team member):
if (teamMembership) {
  await enqueueEmbedJob(teamMembership.team_id, "submission");
}
```

### Step 12b: Replace fire-and-forget with job enqueue in review route

In `app/api/admin/hackathon/submissions/[scope]/[id]/review/route.ts`, replace:

```typescript
// OLD:
import { fireAndForgetTeamDirectionEmbed } from "@/lib/embeddings/team-direction";
// ...
fireAndForgetTeamDirectionEmbed(teamId);

// NEW:
import { enqueueEmbedJob } from "@/lib/embeddings/jobs";
// ...
await enqueueEmbedJob(teamId, "review");
```

---

## Task 13: Update Admin Page

**Files:**
- Modify: `app/admin/hackathon/team-directions/page.tsx`

### Step 13: Replace page with new dashboard

```typescript
import { TeamDirectionDashboard } from "@/components/admin/TeamDirectionDashboard";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function TeamDirectionsPage() {
  await requireAdmin();
  return (
    <div className="container mx-auto space-y-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Team Directions</h1>
        <p className="text-sm text-muted-foreground">
          Explore team trajectories, search semantically, and ask AI for insights.
        </p>
      </div>
      <TeamDirectionDashboard />
    </div>
  );
}
```

---

## Task 14: Observability — Add Monitoring

**Files:**
- Create: `app/api/admin/hackathon/team-directions/health/route.ts`

### Step 14: Health check endpoint

```typescript
// app/api/admin/hackathon/team-directions/health/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdminUser } from "@/lib/admin/requireAdmin";

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  
  const client = createAdminClient();
  
  const { data: jobStats } = await client
    .from("team_direction_embed_jobs")
    .select("status", { count: "exact" });
  
  const { data: snapshotStats } = await client
    .from("hackathon_team_direction_snapshots")
    .select("is_latest", { count: "exact" })
    .eq("is_latest", true);
  
  const { data: teamCount } = await client
    .from("hackathon_teams")
    .select("id", { count: "exact" });
  
  const pendingJobs = jobStats?.filter((j: any) => j.status === "pending").length ?? 0;
  const failedJobs = jobStats?.filter((j: any) => j.status === "failed").length ?? 0;
  const totalTeams = teamCount?.length ?? 0;
  const embeddedTeams = snapshotStats?.length ?? 0;
  
  return NextResponse.json({
    queue: {
      pending: pendingJobs,
      failed: failedJobs,
      total: jobStats?.length ?? 0,
    },
    coverage: {
      teams: totalTeams,
      embedded: embeddedTeams,
      percentage: totalTeams > 0 ? Math.round((embeddedTeams / totalTeams) * 100) : 0,
    },
    health: failedJobs > 10 ? "degraded" : pendingJobs > 50 ? "backlogged" : "healthy",
  });
}
```

---

## Task 15: Backfill Script Update

**Files:**
- Modify: `scripts/backfill-team-direction-embeddings.ts`

### Step 15: Update backfill to use job queue

```typescript
// scripts/backfill-team-direction-embeddings.ts
import { createClient } from "@supabase/supabase-js";
import { collectTeamText, createTeamDirectionSnapshot } from "../lib/embeddings/team-direction";
import { extractTeamProfilesBatch } from "../lib/embeddings/profile-extractor";

const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!PROD_URL || !PROD_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const admin = createClient(PROD_URL, PROD_KEY);
const BATCH_SIZE = 5; // Teams per LLM call (extractTeamProfilesBatch default)

async function main() {
  const { data: teams } = await admin.from("hackathon_teams").select("id, name");
  if (!teams || teams.length === 0) {
    console.log("No teams found.");
    return;
  }

  console.log(`Backfilling ${teams.length} teams...`);

  // Phase 1: Collect all team texts
  console.log("Phase 1: Collecting team texts...");
  const teamTexts: { teamId: string; teamText: string }[] = [];
  for (const team of teams) {
    const text = await collectTeamText(team.id, admin);
    if (text) teamTexts.push({ teamId: team.id, teamText: text });
  }
  console.log(`  Collected text for ${teamTexts.length}/${teams.length} teams`);

  // Phase 2: Batch extract profiles (saves ~80% LLM latency vs individual calls)
  console.log("Phase 2: Extracting profiles in batches...");
  const profileMap = await extractTeamProfilesBatch(
    teamTexts.map((t) => ({ teamId: t.teamId, teamText: t.teamText }))
  );
  console.log(`  Extracted ${profileMap.size} profiles`);

  // Phase 3: Create snapshots with pre-extracted profiles
  console.log("Phase 3: Creating snapshots...");
  let success = 0;
  let failed = 0;
  for (const { teamId, teamText } of teamTexts) {
    const profile = profileMap.get(teamId);
    if (!profile) {
      console.error(`  ✗ No profile for ${teamId}`);
      failed++;
      continue;
    }
    try {
      await createTeamDirectionSnapshot(teamId, { adminClient: admin, profile });
      success++;
      process.stdout.write(`  ✓ ${success}/${teamTexts.length}\r`);
    } catch (err) {
      console.error(`  ✗ ${teamId}:`, err);
      failed++;
    }
  }

  console.log(`\nBackfill complete: ${success} success, ${failed} failed`);
  console.log("Run reclustering manually: POST /api/admin/hackathon/team-directions/clusters");
}

main().catch(console.error);
```

---

## Task 16: Modify Clusters API to Include Auto-Labeling

**Files:**
- Modify: `app/api/admin/hackathon/team-directions/clusters/route.ts`

### Step 16: Update POST handler to auto-label after reclustering

```typescript
import { autoLabelAllClusters } from "@/lib/clustering/auto-label";

// In the POST handler, after reclusterTeamDirections succeeds:
const { clusteringId } = await reclusterTeamDirections({ createdByUserId: adminUser.id });

// Auto-label clusters in background (don't block response)
autoLabelAllClusters(clusteringId).catch((err) => {
  console.error("Auto-labeling failed:", err);
});

return NextResponse.json({ ok: true, clusteringId });
```

## Task 17: Add Scheduled Reclustering (Vercel Cron or Manual Trigger)

**Files:**
- Create: `app/api/admin/hackathon/team-directions/recluster/route.ts`

### Step 17a: Create recluster trigger endpoint

```typescript
import { NextResponse } from "next/server";
import { reclusterTeamDirections } from "@/lib/clustering/team-direction";
import { autoLabelAllClusters } from "@/lib/clustering/auto-label";
import { requireAdminUser } from "@/lib/admin/requireAdmin";

export async function POST() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  
  try {
    const result = await reclusterTeamDirections({ createdByUserId: admin.id });
    await autoLabelAllClusters(result.clusteringId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### Step 17b: Vercel Cron (optional)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/admin/hackathon/team-directions/recluster",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs reclustering every hour. If using Vercel Cron, the endpoint needs a secret token check instead of admin auth.

---

## Engineering Review Fixes Applied

The following issues were identified during `/plan-eng-review` and fixed in this plan:

1. **Reclustering thundering herd (FIXED)** — Reclustering removed from embed job. Now triggered separately via scheduled job or manual endpoint.
2. **AI extraction latency (FIXED)** — Added `extractTeamProfilesBatch()` for backfill. Processes 5 teams per LLM call (~80% latency savings).
3. **Snapshot storage growth (FIXED)** — Added `prune_old_snapshots()` trigger. Retains only last 3 snapshots per team.
4. **Job queue over-engineered (FIXED)** — Simplified from 2-step pipeline to simple `status/attempts/error` model.
5. **Auto-labeling cost (FIXED)** — Batched into single LLM call. Cost: ~$0.01 vs $0.08 for 8 separate calls.

---

## Rollout Plan

1. **Run migration** (`supabase db push`)
2. **Deploy job queue API** (enqueue/process/status)
3. **Update submit/review routes** to use enqueue instead of fire-and-forget
4. **Run backfill script** to create snapshots for all existing teams
5. **Trigger initial reclustering** via POST to recluster endpoint
6. **Deploy admin dashboard** with search + RAG
7. **Monitor health endpoint** and verify queue processing
8. **Set up scheduled reclustering** (Vercel Cron or external scheduler)

## Testing Checklist

- [ ] Enqueue job → process → status poll works end-to-end
- [ ] Profile extraction produces valid structured data
- [ ] Multi-aspect embeddings are stored correctly
- [ ] Semantic search returns relevant teams
- [ ] RAG answers cite correct teams
- [ ] Auto-labeling generates meaningful cluster names
- [ ] Submit/review triggers enqueue job correctly
- [ ] Backfill script creates snapshots for all teams (with batched profile extraction)
- [ ] Health endpoint shows accurate metrics
- [ ] Old fire-and-forget logs deprecation warning

## Migration Notes

- Old `hackathon_team_direction_embeddings` table stays for backward compatibility
- New snapshots table stores superset of data (multi-aspect + temporal)
- Snapshots are auto-pruned to last 3 per team via database trigger
- Old clustering tables still work; new auto-labeling updates them in-place
- Reclustering is decoupled from embedding (no thundering herd)
- Gradual migration: new features use snapshots, old UI uses legacy embeddings until fully cut over
