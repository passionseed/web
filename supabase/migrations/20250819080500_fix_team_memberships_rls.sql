-- 20250819080500_fix_team_memberships_rls.sql
BEGIN;
DROP POLICY IF EXISTS "users_view_team_memberships" ON public.team_memberships;
CREATE POLICY "users_view_team_memberships" ON public.team_memberships
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.classroom_teams ct
            JOIN public.classroom_memberships cm ON ct.classroom_id = cm.classroom_id
            WHERE cm.user_id = auth.uid()
            AND ct.id = team_memberships.team_id
        )
    );
DROP POLICY IF EXISTS "team_leaders_insert_team_maps" ON public.classroom_team_maps;
CREATE POLICY "team_leaders_insert_team_maps" ON public.classroom_team_maps
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.team_memberships tm
            WHERE tm.user_id = auth.uid()
            AND tm.team_id = classroom_team_maps.team_id
            AND tm.is_leader = true
            AND tm.left_at IS NULL
        )
    );
COMMIT;