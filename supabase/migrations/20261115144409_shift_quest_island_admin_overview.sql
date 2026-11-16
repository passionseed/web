-- Private oversight for application admins. Public map/consent rules stay intact.
BEGIN;
CREATE OR REPLACE FUNCTION public.shift_quest_admin_island(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
BEGIN
  RETURN jsonb_build_object('projects', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'slot', pl.slot, 'name', p.name, 'route', p.route, 'ambition', p.ambition,
      'milestones', public.shift_quest__milestones(p.id),
      'members', COALESCE((SELECT jsonb_agg(COALESCE(m.display_name, 'ไม่ระบุชื่อ') ORDER BY m.display_name, m.id)
        FROM public.shift_quest_project_members pm JOIN public.shift_quest_members m ON m.id = pm.member_id
        WHERE pm.project_id = p.id AND pm.status = 'active' AND m.erased_at IS NULL), '[]'::jsonb),
      'waitingReview', (SELECT count(*) FROM public.shift_quest_instances i
        WHERE i.project_id = p.id AND i.state IN ('submitted', 'appealed')),
      'openHelp', (SELECT count(*) FROM public.shift_quest_help_requests h
        WHERE h.project_id = p.id AND h.status IN ('open', 'claimed')),
      'checkinsWeek', (SELECT count(*) FROM public.shift_quest_progress g
        WHERE g.project_id = p.id AND g.kind = 'tap'
          AND (g.created_at AT TIME ZONE 'Asia/Bangkok')::date >= (now() AT TIME ZONE 'Asia/Bangkok')::date - 6),
      'lastActivity', GREATEST(p.updated_at,
        (SELECT max(i.updated_at) FROM public.shift_quest_instances i WHERE i.project_id = p.id),
        (SELECT max(g.created_at) FROM public.shift_quest_progress g WHERE g.project_id = p.id),
        (SELECT max(h.updated_at) FROM public.shift_quest_help_requests h WHERE h.project_id = p.id))
    ) ORDER BY pl.slot)
    FROM public.shift_quest_projects p JOIN public.shift_quest_plots pl ON pl.project_id = p.id
    WHERE p.archived_at IS NULL
  ), '[]'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.shift_quest_admin_island(text) FROM PUBLIC, anon, authenticated, shift_quest_bot;
GRANT EXECUTE ON FUNCTION public.shift_quest_admin_island(text) TO shift_quest_web, service_role;
COMMIT;
