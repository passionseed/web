-- Enable required extensions
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- Create enum types (only if they don't exist)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'community_role') then
    create type public.community_role as enum ('member', 'moderator', 'admin', 'owner');
  end if;
  
  if not exists (select 1 from pg_type where typname = 'post_type') then
    create type public.post_type as enum ('text', 'image', 'link', 'poll');
  end if;
  
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum ('planning', 'in_progress', 'completed', 'on_hold');
  end if;
end $$;

-- Communities table (only if it doesn't exist)
create table if not exists public.communities (
  id uuid not null default extensions.uuid_generate_v4(),
  name text not null,
  slug text not null generated always as (lower(replace(replace(trim(name), ' ', '-'), '.', ''))) stored,
  description text,
  short_description text,
  is_public boolean not null default true,
  is_active boolean not null default true,
  member_count integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint communities_pkey primary key (id),
  constraint communities_slug_key unique (slug)
) tablespace pg_default;

-- Community images (for profile and cover photos)
create table if not exists public.community_images (
  id uuid not null default extensions.uuid_generate_v4(),
  community_id uuid not null,
  url text not null,
  type text not null check (type in ('profile', 'cover')),
  storage_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  constraint community_images_pkey primary key (id),
  constraint community_images_community_id_fkey foreign key (community_id) 
    references communities(id) on delete cascade
) tablespace pg_default;

-- User communities (membership)
create table if not exists public.user_communities (
  id uuid not null default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  community_id uuid not null references communities(id) on delete cascade,
  role community_role not null default 'member',
  joined_at timestamp with time zone not null default now(),
  last_seen_at timestamp with time zone,
  constraint user_communities_pkey primary key (id),
  constraint user_communities_user_community_key unique (user_id, community_id)
) tablespace pg_default;

-- Community posts
create table if not exists public.community_posts (
  id uuid not null default extensions.uuid_generate_v4(),
  community_id uuid not null references communities(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references community_posts(id) on delete cascade,
  title text,
  content text,
  type post_type not null default 'text',
  metadata jsonb,
  is_pinned boolean not null default false,
  is_edited boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint community_posts_pkey primary key (id)
) tablespace pg_default;

-- Post media (for images, files, etc.)
create table if not exists public.post_media (
  id uuid not null default extensions.uuid_generate_v4(),
  post_id uuid not null references community_posts(id) on delete cascade,
  url text not null,
  type text not null,
  storage_path text not null,
  metadata jsonb,
  created_at timestamp with time zone not null default now(),
  constraint post_media_pkey primary key (id)
) tablespace pg_default;

-- Post likes
create table if not exists public.post_likes (
  id uuid not null default extensions.uuid_generate_v4(),
  post_id uuid not null references community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  constraint post_likes_pkey primary key (id),
  constraint post_likes_post_user_key unique (post_id, user_id)
) tablespace pg_default;

-- Post comments
create table if not exists public.post_comments (
  id uuid not null default extensions.uuid_generate_v4(),
  post_id uuid not null references community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references post_comments(id) on delete cascade,
  content text not null,
  is_edited boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint post_comments_pkey primary key (id)
) tablespace pg_default;

-- Community projects
create table if not exists public.community_projects (
  id uuid not null default extensions.uuid_generate_v4(),
  community_id uuid not null references communities(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete set null,
  title text not null,
  description text,
  status project_status not null default 'planning',
  start_date date,
  target_date date,
  is_featured boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint community_projects_pkey primary key (id)
) tablespace pg_default;

-- Project members
create table if not exists public.project_members (
  id uuid not null default extensions.uuid_generate_v4(),
  project_id uuid not null references community_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'contributor',
  joined_at timestamp with time zone not null default now(),
  constraint project_members_pkey primary key (id),
  constraint project_members_project_user_key unique (project_id, user_id)
) tablespace pg_default;

-- Mentors
create table if not exists public.community_mentors (
  id uuid not null default extensions.uuid_generate_v4(),
  community_id uuid not null references communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  bio text,
  expertise text[],
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint community_mentors_pkey primary key (id),
  constraint community_mentors_community_user_key unique (community_id, user_id)
) tablespace pg_default;

-- Add missing columns if they don't exist
do $$
begin
  -- Add slug column if it doesn't exist
  if not exists (select 1 from information_schema.columns where table_name = 'communities' and column_name = 'slug') then
    alter table public.communities 
    add column slug text generated always as (lower(replace(replace(trim(name), ' ', '-'), '.', ''))) stored;
  end if;
  
  -- Add other missing columns as needed
  if not exists (select 1 from information_schema.columns where table_name = 'communities' and column_name = 'short_description') then
    alter table public.communities 
    add column short_description text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'communities' and column_name = 'is_public') then
    alter table public.communities 
    add column is_public boolean not null default true;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'communities' and column_name = 'is_active') then
    alter table public.communities 
    add column is_active boolean not null default true;
  end if;
  
  -- Add unique constraint on slug if it doesn't exist
  if not exists (
    select 1 from information_schema.table_constraints 
    where table_name = 'communities' and constraint_name = 'communities_slug_key'
  ) then
    alter table public.communities 
    add constraint communities_slug_key unique (slug);
  end if;
end $$;

-- Create indexes for better query performance (only if they don't exist)
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'idx_communities_slug') then
    create index idx_communities_slug on public.communities(slug);
  end if;
  
  if not exists (select 1 from pg_indexes where indexname = 'idx_community_posts_community') then
    create index idx_community_posts_community on public.community_posts(community_id);
  end if;
  
  if not exists (select 1 from pg_indexes where indexname = 'idx_community_posts_author') then
    create index idx_community_posts_author on public.community_posts(author_id);
  end if;
  
  if not exists (select 1 from pg_indexes where indexname = 'idx_community_projects_community') then
    create index idx_community_projects_community on public.community_projects(community_id);
  end if;
  
  if not exists (select 1 from pg_indexes where indexname = 'idx_community_mentors_community') then
    create index idx_community_mentors_community on public.community_mentors(community_id);
  end if;
end $$;

-- Set up Row Level Security (RLS)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'communities') then
    alter table public.communities enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'community_images') then
    alter table public.community_images enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'user_communities') then
    alter table public.user_communities enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'community_posts') then
    alter table public.community_posts enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'post_media') then
    alter table public.post_media enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'post_likes') then
    alter table public.post_likes enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'post_comments') then
    alter table public.post_comments enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'community_projects') then
    alter table public.community_projects enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'project_members') then
    alter table public.project_members enable row level security;
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'community_mentors') then
    alter table public.community_mentors enable row level security;
  end if;
