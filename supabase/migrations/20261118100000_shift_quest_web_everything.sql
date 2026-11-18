-- SHIFT High Island: the website does everything but Discord (schema 17).
--
-- The founder decided (2026-11-16): the SHIFT Island Discord bot becomes
-- notify-only, and every student and staff flow moves to the website, which
-- reaches the database only as the login role shift_quest_web through an
-- allowlist of shift_quest_* functions. This file gives the website what it
-- needs and changes nothing a user sees until the website ships pages for it.
--
--   * Three helpers nobody may call: shift_quest__discord_of (a live
--     member's Discord id, else not_found), shift_quest__contributors_of
--     (member uuids to Discord ids: the caller and duplicates removed, then at
--     most 8, any miss is contributor_not_teammate) and
--     shift_quest__help_conflicted (the review conflict rule for a help
--     request).
--   * Website-only wrappers. Each is SECURITY DEFINER with search_path
--     public, checks the actor FIRST (so a stranger or a non-admin learns
--     nothing about a member uuid), takes opaque member uuids and never
--     returns a Discord id. The website only ever holds the signed-in user's
--     own Discord id.
--       Students: shift_quest_project_teammates, shift_quest_islanders,
--       shift_quest_share_draft (5 celebration or thank-you drafts a day,
--       'share_limit'; the campfire's intentions do not count),
--       shift_quest_milestone_submit_team, shift_quest_side_submit_team
--       (teammates who helped: visibility 'team' when any are named, else
--       'reviewers'; on side quests only the two community quests take them).
--       Admins: shift_quest_admin_web_status (shift_quest_admin_status with
--       every Discord channel and role id replaced by a yes/no or a count),
--       shift_quest_admin_setting (no Discord keys, returns the web status),
--       shift_quest_admin_members (search), shift_quest_admin_member (detail
--       with the ledger), shift_quest_admin_member_role (members who already
--       have a row; new staff are added in Discord with /admin role),
--       shift_quest_admin_member_recognize ('web-recog:' keys),
--       shift_quest_admin_member_award ('web-award:' keys),
--       shift_quest_admin_member_consent_reset, shift_quest_admin_seasons.
--   * Body changes, same signatures and grants:
--       shift_quest_data_request: one open request per kind per member (a
--       second click returns the open one, so staff get one alert; a new
--       note is added to the open request, never dropped).
--       shift_quest_help_queue and shift_quest_help_update: a reviewer never
--       sees or takes the help request of their own team (the review rule,
--       refused as 'help_conflict').
--       shift_quest_contribution_respond: the last answer on an approved
--       submission issues the award it withheld ('contributions_pending').
--   * Existing staff and student functions granted to the website (the bot
--     keeps them while both work). Never granted: the raw Discord-id
--     functions (admin_set, admin_role, admin_recognize, admin_staff_award,
--     admin_ledger, admin_consent_reset, share_create, project_invite) and
--     admin_status (it carries Discord channel and role ids), the
--     outbox, live, digest, voice and campfire-round functions, the dropped
--     student flows (ownership_set, project_select, appeals, squads).
--   * shift_quest_schema_version() = 17.
--
-- Prod-first apply: additive and idempotent (CREATE OR REPLACE, REVOKE and
-- GRANT only). The grant block grants by full signature and stops if one is
-- missing; it never revokes a website grant made by an earlier file.
-- Applies after 20261116080000_shift_quest_review_view_conflict.
--
-- Any later migration that repeats the bot's grant loop must keep excluding
-- the website-only wrappers below, or end with the same REVOKE ... FROM
-- shift_quest_bot.

-- ---------------------------------------------------------------------------
-- Helpers (never granted)
-- ---------------------------------------------------------------------------

/** A live member's Discord id: not erased and linked. Otherwise 'not_found'. */
CREATE OR REPLACE FUNCTION public.shift_quest__discord_of(p_member uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discord text;
BEGIN
  SELECT discord_user_id INTO v_discord FROM public.shift_quest_members
  WHERE id = p_member AND erased_at IS NULL AND discord_user_id IS NOT NULL;
  IF v_discord IS NULL THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  RETURN v_discord;
END;
$$;

/**
 * Teammates named on a website submit, as the Discord ids shift_quest_submit
 * takes: the caller (p_self, whose own part is the submit's contribution) and
 * duplicates removed, then at most 8 ('bad_input'), and a null, unknown,
 * erased or unlinked id is 'contributor_not_teammate'. shift_quest_submit
 * still checks each one is an active, started teammate.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__contributors_of(p_members uuid[], p_self uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
  v_out text[];
BEGIN
  IF p_members IS NULL OR cardinality(p_members) = 0 THEN
    RETURN '{}'::text[];
  END IF;
  IF array_position(p_members, NULL) IS NOT NULL THEN
    PERFORM public.shift_quest__fail('contributor_not_teammate');
  END IF;
  SELECT array_agg(DISTINCT x ORDER BY x) INTO v_ids FROM unnest(p_members) x WHERE x IS DISTINCT FROM p_self;
  IF v_ids IS NULL THEN
    RETURN '{}'::text[];
  END IF;
  IF cardinality(v_ids) > 8 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  SELECT array_agg(m.discord_user_id ORDER BY m.id) INTO v_out
  FROM public.shift_quest_members m
  WHERE m.id = ANY (v_ids) AND m.erased_at IS NULL AND m.discord_user_id IS NOT NULL;
  IF COALESCE(cardinality(v_out), 0) <> cardinality(v_ids) THEN
    PERFORM public.shift_quest__fail('contributor_not_teammate');
  END IF;
  RETURN v_out;
END;
$$;

/**
 * The review conflict rule (shift_quest__conflicted) for a help request: the
 * reviewer asked it, is or was on its project, shares any project with the
 * student, or is conflicted with the quest it is about.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__help_conflicted(p_reviewer uuid, p_help public.shift_quest_help_requests)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_help.member_id = p_reviewer
    OR (p_help.project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.shift_quest_project_members pm
      WHERE pm.project_id = p_help.project_id AND pm.member_id = p_reviewer
        AND pm.status IN ('active', 'invited', 'left')
    ))
    OR EXISTS (
      SELECT 1 FROM public.shift_quest_project_members mine
      JOIN public.shift_quest_project_members theirs ON theirs.project_id = mine.project_id
      WHERE mine.member_id = p_reviewer AND theirs.member_id = p_help.member_id
        AND mine.status IN ('active', 'invited', 'left')
        AND theirs.status IN ('active', 'invited', 'left')
    )
    OR (p_help.instance_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.shift_quest_instances i
      WHERE i.id = p_help.instance_id AND public.shift_quest__conflicted(p_reviewer, i)
    ));
$$;

-- ---------------------------------------------------------------------------
-- Students
-- ---------------------------------------------------------------------------

/** The teammate picker: active, started, non-staff members of the caller's current project, not the caller. */
CREATE OR REPLACE FUNCTION public.shift_quest_project_teammates(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
BEGIN
  IF v_project IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', m.id, 'name', m.display_name) ORDER BY m.display_name, m.id)
    FROM public.shift_quest_project_members pm
    JOIN public.shift_quest_members m ON m.id = pm.member_id
    WHERE pm.project_id = v_project AND pm.status = 'active' AND m.id <> v_member.id
      AND m.onboarded_at IS NOT NULL AND m.erased_at IS NULL AND m.discord_user_id IS NOT NULL
      AND NOT (m.roles && ARRAY['reviewer', 'admin', 'fulfillment']::text[])
  ), '[]'::jsonb);
END;
$$;

/**
 * Who a student may thank: started, non-staff students with a Discord link,
 * not the caller, teammates first. A query of 2 to 80 characters, 20 at most.
 * Staff callers are not_eligible (they recognise through the admin page).
 */
CREATE OR REPLACE FUNCTION public.shift_quest_islanders(p_actor text, p_query text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
BEGIN
  IF v_member.roles && ARRAY['reviewer', 'admin', 'fulfillment']::text[] THEN
    PERFORM public.shift_quest__fail('not_eligible');
  END IF;
  IF p_query IS NULL OR char_length(btrim(p_query)) < 2 OR char_length(p_query) > 80 THEN
    PERFORM public.shift_quest__fail('invalid_input');
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', f.id, 'name', f.display_name, 'teammate', f.teammate)
      ORDER BY f.teammate DESC, f.display_name, f.id)
    FROM (
      SELECT m.id, m.display_name,
        v_project IS NOT NULL AND public.shift_quest__is_teammate(v_project, m.id) AS teammate
      FROM public.shift_quest_members m
      WHERE m.id <> v_member.id AND m.onboarded_at IS NOT NULL
        AND m.erased_at IS NULL AND m.discord_user_id IS NOT NULL
        AND NOT (m.roles && ARRAY['reviewer', 'admin', 'fulfillment']::text[])
        AND strpos(lower(m.display_name), lower(btrim(p_query))) > 0
      ORDER BY 3 DESC, m.display_name, m.id
      LIMIT 20
    ) f
  ), '[]'::jsonb);
