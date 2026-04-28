-- Returns per-activity submission counts grouped by effective review status.
-- Combines individual + team submissions in one query with no row data transfer.
create or replace function get_hackathon_activity_submission_counts(activity_ids uuid[])
returns table (
  activity_id uuid,
  review_status text,
  cnt bigint
)
language sql
stable
security definer
as $$
  select
    s.activity_id,
    coalesce(
      r.review_status,
      case when s.status in ('submitted', 'pending_review') then 'pending_review' else s.status end
    ) as review_status,
    count(*) as cnt
  from hackathon_phase_activity_submissions s
  left join lateral (
    select review_status from hackathon_submission_reviews
    where individual_submission_id = s.id
    limit 1
  ) r on true
  where s.activity_id = any(activity_ids)
    and s.status <> 'draft'
  group by s.activity_id, 2

  union all

  select
    t.activity_id,
    coalesce(
      r.review_status,
      case when t.status in ('submitted', 'pending_review') then 'pending_review' else t.status end
    ) as review_status,
    count(*) as cnt
  from hackathon_phase_activity_team_submissions t
  left join lateral (
    select review_status from hackathon_submission_reviews
    where team_submission_id = t.id
    limit 1
  ) r on true
  where t.activity_id = any(activity_ids)
    and t.status <> 'draft'
  group by t.activity_id, 2;
$$;
