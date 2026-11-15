-- SHIFT High Island: the peer check (feedback only).
--
-- Plan: docs/designs/shift-high-quest-pitfalls.md ("Show work and peer
-- check"). The founder decided (2026-11-15): another island student can look
-- at a submitted quest, tick the "เสร็จเมื่อ" items they think are met, and
-- leave one short line. A mentor still approves, and only a mentor's approval
-- grows the tree. This file adds:
--
--   * shift_quest_submissions.peer_open: the submitter lets peers check this
--     submission (the website's form asks, ticked by default; off for every
--     row before this file and for the bot's submits).
--   * shift_quest_peer_checks: one check per peer per submission revision:
--     the ticked checklist item ids, one line (280 characters), and a
--     mentor's hide.
--   * Who may check (shift_quest__peer_can_check): an onboarded student who
--     is not staff, not the submitter, and not conflicted with the quest the
--     way a reviewer would be (shift_quest__conflicted: the quest's project,
--     a contribution, any project shared with its owner), on a submission
--     that is pending, the latest revision, open to peers, and whose
--     submitter's consent allows it (shift_quest__consent_ok). Peers never
--     see the submitter's name or team.
--   * Website-only functions: shift_quest_peer_open, _queue (oldest first,
--     20 at most, skipping ones already checked), _view, _check (10 a
--     Bangkok day), _list (the submitter, active teammates and reviewers;
--     hidden checks only for reviewers), _hide (reviewers and admins).
--   * Visibility: the peers allowed to check a submission may see its photos
--     (shift_quest__evidence_viewer); the web review page and the bot's
--     review count include peer checks (shift_quest_review_view,
--     shift_quest_review_extras).
--   * Export lists the member's own checks; erasure deletes them.
--   * shift_quest_schema_version() = 15.
--
-- Group-visible only: a check is shown to the submitter's team and the
-- mentors, never posted anywhere public, and it opens no private channel
-- between anyone (AGENTS.md safeguarding). A peer's name shows only when that
-- peer's consent is on file; otherwise "a peer on the island".
--
-- Prod-first apply: additive and idempotent.

ALTER TABLE public.shift_quest_submissions ADD COLUMN IF NOT EXISTS peer_open boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.shift_quest_peer_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.shift_quest_submissions(id) ON DELETE CASCADE,
  peer_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  -- Checklist item ids from the website's quest guide (e.g. 'm1-target') or 'c<n>' for a criteria line.
  ticked text[] NOT NULL DEFAULT '{}' CHECK (cardinality(ticked) <= 10),
  line text NOT NULL CHECK (char_length(line) BETWEEN 1 AND 280),
  hidden_by uuid NULL REFERENCES public.shift_quest_members(id),
  hidden_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shift_quest_peer_checks_one UNIQUE (submission_id, peer_id),
  CONSTRAINT shift_quest_peer_checks_hidden CHECK ((hidden_by IS NULL) = (hidden_at IS NULL))
);

CREATE INDEX IF NOT EXISTS shift_quest_peer_checks_peer ON public.shift_quest_peer_checks (peer_id, created_at);

COMMENT ON TABLE public.shift_quest_peer_checks IS
  'SHIFT High: a peer''s check of a quest submission (feedback only; a mentor still decides).';

ALTER TABLE public.shift_quest_peer_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_quest_peer_checks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shift_quest_peer_checks TO service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

/** Whether a member may check a submission now (see the header). */
CREATE OR REPLACE FUNCTION public.shift_quest__peer_can_check(
  p_member public.shift_quest_members, p_sub public.shift_quest_submissions
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_sub.peer_open
    AND p_sub.status = 'pending'
    AND p_sub.submitted_by <> p_member.id
    AND p_member.onboarded_at IS NOT NULL
    AND p_member.erased_at IS NULL
    AND NOT (p_member.roles && ARRAY['reviewer', 'admin']::text[])
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_quest_submissions s
      WHERE s.instance_id = p_sub.instance_id AND s.revision > p_sub.revision
    )
    AND public.shift_quest__consent_ok(p_sub.submitted_by)
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_quest_instances i
      WHERE i.id = p_sub.instance_id AND public.shift_quest__conflicted(p_member.id, i)
    );
$$;

