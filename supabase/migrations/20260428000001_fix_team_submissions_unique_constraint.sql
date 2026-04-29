-- The original UNIQUE(team_id, activity_id) only allows one submission per
-- team per activity, but activities can have multiple assessments (e.g. phase 1
-- final submission has 4 text_answer assessments).  Widen the constraint so
-- each assessment gets its own row.

-- Team submissions table
ALTER TABLE public.hackathon_phase_activity_team_submissions
  DROP CONSTRAINT IF EXISTS hackathon_phase_activity_team_submissions_team_id_activity_id_key,
  DROP CONSTRAINT IF EXISTS hackathon_phase_activity_team_submissions_team_id_activity_id_k;

ALTER TABLE public.hackathon_phase_activity_team_submissions
  ADD CONSTRAINT hackathon_team_sub_team_activity_assessment_uq
  UNIQUE (team_id, activity_id, assessment_id);

-- Individual submissions table: deduplicate before adding constraint
DELETE FROM public.hackathon_phase_activity_submissions a
USING public.hackathon_phase_activity_submissions b
WHERE a.participant_id = b.participant_id
  AND a.activity_id = b.activity_id
  AND a.assessment_id = b.assessment_id
  AND a.id < b.id;

ALTER TABLE public.hackathon_phase_activity_submissions
  DROP CONSTRAINT IF EXISTS hackathon_phase_activity_submissions_participant_id_activity_id_key,
  DROP CONSTRAINT IF EXISTS hackathon_phase_activity_submissions_participant_id_activity_id;

ALTER TABLE public.hackathon_phase_activity_submissions
  ADD CONSTRAINT hackathon_ind_sub_participant_activity_assessment_uq
  UNIQUE (participant_id, activity_id, assessment_id);
