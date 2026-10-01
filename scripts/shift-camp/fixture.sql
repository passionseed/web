-- Minimal legacy contract, synthetic data only. Used in an isolated test DB.
do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; end $$;
create schema auth;
create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users(id uuid primary key);
create table public.profiles(id uuid primary key references auth.users,full_name text,preferred_language text,is_onboarded boolean default false,onboarded_at timestamptz,mobile_settings jsonb);
create table public.user_roles(user_id uuid references auth.users,role text);
create table public.classrooms(id uuid primary key default gen_random_uuid(),name text,instructor_id uuid references auth.users);
create table public.classroom_memberships(classroom_id uuid references classrooms,user_id uuid references auth.users,role text,unique(classroom_id,user_id));
create table public.classroom_teams(id uuid primary key default gen_random_uuid(),classroom_id uuid references classrooms,name text,created_by uuid references auth.users,max_members integer,is_active boolean default true);
create table public.team_memberships(id uuid primary key default gen_random_uuid(),team_id uuid references classroom_teams,user_id uuid references auth.users,left_at timestamptz);
create table public.communities(id uuid primary key default gen_random_uuid(),name text,is_public boolean default true);
create table public.user_communities(community_id uuid references communities,user_id uuid references auth.users,role text,unique(user_id,community_id));
create table public.community_projects(id uuid primary key default gen_random_uuid(),community_id uuid references communities,title text,description text,created_by uuid references auth.users,updated_at timestamptz default now());
create table public.project_members(project_id uuid references community_projects,user_id uuid references auth.users,role text,unique(project_id,user_id));
create table public.community_posts(id uuid primary key default gen_random_uuid(),community_id uuid references communities,author_id uuid references auth.users,title text,content text,metadata jsonb,is_edited boolean default false,updated_at timestamptz default now());
create table public.post_comments(id uuid primary key default gen_random_uuid(),post_id uuid references community_posts,author_id uuid references auth.users,content text,created_at timestamptz default now());
create table public.learning_maps(id uuid primary key default gen_random_uuid(),title text,description text,creator_id uuid references profiles,map_type text);
create table public.map_nodes(id uuid primary key default gen_random_uuid(),map_id uuid references learning_maps,title text,instructions text,metadata jsonb);
create table public.user_map_enrollments(user_id uuid references profiles,map_id uuid references learning_maps,unique(user_id,map_id));
create table public.student_node_progress(user_id uuid references profiles,node_id uuid references map_nodes,status text,unique(user_id,node_id));
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets,name text);
alter table storage.objects enable row level security;
grant usage on schema public,auth,storage to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
grant all on all tables in schema public to anon,authenticated;
grant select,insert,delete on storage.objects to authenticated;
do $$ declare tbl text; begin
 foreach tbl in array array['communities','user_communities','community_projects','project_members','community_posts','post_comments','classrooms','classroom_memberships','classroom_teams','team_memberships'] loop
 execute format('alter table %I enable row level security',tbl);
 execute format('create policy legacy_open on %I for all using(true) with check(true)',tbl);
 end loop;
end $$;