/** A member's name for a peer check: the display name with consent on file, else null ("a peer on the island"). */
CREATE OR REPLACE FUNCTION public.shift_quest__peer_name(p_member uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.shift_quest__consent_ok(p_member) THEN m.display_name END
  FROM public.shift_quest_members m WHERE m.id = p_member;
$$;

/** A submission's peer checks, oldest first; hidden ones only when p_staff. */
CREATE OR REPLACE FUNCTION public.shift_quest__peer_checks_json(p_submission uuid, p_staff boolean)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'peer', public.shift_quest__peer_name(c.peer_id),
      'ticked', to_jsonb(c.ticked),
      'line', c.line,
      'created_at', c.created_at,
      'hidden', c.hidden_at IS NOT NULL
    ) ORDER BY c.created_at, c.id), '[]'::jsonb)
  FROM public.shift_quest_peer_checks c
  WHERE c.submission_id = p_submission AND (p_staff OR c.hidden_at IS NULL);
$$;

/**
 * The body of 20261115130000 plus: the peers allowed to check the
 * submission, and a peer who already checked it, see its photos too.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__evidence_viewer(
  p_member public.shift_quest_members, p_sub public.shift_quest_submissions
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_sub.submitted_by = p_member.id
    OR p_member.roles && ARRAY['reviewer', 'admin']::text[]
    OR (p_sub.visibility = 'team' AND EXISTS (
      SELECT 1 FROM public.shift_quest_instances i
      WHERE i.id = p_sub.instance_id AND public.shift_quest__is_teammate(i.project_id, p_member.id)
    ))
    -- 20261115140000_shift_quest_peer_check.
    OR public.shift_quest__peer_can_check(p_member, p_sub)
    OR EXISTS (
      SELECT 1 FROM public.shift_quest_peer_checks c
      WHERE c.submission_id = p_sub.id AND c.peer_id = p_member.id
    );
$$;

-- ---------------------------------------------------------------------------
-- The submitter
-- ---------------------------------------------------------------------------

/**
 * Opens (or closes) the caller's own pending submission to peer checks.
 * Returns {peer_open}. 'sq:not_found' when it is not the caller's,
 * 'sq:bad_state' once a mentor decided or a newer revision exists.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_peer_open(p_actor text, p_submission uuid, p_open boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_instance uuid;
  v_sub public.shift_quest_submissions;
BEGIN
  SELECT instance_id INTO v_instance FROM public.shift_quest_submissions WHERE id = p_submission;
  IF v_instance IS NULL THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  PERFORM 1 FROM public.shift_quest_instances WHERE id = v_instance FOR NO KEY UPDATE;
  SELECT * INTO v_sub FROM public.shift_quest_submissions WHERE id = p_submission FOR NO KEY UPDATE;
  IF v_sub.submitted_by <> v_member.id THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF v_sub.status <> 'pending' OR EXISTS (
    SELECT 1 FROM public.shift_quest_submissions s
    WHERE s.instance_id = v_sub.instance_id AND s.revision > v_sub.revision
  ) THEN
    PERFORM public.shift_quest__fail('bad_state');
  END IF;
  UPDATE public.shift_quest_submissions SET peer_open = COALESCE(p_open, false) WHERE id = v_sub.id;
  PERFORM public.shift_quest__audit(v_member.id, CASE WHEN COALESCE(p_open, false) THEN 'peer_open' ELSE 'peer_close' END,
    'submission', v_sub.id);
  RETURN jsonb_build_object('peer_open', COALESCE(p_open, false));
END;
$$;

-- ---------------------------------------------------------------------------
-- The peer
-- ---------------------------------------------------------------------------

/**
 * What the caller can check now, oldest first, 20 at most, skipping what
 * they already checked: [{submission_id, title, revision, created_at,
 * photos, checks}] (checks: how many peers already did, hidden ones not
 * counted). No names, no project.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_peer_queue(p_actor text)
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
        'submission_id', q.id,
        'title', q.title,
        'revision', q.revision,
        'created_at', q.created_at,
        'photos', (SELECT count(*) FROM public.shift_quest_evidence_photos p WHERE p.submission_id = q.id),
        'checks', (SELECT count(*) FROM public.shift_quest_peer_checks c WHERE c.submission_id = q.id AND c.hidden_at IS NULL)
      ) ORDER BY q.created_at, q.id)
    FROM (
      SELECT s.id, s.revision, s.created_at, i.title
      FROM public.shift_quest_submissions s
      JOIN public.shift_quest_instances i ON i.id = s.instance_id
      WHERE s.status = 'pending' AND s.peer_open
        AND public.shift_quest__peer_can_check(v_member, s)
        AND NOT EXISTS (
          SELECT 1 FROM public.shift_quest_peer_checks c WHERE c.submission_id = s.id AND c.peer_id = v_member.id
        )
      ORDER BY s.created_at, s.id
      LIMIT 20
    ) q
  ), '[]'::jsonb);
END;
$$;

/**
 * One submission for a peer: the quest (title, goal, criteria, its template
 * slug, kind and milestone, so the website can show its checklist), the work
 * (evidence, reflection, link, photos), whether the caller can still check
 * it, and the caller's own check if they made one. No submitter name, no
 * project. 'sq:not_found' for anyone who may not check it and has not.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_peer_view(p_actor text, p_submission uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_sub public.shift_quest_submissions;
  v_inst public.shift_quest_instances;
  v_tpl public.shift_quest_templates;
  v_mine public.shift_quest_peer_checks;
  v_can boolean;
BEGIN
  SELECT * INTO v_sub FROM public.shift_quest_submissions WHERE id = p_submission;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  v_can := public.shift_quest__peer_can_check(v_member, v_sub);
  SELECT * INTO v_mine FROM public.shift_quest_peer_checks WHERE submission_id = v_sub.id AND peer_id = v_member.id;
  IF NOT v_can AND v_mine.id IS NULL THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  SELECT * INTO v_inst FROM public.shift_quest_instances WHERE id = v_sub.instance_id;
  SELECT * INTO v_tpl FROM public.shift_quest_templates WHERE id = v_inst.template_id;
  RETURN jsonb_build_object(
    'submission_id', v_sub.id,
    'revision', v_sub.revision,
    'status', v_sub.status,
    'title', v_inst.title,
    'goal', v_inst.goal,
    'criteria', v_inst.criteria,
    'kind', CASE WHEN v_tpl.id IS NULL THEN 'proposed' WHEN v_tpl.side THEN 'side' ELSE 'main' END,
    'slug', v_tpl.slug,
    'milestone', v_inst.milestone,
    'evidence', CASE WHEN v_sub.redacted_at IS NULL THEN v_sub.evidence END,
    'reflection', CASE WHEN v_sub.redacted_at IS NULL THEN v_sub.reflection END,
    'artifact_url', CASE WHEN v_sub.redacted_at IS NULL THEN v_sub.artifact_url END,
    'photos', public.shift_quest__evidence_of(v_sub.id),
    'can_check', v_can AND v_mine.id IS NULL,
    'mine', CASE WHEN v_mine.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_mine.id, 'ticked', to_jsonb(v_mine.ticked), 'line', v_mine.line,
      'created_at', v_mine.created_at, 'hidden', v_mine.hidden_at IS NOT NULL
    ) END
  );
END;
$$;

/**
 * The caller's check of one submission: the ticked checklist item ids (at
 * most 10, each 1 to 40 of a-z, 0-9 and '-') and one line (1 to 280).
 * Returns {id}. Refusals: 'sq:not_found' (not one the caller may check, or
 * a revision that was replaced), 'sq:bad_state' (a mentor decided while it
 * was one the caller could check),
 * 'sq:already_checked', 'sq:peer_limit' (10 checks a Bangkok day),
 * 'sq:bad_input', 'sq:missing_text', 'sq:text_too_long'. Locks the quest
 * first, as everything that changes a submission does.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_peer_check(
  p_actor text, p_submission uuid, p_ticked text[], p_line text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_line text := public.shift_quest__check_len(p_line, 280, true);
  v_ticked text[] := ARRAY(SELECT DISTINCT t FROM unnest(COALESCE(p_ticked, '{}'::text[])) t ORDER BY t);
  v_instance uuid;
  v_sub public.shift_quest_submissions;
  v_pending public.shift_quest_submissions;
  v_id uuid;
BEGIN
  IF cardinality(v_ticked) > 10 OR EXISTS (
    SELECT 1 FROM unnest(v_ticked) t WHERE t IS NULL OR t !~ '^[a-z0-9-]{1,40}$'
  ) THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  SELECT instance_id INTO v_instance FROM public.shift_quest_submissions WHERE id = p_submission;
  IF v_instance IS NULL THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  PERFORM 1 FROM public.shift_quest_instances WHERE id = v_instance FOR NO KEY UPDATE;
  SELECT * INTO v_sub FROM public.shift_quest_submissions WHERE id = p_submission;
  IF EXISTS (
    SELECT 1 FROM public.shift_quest_peer_checks WHERE submission_id = v_sub.id AND peer_id = v_member.id
  ) THEN
    PERFORM public.shift_quest__fail('already_checked');
  END IF;
  IF NOT public.shift_quest__peer_can_check(v_member, v_sub) THEN
    -- A peer who could have checked it while it waited is told a mentor decided; anyone else finds nothing.
    v_pending := v_sub;
    v_pending.status := 'pending';
    IF v_sub.status <> 'pending' AND public.shift_quest__peer_can_check(v_member, v_pending) THEN
      PERFORM public.shift_quest__fail('bad_state');
    END IF;
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF (
    SELECT count(*) FROM public.shift_quest_peer_checks
    WHERE peer_id = v_member.id
      AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok')
  ) >= 10 THEN
    PERFORM public.shift_quest__fail('peer_limit');
  END IF;

  INSERT INTO public.shift_quest_peer_checks (submission_id, peer_id, ticked, line)
  VALUES (v_sub.id, v_member.id, v_ticked, v_line)
  RETURNING id INTO v_id;
  PERFORM public.shift_quest__audit(v_member.id, 'peer_check', 'submission', v_sub.id);
  RETURN jsonb_build_object('id', v_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- The team and the mentors
-- ---------------------------------------------------------------------------

/**
 * The peer checks of one quest's latest submission: {submission_id,
 * revision, checks: [{id, peer, ticked, line, created_at, hidden}]} for its
 * submitter, the quest project's active teammates, and reviewers and admins
 * (who also see hidden checks, marked hidden). Null for anyone else, or
 * without a submission. peer is null without that peer's consent on file.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_peer_list(p_actor text, p_instance uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
  v_staff boolean := v_member.roles && ARRAY['reviewer', 'admin']::text[];
  v_sub public.shift_quest_submissions;
  v_project uuid;
BEGIN
  SELECT * INTO v_sub FROM public.shift_quest_submissions
  WHERE instance_id = p_instance
  ORDER BY revision DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT project_id INTO v_project FROM public.shift_quest_instances WHERE id = p_instance;
  IF NOT (v_staff OR v_sub.submitted_by = v_member.id OR public.shift_quest__is_teammate(v_project, v_member.id)) THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'submission_id', v_sub.id,
    'revision', v_sub.revision,
    'peer_open', v_sub.peer_open,
    'checks', public.shift_quest__peer_checks_json(v_sub.id, v_staff)
  );
END;
$$;

/** A mentor hides (or shows again) one peer check. Reviewers and admins only. Returns {hidden}. */
CREATE OR REPLACE FUNCTION public.shift_quest_peer_hide(p_actor text, p_check uuid, p_hide boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
  v_submission uuid;
BEGIN
  UPDATE public.shift_quest_peer_checks
  SET hidden_by = CASE WHEN COALESCE(p_hide, true) THEN v_staff.id END,
      hidden_at = CASE WHEN COALESCE(p_hide, true) THEN now() END
  WHERE id = p_check
  RETURNING submission_id INTO v_submission;
  IF v_submission IS NULL THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  PERFORM public.shift_quest__audit(v_staff.id, CASE WHEN COALESCE(p_hide, true) THEN 'peer_hide' ELSE 'peer_show' END,
    'submission', v_submission);
  RETURN jsonb_build_object('hidden', COALESCE(p_hide, true));
END;
$$;

/** The body of 20261115130000 plus peer_checks (every check, hidden ones marked). */
CREATE OR REPLACE FUNCTION public.shift_quest_review_view(p_actor text, p_submission uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
  v_sub public.shift_quest_submissions;
  v_inst public.shift_quest_instances;
BEGIN
  SELECT * INTO v_sub FROM public.shift_quest_submissions WHERE id = p_submission;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  SELECT * INTO v_inst FROM public.shift_quest_instances WHERE id = v_sub.instance_id;
  RETURN jsonb_build_object(
    'submission_id', v_sub.id,
    'instance_id', v_sub.instance_id,
    'revision', v_sub.revision,
    'status', v_sub.status,
    'is_latest', NOT EXISTS (
      SELECT 1 FROM public.shift_quest_submissions s
      WHERE s.instance_id = v_sub.instance_id AND s.revision > v_sub.revision
    ),
    'title', v_inst.title,
    'goal', v_inst.goal,
    'criteria', v_inst.criteria,
    'evidence', v_sub.evidence,
    'reflection', v_sub.reflection,
    'artifact_url', v_sub.artifact_url,
    'created_at', v_sub.created_at,
    'redacted', v_sub.redacted_at IS NOT NULL,
    'photos', public.shift_quest__evidence_of(v_sub.id),
    -- 20261115140000_shift_quest_peer_check.
    'peer_open', v_sub.peer_open,
    'peer_checks', public.shift_quest__peer_checks_json(v_sub.id, true)
  );
END;
$$;

/** The body of 20261115130000 plus peer_checks: how many peers checked it (hidden ones not counted). */
CREATE OR REPLACE FUNCTION public.shift_quest_review_extras(p_actor text, p_submission uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
  v_instance uuid;
BEGIN
  SELECT instance_id INTO v_instance FROM public.shift_quest_submissions WHERE id = p_submission;
  IF v_instance IS NULL THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  RETURN jsonb_build_object(
    'instance_id', v_instance,
    'photos', (SELECT count(*) FROM public.shift_quest_evidence_photos WHERE submission_id = p_submission),
    'peer_checks', (
      SELECT count(*) FROM public.shift_quest_peer_checks WHERE submission_id = p_submission AND hidden_at IS NULL
    )
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Export and erasure (the bodies of 20261115130000 plus peer checks)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest__island_export(p_member uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'recognitions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('category', g.category, 'reason', g.reason, 'amount', g.amount,
                                          'created_at', g.created_at) ORDER BY g.created_at)
      FROM public.shift_quest_recognitions g WHERE g.member_id = p_member
    ), '[]'::jsonb),
    'season_unlocks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', u.label, 'earned_at', e.earned_at) ORDER BY e.earned_at)
      FROM public.shift_quest_season_unlock_earned e JOIN public.shift_quest_season_unlocks u ON u.id = e.unlock_id
      WHERE e.member_id = p_member
    ), '[]'::jsonb),
    'squads', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', q.name, 'target', q.target, 'starts_on', q.starts_on,
                                          'ends_on', q.ends_on, 'status', sm.status) ORDER BY q.created_at)
      FROM public.shift_quest_squad_members sm JOIN public.shift_quest_squads q ON q.id = sm.squad_id
      WHERE sm.member_id = p_member
    ), '[]'::jsonb),
    -- 20261111095000_shift_quest_player.
    'island_consent', (
      SELECT jsonb_build_object('state', c.state, 'basis', c.basis, 'ai', c.ai_ok,
                                'notice_version', c.notice_version, 'decided_at', c.decided_at)
      FROM public.shift_quest_consents c WHERE c.member_id = p_member
    ),
    -- 20261115130000_shift_quest_evidence_photos: what is stored, never the image.
    'evidence_photos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('quest', i.title, 'revision', s.revision, 'bytes', p.bytes,
                                          'width', p.width, 'height', p.height, 'created_at', p.created_at)
                       ORDER BY p.created_at)
      FROM public.shift_quest_evidence_photos p
      JOIN public.shift_quest_submissions s ON s.id = p.submission_id
      JOIN public.shift_quest_instances i ON i.id = s.instance_id
      WHERE p.member_id = p_member
    ), '[]'::jsonb),
    -- 20261115140000_shift_quest_peer_check: the checks the member wrote.
    'peer_checks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('quest', i.title, 'revision', s.revision, 'ticked', to_jsonb(c.ticked),
                                          'line', c.line, 'hidden', c.hidden_at IS NOT NULL, 'created_at', c.created_at)
                       ORDER BY c.created_at)
      FROM public.shift_quest_peer_checks c
      JOIN public.shift_quest_submissions s ON s.id = c.submission_id
      JOIN public.shift_quest_instances i ON i.id = s.instance_id
      WHERE c.peer_id = p_member
    ), '[]'::jsonb)
  );