END;
$$;

/**
 * Celebrate an approved quest, or thank a started student (p_peer, a member
 * uuid). Returns a draft share id; shift_quest_share_confirm sends it. The
 * campfire's 'intention' stays in Discord. At most 5 celebration or thank-you
 * drafts in 24 hours, cancelled ones included ('share_limit'), so the
 * celebrate channel and peers' inboxes cannot be flooded; the campfire's
 * intentions are not counted.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_share_draft(p_actor text, p_kind text, p_body text, p_instance uuid, p_peer uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_discord text;
BEGIN
  IF v_member.roles && ARRAY['reviewer', 'admin', 'fulfillment']::text[] THEN
    PERFORM public.shift_quest__fail('not_eligible');
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('celebration', 'recognition')
     OR (p_kind = 'celebration' AND p_peer IS NOT NULL)
     OR (p_kind = 'recognition' AND p_peer IS NULL) THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;

  -- One draft at a time per member, so a double click cannot pass the cap twice.
  PERFORM pg_advisory_xact_lock(hashtext('shift_quest_share_draft:' || v_member.id));
  IF (SELECT count(*) FROM public.shift_quest_shares
      WHERE member_id = v_member.id AND kind IN ('celebration', 'recognition')
        AND created_at > now() - interval '24 hours') >= 5 THEN
    PERFORM public.shift_quest__fail('share_limit');
  END IF;

  IF p_kind = 'recognition' THEN
    SELECT discord_user_id INTO v_discord FROM public.shift_quest_members
    WHERE id = p_peer AND onboarded_at IS NOT NULL AND erased_at IS NULL AND discord_user_id IS NOT NULL
      AND NOT (roles && ARRAY['reviewer', 'admin', 'fulfillment']::text[]);
    IF v_discord IS NULL THEN
      PERFORM public.shift_quest__fail('invitee_not_started');
    END IF;
  END IF;
  RETURN public.shift_quest_share_create(p_actor, p_kind, p_body, p_instance, v_discord);
END;
$$;

/**
 * shift_quest_milestone_submit with the caller's own part and the teammates
 * who helped (member uuids, at most 8). Named teammates confirm their part
 * from their inbox, and the proof is visible to the team; with none it is
 * the plain submit (reviewers only). One statement: a refused contributor
 * leaves no quest behind.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_milestone_submit_team(
  p_actor text, p_milestone smallint, p_proof text, p_reflection text, p_artifact_url text,
  p_contribution text, p_contributors uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  -- The caller's own part is p_contribution; naming themselves adds nobody.
  v_ids text[] := public.shift_quest__contributors_of(p_contributors, v_member.id);
  v_open jsonb;
  v_id uuid;
  v_result jsonb;
BEGIN
  v_open := public.shift_quest__milestone_open(p_actor, p_milestone);
  v_id := (v_open ->> 'instance_id')::uuid;
  v_result := public.shift_quest_submit(
    p_actor, v_id, NULL, p_proof, p_reflection, p_artifact_url,
    CASE WHEN cardinality(v_ids) > 0 THEN 'team' ELSE 'reviewers' END, p_contribution, v_ids
  );
  RETURN jsonb_build_object(
    'instance_id', v_id,
    'submission_id', v_result -> 'submission_id',
    'revision', v_result -> 'revision',
    'version', v_result -> 'version',
    'created', v_open -> 'created'
  );
END;
$$;

/**
 * The same for side quests. Only the two community quests take teammates
 * (they are what shift_quest__community_done counts); naming teammates on any
 * other side quest is 'bad_input'.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_side_submit_team(
  p_actor text, p_template uuid, p_proof text, p_reflection text, p_artifact_url text,
  p_contribution text, p_contributors uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  -- The caller's own part is p_contribution; naming themselves adds nobody.
  v_ids text[] := public.shift_quest__contributors_of(p_contributors, v_member.id);
  v_open jsonb;
  v_id uuid;
  v_result jsonb;
BEGIN
  IF cardinality(v_ids) > 0 AND NOT EXISTS (
    SELECT 1 FROM public.shift_quest_templates
    WHERE id = p_template AND slug IN ('side-help-a-builder', 'side-improve-community')
  ) THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  v_open := public.shift_quest__side_open(p_actor, p_template, true);
  v_id := (v_open ->> 'instance_id')::uuid;
  v_result := public.shift_quest_submit(
    p_actor, v_id, NULL, p_proof, p_reflection, p_artifact_url,
    CASE WHEN cardinality(v_ids) > 0 THEN 'team' ELSE 'reviewers' END, p_contribution, v_ids
  );
  RETURN jsonb_build_object(
    'instance_id', v_id,
    'submission_id', v_result -> 'submission_id',
    'revision', v_result -> 'revision',
    'version', v_result -> 'version',
    'created', v_open -> 'created'
  );
END;
$$;

/**
 * The body of 20261111090100 plus: one open request per kind per member. A
 * second request returns the open one (staff get one alert), and its note,
 * checked as before, is added to the open request so staff see it too
 * ('text_too_long' when the two no longer fit in 1000 characters).
 */
