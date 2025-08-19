-- 20250819064941_create_team_maps_table.sql
BEGIN;
CREATE TABLE IF NOT EXISTS public.classroom_team_maps (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	team_id uuid NOT NULL REFERENCES public.classroom_teams(id) ON DELETE CASCADE,
	map_id uuid NOT NULL REFERENCES public.learning_maps(id) ON DELETE CASCADE,
	original_map_id uuid NULL REFERENCES public.learning_maps(id),
	created_by uuid NULL REFERENCES auth.users(id),
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now(),
	visibility text DEFAULT 'team',
	metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_classroom_team_maps_team_id ON public.classroom_team_maps (team_id);
CREATE INDEX IF NOT EXISTS idx_classroom_team_maps_map_id ON public.classroom_team_maps (map_id);
COMMIT;