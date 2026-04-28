-- Move submissions from individual table to team table for team-scope activities.
-- Multiple team members may have submitted for the same activity — keep the latest.

-- Step 1: Insert deduplicated rows (latest per team+activity) into team table
insert into hackathon_phase_activity_team_submissions (
  team_id, activity_id, assessment_id, submitted_by,
  text_answer, image_url, file_urls, status,
  submitted_at, created_at, updated_at, revisions
)
select
  ranked.team_id,
  ranked.activity_id,
  ranked.assessment_id,
  ranked.submitted_by,
  ranked.text_answer,
  ranked.image_url,
  ranked.file_urls,
  ranked.status,
  ranked.submitted_at,
  ranked.created_at,
  ranked.updated_at,
  ranked.revisions
from (
  select
    tm.team_id,
    s.activity_id,
    s.assessment_id,
    s.participant_id as submitted_by,
    s.text_answer,
    s.image_url,
    s.file_urls,
    s.status,
    s.submitted_at,
    s.created_at,
    s.updated_at,
    s.revisions,
    row_number() over (
      partition by tm.team_id, s.activity_id
      order by s.submitted_at desc nulls last
    ) as rn
  from hackathon_phase_activity_submissions s
  join hackathon_phase_activities a on a.id = s.activity_id
  join hackathon_team_members tm on tm.participant_id = s.participant_id
  where a.submission_scope = 'team'
    and s.status <> 'draft'
) ranked
where ranked.rn = 1
on conflict (team_id, activity_id) do update set
  text_answer = excluded.text_answer,
  image_url = excluded.image_url,
  file_urls = excluded.file_urls,
  status = excluded.status,
  submitted_at = excluded.submitted_at,
  updated_at = excluded.updated_at,
  revisions = excluded.revisions,
  submitted_by = excluded.submitted_by;

-- Step 2: Delete the misplaced rows from individual table
delete from hackathon_phase_activity_submissions s
using hackathon_phase_activities a
where a.id = s.activity_id
  and a.submission_scope = 'team'
  and s.status <> 'draft';