CREATE OR REPLACE FUNCTION public.shift_quest_data_request(p_actor text, p_kind text, p_note text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
  v_id uuid;
  v_note text;
  v_open_note text;
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('correction', 'erasure') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  v_note := public.shift_quest__check_len(p_note, 1000, p_kind = 'correction');
  -- 20261118100000: an open request of this kind already reached staff.
  PERFORM pg_advisory_xact_lock(hashtext('shift_quest_data_request:' || v_member.id || ':' || p_kind));
  SELECT id, note INTO v_id, v_open_note FROM public.shift_quest_data_requests
  WHERE member_id = v_member.id AND kind = p_kind AND status = 'open'
  ORDER BY created_at, id LIMIT 1;
  IF v_id IS NOT NULL THEN
    -- A new note joins the open request; the same note again (a double click) adds nothing.
    IF v_note IS NOT NULL AND (v_open_note IS NULL OR strpos(v_open_note, v_note) = 0) THEN
      v_note := concat_ws(E'\n---\n', v_open_note, v_note);
      IF char_length(v_note) > 1000 THEN
        PERFORM public.shift_quest__fail('text_too_long');
      END IF;
      UPDATE public.shift_quest_data_requests SET note = v_note WHERE id = v_id;
      PERFORM public.shift_quest__audit(v_member.id, 'data_request_' || p_kind || '_more', 'data_request', v_id);
    END IF;
    RETURN v_id;
  END IF;
  INSERT INTO public.shift_quest_data_requests (member_id, kind, note)
  VALUES (v_member.id, p_kind, v_note)
  RETURNING id INTO v_id;
  -- Staff see that a request exists; the note stays in the database.
  PERFORM public.shift_quest__post('data:' || v_id, 'staff', 'data_request',
    jsonb_build_object('request_id', v_id, 'kind', p_kind));
  PERFORM public.shift_quest__audit(v_member.id, 'data_request_' || p_kind, 'data_request', v_id);
  RETURN v_id;
END;
$$;

/**
 * The body of 20261111090100 plus: when the last pending teammate answers on
 * an approved submission whose award waited for them ('contributions_pending'),
 * the award is issued now, as the reviewer who approved it, in the approval's
 * lock order (quest, plot, members). Any other reason (a missing team split,
 * awards paused) is recorded on the quest as a staff retry would.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_contribution_respond(p_actor text, p_submission uuid, p_accept boolean, p_contribution text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_status text;
  v_text text := public.shift_quest__check_len(p_contribution, 1000, false);
  v_instance public.shift_quest_instances;
  v_reviewer uuid;
  v_award jsonb;
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

  -- 20261118100000: the last answer issues the award that waited for it.
  IF v_status = 'approved' THEN
    SELECT i.* INTO v_instance FROM public.shift_quest_instances i
    JOIN public.shift_quest_submissions s ON s.instance_id = i.id
    WHERE s.id = p_submission;
    IF v_instance.state = 'approved' AND v_instance.award_status = 'not_issued'
       AND v_instance.award_note = 'contributions_pending'
       AND NOT EXISTS (
         SELECT 1 FROM public.shift_quest_contributions c
         JOIN public.shift_quest_members m ON m.id = c.member_id
         WHERE c.submission_id = p_submission AND c.status = 'pending' AND m.erased_at IS NULL
       ) THEN
      SELECT r.reviewer_id INTO v_reviewer FROM public.shift_quest_reviews r
      WHERE r.submission_id = p_submission AND r.outcome = 'approved'
      ORDER BY r.created_at DESC LIMIT 1;
      PERFORM public.shift_quest__lock_plot(v_instance.project_id);
      PERFORM public.shift_quest__lock_approval_members(v_instance.id);
      v_award := public.shift_quest__issue_award(v_instance.id, COALESCE(v_reviewer, v_member.id));
      PERFORM public.shift_quest__audit(v_member.id, 'award_after_contributions', 'quest', v_instance.id,
                                        CASE WHEN (v_award ->> 'issued')::boolean THEN 'ok' ELSE v_award ->> 'reason' END);
    END IF;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Reviewers: help requests honour conflicts of interest
-- ---------------------------------------------------------------------------

/** The body of 20261111090200 plus: a reviewer never sees their own team's help requests. */
CREATE OR REPLACE FUNCTION public.shift_quest_help_queue(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
BEGIN
  PERFORM public.shift_quest__audit(v_me.id, 'help_queue_view', 'help', NULL);
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', h.id, 'student', m.display_name, 'summary', h.summary, 'visibility', h.visibility,
      'source', h.source, 'status', h.status, 'claimed_by', c.display_name,
      'project', p.name, 'created_at', h.created_at
    ) ORDER BY h.created_at)
    FROM public.shift_quest_help_requests h
    JOIN public.shift_quest_members m ON m.id = h.member_id
    LEFT JOIN public.shift_quest_members c ON c.id = h.claimed_by
    LEFT JOIN public.shift_quest_projects p ON p.id = h.project_id
    WHERE h.status IN ('open', 'claimed')
      -- 20261118100000: the review rule, for help too.
      AND NOT public.shift_quest__help_conflicted(v_me.id, h)
  ), '[]'::jsonb);
