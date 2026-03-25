-- Allow anon to look up a beta submission by the last 4 hex chars of its UUID.
-- We expose a security-definer function so we never need to relax RLS on the tables.

CREATE OR REPLACE FUNCTION public.get_beta_submission_by_code(p_code text)
RETURNS TABLE (
  field_label text,
  answer_text text,
  order_index integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form_token uuid := '2d1a7a73-e3dd-4c5a-b0d5-1b7f5a5c2e11';
  v_submission_id uuid;
BEGIN
  -- Normalise to uppercase
  p_code := upper(p_code);

  -- Find the submission in the beta form whose UUID ends with the 4-char code
  SELECT s.id INTO v_submission_id
  FROM ps_submissions s
  JOIN ps_feedback_forms f ON f.id = s.form_id
  WHERE f.token = v_form_token
    AND upper(right(replace(s.id::text, '-', ''), 4)) = p_code
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_submission_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ff.label::text,
    sa.answer_text::text,
    ff.order_index::integer
  FROM ps_submission_answers sa
  JOIN ps_form_fields ff ON ff.id = sa.field_id
  WHERE sa.submission_id = v_submission_id
    AND sa.answer_text IS NOT NULL
    AND sa.answer_text <> ''
  ORDER BY ff.order_index;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_beta_submission_by_code(text) TO anon, authenticated;
