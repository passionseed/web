-- SHIFT High Island: photo evidence on a quest submission, and changing the
-- team's planted problem later.
--
-- Plan: docs/designs/shift-high-quest-pitfalls.md ("Show work and peer
-- check"). The founder decided (2026-11-15) that students show work by
-- writing it, a photo or screenshot, or a canvas notes card. This file adds:
--
--   * shift_quest_evidence_photos: up to three photos per submission
--     revision, uploaded by the student who submitted it while it waits for a
--     mentor. One row per photo: the object's path in the private Storage
--     bucket 'shift-quest-evidence' (made by 20261115130100, outside this
--     sandbox), its size and pixel size. No file name, no caption, no
--     metadata: the website re-encodes every photo to WebP and strips EXIF and
--     GPS before it is stored (students are minors).
--   * shift_quest_storage_trash: object paths waiting to be deleted from
--     Storage. A trigger queues every photo row that goes, whatever removed it
--     (the student, an admin erase, a cascade from a deleted submission), and
--     the website's daily job deletes the objects and clears the queue. This
--     database cannot reach Storage.
--   * Website-only functions: shift_quest_evidence_add (reserve a photo's
--     path, the submitter only, pending submissions only, three at most),
--     shift_quest_evidence_remove, shift_quest_evidence_list (the latest
--     submission's photos of one quest, for its submitter, teammates when the
--     submission is team-visible, and reviewers), shift_quest_review_view (a
--     submission with its photos, reviewers and admins only, for the web
--     review page), shift_quest_storage_trash_claim and
--     shift_quest_storage_trash_done (the daily job), and
--     shift_quest_project_set_ambition (any active teammate changes the
--     team's problem line; changing it is normal).
--   * shift_quest_review_extras: the bot's review card asks how many photos a
--     submission has, so it can say so and link to the web review page.
--   * The data export lists the member's photos (when, how big; never the
--     image), and the erasure deletes them (the trigger queues the objects).
--   * shift_quest_schema_version() = 14. The website still needs 6 and checks
--     for 14 before it shows photo uploads; the bot still needs 2.
--
-- Prod-first apply: additive and idempotent (CREATE TABLE IF NOT EXISTS,
-- CREATE OR REPLACE, DROP TRIGGER IF EXISTS before CREATE TRIGGER).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shift_quest_evidence_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.shift_quest_submissions(id) ON DELETE CASCADE,
  -- The student who uploaded it: always the submission's submitter.
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  -- '<submission id>/<photo id>.webp' in the bucket 'shift-quest-evidence'.
  object_path text NOT NULL UNIQUE
    CHECK (object_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'),
  bytes integer NOT NULL CHECK (bytes BETWEEN 1 AND 4194304),
  width integer NOT NULL CHECK (width BETWEEN 1 AND 1600),
  height integer NOT NULL CHECK (height BETWEEN 1 AND 1600),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shift_quest_evidence_photos_submission
  ON public.shift_quest_evidence_photos (submission_id, created_at);
CREATE INDEX IF NOT EXISTS shift_quest_evidence_photos_member
  ON public.shift_quest_evidence_photos (member_id);

COMMENT ON TABLE public.shift_quest_evidence_photos IS
  'SHIFT High: photos a student attached to a quest submission. Paths in the private bucket shift-quest-evidence; images re-encoded, metadata stripped.';

CREATE TABLE IF NOT EXISTS public.shift_quest_storage_trash (
  object_path text PRIMARY KEY CHECK (char_length(object_path) BETWEEN 1 AND 200),
  queued_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shift_quest_storage_trash IS
  'SHIFT High: Storage objects (bucket shift-quest-evidence) to delete. The website''s daily job empties it.';

-- No Data API access, as every other quest table.
ALTER TABLE public.shift_quest_evidence_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_quest_evidence_photos FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shift_quest_evidence_photos TO service_role;
ALTER TABLE public.shift_quest_storage_trash ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_quest_storage_trash FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shift_quest_storage_trash TO service_role;

/** Every photo row that goes queues its object for deletion from Storage. */
CREATE OR REPLACE FUNCTION public.shift_quest__evidence_trash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.shift_quest_storage_trash (object_path)
  VALUES (OLD.object_path)
  ON CONFLICT (object_path) DO NOTHING;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS shift_quest_evidence_photos_trash ON public.shift_quest_evidence_photos;
CREATE TRIGGER shift_quest_evidence_photos_trash
  AFTER DELETE ON public.shift_quest_evidence_photos
  FOR EACH ROW EXECUTE FUNCTION public.shift_quest__evidence_trash();

-- ---------------------------------------------------------------------------
-- Photos
-- ---------------------------------------------------------------------------

/** One photo as the website reads it. */
CREATE OR REPLACE FUNCTION public.shift_quest__evidence_json(p_photo public.shift_quest_evidence_photos)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', p_photo.id,
    'path', p_photo.object_path,
    'width', p_photo.width,
    'height', p_photo.height
  );
$$;

/** A submission's photos, oldest first. */
CREATE OR REPLACE FUNCTION public.shift_quest__evidence_of(p_submission uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(public.shift_quest__evidence_json(p) ORDER BY p.created_at, p.id), '[]'::jsonb)
  FROM public.shift_quest_evidence_photos p
  WHERE p.submission_id = p_submission;
$$;

/**
 * Reserves one photo on the caller's own pending submission and returns
 * {id, path, count}: the website then stores the re-encoded image at path.
 * Only the student who submitted it, only while it waits for a mentor
 * (status pending, the quest's latest revision), three photos at most.
 * Refusals: 'sq:not_found' (no such submission, or not the caller's),
 * 'sq:bad_state' (decided, withdrawn or superseded), 'sq:too_many_photos',
 * 'sq:bad_input' (a size out of range). Locks the quest, then the submission.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_evidence_add(
  p_actor text, p_submission uuid, p_bytes integer, p_width integer, p_height integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_instance uuid;
  v_sub public.shift_quest_submissions;
  v_count integer;
  v_id uuid := gen_random_uuid();
  v_path text;
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
  IF p_bytes IS NULL OR p_bytes NOT BETWEEN 1 AND 4194304
     OR p_width IS NULL OR p_width NOT BETWEEN 1 AND 1600
     OR p_height IS NULL OR p_height NOT BETWEEN 1 AND 1600 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  SELECT count(*) INTO v_count FROM public.shift_quest_evidence_photos WHERE submission_id = v_sub.id;
  IF v_count >= 3 THEN
    PERFORM public.shift_quest__fail('too_many_photos');
  END IF;

  v_path := v_sub.id::text || '/' || v_id::text || '.webp';
  INSERT INTO public.shift_quest_evidence_photos (id, submission_id, member_id, object_path, bytes, width, height)
  VALUES (v_id, v_sub.id, v_member.id, v_path, p_bytes, p_width, p_height);
  PERFORM public.shift_quest__audit(v_member.id, 'evidence_add', 'submission', v_sub.id);
  RETURN jsonb_build_object('id', v_id, 'path', v_path, 'count', v_count + 1);
END;
$$;

/**
 * Removes one of the caller's own photos from a submission still waiting for
 * a mentor (the website's rollback when an upload fails, or the student
 * taking a photo back). Returns {path}; the object is queued for deletion
 * (the trigger) and the website deletes it at once too. 'sq:not_found' when
 * it is not the caller's photo, 'sq:bad_state' once a mentor has decided.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_evidence_remove(p_actor text, p_photo uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_photo public.shift_quest_evidence_photos;
  v_instance uuid;
  v_status text;
BEGIN
  SELECT s.instance_id INTO v_instance
  FROM public.shift_quest_evidence_photos p
  JOIN public.shift_quest_submissions s ON s.id = p.submission_id
  WHERE p.id = p_photo;
  IF v_instance IS NULL THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  PERFORM 1 FROM public.shift_quest_instances WHERE id = v_instance FOR NO KEY UPDATE;
  SELECT * INTO v_photo FROM public.shift_quest_evidence_photos WHERE id = p_photo FOR UPDATE;
  IF NOT FOUND OR v_photo.member_id <> v_member.id THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  SELECT status INTO v_status FROM public.shift_quest_submissions WHERE id = v_photo.submission_id;
  IF v_status <> 'pending' THEN
    PERFORM public.shift_quest__fail('bad_state');
  END IF;
  DELETE FROM public.shift_quest_evidence_photos WHERE id = p_photo;
  PERFORM public.shift_quest__audit(v_member.id, 'evidence_remove', 'submission', v_photo.submission_id);
  RETURN jsonb_build_object('path', v_photo.object_path);
END;
$$;

/**
 * Whether a member may see a submission's photos: its submitter, an active
 * teammate when the submission is team-visible, or a reviewer or admin.
 * (20261115140000, the peer check, widens this to the peers allowed to check
 * it.)
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
    ));
$$;

/**
 * The photos of one quest's latest submission, for someone allowed to see
 * them: {submission_id, revision, status, photos: [{id, path, width,
 * height}]}, or null without a submission or without the right to see it
 * (never a refusal, so the quest page just shows none). Staff who never ran
 * /start still read (reviewers).
 */
CREATE OR REPLACE FUNCTION public.shift_quest_evidence_list(p_actor text, p_instance uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
  v_sub public.shift_quest_submissions;
BEGIN
  SELECT * INTO v_sub FROM public.shift_quest_submissions
  WHERE instance_id = p_instance
  ORDER BY revision DESC
  LIMIT 1;
  IF NOT FOUND OR NOT public.shift_quest__evidence_viewer(v_member, v_sub) THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'submission_id', v_sub.id,
    'revision', v_sub.revision,
    'status', v_sub.status,
    'photos', public.shift_quest__evidence_of(v_sub.id)
  );
END;
$$;

/**
 * One submission for the web review page, reviewers and admins only
 * ('sq:not_authorized' otherwise, 'sq:not_found' for an unknown id):
 * {submission_id, instance_id, revision, status, is_latest, title, goal,
 * criteria, evidence, reflection, artifact_url, created_at, redacted,
 * photos}. No student name: the Discord card already carries it.
 */
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
    'photos', public.shift_quest__evidence_of(v_sub.id)
  );
END;
$$;

/**
 * For the bot's review card, reviewers and admins only: {instance_id,
 * photos} (how many photos the submission has). 'sq:not_found' for an
 * unknown id. (20261115140000 adds peer_checks.)
 */
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
    'photos', (SELECT count(*) FROM public.shift_quest_evidence_photos WHERE submission_id = p_submission)
  );
