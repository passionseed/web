-- SHIFT Island: a plot shows its team's project name by default.
--
-- Founder's ask (2026-11-14): "make each plot show name, by default, to build
-- community". show_name was opt-in (default false, turned on with
-- shift_quest_island_optin). It becomes opt-out: every new project member starts
-- shown, and a member can still hide it with shift_quest_island_optin(.., false).
--
-- Unchanged on purpose: shift_quest__name_visible still needs every active member
-- to be shown AND shift_quest__consent_ok (parent consent, adult basis or an
-- import from the SHIFT application; the consent_required kill switch is not
-- touched). Only the project name, stage and decorations become visible, as
-- already designed: no student name appears anywhere.
--
-- 1. Column default true (new members, created by shift_quest_project_create).
-- 2. shift_quest_project_invite used to reset show_name = false on a re-invite
--    ("asked afresh"); it now sets true, so a re-joiner starts shown as well.
-- 3. Backfill: active members who never explicitly hid it become shown. An explicit
--    hide is the member's latest island_name_on / island_name_off audit row for the
--    project (since this membership row began) being island_name_off. Re-running is
--    safe: a hide made after the first run leaves an island_name_off row as the
--    latest, so it is skipped again.
--
-- The maintainer applies this migration. Additive and idempotent. The schema
-- version is not bumped: neither the bot nor the web needs to tell versions apart.

ALTER TABLE public.shift_quest_project_members ALTER COLUMN show_name SET DEFAULT true;

UPDATE public.shift_quest_project_members pm
SET show_name = true
WHERE pm.status = 'active'
  AND NOT pm.show_name
  AND COALESCE((
    SELECT a.action
    FROM public.shift_quest_audit a
    WHERE a.actor_id = pm.member_id
      AND a.resource_type = 'project'
      AND a.resource_id = pm.project_id
      AND a.action IN ('island_name_on', 'island_name_off')
      AND a.created_at >= pm.created_at
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT 1
  ), 'island_name_on') <> 'island_name_off';

/** Invites need the invitee to have run /start: no record is made for anyone who has not. */
CREATE OR REPLACE FUNCTION public.shift_quest_project_invite(p_actor text, p_project uuid, p_invitee text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_invitee public.shift_quest_members;
  v_project public.shift_quest_projects;
  v_status text;
BEGIN
  IF NOT public.shift_quest__is_teammate(p_project, v_member.id) THEN
    PERFORM public.shift_quest__fail('not_project_member');
  END IF;
  SELECT * INTO v_project FROM public.shift_quest_projects WHERE id = p_project AND archived_at IS NULL;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;

  SELECT * INTO v_invitee FROM public.shift_quest_members
  WHERE discord_user_id = p_invitee AND onboarded_at IS NOT NULL;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('invitee_not_started');
  END IF;
  IF v_invitee.id = v_member.id THEN
    PERFORM public.shift_quest__fail('already_member');
  END IF;

  SELECT status INTO v_status FROM public.shift_quest_project_members
  WHERE project_id = p_project AND member_id = v_invitee.id;
  IF v_status IN ('active', 'invited') THEN
    PERFORM public.shift_quest__fail('already_member');
  END IF;

  INSERT INTO public.shift_quest_project_members (project_id, member_id, status, invited_by)
  VALUES (p_project, v_invitee.id, 'invited', v_member.id)
  ON CONFLICT (project_id, member_id) DO UPDATE
    SET status = 'invited', invited_by = EXCLUDED.invited_by, created_at = now(), responded_at = NULL,
        show_name = true; -- the plot's name shows by default again; the member can hide it

  PERFORM public.shift_quest__notify(
    v_invitee.id,
    'invite:' || p_project || ':' || v_invitee.id || ':' || extract(epoch FROM clock_timestamp())::text,
    'project_invite',
    -- actor_id lets erasure scrub the sender's name from this notice later.
    jsonb_build_object('project_id', p_project, 'project_name', v_project.name, 'from', v_member.display_name,
                       'actor_id', v_member.id),
    p_project
  );
  PERFORM public.shift_quest__audit(v_member.id, 'project_invite', 'project', p_project);
END;
$$;