END;
$$;

/**
 * The body of 20261115130000 plus: the peer checks the member wrote go.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__island_erase(p_member uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shift_quest_squad_members SET status = 'left', responded_at = now()
  WHERE member_id = p_member AND status IN ('active', 'invited');
  UPDATE public.shift_quest_squads SET name = '[erased]', target = '[erased]'
  WHERE created_by = p_member AND (name <> '[erased]' OR target <> '[erased]');
  UPDATE public.shift_quest_inbox SET params = params || '{"name": "[erased]"}'::jsonb
  WHERE kind = 'squad_invite'
    AND ref_id IN (SELECT id FROM public.shift_quest_squads WHERE created_by = p_member);
  -- 20261111095000_shift_quest_player: the consent row, and every AI summary
  -- of a project the member was ever on or contributed to (they were written
  -- from evidence the erasure clears, and go back to the model as 'previous').
  DELETE FROM public.shift_quest_consents WHERE member_id = p_member;
  DELETE FROM public.shift_quest_digests
  WHERE project_id IN (
    SELECT project_id FROM public.shift_quest_project_members WHERE member_id = p_member
    UNION
    SELECT i.project_id
    FROM public.shift_quest_contributions c
    JOIN public.shift_quest_submissions s ON s.id = c.submission_id
    JOIN public.shift_quest_instances i ON i.id = s.instance_id
    WHERE c.member_id = p_member AND i.project_id IS NOT NULL
    UNION
    SELECT i.project_id
    FROM public.shift_quest_submissions s
    JOIN public.shift_quest_instances i ON i.id = s.instance_id
    WHERE s.submitted_by = p_member AND i.project_id IS NOT NULL
  );
  -- 20261115130000_shift_quest_evidence_photos: the member's photos.
  DELETE FROM public.shift_quest_evidence_photos WHERE member_id = p_member;
  -- 20261115140000_shift_quest_peer_check: the checks the member wrote (their words about others' work).
  DELETE FROM public.shift_quest_peer_checks WHERE peer_id = p_member;
END;
$$;

/** Island schema 15: the peer check. */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 15; $$;