END;
$$;

/** The daily job: up to p_limit queued object paths, oldest first. */
CREATE OR REPLACE FUNCTION public.shift_quest_storage_trash_claim(p_limit integer)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(object_path ORDER BY queued_at, object_path), '{}'::text[])
  FROM (
    SELECT object_path, queued_at FROM public.shift_quest_storage_trash
    ORDER BY queued_at, object_path
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 0), 0), 1000)
  ) t;
$$;

/** The daily job: these objects are gone from Storage. Returns how many rows it cleared. */
CREATE OR REPLACE FUNCTION public.shift_quest_storage_trash_done(p_paths text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.shift_quest_storage_trash WHERE object_path = ANY (COALESCE(p_paths, '{}'::text[]));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- The team's problem, changed later
-- ---------------------------------------------------------------------------

/**
 * Changes a project's ambition (ปัญหาที่ทีมเลือก, the line planted with the
 * seed). Any active teammate of a project that is not archived; changing it
 * is normal: talking to real people sharpens it. Returns {ambition}.
 * Refusals: 'sq:not_found' (no such project, not the caller's, or archived),
 * 'sq:missing_text', 'sq:text_too_long' (500).
 */
CREATE OR REPLACE FUNCTION public.shift_quest_project_set_ambition(p_actor text, p_project uuid, p_ambition text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_text text := public.shift_quest__check_len(p_ambition, 500, true);
BEGIN
  IF p_project IS NULL OR NOT public.shift_quest__is_teammate(p_project, v_member.id) OR EXISTS (
    SELECT 1 FROM public.shift_quest_projects WHERE id = p_project AND archived_at IS NOT NULL
  ) THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  UPDATE public.shift_quest_projects
  SET ambition = v_text, updated_at = now()
  WHERE id = p_project AND ambition IS DISTINCT FROM v_text;
  PERFORM public.shift_quest__audit(v_member.id, 'project_ambition', 'project', p_project);
  RETURN jsonb_build_object('ambition', v_text);
END;
$$;

-- ---------------------------------------------------------------------------
-- Export and erasure (the bodies of 20261111095000_shift_quest_player plus photos)
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
    ), '[]'::jsonb)
  );
