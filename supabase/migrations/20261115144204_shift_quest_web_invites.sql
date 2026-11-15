-- Web invitations expose opaque member IDs and display names, never Discord IDs.
-- Reuse project_invite for membership, notification and audit rules.
BEGIN;

CREATE OR REPLACE FUNCTION public.shift_quest_project_friends(p_actor text, p_project uuid, p_query text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_result jsonb;
BEGIN
  IF v_member.roles && ARRAY['reviewer', 'admin', 'fulfillment']::text[] THEN
    PERFORM public.shift_quest__fail('not_eligible');
  END IF;
  IF NOT public.shift_quest__is_teammate(p_project, v_member.id) THEN
    PERFORM public.shift_quest__fail('not_project_member');
  END IF;
  IF p_query IS NULL OR char_length(btrim(p_query)) < 2 OR char_length(p_query) > 80 THEN
    PERFORM public.shift_quest__fail('invalid_input');
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', f.id, 'name', f.display_name)
    ORDER BY f.display_name, f.id), '[]'::jsonb) INTO v_result
  FROM (
    SELECT m.id, m.display_name FROM public.shift_quest_members m
    WHERE m.id <> v_member.id AND m.onboarded_at IS NOT NULL
      AND m.erased_at IS NULL AND m.discord_user_id IS NOT NULL
      AND NOT (m.roles && ARRAY['reviewer', 'admin', 'fulfillment']::text[])
      AND strpos(lower(m.display_name), lower(btrim(p_query))) > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.shift_quest_project_members pm
        WHERE pm.project_id = p_project AND pm.member_id = m.id AND pm.status IN ('active', 'invited')
      )
    ORDER BY m.display_name, m.id LIMIT 20
  ) f;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_project_invite_friend(p_actor text, p_project uuid, p_friend uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_discord text;
BEGIN
  IF v_member.roles && ARRAY['reviewer', 'admin', 'fulfillment']::text[] THEN
    PERFORM public.shift_quest__fail('not_eligible');
  END IF;
  IF NOT public.shift_quest__is_teammate(p_project, v_member.id) THEN
    PERFORM public.shift_quest__fail('not_project_member');
  END IF;
  -- Serialize web invitations to one friend on one plot, including duplicate clicks.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_project::text || ':' || p_friend::text, 0));
  SELECT discord_user_id INTO v_discord FROM public.shift_quest_members
  WHERE id = p_friend AND onboarded_at IS NOT NULL AND erased_at IS NULL
    AND discord_user_id IS NOT NULL
    AND NOT (roles && ARRAY['reviewer', 'admin', 'fulfillment']::text[]);
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('invitee_not_started');
  END IF;
  PERFORM public.shift_quest_project_invite(p_actor, p_project, v_discord);
END;
$$;

REVOKE ALL ON FUNCTION public.shift_quest_project_friends(text, uuid, text) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_project_invite_friend(text, uuid, uuid) FROM PUBLIC, anon, authenticated, shift_quest_bot;
GRANT EXECUTE ON FUNCTION public.shift_quest_project_friends(text, uuid, text) TO shift_quest_web;
GRANT EXECUTE ON FUNCTION public.shift_quest_project_invite_friend(text, uuid, uuid) TO shift_quest_web;
COMMIT;
