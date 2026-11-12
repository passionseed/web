-- SHIFT High quests: helpers and student-facing functions.
--
-- The bot calls these as shift_quest_bot (migration 20261111090600). Every
-- function takes the caller's Discord user ID first and checks, inside the
-- database, that the caller may do what they ask. Errors are raised as
-- 'sq:<code>' (SQLSTATE P0001); the bot maps each code to a message.
--
-- Prod-first apply: CREATE OR REPLACE only.

-- ---------------------------------------------------------------------------
-- Helpers (double underscore: never granted to the bot)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest__fail(p_code text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'sq:%', p_code USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest__trim(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(btrim(p_text), '');
$$;

/** Any known, non-erased member. */
CREATE OR REPLACE FUNCTION public.shift_quest__member(p_actor text)
RETURNS public.shift_quest_members
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members;
BEGIN
  IF p_actor IS NULL THEN
    PERFORM public.shift_quest__fail('not_started');
  END IF;
  SELECT * INTO v_member FROM public.shift_quest_members WHERE discord_user_id = p_actor;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_started');
  END IF;
  RETURN v_member;
END;
$$;

/** A member who finished /start. */
CREATE OR REPLACE FUNCTION public.shift_quest__student(p_actor text)
RETURNS public.shift_quest_members
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
BEGIN
  IF v_member.onboarded_at IS NULL THEN
    PERFORM public.shift_quest__fail('not_started');
  END IF;
  RETURN v_member;
END;
$$;

/** A member holding one of the given application roles. */
CREATE OR REPLACE FUNCTION public.shift_quest__staff(p_actor text, p_roles text[])
RETURNS public.shift_quest_members
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members;
BEGIN
  SELECT * INTO v_member FROM public.shift_quest_members WHERE discord_user_id = p_actor;
  IF NOT FOUND OR NOT (v_member.roles && p_roles) THEN
    PERFORM public.shift_quest__fail('not_authorized');
  END IF;
  RETURN v_member;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest__settings()
RETURNS public.shift_quest_settings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.shift_quest_settings WHERE id;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest__audit(
  p_actor uuid, p_action text, p_type text, p_id uuid, p_outcome text DEFAULT 'ok'
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.shift_quest_audit (actor_id, action, resource_type, resource_id, outcome)
  VALUES (p_actor, p_action, p_type, p_id, p_outcome);
$$;

/** A private notice for one member, plus a content-free DM nudge if they opted in. */
CREATE OR REPLACE FUNCTION public.shift_quest__notify(
  p_member uuid, p_dedupe text, p_kind text, p_params jsonb, p_ref uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted boolean;
BEGIN
  INSERT INTO public.shift_quest_inbox (member_id, dedupe_key, kind, params, ref_id)
  VALUES (p_member, p_dedupe, p_kind, COALESCE(p_params, '{}'), p_ref)
  ON CONFLICT (dedupe_key) DO NOTHING
  RETURNING true INTO v_inserted;

  IF v_inserted AND EXISTS (
    SELECT 1 FROM public.shift_quest_members
    WHERE id = p_member AND notify_dm AND erased_at IS NULL
  ) THEN
    INSERT INTO public.shift_quest_outbox (dedupe_key, target_kind, member_id, kind)
    VALUES ('nudge:' || p_dedupe, 'dm', p_member, 'nudge')
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest__post(
  p_dedupe text, p_channel text, p_kind text, p_params jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.shift_quest_outbox (dedupe_key, target_kind, channel_key, kind, params)
  VALUES (p_dedupe, 'channel', p_channel, p_kind, COALESCE(p_params, '{}'))
  ON CONFLICT (dedupe_key) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest__is_teammate(p_project uuid, p_member uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shift_quest_project_members pm
    JOIN public.shift_quest_projects p ON p.id = pm.project_id
    WHERE pm.project_id = p_project AND pm.member_id = p_member AND pm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.shift_quest__balance(p_member uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::integer FROM public.shift_quest_ledger WHERE member_id = p_member;
$$;

/**
 * What still stops each feature from being switched on. An empty list means
 * the feature may be enabled; the *_enabled flags say whether it is.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__blockers()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shift_quest_settings := public.shift_quest__settings();
  v_awards text[] := '{}';
  v_redemption text[] := '{}';
  v_sharing text[] := '{}';
  v_reminders text[] := '{}';
BEGIN
  IF public.shift_quest__trim(s.reward_terms) IS NULL THEN
    v_awards := array_append(v_awards, 'reward_terms');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shift_quest_reward_rules WHERE status = 'published') THEN
    v_awards := array_append(v_awards, 'reward_rule');
  END IF;

  IF NOT s.awards_enabled THEN
    v_redemption := array_append(v_redemption, 'awards_enabled');
  END IF;
  IF public.shift_quest__trim(s.redemption_terms) IS NULL THEN
    v_redemption := array_append(v_redemption, 'redemption_terms');
  END IF;
  IF public.shift_quest__trim(s.fulfillment_process) IS NULL THEN
    v_redemption := array_append(v_redemption, 'fulfillment_process');
  END IF;
  IF public.shift_quest__trim(s.fulfillment_owner) IS NULL THEN
    v_redemption := array_append(v_redemption, 'fulfillment_owner');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shift_quest_members WHERE 'fulfillment' = ANY (roles)) THEN
    v_redemption := array_append(v_redemption, 'fulfillment_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shift_quest_catalog WHERE active AND stock_available > 0) THEN
    v_redemption := array_append(v_redemption, 'catalog_item');
  END IF;

  IF s.celebrate_channel_id IS NULL THEN
    v_sharing := array_append(v_sharing, 'celebrate_channel');
  END IF;

  RETURN jsonb_build_object(
    'awards', to_jsonb(v_awards),
    'redemption', to_jsonb(v_redemption),
    'sharing', to_jsonb(v_sharing),
    'reminders', to_jsonb(v_reminders)
  );
END;
$$;

/** Redemption is live only while enabled and fully configured. */
CREATE OR REPLACE FUNCTION public.shift_quest__redemption_live()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.redemption_enabled AND s.awards_enabled
     AND jsonb_array_length(public.shift_quest__blockers() -> 'redemption') = 0
  FROM public.shift_quest_settings s WHERE s.id;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest__awards_live()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.awards_enabled AND public.shift_quest__trim(s.reward_terms) IS NOT NULL
  FROM public.shift_quest_settings s WHERE s.id;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest__check_url(p_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_url text := public.shift_quest__trim(p_url);
BEGIN
  IF v_url IS NULL THEN
    RETURN NULL;
  END IF;
  IF v_url !~ '^https://[^\s]+$' OR char_length(v_url) > 500 THEN
    PERFORM public.shift_quest__fail('bad_url');
  END IF;
  RETURN v_url;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest__check_len(p_text text, p_max integer, p_required boolean)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_text text := public.shift_quest__trim(p_text);
BEGIN
  IF v_text IS NULL AND p_required THEN
    PERFORM public.shift_quest__fail('missing_text');
  END IF;
  IF char_length(v_text) > p_max THEN
    PERFORM public.shift_quest__fail('text_too_long');
  END IF;
  RETURN v_text;
END;
$$;

-- ---------------------------------------------------------------------------
-- Session and preferences
-- ---------------------------------------------------------------------------

/**
 * Called at the start of every interaction. Never creates a member: only
 * /start does, so browsing the bot stores nothing about anyone.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_session(p_actor text, p_display_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shift_quest_settings := public.shift_quest__settings();
  v_member public.shift_quest_members;
  v_unread integer := 0;
  v_pending integer := 0;
BEGIN
  SELECT * INTO v_member FROM public.shift_quest_members WHERE discord_user_id = p_actor;
  IF FOUND THEN
    IF p_display_name IS NOT NULL AND v_member.display_name IS DISTINCT FROM left(p_display_name, 80) THEN
      UPDATE public.shift_quest_members
      SET display_name = left(p_display_name, 80), updated_at = now()
      WHERE id = v_member.id;
    END IF;
    SELECT count(*) INTO v_unread FROM public.shift_quest_inbox
    WHERE member_id = v_member.id AND read_at IS NULL;
    SELECT count(*) INTO v_pending FROM public.shift_quest_shares
    WHERE peer_member_id = v_member.id AND status = 'awaiting_peer';
  END IF;

  RETURN jsonb_build_object(
    'member_id', v_member.id,
    'onboarded', v_member.onboarded_at IS NOT NULL,
    'roles', to_jsonb(COALESCE(v_member.roles, '{}')),
    'current_project_id', v_member.current_project_id,
    'unread', v_unread + v_pending,
    'prefs', CASE WHEN v_member.id IS NULL THEN NULL ELSE jsonb_build_object(
      'reminders_opt_in', v_member.reminders_opt_in,
      'reminder_days', to_jsonb(v_member.reminder_days),
      'reminder_hour', v_member.reminder_hour,
      'notify_dm', v_member.notify_dm
    ) END,
    'settings', jsonb_build_object(
      'student_role_ids', to_jsonb(s.student_role_ids),
      'awards', public.shift_quest__awards_live(),
      'redemption', public.shift_quest__redemption_live(),
      'sharing', s.sharing_enabled,
      'reminders', s.reminders_enabled,
      'reward_terms', s.reward_terms,
      'redemption_terms', s.redemption_terms,
      -- Switch from 20261111090800_shift_quests_seasons (off until then; hook
      -- in 20261111090700_shift_quests_island).
      'squads', COALESCE((public.shift_quest__feature_flags() ->> 'squads')::boolean, false)
    )
  );
END;
$$;

/** /start: the only place a member record is created for a student. */
CREATE OR REPLACE FUNCTION public.shift_quest_start(
  p_actor text, p_display_name text, p_notify_dm boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_actor IS NULL OR p_actor !~ '^[0-9]{5,25}$' THEN
    PERFORM public.shift_quest__fail('not_started');
  END IF;

  INSERT INTO public.shift_quest_members (discord_user_id, display_name, onboarded_at, notify_dm)
  VALUES (p_actor, left(p_display_name, 80), now(), COALESCE(p_notify_dm, false))
  ON CONFLICT (discord_user_id) DO UPDATE
    SET onboarded_at = COALESCE(shift_quest_members.onboarded_at, now()),
        display_name = COALESCE(left(EXCLUDED.display_name, 80), shift_quest_members.display_name),
        notify_dm = COALESCE(p_notify_dm, shift_quest_members.notify_dm),
        updated_at = now()
  RETURNING id INTO v_id;

  PERFORM public.shift_quest__audit(v_id, 'start', 'member', v_id);
  RETURN public.shift_quest_session(p_actor, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_update_prefs(
  p_actor text, p_reminders_opt_in boolean, p_days smallint[], p_hour smallint, p_notify_dm boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  IF p_reminders_opt_in AND (p_hour IS NULL OR COALESCE(cardinality(p_days), 0) = 0) THEN
    PERFORM public.shift_quest__fail('reminder_time_required');
  END IF;

  UPDATE public.shift_quest_members
  SET reminders_opt_in = COALESCE(p_reminders_opt_in, reminders_opt_in),
      reminder_days = CASE WHEN p_reminders_opt_in THEN p_days ELSE reminder_days END,
      reminder_hour = CASE WHEN p_reminders_opt_in THEN p_hour ELSE reminder_hour END,
      notify_dm = COALESCE(p_notify_dm, notify_dm),
      updated_at = now()
  WHERE id = v_member.id;

  -- An opt-out also cancels anything already queued.
  IF p_reminders_opt_in IS FALSE THEN
    UPDATE public.shift_quest_outbox SET status = 'dropped', last_error = 'opted_out'
    WHERE member_id = v_member.id AND kind = 'reminder' AND status IN ('pending', 'blocked');
  END IF;
  IF p_notify_dm IS FALSE THEN
    UPDATE public.shift_quest_outbox SET status = 'dropped', last_error = 'opted_out'
    WHERE member_id = v_member.id AND kind = 'nudge' AND status IN ('pending', 'blocked');
  END IF;

  PERFORM public.shift_quest__audit(v_member.id, 'update_prefs', 'member', v_member.id);
  RETURN public.shift_quest_session(p_actor, NULL);
END;
$$;

-- ---------------------------------------------------------------------------
-- Projects and practical ownership
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest_project_create(
  p_actor text, p_name text, p_route text, p_ambition text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_id uuid;
BEGIN
  IF p_route NOT IN ('software', 'creative', 'service', 'other') THEN
    PERFORM public.shift_quest__fail('bad_route');
  END IF;

  INSERT INTO public.shift_quest_projects (name, route, ambition, created_by)
  VALUES (
    public.shift_quest__check_len(p_name, 80, true),
    p_route,
    public.shift_quest__check_len(p_ambition, 500, false),
    v_member.id
  )
  RETURNING id INTO v_id;

  INSERT INTO public.shift_quest_project_members (project_id, member_id, status, responded_at)
  VALUES (v_id, v_member.id, 'active', now());

  INSERT INTO public.shift_quest_ownership_checks (project_id, item)
  SELECT v_id, unnest(ARRAY['access', 'export', 'team', 'costs', 'portability']);

  -- A stable plot on the island (helper in 20261111090700_shift_quests_island).
  PERFORM public.shift_quest__assign_plot(v_id);

  UPDATE public.shift_quest_members SET current_project_id = v_id, updated_at = now()
  WHERE id = v_member.id;
  -- A member became active on a project (hook in 20261111090700_shift_quests_island;
  -- a new project meets no unlock yet, but every join goes through one place).
  PERFORM public.shift_quest__on_project_join(v_id, v_member.id);

  PERFORM public.shift_quest__audit(v_member.id, 'project_create', 'project', v_id);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_project_list(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'route', p.route,
      'status', pm.status,
      'is_current', p.id = v_member.current_project_id,
      'inviter', inviter.display_name
    ) ORDER BY pm.status = 'invited' DESC, p.created_at DESC)
    FROM public.shift_quest_project_members pm
    JOIN public.shift_quest_projects p ON p.id = pm.project_id
    LEFT JOIN public.shift_quest_members inviter ON inviter.id = pm.invited_by
    WHERE pm.member_id = v_member.id
      AND pm.status IN ('active', 'invited')
      AND p.archived_at IS NULL
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_project_select(p_actor text, p_project uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  IF NOT public.shift_quest__is_teammate(p_project, v_member.id) THEN
    PERFORM public.shift_quest__fail('not_project_member');
  END IF;
  UPDATE public.shift_quest_members SET current_project_id = p_project, updated_at = now()
  WHERE id = v_member.id;
END;
$$;

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
        show_name = false; -- consent to show the name on the island is asked afresh

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

CREATE OR REPLACE FUNCTION public.shift_quest_project_respond(p_actor text, p_project uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.shift_quest_project_members
    WHERE project_id = p_project AND member_id = v_member.id AND status = 'invited'
  ) THEN
    PERFORM public.shift_quest__fail('no_invite');
  END IF;
  -- Joining waits for an approval in progress on this project (its plot
  -- lock), so the members an approval locked up front stay its members.
  IF p_accept THEN
    PERFORM public.shift_quest__lock_plot(p_project);
  END IF;
  UPDATE public.shift_quest_project_members
  SET status = CASE WHEN p_accept THEN 'active' ELSE 'declined' END, responded_at = now()
  WHERE project_id = p_project AND member_id = v_member.id AND status = 'invited';
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('no_invite');
  END IF;

  -- A joiner earns at once whatever the project already qualifies for (wave-2
  -- hook in 20261111090800_shift_quests_seasons; a no-op before it). Plot lock
  -- held, then the project's members in one sorted pass, before this member's
  -- own row is updated below: touching it first would lock it out of order.
  IF p_accept THEN
    PERFORM public.shift_quest__on_project_join(p_project, v_member.id);
  END IF;
  IF p_accept AND v_member.current_project_id IS NULL THEN
    UPDATE public.shift_quest_members SET current_project_id = p_project, updated_at = now()
    WHERE id = v_member.id;
  END IF;
  PERFORM public.shift_quest__audit(
    v_member.id, CASE WHEN p_accept THEN 'project_join' ELSE 'project_decline' END, 'project', p_project
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_project_leave(p_actor text, p_project uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  IF NOT public.shift_quest__is_teammate(p_project, v_member.id) THEN
    PERFORM public.shift_quest__fail('not_project_member');
  END IF;
  -- Lock order: the leaver's open milestone quests on this project first (the
  -- ones released below), then the plot. Leaving waits for an approval in
  -- progress on this project, as joining does.
  PERFORM 1 FROM public.shift_quest_instances
  WHERE member_id = v_member.id AND project_id = p_project AND milestone IS NOT NULL
    AND state IN ('active', 'paused', 'clarification')
  ORDER BY id
  FOR NO KEY UPDATE;
  PERFORM public.shift_quest__lock_plot(p_project);
  UPDATE public.shift_quest_project_members SET status = 'left', responded_at = now(), show_name = false
  WHERE project_id = p_project AND member_id = v_member.id AND status = 'active';
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_project_member');
  END IF;
  -- Milestones they were still working on go back to the team (helper in
  -- 20261111090700_shift_quests_island); work with the reviewers stays there.
  PERFORM public.shift_quest__release_milestones(p_project, v_member.id);
  UPDATE public.shift_quest_members SET current_project_id = NULL, updated_at = now()
  WHERE id = v_member.id AND current_project_id = p_project;
  PERFORM public.shift_quest__audit(v_member.id, 'project_leave', 'project', p_project);
END;
$$;

/**
 * The project journey for its active members: who is on it, its quests (not
 * their evidence), entries teammates chose to share, and ownership checks.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_project_view(p_actor text, p_project uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project public.shift_quest_projects;
BEGIN
  IF NOT public.shift_quest__is_teammate(p_project, v_member.id) THEN
    PERFORM public.shift_quest__fail('not_project_member');
  END IF;
  SELECT * INTO v_project FROM public.shift_quest_projects WHERE id = p_project;

  RETURN jsonb_build_object(
    'id', v_project.id,
    'name', v_project.name,
    'route', v_project.route,
    'ambition', v_project.ambition,
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', m.display_name, 'status', pm.status) ORDER BY pm.created_at)
      FROM public.shift_quest_project_members pm
      JOIN public.shift_quest_members m ON m.id = pm.member_id
      WHERE pm.project_id = p_project AND pm.status IN ('active', 'invited')
    ), '[]'::jsonb),
    'quests', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('title', i.title, 'state', i.state, 'owner', m.display_name)
        ORDER BY i.updated_at DESC)
      FROM public.shift_quest_instances i
      JOIN public.shift_quest_members m ON m.id = i.member_id
      WHERE i.project_id = p_project AND i.state <> 'archived'
        AND public.shift_quest__is_teammate(p_project, i.member_id)
    ), '[]'::jsonb),
    'ownership', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'item', o.item, 'state', o.state, 'note', o.note,
        'mentor_held', o.mentor_held, 'continuation_path', o.continuation_path
      ) ORDER BY array_position(ARRAY['access', 'export', 'team', 'costs', 'portability'], o.item))
      FROM public.shift_quest_ownership_checks o
      WHERE o.project_id = p_project
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_ownership_set(
  p_actor text, p_project uuid, p_item text, p_state text,
  p_note text, p_mentor_held boolean, p_continuation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_note text := public.shift_quest__check_len(p_note, 1000, false);
  v_path text := public.shift_quest__check_len(p_continuation, 1000, false);
  v_existing public.shift_quest_ownership_checks;
  v_help uuid;
BEGIN
  IF NOT public.shift_quest__is_teammate(p_project, v_member.id) THEN
    PERFORM public.shift_quest__fail('not_project_member');
  END IF;
  IF p_item NOT IN ('access', 'export', 'team', 'costs', 'portability')
     OR p_state NOT IN ('not_checked', 'demonstrated', 'needs_help', 'not_applicable') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF p_state = 'not_applicable' AND v_note IS NULL THEN
    PERFORM public.shift_quest__fail('reason_required');
  END IF;
  IF p_state = 'demonstrated' AND COALESCE(p_mentor_held, false) AND v_path IS NULL THEN
    PERFORM public.shift_quest__fail('continuation_required');
  END IF;

  SELECT * INTO v_existing FROM public.shift_quest_ownership_checks
  WHERE project_id = p_project AND item = p_item
  FOR NO KEY UPDATE;

  v_help := v_existing.help_request_id;
  -- A blocked check becomes a help request, once while it stays open.
  IF p_state = 'needs_help' AND NOT EXISTS (
    SELECT 1 FROM public.shift_quest_help_requests
    WHERE id = v_existing.help_request_id AND status IN ('open', 'claimed')
  ) THEN
    INSERT INTO public.shift_quest_help_requests (member_id, project_id, summary, visibility, source)
    VALUES (
      v_member.id, p_project,
      left('ownership:' || p_item || COALESCE(' ' || v_note, ''), 1000),
      'mentors', 'ownership'
    )
    RETURNING id INTO v_help;
    PERFORM public.shift_quest__post(
      'help:' || v_help, 'staff', 'help_mentors',
      jsonb_build_object('member_id', v_member.id, 'help_id', v_help, 'source', 'ownership', 'item', p_item)
    );
  END IF;

  INSERT INTO public.shift_quest_ownership_checks AS o (
    project_id, item, state, note, mentor_held, continuation_path, help_request_id, updated_by, updated_at
  )
  VALUES (p_project, p_item, p_state, v_note, COALESCE(p_mentor_held, false), v_path, v_help, v_member.id, now())
  ON CONFLICT (project_id, item) DO UPDATE
    SET state = EXCLUDED.state, note = EXCLUDED.note, mentor_held = EXCLUDED.mentor_held,
        continuation_path = EXCLUDED.continuation_path, help_request_id = EXCLUDED.help_request_id,
        updated_by = EXCLUDED.updated_by, updated_at = now();

  PERFORM public.shift_quest__audit(v_member.id, 'ownership_' || p_state, 'project', p_project);
  RETURN jsonb_build_object('help_request_id', CASE WHEN p_state = 'needs_help' THEN v_help END);
END;
$$;

-- ---------------------------------------------------------------------------
-- Quests: browse, choose, propose, manage
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest__rule_summary(p_rule uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'key', r.key, 'version', r.version, 'amount', r.amount, 'cap', r.cap_per_member,
    'team_allocation', r.team_allocation, 'eligibility', r.eligibility,
    'review_process', r.review_process, 'reversal_policy', r.reversal_policy
  )
  FROM public.shift_quest_reward_rules r WHERE r.id = p_rule;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_templates(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
  v_awards boolean := public.shift_quest__awards_live();
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', t.id, 'slug', t.slug, 'title', t.title, 'purpose', t.purpose, 'routes', t.routes,
      'examples', t.examples, 'evidence_criteria', t.evidence_criteria,
      'reflection_prompt', t.reflection_prompt, 'support_options', t.support_options,
      'repeatable', t.repeatable,
      'milestone', t.milestone,
      'reward', CASE WHEN v_awards THEN public.shift_quest__rule_summary(r.id) END,
      'taken', EXISTS (
        SELECT 1 FROM public.shift_quest_instances i
        JOIN public.shift_quest_templates t2 ON t2.id = i.template_id
        WHERE i.member_id = v_member.id AND t2.slug = t.slug AND i.state <> 'archived'
      )
    ) ORDER BY t.sort_order, t.title)
    FROM public.shift_quest_templates t
    LEFT JOIN public.shift_quest_reward_rules r ON r.key = t.reward_rule_key AND r.status = 'published'
    WHERE t.status = 'published'
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest__current_project(p_member public.shift_quest_members)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.shift_quest__is_teammate(p_member.current_project_id, p_member.id)
    THEN p_member.current_project_id END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_choose(
  p_actor text, p_template uuid, p_goal text, p_next_step text, p_criteria text, p_review_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
  v_template public.shift_quest_templates;
  v_rule uuid;
  v_id uuid;
BEGIN
  SELECT * INTO v_template FROM public.shift_quest_templates WHERE id = p_template AND status = 'published';
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('template_unavailable');
  END IF;

  -- Serialize this member's choices so two clicks cannot both pass the check.
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_member.id FOR NO KEY UPDATE;
  IF NOT v_template.repeatable AND EXISTS (
    SELECT 1 FROM public.shift_quest_instances i
    JOIN public.shift_quest_templates t ON t.id = i.template_id
    WHERE i.member_id = v_member.id AND t.slug = v_template.slug AND i.state <> 'archived'
  ) THEN
    PERFORM public.shift_quest__fail('not_repeatable');
  END IF;
  IF p_review_date IS NOT NULL AND p_review_date < (now() AT TIME ZONE 'Asia/Bangkok')::date THEN
    PERFORM public.shift_quest__fail('date_in_past');
  END IF;
  -- An island milestone grows a project's tree, so it needs a current project
  -- the caller is still on (a stale or forged choice would file it nowhere).
  IF v_template.milestone IS NOT NULL AND v_project IS NULL THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;
  -- One open quest per project and island milestone (milestone column and
  -- unique index: 20261111090700_shift_quests_island): teammates share it.
  IF v_template.milestone IS NOT NULL AND v_project IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.shift_quest_instances
    WHERE project_id = v_project AND milestone = v_template.milestone
      AND state IN ('active', 'paused', 'submitted', 'clarification', 'appealed')
  ) THEN
    PERFORM public.shift_quest__fail('milestone_open');
  END IF;

  -- Pin the rule version published now; later edits never change this quest.
  SELECT id INTO v_rule FROM public.shift_quest_reward_rules
  WHERE key = v_template.reward_rule_key AND status = 'published';

  BEGIN
    INSERT INTO public.shift_quest_instances (
      member_id, project_id, template_id, milestone, title, goal, next_step, criteria, review_date, reward_rule_id
    )
    VALUES (
      v_member.id, v_project, v_template.id, v_template.milestone, v_template.title,
      public.shift_quest__check_len(p_goal, 1000, true),
      public.shift_quest__check_len(p_next_step, 500, true),
      COALESCE(public.shift_quest__check_len(p_criteria, 1000, false), left(v_template.evidence_criteria, 1000)),
      p_review_date, v_rule
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    -- A teammate opened the same milestone a moment earlier.
    PERFORM public.shift_quest__fail('milestone_open');
  END;

  PERFORM public.shift_quest__audit(v_member.id, 'quest_choose', 'quest', v_id);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_propose(
  p_actor text, p_title text, p_why text, p_goal text, p_criteria text, p_next_step text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_id uuid;
BEGIN
  INSERT INTO public.shift_quest_instances (member_id, project_id, title, why, goal, next_step, criteria)
  VALUES (
    v_member.id, public.shift_quest__current_project(v_member),
    public.shift_quest__check_len(p_title, 80, true),
    public.shift_quest__check_len(p_why, 1000, false),
    public.shift_quest__check_len(p_goal, 1000, true),
    public.shift_quest__check_len(p_next_step, 500, true),
    public.shift_quest__check_len(p_criteria, 1000, true)
  )
  RETURNING id INTO v_id;

  -- A mentor agrees scope and any reward before reward-bearing work starts.
  PERFORM public.shift_quest__post(
    'proposal:' || v_id || ':1', 'staff', 'proposal_needs_agreement',
    jsonb_build_object('member_id', v_member.id, 'instance_id', v_id, 'title', left(p_title, 80))
  );
  PERFORM public.shift_quest__audit(v_member.id, 'quest_propose', 'quest', v_id);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest__quest_json(p_instance public.shift_quest_instances)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', p_instance.id,
    'title', p_instance.title,
    'state', p_instance.state,
    'version', p_instance.version,
    'goal', p_instance.goal,
    'why', p_instance.why,
    'next_step', p_instance.next_step,
    'criteria', p_instance.criteria,
    'review_date', p_instance.review_date,
    'overdue', p_instance.review_date IS NOT NULL
      AND p_instance.review_date < (now() AT TIME ZONE 'Asia/Bangkok')::date
      AND p_instance.state IN ('active', 'clarification'),
    'proposed', p_instance.template_id IS NULL,
    'reward_agreed', p_instance.reward_agreed_at IS NOT NULL,
    'reward', public.shift_quest__rule_summary(p_instance.reward_rule_id),
    'award_status', p_instance.award_status,
    'award_note', p_instance.award_note,
    'project_id', p_instance.project_id,
    'reflection_prompt', (SELECT t.reflection_prompt FROM public.shift_quest_templates t WHERE t.id = p_instance.template_id),
    'latest_submission', (
      SELECT jsonb_build_object('id', s.id, 'revision', s.revision, 'status', s.status, 'created_at', s.created_at)
      FROM public.shift_quest_submissions s WHERE s.instance_id = p_instance.id
      ORDER BY s.revision DESC LIMIT 1
    ),
    'latest_review', (
      SELECT jsonb_build_object('outcome', r.outcome, 'feedback', r.feedback, 'created_at', r.created_at)
      FROM public.shift_quest_reviews r
      JOIN public.shift_quest_submissions s ON s.id = r.submission_id
      WHERE s.instance_id = p_instance.id
      ORDER BY r.created_at DESC LIMIT 1
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_my_quests(p_actor text, p_include_closed boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(public.shift_quest__quest_json(i) ORDER BY
      array_position(ARRAY['clarification', 'active', 'submitted', 'appealed', 'declined', 'paused', 'approved', 'archived'], i.state),
      i.updated_at DESC)
    FROM (
      SELECT * FROM public.shift_quest_instances
      WHERE member_id = v_member.id
        AND (p_include_closed OR state NOT IN ('approved', 'archived'))
      ORDER BY updated_at DESC
      LIMIT 25
    ) i
  ), '[]'::jsonb);
END;
$$;

/** Lock a quest the caller owns and check the version they last saw. */
CREATE OR REPLACE FUNCTION public.shift_quest__lock_own(p_member uuid, p_instance uuid, p_version integer)
RETURNS public.shift_quest_instances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance public.shift_quest_instances;
BEGIN
  SELECT * INTO v_instance FROM public.shift_quest_instances WHERE id = p_instance FOR NO KEY UPDATE;
  IF NOT FOUND OR v_instance.member_id <> p_member THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF p_version IS NOT NULL AND v_instance.version <> p_version THEN
    PERFORM public.shift_quest__fail('stale_version');
  END IF;
  RETURN v_instance;
END;
$$;

/** Resize or replace the goal: no penalty, any time before submission. */
CREATE OR REPLACE FUNCTION public.shift_quest_update(
  p_actor text, p_instance uuid, p_version integer,
  p_goal text, p_next_step text, p_criteria text, p_review_date date, p_clear_date boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_instance public.shift_quest_instances := public.shift_quest__lock_own(v_member.id, p_instance, p_version);
  v_criteria text := COALESCE(public.shift_quest__check_len(p_criteria, 1000, false), v_instance.criteria);
  v_reset boolean;
BEGIN
  IF v_instance.state NOT IN ('active', 'paused', 'clarification') THEN
    PERFORM public.shift_quest__fail('bad_state');
  END IF;
  IF p_review_date IS NOT NULL AND p_review_date < (now() AT TIME ZONE 'Asia/Bangkok')::date THEN
    PERFORM public.shift_quest__fail('date_in_past');
  END IF;

  -- Changing what counts as evidence on a proposed quest needs a fresh agreement.
  v_reset := v_instance.template_id IS NULL AND v_instance.reward_agreed_at IS NOT NULL
    AND v_criteria IS DISTINCT FROM v_instance.criteria;

  UPDATE public.shift_quest_instances
  SET goal = COALESCE(public.shift_quest__check_len(p_goal, 1000, false), goal),
      next_step = COALESCE(public.shift_quest__check_len(p_next_step, 500, false), next_step),
      criteria = v_criteria,
      review_date = CASE WHEN p_clear_date THEN NULL ELSE COALESCE(p_review_date, review_date) END,
      reward_rule_id = CASE WHEN v_reset THEN NULL ELSE reward_rule_id END,
      reward_agreed_by = CASE WHEN v_reset THEN NULL ELSE reward_agreed_by END,
      reward_agreed_at = CASE WHEN v_reset THEN NULL ELSE reward_agreed_at END,
      version = version + 1,
      updated_at = now()
  WHERE id = p_instance;

  IF v_reset THEN
    PERFORM public.shift_quest__post(
      'proposal:' || p_instance || ':' || (v_instance.version + 1), 'staff', 'proposal_needs_agreement',
      jsonb_build_object('member_id', v_member.id, 'instance_id', p_instance, 'title', v_instance.title)
    );
  END IF;
  PERFORM public.shift_quest__audit(v_member.id, 'quest_update', 'quest', p_instance);
  RETURN v_instance.version + 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_set_state(
  p_actor text, p_instance uuid, p_version integer, p_action text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_instance public.shift_quest_instances := public.shift_quest__lock_own(v_member.id, p_instance, p_version);
  v_next text;
BEGIN
  v_next := CASE
    WHEN p_action = 'pause' AND v_instance.state IN ('active', 'clarification') THEN 'paused'
    WHEN p_action = 'resume' AND v_instance.state = 'paused' THEN 'active'
    WHEN p_action = 'archive' AND v_instance.state IN ('active', 'paused', 'clarification', 'declined') THEN 'archived'
  END;
  IF v_next IS NULL THEN
    PERFORM public.shift_quest__fail('bad_state');
  END IF;

  UPDATE public.shift_quest_instances
  SET state = v_next, version = version + 1, updated_at = now()
  WHERE id = p_instance;

  PERFORM public.shift_quest__audit(v_member.id, 'quest_' || p_action, 'quest', p_instance);
  RETURN v_instance.version + 1;
END;
$$;

/**
 * Submits a new revision. Any revision still waiting is superseded, so a
 * reviewer holding the old one can no longer approve it.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_submit(
  p_actor text, p_instance uuid, p_version integer,
  p_evidence text, p_reflection text, p_artifact_url text, p_visibility text,
  p_contribution text, p_contributors text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_instance public.shift_quest_instances := public.shift_quest__lock_own(v_member.id, p_instance, p_version);
  v_revision integer;
  v_submission uuid;
  v_peer public.shift_quest_members;
  v_discord text;
BEGIN
  IF v_instance.state NOT IN ('active', 'clarification', 'submitted') THEN
    PERFORM public.shift_quest__fail('bad_state');
  END IF;
  IF p_visibility NOT IN ('reviewers', 'team') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF (p_visibility = 'team' OR COALESCE(cardinality(p_contributors), 0) > 0) AND v_instance.project_id IS NULL THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;

  UPDATE public.shift_quest_submissions SET status = 'superseded', decided_at = now()
  WHERE instance_id = p_instance AND status = 'pending';

  SELECT COALESCE(max(revision), 0) + 1 INTO v_revision
  FROM public.shift_quest_submissions WHERE instance_id = p_instance;

  INSERT INTO public.shift_quest_submissions (
    instance_id, revision, submitted_by, evidence, reflection, artifact_url, visibility
  )
  VALUES (
    p_instance, v_revision, v_member.id,
    public.shift_quest__check_len(p_evidence, 2000, true),
    public.shift_quest__check_len(p_reflection, 2000, true),
    public.shift_quest__check_url(p_artifact_url),
    p_visibility
  )
  RETURNING id INTO v_submission;

  INSERT INTO public.shift_quest_contributions (submission_id, member_id, contribution, status, responded_at)
  VALUES (v_submission, v_member.id, public.shift_quest__check_len(p_contribution, 1000, false), 'confirmed', now());

  -- Teammates confirm their own part; nothing is inferred for them.
  FOREACH v_discord IN ARRAY COALESCE(p_contributors, '{}') LOOP
    SELECT * INTO v_peer FROM public.shift_quest_members
    WHERE discord_user_id = v_discord AND onboarded_at IS NOT NULL;
    IF NOT FOUND OR NOT public.shift_quest__is_teammate(v_instance.project_id, v_peer.id) THEN
      PERFORM public.shift_quest__fail('contributor_not_teammate');
    END IF;
    IF v_peer.id = v_member.id THEN
      CONTINUE;
    END IF;
    INSERT INTO public.shift_quest_contributions (submission_id, member_id)
    VALUES (v_submission, v_peer.id)
    ON CONFLICT DO NOTHING;
    PERFORM public.shift_quest__notify(
      v_peer.id, 'contrib:' || v_submission || ':' || v_peer.id, 'contribution_requested',
      jsonb_build_object('submission_id', v_submission, 'title', v_instance.title, 'from', v_member.display_name,
                         'actor_id', v_member.id),
      v_submission
    );
  END LOOP;

  UPDATE public.shift_quest_instances
  SET state = 'submitted', version = version + 1, updated_at = now()
  WHERE id = p_instance;

  PERFORM public.shift_quest__post(
    'review:' || v_submission, 'staff', 'review_needed',
    jsonb_build_object('member_id', v_member.id, 'submission_id', v_submission,
                       'title', v_instance.title, 'revision', v_revision, 'appeal', false)
  );
  PERFORM public.shift_quest__audit(v_member.id, 'quest_submit', 'submission', v_submission);
  RETURN jsonb_build_object('submission_id', v_submission, 'revision', v_revision, 'version', v_instance.version + 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_withdraw(p_actor text, p_instance uuid, p_version integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_instance public.shift_quest_instances := public.shift_quest__lock_own(v_member.id, p_instance, p_version);
BEGIN
  IF v_instance.state <> 'submitted' THEN
    PERFORM public.shift_quest__fail('bad_state');
  END IF;
  UPDATE public.shift_quest_submissions SET status = 'withdrawn', decided_at = now()
  WHERE instance_id = p_instance AND status = 'pending';
  -- A milestone quest whose owner has left the project is archived instead of
  -- reopened, so the milestone is free for the members still on it.
  UPDATE public.shift_quest_instances
  SET state = CASE
        WHEN milestone IS NOT NULL AND project_id IS NOT NULL
             AND NOT public.shift_quest__is_teammate(project_id, member_id) THEN 'archived'
        ELSE 'active' END,
      version = version + 1, updated_at = now()
  WHERE id = p_instance;
  PERFORM public.shift_quest__audit(v_member.id, 'quest_withdraw', 'quest', p_instance);
  RETURN v_instance.version + 1;
END;
$$;

/** A teammate confirms (or declines) their own part of a shared submission. */
CREATE OR REPLACE FUNCTION public.shift_quest_contribution_respond(
  p_actor text, p_submission uuid, p_accept boolean, p_contribution text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_status text;
  v_text text := public.shift_quest__check_len(p_contribution, 1000, false);
BEGIN
  -- Same lock order as review: the quest first.
  PERFORM 1 FROM public.shift_quest_instances i
  JOIN public.shift_quest_submissions s ON s.instance_id = i.id
  WHERE s.id = p_submission
  FOR NO KEY UPDATE OF i;

  SELECT s.status INTO v_status FROM public.shift_quest_submissions s WHERE s.id = p_submission;
  IF v_status IS NULL OR v_status NOT IN ('pending', 'approved') THEN
    PERFORM public.shift_quest__fail('bad_state');
  END IF;
  IF p_accept AND v_text IS NULL THEN
    PERFORM public.shift_quest__fail('missing_text');
  END IF;

  UPDATE public.shift_quest_contributions
  SET status = CASE WHEN p_accept THEN 'confirmed' ELSE 'declined' END,
      contribution = CASE WHEN p_accept THEN v_text END,
      responded_at = now()
  WHERE submission_id = p_submission AND member_id = v_member.id AND status = 'pending';
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  PERFORM public.shift_quest__audit(v_member.id, 'contribution_' || CASE WHEN p_accept THEN 'confirm' ELSE 'decline' END,
                                    'submission', p_submission);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_pending_contributions(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'submission_id', s.id, 'title', i.title, 'owner', owner.display_name,
      'evidence', CASE WHEN s.visibility = 'team' THEN s.evidence END
    ) ORDER BY s.created_at)
    FROM public.shift_quest_contributions c
    JOIN public.shift_quest_submissions s ON s.id = c.submission_id
    JOIN public.shift_quest_instances i ON i.id = s.instance_id
    JOIN public.shift_quest_members owner ON owner.id = i.member_id
    WHERE c.member_id = v_member.id AND c.status = 'pending' AND s.status IN ('pending', 'approved')
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_appeal(p_actor text, p_instance uuid, p_reason text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_instance public.shift_quest_instances := public.shift_quest__lock_own(v_member.id, p_instance, NULL);
  v_submission public.shift_quest_submissions;
  v_decliner uuid;
  v_id uuid;
BEGIN
  IF v_instance.state <> 'declined' THEN
    PERFORM public.shift_quest__fail('bad_state');
  END IF;
  SELECT * INTO v_submission FROM public.shift_quest_submissions
  WHERE instance_id = p_instance ORDER BY revision DESC LIMIT 1;
  -- One appeal per declined revision: an appeal that is declined ends the
  -- route (a resubmission after a clarification can be appealed afresh).
  IF EXISTS (SELECT 1 FROM public.shift_quest_appeals WHERE submission_id = v_submission.id) THEN
    PERFORM public.shift_quest__fail('appeal_used');
  END IF;
  SELECT reviewer_id INTO v_decliner FROM public.shift_quest_reviews
  WHERE submission_id = v_submission.id AND outcome = 'declined'
  ORDER BY created_at DESC LIMIT 1;
  -- An appeal reopens the quest: refused while the project already has
  -- another open quest for this island milestone (one open per milestone).
  IF v_instance.milestone IS NOT NULL AND v_instance.project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.shift_quest_instances
    WHERE project_id = v_instance.project_id AND milestone = v_instance.milestone AND id <> p_instance
      AND state IN ('active', 'paused', 'submitted', 'clarification', 'appealed')
  ) THEN
    PERFORM public.shift_quest__fail('milestone_open');
  END IF;

  INSERT INTO public.shift_quest_appeals (instance_id, submission_id, member_id, declined_by, reason)
  VALUES (p_instance, v_submission.id, v_member.id, v_decliner, public.shift_quest__check_len(p_reason, 1000, true))
  RETURNING id INTO v_id;

  BEGIN
    UPDATE public.shift_quest_instances
    SET state = 'appealed', version = version + 1, updated_at = now()
    WHERE id = p_instance;
  EXCEPTION WHEN unique_violation THEN
    PERFORM public.shift_quest__fail('milestone_open');
  END;

  PERFORM public.shift_quest__post(
    'appeal:' || v_id, 'staff', 'review_needed',
    jsonb_build_object('member_id', v_member.id, 'submission_id', v_submission.id,
                       'title', v_instance.title, 'revision', v_submission.revision, 'appeal', true)
  );
  PERFORM public.shift_quest__audit(v_member.id, 'quest_appeal', 'quest', p_instance);
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Progress journal
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest_progress_add(
  p_actor text, p_changed text, p_learned text, p_next text, p_blocker text,
  p_artifact_url text, p_visibility text, p_instance uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
  v_id uuid;
BEGIN
  IF p_visibility NOT IN ('private', 'team') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF p_visibility = 'team' AND v_project IS NULL THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;
  IF p_instance IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.shift_quest_instances WHERE id = p_instance AND member_id = v_member.id
  ) THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;

  INSERT INTO public.shift_quest_progress (
    member_id, project_id, instance_id, changed, learned, next_step, blocker, artifact_url, visibility
  )
  VALUES (
    v_member.id, v_project, p_instance,
    public.shift_quest__check_len(p_changed, 1000, true),
    public.shift_quest__check_len(p_learned, 1000, false),
    public.shift_quest__check_len(p_next, 500, false),
    public.shift_quest__check_len(p_blocker, 1000, false),
    public.shift_quest__check_url(p_artifact_url),
    p_visibility
  )
  RETURNING id INTO v_id;

  PERFORM public.shift_quest__audit(v_member.id, 'progress_add', 'progress', v_id);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_progress_edit(
  p_actor text, p_entry uuid, p_version integer, p_changed text, p_learned text,
  p_next text, p_blocker text, p_artifact_url text, p_visibility text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_entry public.shift_quest_progress;
BEGIN
  SELECT * INTO v_entry FROM public.shift_quest_progress WHERE id = p_entry FOR NO KEY UPDATE;
  -- A tap has no words to edit; the journal shows notes only.
  IF NOT FOUND OR v_entry.member_id <> v_member.id OR v_entry.kind <> 'note' THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF v_entry.version <> p_version THEN
    PERFORM public.shift_quest__fail('stale_version');
  END IF;
  IF p_visibility NOT IN ('private', 'team') OR (p_visibility = 'team' AND v_entry.project_id IS NULL) THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;

  UPDATE public.shift_quest_progress
  SET changed = public.shift_quest__check_len(p_changed, 1000, true),
      learned = public.shift_quest__check_len(p_learned, 1000, false),
      next_step = public.shift_quest__check_len(p_next, 500, false),
      blocker = public.shift_quest__check_len(p_blocker, 1000, false),
      artifact_url = public.shift_quest__check_url(p_artifact_url),
      visibility = p_visibility,
      version = version + 1,
      edited_at = now()
  WHERE id = p_entry;

  PERFORM public.shift_quest__audit(v_member.id, 'progress_edit', 'progress', p_entry);
  RETURN v_entry.version + 1;
END;
$$;

/** Own entries, or (with a project) what active teammates chose to share. */
CREATE OR REPLACE FUNCTION public.shift_quest_progress_list(p_actor text, p_project uuid, p_limit integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 25);
BEGIN
  IF p_project IS NOT NULL AND NOT public.shift_quest__is_teammate(p_project, v_member.id) THEN
    PERFORM public.shift_quest__fail('not_project_member');
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', e.id, 'author', m.display_name, 'own', e.member_id = v_member.id,
      'changed', e.changed, 'learned', e.learned, 'next_step', e.next_step, 'blocker', e.blocker,
      'artifact_url', e.artifact_url, 'visibility', e.visibility, 'version', e.version,
      'created_at', e.created_at, 'edited_at', e.edited_at
    ) ORDER BY e.created_at DESC)
    FROM (
      SELECT * FROM public.shift_quest_progress p
      WHERE p.kind = 'note' AND CASE
        WHEN p_project IS NULL THEN p.member_id = v_member.id
        ELSE p.project_id = p_project AND p.visibility = 'team'
             AND public.shift_quest__is_teammate(p_project, p.member_id)
      END
      ORDER BY p.created_at DESC
      LIMIT v_limit
    ) e
    JOIN public.shift_quest_members m ON m.id = e.member_id
  ), '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- Coworking: an intention and a reflection, nothing observed
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest_work_start(p_actor text, p_intention text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.shift_quest_work_sessions WHERE member_id = v_member.id AND ended_at IS NULL) THEN
    PERFORM public.shift_quest__fail('session_open');
  END IF;
  INSERT INTO public.shift_quest_work_sessions (member_id, intention)
  VALUES (v_member.id, public.shift_quest__check_len(p_intention, 300, true))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_work_end(p_actor text, p_reflection text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_session public.shift_quest_work_sessions;
BEGIN
  UPDATE public.shift_quest_work_sessions
  SET ended_at = now(), reflection = public.shift_quest__check_len(p_reflection, 1000, false)
  WHERE member_id = v_member.id AND ended_at IS NULL
  RETURNING * INTO v_session;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('no_session');
  END IF;
  RETURN jsonb_build_object('id', v_session.id, 'intention', v_session.intention);
END;
$$;

-- ---------------------------------------------------------------------------
-- Help: a group support queue, never a private channel
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest_help_create(
  p_actor text, p_summary text, p_visibility text, p_source text, p_instance uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_summary text := public.shift_quest__check_len(p_summary, 1000, true);
  v_id uuid;
BEGIN
  IF p_visibility NOT IN ('community', 'mentors') OR COALESCE(p_source, 'student') NOT IN ('student', 'progress') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF p_instance IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.shift_quest_instances WHERE id = p_instance AND member_id = v_member.id
  ) THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;

  INSERT INTO public.shift_quest_help_requests (member_id, project_id, instance_id, summary, visibility, source)
  VALUES (v_member.id, public.shift_quest__current_project(v_member), p_instance, v_summary, p_visibility,
          COALESCE(p_source, 'student'))
  RETURNING id INTO v_id;

  IF p_visibility = 'community' THEN
    PERFORM public.shift_quest__post('help:' || v_id, 'help', 'help_community',
      jsonb_build_object('member_id', v_member.id, 'help_id', v_id, 'summary', v_summary));
  ELSE
    PERFORM public.shift_quest__post('help:' || v_id, 'staff', 'help_mentors',
      jsonb_build_object('member_id', v_member.id, 'help_id', v_id, 'summary', v_summary, 'source', p_source));
  END IF;

  PERFORM public.shift_quest__audit(v_member.id, 'help_create', 'help', v_id);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_help_mine(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', h.id, 'summary', h.summary, 'visibility', h.visibility, 'status', h.status,
      'source', h.source, 'resolution_note', h.resolution_note, 'created_at', h.created_at
    ) ORDER BY h.created_at DESC)
    FROM (
      SELECT * FROM public.shift_quest_help_requests
      WHERE member_id = v_member.id
        AND (status IN ('open', 'claimed') OR resolved_at > now() - interval '14 days')
      ORDER BY created_at DESC LIMIT 15
    ) h
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_help_withdraw(p_actor text, p_help uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  UPDATE public.shift_quest_help_requests
  SET status = 'withdrawn', updated_at = now(), resolved_at = now()
  WHERE id = p_help AND member_id = v_member.id AND status IN ('open', 'claimed');
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  PERFORM public.shift_quest__audit(v_member.id, 'help_withdraw', 'help', p_help);
END;
$$;

-- ---------------------------------------------------------------------------
-- Sharing: preview first, confirm explicitly, peers consent
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest_share_create(
  p_actor text, p_kind text, p_body text, p_instance uuid, p_peer text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_peer uuid;
  v_id uuid;
BEGIN
  IF p_kind NOT IN ('celebration', 'recognition', 'intention') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF p_instance IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.shift_quest_instances
    WHERE id = p_instance AND member_id = v_member.id AND state = 'approved'
  ) THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF p_kind = 'recognition' THEN
    SELECT id INTO v_peer FROM public.shift_quest_members
    WHERE discord_user_id = p_peer AND onboarded_at IS NOT NULL;
    IF v_peer IS NULL THEN
      PERFORM public.shift_quest__fail('invitee_not_started');
    END IF;
    IF v_peer = v_member.id THEN
      PERFORM public.shift_quest__fail('bad_input');
    END IF;
  END IF;

  INSERT INTO public.shift_quest_shares (member_id, kind, body, instance_id, peer_member_id)
  VALUES (v_member.id, p_kind, public.shift_quest__check_len(p_body, 1000, true), p_instance, v_peer)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest__queue_share(p_share public.shift_quest_shares)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.shift_quest__settings()).sharing_enabled THEN
    PERFORM public.shift_quest__fail('sharing_paused');
  END IF;
  UPDATE public.shift_quest_shares SET status = 'queued', updated_at = now() WHERE id = p_share.id;
  PERFORM public.shift_quest__post(
    'share:' || p_share.id,
    CASE WHEN p_share.kind = 'intention' THEN 'coworking' ELSE 'celebrate' END,
    p_share.kind,
    jsonb_build_object(
      'member_id', p_share.member_id, 'peer_member_id', p_share.peer_member_id, 'body', p_share.body,
      'title', (SELECT title FROM public.shift_quest_instances WHERE id = p_share.instance_id)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_share_confirm(p_actor text, p_share uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_share public.shift_quest_shares;
BEGIN
  SELECT * INTO v_share FROM public.shift_quest_shares WHERE id = p_share AND member_id = v_member.id FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  -- A second click on the same preview is a no-op.
  IF v_share.status <> 'draft' THEN
    RETURN v_share.status;
  END IF;
  IF NOT (public.shift_quest__settings()).sharing_enabled THEN
    PERFORM public.shift_quest__fail('sharing_paused');
  END IF;

  IF v_share.kind = 'recognition' THEN
    UPDATE public.shift_quest_shares SET status = 'awaiting_peer', updated_at = now() WHERE id = p_share;
    PERFORM public.shift_quest__notify(
      v_share.peer_member_id, 'recognize:' || p_share, 'recognition_request',
      jsonb_build_object('share_id', p_share, 'from', v_member.display_name, 'body', v_share.body,
                         'actor_id', v_member.id), p_share
    );
    PERFORM public.shift_quest__audit(v_member.id, 'share_confirm', 'share', p_share);
    RETURN 'awaiting_peer';
  END IF;

  PERFORM public.shift_quest__queue_share(v_share);
  PERFORM public.shift_quest__audit(v_member.id, 'share_confirm', 'share', p_share);
  RETURN 'queued';
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_share_cancel(p_actor text, p_share uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  UPDATE public.shift_quest_shares SET status = 'cancelled', updated_at = now()
  WHERE id = p_share AND member_id = v_member.id AND status IN ('draft', 'awaiting_peer');
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_share_respond(p_actor text, p_share uuid, p_accept boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_share public.shift_quest_shares;
BEGIN
  SELECT * INTO v_share FROM public.shift_quest_shares
  WHERE id = p_share AND peer_member_id = v_member.id FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF v_share.status <> 'awaiting_peer' THEN
    RETURN v_share.status;
  END IF;

  IF NOT p_accept THEN
    UPDATE public.shift_quest_shares SET status = 'peer_declined', updated_at = now() WHERE id = p_share;
    PERFORM public.shift_quest__audit(v_member.id, 'share_peer_decline', 'share', p_share);
    RETURN 'peer_declined';
  END IF;

  PERFORM public.shift_quest__queue_share(v_share);
  PERFORM public.shift_quest__audit(v_member.id, 'share_peer_accept', 'share', p_share);
  RETURN 'queued';
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_share_get(p_actor text, p_share uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'id', s.id, 'kind', s.kind, 'body', s.body, 'status', s.status,
      'author', a.display_name, 'peer', p.display_name,
      'title', (SELECT title FROM public.shift_quest_instances WHERE id = s.instance_id)
    )
    FROM public.shift_quest_shares s
    JOIN public.shift_quest_members a ON a.id = s.member_id
    LEFT JOIN public.shift_quest_members p ON p.id = s.peer_member_id
    WHERE s.id = p_share AND (s.member_id = v_member.id OR s.peer_member_id = v_member.id)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Inbox
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest_inbox_list(p_actor text, p_mark_read boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
  v_items jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', n.id, 'kind', n.kind, 'params', n.params, 'ref_id', n.ref_id,
    'created_at', n.created_at, 'unread', n.read_at IS NULL
  ) ORDER BY n.created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT * FROM public.shift_quest_inbox WHERE member_id = v_member.id
    ORDER BY read_at IS NULL DESC, created_at DESC LIMIT 15
  ) n;

  IF p_mark_read THEN
    UPDATE public.shift_quest_inbox SET read_at = now()
    WHERE member_id = v_member.id AND read_at IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'items', v_items,
    'recognitions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('share_id', s.id, 'from', a.display_name, 'body', s.body))
      FROM public.shift_quest_shares s
      JOIN public.shift_quest_members a ON a.id = s.member_id
      WHERE s.peer_member_id = v_member.id AND s.status = 'awaiting_peer'
    ), '[]'::jsonb),
    'contributions', CASE WHEN v_member.onboarded_at IS NOT NULL
      THEN public.shift_quest_pending_contributions(p_actor) ELSE '[]'::jsonb END,
    'invites', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('project_id', p.id, 'name', p.name, 'from', i.display_name))
      FROM public.shift_quest_project_members pm
      JOIN public.shift_quest_projects p ON p.id = pm.project_id
      LEFT JOIN public.shift_quest_members i ON i.id = pm.invited_by
      WHERE pm.member_id = v_member.id AND pm.status = 'invited' AND p.archived_at IS NULL
    ), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Personal data: export and requests
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest_data_export(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
BEGIN
  RETURN jsonb_build_object(
    'exported_at', now(),
    'member', jsonb_build_object(
      'display_name', v_member.display_name, 'roles', v_member.roles,
      'onboarded_at', v_member.onboarded_at, 'reminders_opt_in', v_member.reminders_opt_in,
      'reminder_days', v_member.reminder_days, 'reminder_hour', v_member.reminder_hour,
      'notify_dm', v_member.notify_dm
    ),
    'projects', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', p.name, 'route', p.route, 'ambition', p.ambition, 'status', pm.status,
                                          'show_name_on_island', pm.show_name))
      FROM public.shift_quest_project_members pm JOIN public.shift_quest_projects p ON p.id = pm.project_id
      WHERE pm.member_id = v_member.id
    ), '[]'::jsonb),
    'quests', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'title', i.title, 'state', i.state, 'goal', i.goal, 'why', i.why, 'next_step', i.next_step,
        'criteria', i.criteria, 'review_date', i.review_date, 'created_at', i.created_at,
        'submissions', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'revision', s.revision, 'status', s.status, 'evidence', s.evidence, 'reflection', s.reflection,
            'artifact_url', s.artifact_url, 'created_at', s.created_at,
            'reviews', COALESCE((
              SELECT jsonb_agg(jsonb_build_object('outcome', r.outcome, 'feedback', r.feedback, 'created_at', r.created_at))
              FROM public.shift_quest_reviews r WHERE r.submission_id = s.id
            ), '[]'::jsonb)
          ) ORDER BY s.revision)
          FROM public.shift_quest_submissions s WHERE s.instance_id = i.id
        ), '[]'::jsonb)
      ) ORDER BY i.created_at)
      FROM public.shift_quest_instances i WHERE i.member_id = v_member.id
    ), '[]'::jsonb),
    'contributions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('quest', i.title, 'contribution', c.contribution, 'status', c.status))
      FROM public.shift_quest_contributions c
      JOIN public.shift_quest_submissions s ON s.id = c.submission_id
      JOIN public.shift_quest_instances i ON i.id = s.instance_id
      WHERE c.member_id = v_member.id AND i.member_id <> v_member.id
    ), '[]'::jsonb),
    'progress', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'kind', e.kind,
        'changed', e.changed, 'learned', e.learned, 'next_step', e.next_step, 'blocker', e.blocker,
        'artifact_url', e.artifact_url, 'visibility', e.visibility, 'created_at', e.created_at
      ) ORDER BY e.created_at)
      FROM public.shift_quest_progress e WHERE e.member_id = v_member.id
    ), '[]'::jsonb),
    'work_sessions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('intention', w.intention, 'reflection', w.reflection,
                                          'started_at', w.started_at, 'ended_at', w.ended_at) ORDER BY w.started_at)
      FROM public.shift_quest_work_sessions w WHERE w.member_id = v_member.id
    ), '[]'::jsonb),
    'help_requests', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('summary', h.summary, 'visibility', h.visibility, 'status', h.status,
                                          'created_at', h.created_at) ORDER BY h.created_at)
      FROM public.shift_quest_help_requests h WHERE h.member_id = v_member.id
    ), '[]'::jsonb),
    'shares', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('kind', s.kind, 'body', s.body, 'status', s.status, 'created_at', s.created_at))
      FROM public.shift_quest_shares s WHERE s.member_id = v_member.id
    ), '[]'::jsonb),
    'coins', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('amount', l.amount, 'kind', l.kind, 'reason', l.reason,
                                          'created_at', l.created_at) ORDER BY l.created_at)
      FROM public.shift_quest_ledger l WHERE l.member_id = v_member.id
    ), '[]'::jsonb),
    'redemptions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('item', c.name, 'cost', r.cost, 'status', r.status, 'created_at', r.created_at))
      FROM public.shift_quest_redemptions r JOIN public.shift_quest_catalog c ON c.id = r.item_id
      WHERE r.member_id = v_member.id
    ), '[]'::jsonb)
  )
  -- Season records (recognitions, unlocks, squads) once
  -- 20261111090800_shift_quests_seasons is applied; nothing before.
  || public.shift_quest__island_export(v_member.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_data_request(p_actor text, p_kind text, p_note text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
  v_id uuid;
BEGIN
  IF p_kind NOT IN ('correction', 'erasure') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  INSERT INTO public.shift_quest_data_requests (member_id, kind, note)
  VALUES (v_member.id, p_kind, public.shift_quest__check_len(p_note, 1000, p_kind = 'correction'))
  RETURNING id INTO v_id;
  -- Staff see that a request exists; the note stays in the database.
  PERFORM public.shift_quest__post('data:' || v_id, 'staff', 'data_request',
    jsonb_build_object('request_id', v_id, 'kind', p_kind));
  PERFORM public.shift_quest__audit(v_member.id, 'data_request_' || p_kind, 'data_request', v_id);
  RETURN v_id;
END;
$$;

-- Never callable through the Data API: these trust the Discord ID they get.
-- (Supabase grants new functions to anon and authenticated by default.)
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'shift\_quest\_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END;
$$;