END;
$$;

/**
 * The body of 20261111095000 plus: the member's photos go (the trigger queues
 * each object for deletion from Storage).
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
END;
$$;

/** Island schema 14: photo evidence and the team's problem changed later. */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 14; $$;

-- ---------------------------------------------------------------------------
-- Privileges, per function
-- ---------------------------------------------------------------------------

-- Helpers: only the definer functions above (and the trigger) call them.
REVOKE ALL ON FUNCTION public.shift_quest__evidence_trash() FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest__evidence_json(public.shift_quest_evidence_photos)
  FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest__evidence_of(uuid) FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest__evidence_viewer(public.shift_quest_members, public.shift_quest_submissions)
  FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
-- __island_export and __island_erase keep their grants (none): CREATE OR REPLACE leaves them.

-- Website-only entry points: service_role for operators, never the bot.
REVOKE ALL ON FUNCTION public.shift_quest_evidence_add(text, uuid, integer, integer, integer) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_evidence_remove(text, uuid) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_evidence_list(text, uuid) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_review_view(text, uuid) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_storage_trash_claim(integer) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_storage_trash_done(text[]) FROM PUBLIC, anon, authenticated, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest_project_set_ambition(text, uuid, text) FROM PUBLIC, anon, authenticated, shift_quest_bot;
GRANT EXECUTE ON FUNCTION public.shift_quest_evidence_add(text, uuid, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_evidence_remove(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_evidence_list(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_review_view(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_storage_trash_claim(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_storage_trash_done(text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_project_set_ambition(text, uuid, text) TO service_role;

-- The bot's review card count: the bot's and service_role's, never the website's.
REVOKE ALL ON FUNCTION public.shift_quest_review_extras(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shift_quest_review_extras(text, uuid) TO shift_quest_bot, service_role;
-- The schema version keeps the grants it already has.

-- And the website's, where its role exists (made by 20261111090900_shift_quests_board).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    REVOKE ALL ON FUNCTION public.shift_quest__evidence_trash() FROM shift_quest_web;
    REVOKE ALL ON FUNCTION public.shift_quest__evidence_json(public.shift_quest_evidence_photos) FROM shift_quest_web;
    REVOKE ALL ON FUNCTION public.shift_quest__evidence_of(uuid) FROM shift_quest_web;
    REVOKE ALL ON FUNCTION public.shift_quest__evidence_viewer(public.shift_quest_members, public.shift_quest_submissions)
      FROM shift_quest_web;
    REVOKE ALL ON FUNCTION public.shift_quest_review_extras(text, uuid) FROM shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_evidence_add(text, uuid, integer, integer, integer) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_evidence_remove(text, uuid) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_evidence_list(text, uuid) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_review_view(text, uuid) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_storage_trash_claim(integer) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_storage_trash_done(text[]) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_project_set_ambition(text, uuid, text) TO shift_quest_web;
  END IF;
END;
$$;
