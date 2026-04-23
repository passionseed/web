-- Team direction embeddings + clustering for hackathon teams

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- 1. hackathon_team_direction_embeddings
-- ---------------------------------------------------------------------------
create table if not exists public.hackathon_team_direction_embeddings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique references public.hackathon_teams(id) on delete cascade,
  source_text text not null,
  text_hash text not null,
  embedding vector(1024) not null,
  model text not null default 'BAAI/bge-m3',
  generated_at timestamptz not null default now()
);

create index if not exists team_direction_embeddings_ivfflat
  on public.hackathon_team_direction_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 20);

-- ---------------------------------------------------------------------------
-- 2. hackathon_team_direction_clusterings
-- ---------------------------------------------------------------------------
create table if not exists public.hackathon_team_direction_clusterings (
  id uuid primary key default gen_random_uuid(),
  algorithm text not null default 'kmeans',
  k integer not null,
  sample_count integer not null,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  is_latest boolean not null default true
);

create unique index if not exists team_direction_clusterings_latest_unique
  on public.hackathon_team_direction_clusterings ((true))
  where is_latest;

-- ---------------------------------------------------------------------------
-- 3. hackathon_team_direction_clusters
-- ---------------------------------------------------------------------------
create table if not exists public.hackathon_team_direction_clusters (
  id uuid primary key default gen_random_uuid(),
  clustering_id uuid not null references public.hackathon_team_direction_clusterings(id) on delete cascade,
  cluster_index integer not null,
  label text,
  summary text,
  member_count integer not null default 0,
  centroid vector(1024),
  centroid_2d vector(2),
  color text
);

create unique index if not exists team_direction_clusters_unique
  on public.hackathon_team_direction_clusters(clustering_id, cluster_index);

-- ---------------------------------------------------------------------------
-- 4. hackathon_team_direction_cluster_assignments
-- ---------------------------------------------------------------------------
create table if not exists public.hackathon_team_direction_cluster_assignments (
  id uuid primary key default gen_random_uuid(),
  clustering_id uuid not null references public.hackathon_team_direction_clusterings(id) on delete cascade,
  embedding_id uuid not null references public.hackathon_team_direction_embeddings(id) on delete cascade,
  cluster_id uuid not null references public.hackathon_team_direction_clusters(id) on delete cascade,
  projection_2d vector(2),
  distance_to_centroid real,
  created_at timestamptz not null default now()
);

create unique index if not exists team_direction_cluster_assignments_unique
  on public.hackathon_team_direction_cluster_assignments(clustering_id, embedding_id);

create index if not exists team_direction_cluster_assignments_cluster_idx
  on public.hackathon_team_direction_cluster_assignments(cluster_id);

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
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

do $$
begin
  drop policy if exists "Admins read team direction embeddings" on public.hackathon_team_direction_embeddings;
  create policy "Admins read team direction embeddings"
    on public.hackathon_team_direction_embeddings for select
    using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

  drop policy if exists "Admins read team direction clusterings" on public.hackathon_team_direction_clusterings;
  create policy "Admins read team direction clusterings"
    on public.hackathon_team_direction_clusterings for select
    using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

  drop policy if exists "Admins read team direction clusters" on public.hackathon_team_direction_clusters;
  create policy "Admins read team direction clusters"
    on public.hackathon_team_direction_clusters for select
    using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

  drop policy if exists "Admins read team direction cluster assignments" on public.hackathon_team_direction_cluster_assignments;
  create policy "Admins read team direction cluster assignments"
    on public.hackathon_team_direction_cluster_assignments for select
    using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));
end$$;