-- ---------------------------------------------------------------------------
-- Privileges, per function
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.shift_quest__peer_can_check(public.shift_quest_members, public.shift_quest_submissions)
  FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest__peer_name(uuid) FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest__peer_checks_json(uuid, boolean)
  FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
-- __evidence_viewer, __island_export, __island_erase, shift_quest_review_view and
-- shift_quest_review_extras keep their grants: CREATE OR REPLACE leaves them.

-- Website-only entry points: service_role for operators, never the bot.
REVOKE ALL ON FUNCTION public.shift_quest_peer_open(text, uuid, boolean) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_peer_queue(text) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_peer_view(text, uuid) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_peer_check(text, uuid, text[], text) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_peer_list(text, uuid) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_peer_hide(text, uuid, boolean) FROM PUBLIC, anon, authenticated, shift_quest_bot;
GRANT EXECUTE ON FUNCTION public.shift_quest_peer_open(text, uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_peer_queue(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_peer_view(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_peer_check(text, uuid, text[], text) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_peer_list(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_peer_hide(text, uuid, boolean) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    REVOKE ALL ON FUNCTION public.shift_quest__peer_can_check(public.shift_quest_members, public.shift_quest_submissions)
      FROM shift_quest_web;
    REVOKE ALL ON FUNCTION public.shift_quest__peer_name(uuid) FROM shift_quest_web;
    REVOKE ALL ON FUNCTION public.shift_quest__peer_checks_json(uuid, boolean) FROM shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_peer_open(text, uuid, boolean) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_peer_queue(text) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_peer_view(text, uuid) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_peer_check(text, uuid, text[], text) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_peer_list(text, uuid) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_peer_hide(text, uuid, boolean) TO shift_quest_web;
  END IF;
END;
$$;
