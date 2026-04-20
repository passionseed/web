-- Hackathon submission embeddings + per-activity clustering
-- Designed generically (scope column) so PathLab submissions can plug in later
-- without a schema change.

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- 1. submission_embeddings: one BGE-M3 vector per submission
-- ---------------------------------------------------------------------------
create table if not exists public.submission_embeddings (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('hackathon_individual', 'hackathon_team')),
  hackathon_individual_submission_id uuid references public.hackathon_phase_activity_submissions(id) on delete cascade,
  hackathon_team_submission_id uuid references public.hackathon_phase_activity_team_submissions(id) on delete cascade,
  activity_id uuid not null references public.hackathon_phase_activities(id) on delete cascade,
  source_text text not null,
  text_hash text not null,
  embedding vector(1024) not null,
  model text not null default 'BAAI/bge-m3',
  generated_at timestamptz not null default now(),
  constraint submission_embeddings_one_target check (
    (scope = 'hackathon_individual'
      and hackathon_individual_submission_id is not null
      and hackathon_team_submission_id is null)
    or (scope = 'hackathon_team'
      and hackathon_team_submission_id is not null
      and hackathon_individual_submission_id is null)
  )
);

create unique index if not exists submission_embeddings_individual_unique
  on public.submission_embeddings(hackathon_individual_submission_id)
  where hackathon_individual_submission_id is not null;

create unique index if not exists submission_embeddings_team_unique
  on public.submission_embeddings(hackathon_team_submission_id)
  where hackathon_team_submission_id is not null;

create index if not exists submission_embeddings_activity_idx
  on public.submission_embeddings(activity_id);

-- ivfflat index aids future semantic-search features; safe to build even when small.
create index if not exists submission_embeddings_ivfflat
  on public.submission_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- ---------------------------------------------------------------------------
-- 2. activity_submission_clusterings: one row per clustering run per activity
-- ---------------------------------------------------------------------------
create table if not exists public.activity_submission_clusterings (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.hackathon_phase_activities(id) on delete cascade,
  algorithm text not null default 'kmeans',
  k integer not null,
  sample_count integer not null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  is_latest boolean not null default true
);

-- Only one "latest" row per activity.
create unique index if not exists activity_submission_clusterings_latest_unique
  on public.activity_submission_clusterings(activity_id)
  where is_latest;

create index if not exists activity_submission_clusterings_activity_idx
  on public.activity_submission_clusterings(activity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. activity_submission_clusters: one row per cluster in a clustering run
-- ---------------------------------------------------------------------------
create table if not exists public.activity_submission_clusters (
  id uuid primary key default gen_random_uuid(),
  clustering_id uuid not null references public.activity_submission_clusterings(id) on delete cascade,
  cluster_index integer not null,
  label text,
  summary text,
  member_count integer not null default 0,
  centroid vector(1024),
  centroid_2d vector(2),
  color text
);

create unique index if not exists activity_submission_clusters_unique
  on public.activity_submission_clusters(clustering_id, cluster_index);

-- ---------------------------------------------------------------------------
-- 4. submission_cluster_assignments: per-submission cluster + 2D projection
-- ---------------------------------------------------------------------------
create table if not exists public.submission_cluster_assignments (
  id uuid primary key default gen_random_uuid(),
  clustering_id uuid not null references public.activity_submission_clusterings(id) on delete cascade,
  embedding_id uuid not null references public.submission_embeddings(id) on delete cascade,
  cluster_id uuid not null references public.activity_submission_clusters(id) on delete cascade,
  projection_2d vector(2),
  distance_to_centroid real,
  created_at timestamptz not null default now()
);

create unique index if not exists submission_cluster_assignments_unique
  on public.submission_cluster_assignments(clustering_id, embedding_id);

create index if not exists submission_cluster_assignments_cluster_idx
  on public.submission_cluster_assignments(cluster_id);

-- ---------------------------------------------------------------------------
-- 5. RLS: admin read via user_roles pattern; writes via service role only.
-- ---------------------------------------------------------------------------
alter table public.submission_embeddings enable row level security;
alter table public.activity_submission_clusterings enable row level security;
alter table public.activity_submission_clusters enable row level security;
alter table public.submission_cluster_assignments enable row level security;

grant select on table public.submission_embeddings to authenticated;
grant select on table public.activity_submission_clusterings to authenticated;
grant select on table public.activity_submission_clusters to authenticated;
grant select on table public.submission_cluster_assignments to authenticated;

grant all on table public.submission_embeddings to service_role;
grant all on table public.activity_submission_clusterings to service_role;
grant all on table public.activity_submission_clusters to service_role;
grant all on table public.submission_cluster_assignments to service_role;

do $$
begin
  drop policy if exists "Admins read submission embeddings" on public.submission_embeddings;
  create policy "Admins read submission embeddings"
    on public.submission_embeddings for select
    using (
      exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid() and ur.role = 'admin'
      )
    );

  drop policy if exists "Admins read activity clusterings" on public.activity_submission_clusterings;
  create policy "Admins read activity clusterings"
    on public.activity_submission_clusterings for select
    using (
      exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid() and ur.role = 'admin'
      )
    );

  drop policy if exists "Admins read activity clusters" on public.activity_submission_clusters;
  create policy "Admins read activity clusters"
    on public.activity_submission_clusters for select
    using (
      exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid() and ur.role = 'admin'
      )
    );

  drop policy if exists "Admins read cluster assignments" on public.submission_cluster_assignments;
  create policy "Admins read cluster assignments"
    on public.submission_cluster_assignments for select
    using (
      exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid() and ur.role = 'admin'
      )
    );
end$$;
