-- The original UNIQUE(team_id, activity_id) only allows one submission per
-- team per activity, but activities can have multiple assessments (e.g. phase 1
-- final submission has 4 text_answer assessments).  Widen the constraint so
-- each assessment gets its own row.

ALTER TABLE public.hackathon_phase_activity_team_submissions
  DROP CONSTRAINT IF EXISTS hackathon_phase_activity_team_submissions_team_id_activity_id_key;

ALTER TABLE public.hackathon_phase_activity_team_submissions
  ADD CONSTRAINT hackathon_phase_activity_team_submissions_team_activity_assessment_key
  UNIQUE (team_id, activity_id, assessment_id);
