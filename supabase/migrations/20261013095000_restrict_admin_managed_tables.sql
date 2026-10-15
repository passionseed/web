-- Only admins may write ai_agents and university_example_maps.
-- Previously any authenticated user could insert/update/delete them
-- (policies from 20251120000001 used auth.uid() IS NOT NULL).
-- Read policies are unchanged.

DROP POLICY IF EXISTS "Authenticated users can manage university example maps" ON public.university_example_maps;
CREATE POLICY "Admins can manage university example maps" ON public.university_example_maps
    FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage AI agents" ON public.ai_agents;
CREATE POLICY "Admins can manage AI agents" ON public.ai_agents
    FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
