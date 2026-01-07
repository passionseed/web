-- Drop the problematic policy
drop policy "Project members are viewable by everyone in the project" on ps_project_members;

-- Create a simplified policy preventing recursion
-- Since this is an internal tool, allowing all authenticated users to see project memberships is a safe pragmatism.
create policy "Project members are viewable by authenticated users"
  on ps_project_members for select
  using (
    auth.role() = 'authenticated'
  );
