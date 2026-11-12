-- SHIFT High quests: human review, awards, proposals and the help queue.
--
-- Invariants enforced here, not in the bot:
--   * a reviewer never decides their own quest, a teammate's, or one they
--     contributed to, and an appeal goes to someone other than the decliner;
--   * only the latest revision can be decided, so a withdrawn or superseded
--     revision can never be approved;
--   * an approval and its coin credit commit together, and the credit's
--     source key (award:<quest>:<member>) makes every retry a no-op.
--
-- Prod-first apply: CREATE OR REPLACE only.

/**
 * True when the reviewer is too close to this quest to judge it: their own,
 * one they contributed to, or the owner is (or was) on any project with them,
 * whichever project the quest is filed under.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__conflicted(p_reviewer uuid, p_instance public.shift_quest_instances)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_instance.member_id = p_reviewer
    OR EXISTS (
      SELECT 1 FROM public.shift_quest_contributions c
      JOIN public.shift_quest_submissions s ON s.id = c.submission_id
      WHERE s.instance_id = p_instance.id AND c.member_id = p_reviewer
    )
    OR (p_instance.project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.shift_quest_project_members pm
      WHERE pm.project_id = p_instance.project_id AND pm.member_id = p_reviewer
        AND pm.status IN ('active', 'invited', 'left')
    ))
    OR EXISTS (
      SELECT 1 FROM public.shift_quest_project_members mine
      JOIN public.shift_quest_project_members theirs ON theirs.project_id = mine.project_id
      WHERE mine.member_id = p_reviewer AND theirs.member_id = p_instance.member_id
        AND mine.status IN ('active', 'invited', 'left')
        AND theirs.status IN ('active', 'invited', 'left')
    );
$$;

/**
 * Locks, in ONE pass sorted by id, every member an approval of this quest may
 * touch: the latest revision's confirmed contributors (the award) and the
 * project's active members (season unlocks). Callers hold the quest's row
 * lock and the project's plot lock (shift_quest__lock_plot), which joining
 * and leaving also take, so the set cannot grow before the approval commits.
 * Every later member lock in the approval is re-entrant, so two approvals
 * that share members queue instead of deadlocking.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__lock_approval_members(p_instance uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM 1 FROM public.shift_quest_members m
  WHERE m.id IN (
      SELECT c.member_id
      FROM public.shift_quest_contributions c
      JOIN public.shift_quest_submissions s ON s.id = c.submission_id
      WHERE s.instance_id = p_instance AND c.status = 'confirmed'
        AND s.revision = (SELECT max(x.revision) FROM public.shift_quest_submissions x WHERE x.instance_id = p_instance)
      UNION
      SELECT pm.member_id
      FROM public.shift_quest_instances i
      JOIN public.shift_quest_project_members pm ON pm.project_id = i.project_id
      WHERE i.id = p_instance AND pm.status = 'active'
    )
    AND m.erased_at IS NULL
  ORDER BY m.id
  FOR NO KEY UPDATE;
END;
$$;

/**
 * Credits the configured award for an approved quest, at most once per
 * member. Callers hold the quest's row lock, the plot lock and every member
 * lock (shift_quest__lock_approval_members). Returns what happened, and
 * records it on the quest so the student and reviewers can see why an award
 * did not happen.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__issue_award(p_instance uuid, p_actor uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance public.shift_quest_instances;
  v_submission public.shift_quest_submissions;
  v_rule public.shift_quest_reward_rules;
  v_template public.shift_quest_templates;
  v_reason text;
  v_people uuid[];
  v_person uuid;
  v_each integer;
  v_issued integer := 0;
  v_capped integer := 0;
  v_entry uuid;
BEGIN
  SELECT * INTO v_instance FROM public.shift_quest_instances WHERE id = p_instance;
  IF v_instance.state <> 'approved' THEN
    RETURN jsonb_build_object('issued', false, 'reason', 'not_approved');
  END IF;
  SELECT * INTO v_submission FROM public.shift_quest_submissions
  WHERE instance_id = p_instance AND status = 'approved'
  ORDER BY revision DESC LIMIT 1;
  SELECT * INTO v_rule FROM public.shift_quest_reward_rules WHERE id = v_instance.reward_rule_id;
  SELECT * INTO v_template FROM public.shift_quest_templates WHERE id = v_instance.template_id;

  SELECT array_agg(c.member_id ORDER BY c.member_id) INTO v_people
  FROM public.shift_quest_contributions c
  JOIN public.shift_quest_members m ON m.id = c.member_id
  WHERE c.submission_id = v_submission.id AND c.status = 'confirmed' AND m.erased_at IS NULL;

  v_reason := CASE
    WHEN NOT public.shift_quest__awards_live() THEN 'awards_paused'
    WHEN v_instance.reward_rule_id IS NULL THEN 'no_reward_rule'
    WHEN v_instance.template_id IS NULL
         AND (v_instance.reward_agreed_at IS NULL OR v_instance.reward_agreed_at > v_submission.created_at)
      THEN 'reward_not_agreed'
    WHEN v_template.repeatable AND NOT v_submission.distinct_confirmed AND EXISTS (
      SELECT 1 FROM public.shift_quest_instances i
      JOIN public.shift_quest_templates t ON t.id = i.template_id
      WHERE i.member_id = v_instance.member_id AND i.id <> v_instance.id
        AND i.state = 'approved' AND t.slug = v_template.slug
    ) THEN 'distinct_not_confirmed'
    WHEN EXISTS (
      SELECT 1 FROM public.shift_quest_contributions c
      JOIN public.shift_quest_members m ON m.id = c.member_id
      WHERE c.submission_id = v_submission.id AND c.status = 'pending' AND m.erased_at IS NULL
    ) THEN 'contributions_pending'
    WHEN COALESCE(cardinality(v_people), 0) = 0 THEN 'no_contributors'
    WHEN cardinality(v_people) > 1 AND v_rule.team_allocation IS NULL THEN 'team_allocation_missing'
  END;

  IF v_reason IS NULL THEN
    v_each := CASE
      WHEN cardinality(v_people) = 1 OR v_rule.team_allocation = 'each_confirmed' THEN v_rule.amount
      ELSE v_rule.amount / cardinality(v_people)
    END;
    IF v_each <= 0 THEN
      v_reason := 'split_too_small';
    END IF;
  END IF;

  IF v_reason IS NOT NULL THEN
    UPDATE public.shift_quest_instances SET award_status = 'not_issued', award_note = v_reason
    WHERE id = p_instance AND award_status IS DISTINCT FROM 'issued';
    RETURN jsonb_build_object('issued', false, 'reason', v_reason);
  END IF;

  FOREACH v_person IN ARRAY v_people LOOP
    -- Per-member lock so caps and balances cannot race with another award or
    -- a redemption. Re-entrant: the caller locked the whole set up front.
    PERFORM 1 FROM public.shift_quest_members WHERE id = v_person FOR NO KEY UPDATE;

    IF EXISTS (SELECT 1 FROM public.shift_quest_ledger WHERE source_key = 'award:' || p_instance || ':' || v_person) THEN
      v_issued := v_issued + 1;
      CONTINUE;
    END IF;
    -- An award reversed in full no longer counts toward the cap.
    IF v_rule.cap_per_member IS NOT NULL AND (
      SELECT count(*) FROM public.shift_quest_ledger l
      JOIN public.shift_quest_reward_rules r ON r.id = l.reward_rule_id
      WHERE l.member_id = v_person AND l.kind = 'award' AND r.key = v_rule.key
        AND l.amount + COALESCE((
          SELECT sum(x.amount) FROM public.shift_quest_ledger x WHERE x.references_entry_id = l.id
        ), 0) > 0
    ) >= v_rule.cap_per_member THEN
      v_capped := v_capped + 1;
      CONTINUE;
    END IF;

    v_entry := NULL;
    INSERT INTO public.shift_quest_ledger (
      member_id, amount, kind, source_key, reward_rule_id, instance_id, reason, actor_id
    )
    VALUES (
      v_person, v_each, 'award', 'award:' || p_instance || ':' || v_person, v_rule.id, p_instance,
      'quest_award', p_actor
    )
    ON CONFLICT (source_key) DO NOTHING
    RETURNING id INTO v_entry;

    v_issued := v_issued + 1;
    IF v_entry IS NOT NULL THEN
      PERFORM public.shift_quest__notify(
        v_person, 'award:' || v_entry, 'award_issued',
        jsonb_build_object('title', v_instance.title, 'amount', v_each), p_instance
      );
    END IF;
  END LOOP;

  UPDATE public.shift_quest_instances
  SET award_status = CASE WHEN v_issued > 0 THEN 'issued' ELSE 'not_issued' END,
      award_note = CASE WHEN v_capped > 0 THEN 'cap_reached' END
  WHERE id = p_instance;

  RETURN jsonb_build_object('issued', v_issued > 0, 'members', v_issued, 'capped', v_capped, 'amount', v_each,
                            'reason', CASE WHEN v_issued = 0 THEN 'cap_reached' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_review_queue(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
BEGIN
  RETURN jsonb_build_object(
    'submissions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'submission_id', s.id, 'title', i.title, 'revision', s.revision, 'student', m.display_name,
        'created_at', s.created_at, 'appeal', i.state = 'appealed'
      ) ORDER BY s.created_at)
      FROM public.shift_quest_instances i
      JOIN LATERAL (
        SELECT * FROM public.shift_quest_submissions
        WHERE instance_id = i.id ORDER BY revision DESC LIMIT 1
      ) s ON true
      JOIN public.shift_quest_members m ON m.id = i.member_id
      WHERE ((i.state = 'submitted' AND s.status = 'pending')
          OR (i.state = 'appealed' AND NOT EXISTS (
                SELECT 1 FROM public.shift_quest_appeals a
                WHERE a.instance_id = i.id AND a.status = 'open' AND a.declined_by = v_me.id)))
        AND NOT public.shift_quest__conflicted(v_me.id, i)
    ), '[]'::jsonb),
    'proposals', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'instance_id', i.id, 'title', i.title, 'student', m.display_name, 'created_at', i.created_at
      ) ORDER BY i.created_at)
      FROM public.shift_quest_instances i
      JOIN public.shift_quest_members m ON m.id = i.member_id
      WHERE i.template_id IS NULL AND i.reward_agreed_at IS NULL
        AND i.state IN ('active', 'paused', 'clarification')
        AND NOT public.shift_quest__conflicted(v_me.id, i)
    ), '[]'::jsonb),
    'help_open', (SELECT count(*) FROM public.shift_quest_help_requests WHERE status IN ('open', 'claimed'))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_review_get(p_actor text, p_submission uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
  v_submission public.shift_quest_submissions;
  v_instance public.shift_quest_instances;
  v_template public.shift_quest_templates;
BEGIN
  SELECT * INTO v_submission FROM public.shift_quest_submissions WHERE id = p_submission;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  SELECT * INTO v_instance FROM public.shift_quest_instances WHERE id = v_submission.instance_id;
  IF public.shift_quest__conflicted(v_me.id, v_instance) THEN
    PERFORM public.shift_quest__audit(v_me.id, 'review_view', 'submission', p_submission, 'denied_conflict');
    PERFORM public.shift_quest__fail('conflict_of_interest');
  END IF;
  SELECT * INTO v_template FROM public.shift_quest_templates WHERE id = v_instance.template_id;

  PERFORM public.shift_quest__audit(v_me.id, 'review_view', 'submission', p_submission);
  RETURN jsonb_build_object(
    'submission_id', v_submission.id,
    'revision', v_submission.revision,
    'status', v_submission.status,
    'is_latest', v_submission.revision = (
      SELECT max(revision) FROM public.shift_quest_submissions WHERE instance_id = v_instance.id),
    'appeal', v_instance.state = 'appealed',
    'appeal_reason', (SELECT reason FROM public.shift_quest_appeals
                      WHERE instance_id = v_instance.id AND status = 'open'),
    'instance_state', v_instance.state,
    'student', (SELECT display_name FROM public.shift_quest_members WHERE id = v_instance.member_id),
    'title', v_instance.title,
    'why', v_instance.why,
    'goal', v_instance.goal,
    'criteria', v_instance.criteria,
    'template_evidence', v_template.evidence_criteria,
    'proposed', v_instance.template_id IS NULL,
    'repeatable', COALESCE(v_template.repeatable, false),
    'prior_approved', (
      SELECT count(*) FROM public.shift_quest_instances i
      JOIN public.shift_quest_templates t ON t.id = i.template_id
      WHERE i.member_id = v_instance.member_id AND i.id <> v_instance.id
        AND i.state = 'approved' AND t.slug = v_template.slug
    ),
    -- A withdrawn or superseded revision is no longer the student's submission.
    'evidence', CASE WHEN v_submission.status IN ('withdrawn', 'superseded') THEN NULL ELSE v_submission.evidence END,
    'reflection', CASE WHEN v_submission.status IN ('withdrawn', 'superseded') THEN NULL ELSE v_submission.reflection END,
    'artifact_url', CASE WHEN v_submission.status IN ('withdrawn', 'superseded') THEN NULL ELSE v_submission.artifact_url END,
    'reward', public.shift_quest__rule_summary(v_instance.reward_rule_id),
    'reward_agreed', v_instance.reward_agreed_at IS NOT NULL,
    'awards_live', public.shift_quest__awards_live(),
    'contributions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', m.display_name, 'contribution', c.contribution, 'status', c.status))
      FROM public.shift_quest_contributions c JOIN public.shift_quest_members m ON m.id = c.member_id
      WHERE c.submission_id = v_submission.id
    ), '[]'::jsonb),
    'history', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('revision', s.revision, 'outcome', r.outcome, 'feedback', r.feedback,
                                          'created_at', r.created_at) ORDER BY r.created_at)
      FROM public.shift_quest_reviews r
      JOIN public.shift_quest_submissions s ON s.id = r.submission_id
      WHERE s.instance_id = v_instance.id
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_review_decide(
  p_actor text, p_submission uuid, p_outcome text, p_feedback text, p_distinct boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
  v_feedback text := public.shift_quest__check_len(p_feedback, 2000, false);
  v_instance_id uuid;
  v_instance public.shift_quest_instances;
  v_submission public.shift_quest_submissions;
  v_appeal public.shift_quest_appeals;
  v_latest integer;
  v_review uuid;
  v_award jsonb;
  v_island jsonb;
BEGIN
  IF p_outcome NOT IN ('approved', 'clarification', 'declined') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF p_outcome <> 'approved' AND v_feedback IS NULL THEN
    PERFORM public.shift_quest__fail('feedback_required');
  END IF;

  SELECT instance_id INTO v_instance_id FROM public.shift_quest_submissions WHERE id = p_submission;
  IF v_instance_id IS NULL THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  -- Everything below is decided under the quest's row lock, so a concurrent
  -- withdrawal, resubmission or second approval waits and then sees the result.
  SELECT * INTO v_instance FROM public.shift_quest_instances WHERE id = v_instance_id FOR NO KEY UPDATE;
  SELECT * INTO v_submission FROM public.shift_quest_submissions WHERE id = p_submission;

  -- A retried approval of the same revision: success, and nothing new.
  IF p_outcome = 'approved' AND v_submission.status = 'approved' AND v_instance.state = 'approved' THEN
    RETURN jsonb_build_object('already', true, 'award', jsonb_build_object(
      'issued', v_instance.award_status = 'issued', 'reason', v_instance.award_note));
  END IF;

  IF public.shift_quest__conflicted(v_me.id, v_instance) THEN
    PERFORM public.shift_quest__audit(v_me.id, 'review_' || p_outcome, 'submission', p_submission, 'denied_conflict');
    PERFORM public.shift_quest__fail('conflict_of_interest');
  END IF;

  SELECT max(revision) INTO v_latest FROM public.shift_quest_submissions WHERE instance_id = v_instance.id;
  IF v_submission.revision <> v_latest THEN
    PERFORM public.shift_quest__fail('stale_revision');
  END IF;

  IF v_instance.state = 'submitted' AND v_submission.status = 'pending' THEN
    NULL;
  ELSIF v_instance.state = 'appealed' AND v_submission.status = 'declined' THEN
    SELECT * INTO v_appeal FROM public.shift_quest_appeals
    WHERE instance_id = v_instance.id AND status = 'open' FOR NO KEY UPDATE;
    IF v_appeal.declined_by = v_me.id THEN
      PERFORM public.shift_quest__fail('appeal_needs_other_reviewer');
    END IF;
  ELSE
    PERFORM public.shift_quest__fail('stale_revision');
  END IF;

  INSERT INTO public.shift_quest_reviews (submission_id, reviewer_id, outcome, feedback, is_appeal)
  VALUES (p_submission, v_me.id, p_outcome, v_feedback, v_appeal.id IS NOT NULL)
  RETURNING id INTO v_review;

  UPDATE public.shift_quest_submissions
  SET status = p_outcome, decided_at = now(), distinct_confirmed = COALESCE(p_distinct, false)
  WHERE id = p_submission;

  -- "Clarification" reopens a quest for its owner; when the owner has left the
  -- project, a milestone quest is archived instead so the team can take it.
  UPDATE public.shift_quest_instances
  SET state = CASE
        WHEN p_outcome = 'clarification' AND milestone IS NOT NULL AND project_id IS NOT NULL
             AND NOT public.shift_quest__is_teammate(project_id, member_id) THEN 'archived'
        ELSE p_outcome END,
      version = version + 1, updated_at = now()
  WHERE id = v_instance.id;

  IF v_appeal.id IS NOT NULL THEN
    UPDATE public.shift_quest_appeals SET status = 'resolved', resolved_at = now() WHERE id = v_appeal.id;
  END IF;

  IF p_outcome = 'approved' THEN
    -- The project's plot before any member: approvals on one project take
    -- turns, so season thresholds are never missed by two at once.
    -- (Island helpers: 20261111090700_shift_quests_island.) Then every
    -- member this approval may touch, in one sorted pass.
    PERFORM public.shift_quest__lock_plot(v_instance.project_id);
    PERFORM public.shift_quest__lock_approval_members(v_instance.id);
    v_award := public.shift_quest__issue_award(v_instance.id, v_me.id);
    -- Grows the tree; may earn season unlocks for the project's members.
    v_island := public.shift_quest__after_approval(v_instance.id, v_me.id);
  END IF;

  PERFORM public.shift_quest__notify(
    v_instance.member_id, 'reviewed:' || v_review, 'review_' || p_outcome,
    jsonb_build_object('title', v_instance.title, 'feedback', v_feedback, 'award', v_award,
                       'milestone', v_island -> 'milestone', 'stage', v_island -> 'stage'),
    v_instance.id
  );
  PERFORM public.shift_quest__audit(v_me.id, 'review_' || p_outcome, 'submission', p_submission);
  RETURN jsonb_build_object('already', false, 'review_id', v_review, 'award', v_award, 'island', v_island);
END;
$$;

/** Retry an award that did not happen (awards were paused, a teammate had not confirmed). */
CREATE OR REPLACE FUNCTION public.shift_quest_issue_award(p_actor text, p_instance uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
  v_instance public.shift_quest_instances;
  v_result jsonb;
BEGIN
  SELECT * INTO v_instance FROM public.shift_quest_instances WHERE id = p_instance FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF public.shift_quest__conflicted(v_me.id, v_instance) THEN
    PERFORM public.shift_quest__fail('conflict_of_interest');
  END IF;
  -- The same order as an approval: quest, plot, then the members in one pass.
  PERFORM public.shift_quest__lock_plot(v_instance.project_id);
  PERFORM public.shift_quest__lock_approval_members(p_instance);
  v_result := public.shift_quest__issue_award(p_instance, v_me.id);
  PERFORM public.shift_quest__audit(v_me.id, 'award_retry', 'quest', p_instance,
                                    CASE WHEN (v_result ->> 'issued')::boolean THEN 'ok' ELSE v_result ->> 'reason' END);
  RETURN v_result;
END;
$$;

/** Approved quests whose award did not happen, for reviewers to retry. */
CREATE OR REPLACE FUNCTION public.shift_quest_awards_pending(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'instance_id', i.id, 'title', i.title, 'student', m.display_name, 'reason', i.award_note
    ) ORDER BY i.updated_at)
    FROM public.shift_quest_instances i
    JOIN public.shift_quest_members m ON m.id = i.member_id
    WHERE i.state = 'approved' AND i.award_status = 'not_issued'
      AND i.award_note NOT IN ('no_reward_rule', 'reward_not_agreed')
      AND NOT public.shift_quest__conflicted(v_me.id, i)
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_proposal_get(p_actor text, p_instance uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
  v_instance public.shift_quest_instances;
BEGIN
  SELECT * INTO v_instance FROM public.shift_quest_instances WHERE id = p_instance AND template_id IS NULL;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF public.shift_quest__conflicted(v_me.id, v_instance) THEN
    PERFORM public.shift_quest__fail('conflict_of_interest');
  END IF;
  PERFORM public.shift_quest__audit(v_me.id, 'proposal_view', 'quest', p_instance);
  RETURN public.shift_quest__quest_json(v_instance)
    || jsonb_build_object('student', (SELECT display_name FROM public.shift_quest_members WHERE id = v_instance.member_id),
                          'rules', COALESCE((
                            SELECT jsonb_agg(jsonb_build_object('key', key, 'amount', amount) ORDER BY key)
                            FROM public.shift_quest_reward_rules WHERE status = 'published'
                          ), '[]'::jsonb));
END;
$$;

/**
 * A mentor agrees a proposed quest's scope, and optionally which published
 * reward rule applies, before reward-bearing work is submitted.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_proposal_agree(
  p_actor text, p_instance uuid, p_rule_key text, p_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
  v_instance public.shift_quest_instances;
  v_rule public.shift_quest_reward_rules;
BEGIN
  SELECT * INTO v_instance FROM public.shift_quest_instances WHERE id = p_instance FOR NO KEY UPDATE;
  IF NOT FOUND OR v_instance.template_id IS NOT NULL THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF public.shift_quest__conflicted(v_me.id, v_instance) THEN
    PERFORM public.shift_quest__fail('conflict_of_interest');
  END IF;
  IF v_instance.state NOT IN ('active', 'paused', 'clarification') THEN
    PERFORM public.shift_quest__fail('bad_state');
  END IF;
  IF public.shift_quest__trim(p_rule_key) IS NOT NULL THEN
    SELECT * INTO v_rule FROM public.shift_quest_reward_rules WHERE key = p_rule_key AND status = 'published';
    IF NOT FOUND THEN
      PERFORM public.shift_quest__fail('rule_not_found');
    END IF;
  END IF;

  UPDATE public.shift_quest_instances
  SET reward_rule_id = v_rule.id, reward_agreed_by = v_me.id, reward_agreed_at = now(),
      version = version + 1, updated_at = now()
  WHERE id = p_instance;

  PERFORM public.shift_quest__notify(
    v_instance.member_id, 'agreed:' || p_instance || ':' || v_instance.version, 'proposal_agreed',
    jsonb_build_object('title', v_instance.title, 'amount', v_rule.amount,
                       'note', public.shift_quest__check_len(p_note, 1000, false)),
    p_instance
  );
  PERFORM public.shift_quest__audit(v_me.id, 'proposal_agree', 'quest', p_instance);
END;
$$;

-- ---------------------------------------------------------------------------
-- Help queue for mentors
-- ---------------------------------------------------------------------------

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
  ), '[]'::jsonb);
END;
$$;

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