END;
$$;

/**
 * The body of 20261111090200 plus: a conflicted reviewer cannot claim or
 * resolve ('help_conflict'); release stays open to every reviewer.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_help_update(p_actor text, p_help uuid, p_action text, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
  v_help public.shift_quest_help_requests;
BEGIN
  SELECT * INTO v_help FROM public.shift_quest_help_requests WHERE id = p_help FOR NO KEY UPDATE;
  IF NOT FOUND OR v_help.status NOT IN ('open', 'claimed') THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF p_action NOT IN ('claim', 'resolve', 'release') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  -- 20261118100000: the review rule, for help too.
  IF p_action <> 'release' AND public.shift_quest__help_conflicted(v_me.id, v_help) THEN
    PERFORM public.shift_quest__fail('help_conflict');
  END IF;

  UPDATE public.shift_quest_help_requests
  SET status = CASE p_action WHEN 'claim' THEN 'claimed' WHEN 'release' THEN 'open' ELSE 'resolved' END,
      claimed_by = CASE p_action WHEN 'claim' THEN v_me.id WHEN 'release' THEN NULL ELSE claimed_by END,
      resolution_note = CASE WHEN p_action = 'resolve'
        THEN public.shift_quest__check_len(p_note, 1000, false) ELSE resolution_note END,
      resolved_at = CASE WHEN p_action = 'resolve' THEN now() END,
      updated_at = now()
  WHERE id = p_help;

  IF p_action <> 'release' THEN
    PERFORM public.shift_quest__notify(
      v_help.member_id, 'help:' || p_help || ':' || p_action, 'help_' || p_action,
      jsonb_build_object('summary', left(v_help.summary, 200), 'by', v_me.display_name, 'actor_id', v_me.id,
                         'note', CASE WHEN p_action = 'resolve' THEN public.shift_quest__check_len(p_note, 1000, false) END),
      p_help
    );
  END IF;
  -- Resolving the help behind an ownership check does not mark the check done:
  -- the students demonstrate it themselves.
  PERFORM public.shift_quest__audit(v_me.id, 'help_' || p_action, 'help', p_help);
END;
$$;

-- ---------------------------------------------------------------------------
-- Admins: member uuids in, never Discord ids out
-- ---------------------------------------------------------------------------

/**
 * shift_quest_admin_status for the website: every Discord id in its settings
 * (a '*_channel_id' or student_role_ids) becomes a yes/no ('help_channel':
 * true) or a count ('student_roles': 2). The website has no use for Discord
 * configuration, which stays in Discord, and never holds a Discord id but
 * the signed-in user's own.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_web_status(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_status jsonb := public.shift_quest_admin_status(p_actor);
BEGIN
  RETURN jsonb_set(v_status, '{settings}', COALESCE((
    SELECT jsonb_object_agg(
      CASE WHEN e.key LIKE '%\_channel\_id' THEN left(e.key, -3)
           WHEN e.key = 'student_role_ids' THEN 'student_roles'
           ELSE e.key END,
      CASE WHEN e.key LIKE '%\_channel\_id' THEN to_jsonb(jsonb_typeof(e.value) <> 'null')
           WHEN e.key = 'student_role_ids' THEN to_jsonb(CASE WHEN jsonb_typeof(e.value) = 'array'
                                                          THEN jsonb_array_length(e.value) ELSE 0 END)
           ELSE e.value END)
    FROM jsonb_each(v_status -> 'settings') e
  ), '{}'::jsonb));
END;
$$;

/**
 * shift_quest_admin_set for the website: the feature switches and the
 * published terms only. Channels and Discord student roles stay with
 * '/admin channel' and '/admin student-role'; squads are dropped. Any other
 * key is 'bad_input'. Returns shift_quest_admin_web_status (no Discord ids).
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_setting(p_actor text, p_key text, p_value text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
BEGIN
  IF p_key IS NULL OR p_key NOT IN ('awards', 'redemption', 'sharing', 'reminders', 'reward_terms',
                                    'redemption_terms', 'fulfillment_process', 'fulfillment_owner') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  PERFORM public.shift_quest_admin_set(p_actor, p_key, p_value);
  RETURN public.shift_quest_admin_web_status(p_actor);
END;
$$;

/** Admin member search: 2 to 80 characters, 20 at most, staff included, never a Discord id. */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_members(p_actor text, p_query text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
BEGIN
  IF p_query IS NULL OR char_length(btrim(p_query)) < 2 OR char_length(p_query) > 80 THEN
    PERFORM public.shift_quest__fail('invalid_input');
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', f.id, 'name', f.display_name, 'roles', to_jsonb(f.roles),
      'started', f.onboarded_at IS NOT NULL) ORDER BY f.display_name, f.id)
    FROM (
      SELECT m.id, m.display_name, m.roles, m.onboarded_at
      FROM public.shift_quest_members m
      WHERE m.erased_at IS NULL AND m.discord_user_id IS NOT NULL
        AND strpos(lower(m.display_name), lower(btrim(p_query))) > 0
      ORDER BY m.display_name, m.id
      LIMIT 20
    ) f
  ), '[]'::jsonb);
