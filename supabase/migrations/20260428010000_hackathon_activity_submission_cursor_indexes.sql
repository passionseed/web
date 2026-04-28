-- Cursor pagination and review lookup indexes for admin activity submissions.
create index if not exists idx_hackathon_activity_submissions_activity_submitted_id
  on public.hackathon_phase_activity_submissions (activity_id, submitted_at desc, id desc)
  where status <> 'draft';

create index if not exists idx_hackathon_activity_team_submissions_activity_submitted_id
  on public.hackathon_phase_activity_team_submissions (activity_id, submitted_at desc, id desc)
  where status <> 'draft';

create index if not exists idx_hackathon_submission_reviews_individual_reviewed
  on public.hackathon_submission_reviews (individual_submission_id, reviewed_at desc)
  where individual_submission_id is not null;

create index if not exists idx_hackathon_submission_reviews_team_reviewed
  on public.hackathon_submission_reviews (team_submission_id, reviewed_at desc)
  where team_submission_id is not null;
