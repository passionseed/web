-- Auto-archive old submission content into the revisions jsonb array
-- whenever a row is updated with new content. Works for both direct
-- Supabase client writes (mobile app) and the API route.
--
-- The trigger fires BEFORE UPDATE. If the old row had meaningful content
-- and the new row is changing that content, it snapshots the old state
-- (including its review, if any) into NEW.revisions before the write lands.

CREATE OR REPLACE FUNCTION public.hackathon_archive_submission_revision()
RETURNS trigger AS $$
DECLARE
  _has_old_content boolean;
  _is_content_change boolean;
  _review record;
  _review_json jsonb;
  _snapshot jsonb;
  _n int;
BEGIN
  -- Only archive when the row had real content
  _has_old_content := (
    (OLD.text_answer IS NOT NULL AND OLD.text_answer <> '') OR
    OLD.image_url IS NOT NULL OR
    (OLD.file_urls IS NOT NULL AND array_length(OLD.file_urls, 1) > 0)
  );

  IF NOT _has_old_content THEN
    RETURN NEW;
  END IF;

  -- Only archive when content is actually changing
  _is_content_change := (
    OLD.text_answer IS DISTINCT FROM NEW.text_answer OR
    OLD.image_url IS DISTINCT FROM NEW.image_url OR
    OLD.file_urls IS DISTINCT FROM NEW.file_urls
  );

  IF NOT _is_content_change THEN
    RETURN NEW;
  END IF;

  -- Look up the current review for this submission
  _review_json := null;
  IF TG_TABLE_NAME = 'hackathon_phase_activity_submissions' THEN
    SELECT row_to_json(r.*) INTO _review
    FROM public.hackathon_submission_reviews r
    WHERE r.individual_submission_id = OLD.id
    LIMIT 1;
  ELSE
    SELECT row_to_json(r.*) INTO _review
    FROM public.hackathon_submission_reviews r
    WHERE r.team_submission_id = OLD.id
    LIMIT 1;
  END IF;

  IF _review IS NOT NULL THEN
    _review_json := jsonb_build_object(
      'status', (_review.row_to_json->>'review_status'),
      'score_awarded', (_review.row_to_json->>'score_awarded')::numeric,
      'points_possible', (_review.row_to_json->>'points_possible')::numeric,
      'feedback', COALESCE(_review.row_to_json->>'feedback', ''),
      'reasoning', null,
      'reviewed_by', (_review.row_to_json->>'reviewed_by_user_id'),
      'reviewed_at', (_review.row_to_json->>'reviewed_at')
    );
  END IF;

  _n := COALESCE(jsonb_array_length(OLD.revisions), 0) + 1;

  _snapshot := jsonb_build_object(
    'n', _n,
    'text_answer', OLD.text_answer,
    'image_url', OLD.image_url,
    'file_urls', to_jsonb(OLD.file_urls),
    'submitted_at', OLD.submitted_at,
    'review', _review_json
  );

  -- If the caller already computed revisions (API route), don't double-archive.
  -- Detect this: if NEW.revisions already has more entries than OLD.revisions,
  -- the caller handled it.
  IF jsonb_array_length(COALESCE(NEW.revisions, '[]'::jsonb)) > jsonb_array_length(COALESCE(OLD.revisions, '[]'::jsonb)) THEN
    RETURN NEW;
  END IF;

  NEW.revisions := COALESCE(OLD.revisions, '[]'::jsonb) || _snapshot;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Individual submissions
DROP TRIGGER IF EXISTS hackathon_archive_individual_revision
  ON public.hackathon_phase_activity_submissions;

CREATE TRIGGER hackathon_archive_individual_revision
  BEFORE UPDATE ON public.hackathon_phase_activity_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.hackathon_archive_submission_revision();

-- Team submissions
DROP TRIGGER IF EXISTS hackathon_archive_team_revision
  ON public.hackathon_phase_activity_team_submissions;

CREATE TRIGGER hackathon_archive_team_revision
  BEFORE UPDATE ON public.hackathon_phase_activity_team_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.hackathon_archive_submission_revision();