END;
$$;

/**
 * One member for the admin page: roles, started, the current project,
 * consent, then shift_quest_admin_ledger's balance and 25 entries (audited
 * there as 'ledger_view').
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_member(p_actor text, p_member uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_discord text := public.shift_quest__discord_of(p_member);
  v_target public.shift_quest_members;
  v_project uuid;
  v_ledger jsonb;
BEGIN
  SELECT * INTO v_target FROM public.shift_quest_members WHERE id = p_member;
  v_project := public.shift_quest__current_project(v_target);
  v_ledger := public.shift_quest_admin_ledger(p_actor, v_discord);
  RETURN jsonb_build_object(
    'id', v_target.id,
    'name', v_target.display_name,
    'roles', to_jsonb(v_target.roles),
    'started', v_target.onboarded_at IS NOT NULL,
    'started_at', v_target.onboarded_at,
    'project', (SELECT jsonb_build_object('id', p.id, 'name', p.name, 'route', p.route)
                FROM public.shift_quest_projects p WHERE p.id = v_project),
    'consent', public.shift_quest__consent_json(v_target.id),
    'balance', v_ledger -> 'balance',
    'entries', v_ledger -> 'entries'
  );
END;
$$;

/**
 * Grant or remove a staff role on a member who already has a row (found
 * through shift_quest_admin_members). New staff are added in Discord with
 * '/admin role', the only verified way to map a new Discord user. Keeps the
 * stored name; refuses removing the last admin ('last_admin').
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_member_role(p_actor text, p_member uuid, p_role text, p_grant boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
BEGIN
  IF p_grant IS NULL THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  RETURN public.shift_quest_admin_role(p_actor, public.shift_quest__discord_of(p_member), NULL, p_role, p_grant);
END;
$$;

/** shift_quest_admin_recognize by member uuid; the key is 'web-recog:' || p_request (one uuid per form). */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_member_recognize(
  p_actor text, p_member uuid, p_amount integer, p_reason text, p_category text, p_request uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
BEGIN
  IF p_request IS NULL THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  RETURN public.shift_quest_admin_recognize(
    p_actor, public.shift_quest__discord_of(p_member), p_amount, p_reason, p_category, 'web-recog:' || p_request
  );
END;
$$;

/** shift_quest_admin_staff_award by member uuid; the key is 'web-award:' || p_request (one uuid per form). */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_member_award(
  p_actor text, p_member uuid, p_rule_key text, p_reason text, p_request uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
BEGIN
  IF p_request IS NULL THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  RETURN public.shift_quest_admin_staff_award(
    p_actor, public.shift_quest__discord_of(p_member), p_rule_key, p_reason, 'web-award:' || p_request
  );
END;
$$;

/** shift_quest_admin_consent_reset by member uuid: a parent who said no can be asked again. */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_member_consent_reset(p_actor text, p_member uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
BEGIN
  RETURN public.shift_quest_admin_consent_reset(p_actor, public.shift_quest__discord_of(p_member));
END;
$$;

/**
 * Draft and active seasons, newest first, with their unlocks: the season ids
 * shift_quest_admin_unlock needs, without shift_quest_admin_season's island
 * lock. Read-only.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_seasons(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(public.shift_quest__season_admin_json(s.id) ORDER BY s.created_at DESC, s.id)
    FROM public.shift_quest_seasons s
    WHERE s.status IN ('draft', 'active')
  ), '[]'::jsonb);
END;
$$;

/** Island schema 17: the website does everything but Discord. */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 17; $$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

-- Helpers: nobody. shift_quest_web is a LOGIN role and so a member of PUBLIC.
REVOKE ALL ON FUNCTION public.shift_quest__discord_of(uuid)
  FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest__contributors_of(uuid[], uuid)
  FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest__help_conflicted(uuid, public.shift_quest_help_requests)
  FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;

-- Website-only wrappers: service_role for operators, never the bot or the Data API.
REVOKE ALL ON FUNCTION public.shift_quest_project_teammates(text) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_islanders(text, text) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_share_draft(text, text, text, uuid, uuid) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_milestone_submit_team(text, smallint, text, text, text, text, uuid[])
  FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_side_submit_team(text, uuid, text, text, text, text, uuid[])
  FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_admin_web_status(text) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_admin_setting(text, text, text) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_admin_members(text, text) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_admin_member(text, uuid) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_admin_member_role(text, uuid, text, boolean) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_admin_member_recognize(text, uuid, integer, text, text, uuid)
  FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_admin_member_award(text, uuid, text, text, uuid)
  FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_admin_member_consent_reset(text, uuid) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_admin_seasons(text) FROM PUBLIC, anon, authenticated, shift_quest_bot;
GRANT EXECUTE ON FUNCTION public.shift_quest_project_teammates(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_islanders(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_share_draft(text, text, text, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_milestone_submit_team(text, smallint, text, text, text, text, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_side_submit_team(text, uuid, text, text, text, text, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_admin_web_status(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_admin_setting(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_admin_members(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_admin_member(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_admin_member_role(text, uuid, text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_admin_member_recognize(text, uuid, integer, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_admin_member_award(text, uuid, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_admin_member_consent_reset(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_admin_seasons(text) TO service_role;
-- shift_quest_data_request, _contribution_respond, _help_queue, _help_update and
-- _schema_version keep their grants: CREATE OR REPLACE leaves them.

-- The website's allowlist, by full signature. Grants only: a website grant from
-- an earlier file is never revoked here. A missing signature stops the file.
DO $$
DECLARE
  v_sig text;
  v_proc regprocedure;
  v_web text[] := ARRAY[
    -- Students: inbox, settings, teammates, sharing, data rights.
    'public.shift_quest_inbox_list(text,boolean)',
    'public.shift_quest_help_mine(text)',
    'public.shift_quest_help_withdraw(text,uuid)',
    'public.shift_quest_update_prefs(text,boolean,smallint[],smallint,boolean)',
    'public.shift_quest_contribution_respond(text,uuid,boolean,text)',
    'public.shift_quest_share_get(text,uuid)',
    'public.shift_quest_share_confirm(text,uuid)',
    'public.shift_quest_share_cancel(text,uuid)',
    'public.shift_quest_share_respond(text,uuid,boolean)',
    'public.shift_quest_data_export(text)',
    'public.shift_quest_data_request(text,text,text)',
    'public.shift_quest_project_teammates(text)',
    'public.shift_quest_islanders(text,text)',
    'public.shift_quest_share_draft(text,text,text,uuid,uuid)',
    'public.shift_quest_milestone_submit_team(text,smallint,text,text,text,text,uuid[])',
    'public.shift_quest_side_submit_team(text,uuid,text,text,text,text,uuid[])',
    -- Reviewers: the queue, decisions, proposals, help and award retries.
    'public.shift_quest_review_queue(text)',
    'public.shift_quest_review_get(text,uuid)',
    'public.shift_quest_review_decide(text,uuid,text,text,boolean)',
    'public.shift_quest_proposal_get(text,uuid)',
    'public.shift_quest_proposal_agree(text,uuid,text,text)',
    'public.shift_quest_help_queue(text)',
    'public.shift_quest_help_update(text,uuid,text,text)',
    'public.shift_quest_awards_pending(text)',
    'public.shift_quest_issue_award(text,uuid)',
    -- Fulfillment.
    'public.shift_quest_fulfill_queue(text)',
    'public.shift_quest_fulfill_update(text,uuid,text,text)',
    -- Admins. Never shift_quest_admin_status: it carries Discord ids.
    'public.shift_quest_admin_web_status(text)',
    'public.shift_quest_admin_setting(text,text,text)',
    'public.shift_quest_admin_members(text,text)',
    'public.shift_quest_admin_member(text,uuid)',
    'public.shift_quest_admin_member_role(text,uuid,text,boolean)',
    'public.shift_quest_admin_member_recognize(text,uuid,integer,text,text,uuid)',
    'public.shift_quest_admin_member_award(text,uuid,text,text,uuid)',
    'public.shift_quest_admin_member_consent_reset(text,uuid)',
    'public.shift_quest_admin_reverse(text,uuid,integer,text,text)',
    'public.shift_quest_admin_report(text,integer)',
    'public.shift_quest_admin_rule(text,text,integer,integer,text,text,text,text)',
    'public.shift_quest_admin_rule_retire(text,text)',
    'public.shift_quest_admin_templates(text)',
    'public.shift_quest_admin_template_state(text,text,boolean)',
    'public.shift_quest_admin_template_rule(text,text,text)',
    'public.shift_quest_admin_catalog_list(text)',
    'public.shift_quest_admin_catalog(text,uuid,text,text,integer,integer,boolean)',
    'public.shift_quest_admin_catalog_gate(text,uuid,smallint,boolean)',
    'public.shift_quest_admin_seasons(text)',
    'public.shift_quest_admin_season(text,text,date,date,date,smallint,smallint,smallint,integer,date,text,boolean,boolean,smallint)',
    'public.shift_quest_admin_unlock(text,uuid,text,smallint,date,text)',
    'public.shift_quest_admin_island_status(text)',
    'public.shift_quest_admin_island_set(text,text,text)',
    'public.shift_quest_admin_data_requests(text)',
    'public.shift_quest_admin_data_close(text,uuid,boolean)',
    'public.shift_quest_admin_erase(text,uuid)'
  ];
BEGIN
  FOREACH v_sig IN ARRAY v_web LOOP
    IF to_regprocedure(v_sig) IS NULL THEN
      RAISE EXCEPTION 'shift_quest_web allowlist: % does not exist', v_sig;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    RETURN;
  END IF;
  REVOKE ALL ON FUNCTION public.shift_quest__discord_of(uuid) FROM shift_quest_web;
  REVOKE ALL ON FUNCTION public.shift_quest__contributors_of(uuid[], uuid) FROM shift_quest_web;
  REVOKE ALL ON FUNCTION public.shift_quest__help_conflicted(uuid, public.shift_quest_help_requests) FROM shift_quest_web;
  FOREACH v_sig IN ARRAY v_web LOOP
    v_proc := to_regprocedure(v_sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO shift_quest_web', v_proc::text);
  END LOOP;
END;
$$;