end $$;

-- Create RLS policies (only if they don't exist)
do $$
begin
  -- Communities: Public read, authenticated users can create
  if not exists (select 1 from pg_policies where tablename = 'communities' and policyname = 'Communities are viewable by everyone') then
    create policy "Communities are viewable by everyone"
      on public.communities for select
      using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'communities' and policyname = 'Authenticated users can create communities') then
    create policy "Authenticated users can create communities"
      on public.communities for insert
      with check (auth.role() = 'authenticated');
  end if;
  
  -- User communities: Users can see their own memberships
  if not exists (select 1 from pg_policies where tablename = 'user_communities' and policyname = 'Users can view their own community memberships') then
    create policy "Users can view their own community memberships"
      on public.user_communities for select
      using (auth.uid() = user_id);
  end if;
  
  -- Community posts: Public read, members can create
  if not exists (select 1 from pg_policies where tablename = 'community_posts' and policyname = 'Community posts are viewable by everyone') then
    create policy "Community posts are viewable by everyone"
      on public.community_posts for select
      using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'community_posts' and policyname = 'Community members can create posts') then
    create policy "Community members can create posts"
      on public.community_posts for insert
      with check (
        exists (
          select 1 from public.user_communities uc
          where uc.community_id = community_posts.community_id
          and uc.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Create or replace the trigger function for updated_at
create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create or replace triggers for updated_at columns
do $$
begin
  -- For communities table
  if not exists (select 1 from pg_trigger where tgname = 'set_communities_updated_at') then
    execute 'create trigger set_communities_updated_at
    before update on public.communities
    for each row
    execute function public.set_current_timestamp_updated_at()';
  end if;
  
  -- For community_posts table
  if not exists (select 1 from pg_trigger where tgname = 'set_community_posts_updated_at') then
    execute 'create trigger set_community_posts_updated_at
    before update on public.community_posts
    for each row
    execute function public.set_current_timestamp_updated_at()';
  end if;
  
  -- For post_comments table
  if not exists (select 1 from pg_trigger where tgname = 'set_post_comments_updated_at') then
    execute 'create trigger set_post_comments_updated_at
    before update on public.post_comments
    for each row
    execute function public.set_current_timestamp_updated_at()';
  end if;
end $$;

-- Create or replace the trigger function for updating member_count
create or replace function public.update_community_member_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update public.communities
    set member_count = member_count + 1
    where id = new.community_id;
  elsif tg_op = 'DELETE' then
    update public.communities
    set member_count = member_count - 1
    where id = old.community_id;
  end if;
  return null;
end;
$$ language plpgsql;

-- Create the trigger for member count if it doesn't exist
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'update_member_count') then
    execute 'create trigger update_member_count
    after insert or delete on public.user_communities
    for each row
    execute function public.update_community_member_count()';
  end if;
end $$;

-- Create or replace the function to check if a user is a community member
create or replace function public.is_community_member(community_id_param uuid, user_id_param uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.user_communities
    where community_id = community_id_param
    and user_id = user_id_param
  );
end;
$$ language plpgsql security definer;

-- Create or replace the function to check if a user is a community admin
create or replace function public.is_community_admin(community_id_param uuid, user_id_param uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.user_communities
    where community_id = community_id_param
    and user_id = user_id_param
    and role in ('admin', 'owner')
  );
end;
$$ language plpgsql security definer;