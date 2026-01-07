-- Create project members table
create table if not exists ps_project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references ps_projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'member' not null,
  joined_at timestamptz default now() not null,
  unique(project_id, user_id)
);

-- Add assigned_to column to tasks
alter table ps_tasks 
add column if not exists assigned_to uuid references auth.users(id) on delete set null;

-- Enable RLS
alter table ps_project_members enable row level security;

-- Policies for ps_project_members
create policy "Project members are viewable by everyone in the project"
  on ps_project_members for select
  using (
    -- You can see members if you are a member
    (auth.uid() in (
      select user_id from ps_project_members where project_id = ps_project_members.project_id
    ))
    OR
    -- OR if you are the project creator (tracked in ps_projects) - though usually creator is a member
    (exists (
      select 1 from ps_projects 
      where id = ps_project_members.project_id 
      and created_by = auth.uid()
    ))
    OR
    -- OR allow anyone to see membership to know if they can join (optional, maybe restrict?)
    -- Let's stick to: Authenticated users can see membership (simplifies "Join" button logic)
    (auth.role() = 'authenticated')
  );

create policy "Users can join projects"
  on ps_project_members for insert
  with check (
    auth.uid() = user_id
  );

create policy "Members can leave projects"
  on ps_project_members for delete
  using (
    auth.uid() = user_id
  );

-- Update ps_tasks policies to assume project membership allows access
-- (Assuming existing policies might check for project ownership or public access)
-- check existing policies:
-- We probably need to ensure that 'select' on ps_tasks is allowed for project members.
-- Note: User didn't ask to change READ access (maybe projects are public?), but wanted WRITE access for members.

create policy "Project members can insert tasks"
  on ps_tasks for insert
  with check (
    exists (
      select 1 from ps_project_members
      where project_id = ps_tasks.project_id
      and user_id = auth.uid()
    )
  );

create policy "Project members can update tasks"
  on ps_tasks for update
  using (
    exists (
      select 1 from ps_project_members
      where project_id = ps_tasks.project_id
      and user_id = auth.uid()
    )
  );

create policy "Project members can delete tasks"
  on ps_tasks for delete
  using (
    exists (
      select 1 from ps_project_members
      where project_id = ps_tasks.project_id
      and user_id = auth.uid()
    )
  );
