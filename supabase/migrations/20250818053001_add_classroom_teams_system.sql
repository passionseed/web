-- Add classroom teams system
-- This migration creates tables for student teams within classrooms

-- Create classroom_teams table
CREATE TABLE IF NOT EXISTS public.classroom_teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL,
  name character varying(255) NOT NULL,
  description text NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  is_active boolean NULL DEFAULT true,
  max_members integer NULL,
  team_metadata jsonb NULL,
  CONSTRAINT classroom_teams_pkey PRIMARY KEY (id),
  CONSTRAINT classroom_teams_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE,
  CONSTRAINT classroom_teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT classroom_teams_name_length CHECK (
    (char_length(name) >= 1) AND (char_length(name) <= 255)
  ),
  CONSTRAINT classroom_teams_description_length CHECK (
    (char_length(description) <= 2000)
  ),
  CONSTRAINT classroom_teams_max_members_positive CHECK (
    (max_members IS NULL) OR (max_members > 0)
  )
) TABLESPACE pg_default;

-- Create team_memberships table
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role character varying(50) NOT NULL DEFAULT 'member'::character varying,
  joined_at timestamp with time zone NULL DEFAULT now(),
  left_at timestamp with time zone NULL,
  is_leader boolean NOT NULL DEFAULT false,
  member_metadata jsonb NULL,
  CONSTRAINT team_memberships_pkey PRIMARY KEY (id),
  CONSTRAINT team_memberships_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.classroom_teams(id) ON DELETE CASCADE,
  CONSTRAINT team_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT team_memberships_valid_role CHECK (
    (role)::text = ANY (
      ARRAY[
        'member'::character varying,
        'co-leader'::character varying,
        'leader'::character varying
      ]::text[]
    )
  ),
  CONSTRAINT team_memberships_one_leader_per_team EXCLUDE USING gist (
    (team_id::text) WITH =, 
    (is_leader::int) WITH = 
  ) WHERE (is_leader = true)
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classroom_teams_classroom ON public.classroom_teams USING btree (classroom_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_classroom_teams_created_by ON public.classroom_teams USING btree (created_by) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_classroom_teams_active ON public.classroom_teams USING btree (is_active) TABLESPACE pg_default WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS idx_team_memberships_team ON public.team_memberships USING btree (team_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_team_memberships_user ON public.team_memberships USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_team_memberships_role ON public.team_memberships USING btree (role) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_team_memberships_leader ON public.team_memberships USING btree (is_leader) TABLESPACE pg_default WHERE (is_leader = true);

-- Create unique index to prevent duplicate active memberships
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_memberships_unique_active ON public.team_memberships USING btree (team_id, user_id) TABLESPACE pg_default WHERE (left_at IS NULL);

-- Enable Row Level Security
ALTER TABLE public.classroom_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classroom_teams
CREATE POLICY "Users can view teams in their classrooms" ON public.classroom_teams
  FOR SELECT USING (
    classroom_id IN (
      SELECT classroom_id FROM public.classroom_memberships 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Classroom instructors and leaders can create teams" ON public.classroom_teams
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    classroom_id IN (
      SELECT classroom_id FROM public.classroom_memberships 
      WHERE user_id = auth.uid() AND role IN ('instructor', 'ta') AND left_at IS NULL
    )
  );

CREATE POLICY "Team leaders and classroom instructors can update teams" ON public.classroom_teams
  FOR UPDATE USING (
    created_by = auth.uid() OR
    id IN (
      SELECT team_id FROM public.team_memberships 
      WHERE user_id = auth.uid() AND is_leader = true AND left_at IS NULL
    ) OR
    classroom_id IN (
      SELECT classroom_id FROM public.classroom_memberships 
      WHERE user_id = auth.uid() AND role IN ('instructor', 'ta') AND left_at IS NULL
    )
  );

-- RLS Policies for team_memberships
CREATE POLICY "Users can view team memberships in their classrooms" ON public.team_memberships
  FOR SELECT USING (
    team_id IN (
      SELECT id FROM public.classroom_teams 
      WHERE classroom_id IN (
        SELECT classroom_id FROM public.classroom_memberships 
        WHERE user_id = auth.uid() AND left_at IS NULL
      )
    )
  );

CREATE POLICY "Team leaders and classroom instructors can manage memberships" ON public.team_memberships
  FOR ALL USING (
    team_id IN (
      SELECT id FROM public.classroom_teams 
      WHERE classroom_id IN (
        SELECT classroom_id FROM public.classroom_memberships 
        WHERE user_id = auth.uid() AND role IN ('instructor', 'ta') AND left_at IS NULL
      )
    ) OR
    team_id IN (
      SELECT team_id FROM public.team_memberships 
      WHERE user_id = auth.uid() AND is_leader = true AND left_at IS NULL
    )
  );

-- Grant permissions
GRANT ALL ON TABLE public.classroom_teams TO authenticated;
GRANT ALL ON TABLE public.team_memberships TO authenticated;