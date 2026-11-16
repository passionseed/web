-- SHIFT High Island: the web review page honours conflicts of interest.
--
-- shift_quest_review_view (the web review page, /shift/island/review/<id>,
-- made by 20261115130000 and last replaced by 20261115140000) only checked
-- that the caller is a reviewer or admin. It never asked
-- shift_quest__conflicted (20261111090200), so a reviewer who is the student,
-- a teammate (now or before), or a contributor could read the submission, its
-- photos and its peer checks on the website, although the Discord review card
-- (shift_quest_review_get) and every decision refuse them.
--
-- This file replaces the function with the body of 20261115140000 plus that
-- check, raised exactly as shift_quest_review_get raises it
-- ('sq:conflict_of_interest'). The function stays STABLE, so the refusal is
-- not audited here (the review card and decisions audit theirs). Same
-- signature, same SECURITY DEFINER and search_path, same jsonb result.
--
-- shift_quest_schema_version() stays 15: nothing new to detect. The website
-- reads 'conflict_of_interest' as a short note and works before and after.
--
-- Prod-first apply: CREATE OR REPLACE only, grants re-asserted idempotently.

/** The body of 20261115140000 plus: a conflicted reviewer is refused ('sq:conflict_of_interest'). */
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
  -- 20261116080000: the review card's rule (shift_quest_review_get), on the website too.
  IF public.shift_quest__conflicted(v_staff.id, v_inst) THEN
    PERFORM public.shift_quest__fail('conflict_of_interest');
  END IF;
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

-- The grants of 20261115130000, re-asserted: the website's and service_role's, never the bot's or the Data API's.
REVOKE ALL ON FUNCTION public.shift_quest_review_view(text, uuid) FROM PUBLIC, anon, authenticated, shift_quest_bot;
GRANT EXECUTE ON FUNCTION public.shift_quest_review_view(text, uuid) TO service_role;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    GRANT EXECUTE ON FUNCTION public.shift_quest_review_view(text, uuid) TO shift_quest_web;
  END IF;
END;
$$;
