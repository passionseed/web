-- 20250819070000_add_team_rls_policies.sql
BEGIN;
ALTER TABLE public.classroom_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "classroom_members_view_teams" ON public.classroom_teams;
CREATE POLICY "classroom_members_view_teams" ON public.classroom_teams
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.classroom_memberships cm
            WHERE cm.user_id = auth.uid()
            AND cm.classroom_id = classroom_teams.classroom_id
        )
    );
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
-- Policy replaced in later migration
ALTER TABLE public.classroom_team_maps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_members_view_team_maps" ON public.classroom_team_maps;
CREATE POLICY "team_members_view_team_maps" ON public.classroom_team_maps
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.team_memberships tm
            WHERE tm.user_id = auth.uid()
            AND tm.team_id = classroom_team_maps.team_id
        )
    );
COMMIT;