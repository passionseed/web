-- Add type column to ps_projects
ALTER TABLE ps_projects 
ADD COLUMN type text NOT NULL DEFAULT 'project' 
CHECK (type IN ('project', 'hackathon'));

-- Index on type for faster filtering
CREATE INDEX idx_ps_projects_type ON ps_projects(type);
