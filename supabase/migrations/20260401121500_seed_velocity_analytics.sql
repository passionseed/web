create or replace view public.analytics_seed_velocity_user_metrics as
with seed_progress as (
  select
    pe.user_id,
    count(*) as seeds_started,
    count(*) filter (where pe.status = 'explored') as seeds_completed,
    count(distinct s.category_id) filter (where s.category_id is not null) as categories_explored
  from public.path_enrollments pe
  join public.paths p
    on p.id = pe.path_id
  join public.seeds s
    on s.id = p.seed_id
  group by pe.user_id
),
direction_finder as (
  select
    ue.user_id,
    count(*) as direction_finder_views,
    min(ue.created_at) as first_direction_finder_view_at
  from public.user_events ue
  where ue.event_type = 'direction_finder_viewed'
  group by ue.user_id
),
completion_timeline as (
  select
    pe.user_id,
    pe.completed_at,
    row_number() over (
      partition by pe.user_id
      order by pe.completed_at asc, pe.id asc
    ) as completed_seed_count
  from public.path_enrollments pe
  where pe.status = 'explored'
    and pe.completed_at is not null
),
first_df_seed_count as (
  select
    df.user_id,
    coalesce(
      max(ct.completed_seed_count) filter (
        where ct.completed_at <= df.first_direction_finder_view_at
      ),
      0
    ) as seeds_completed_before_first_df_view
  from direction_finder df
  left join completion_timeline ct
    on ct.user_id = df.user_id
  group by df.user_id
)
select
  coalesce(sp.user_id, df.user_id) as user_id,
  coalesce(sp.seeds_started, 0) as seeds_started,
  coalesce(sp.seeds_completed, 0) as seeds_completed,
  coalesce(sp.categories_explored, 0) as categories_explored,
  coalesce(df.direction_finder_views, 0) as direction_finder_views,
  df.first_direction_finder_view_at,
  coalesce(fd.seeds_completed_before_first_df_view, 0) as seeds_completed_before_first_df_view,
  (coalesce(df.direction_finder_views, 0) > 0) as has_direction_finder_engaged,
  (coalesce(sp.seeds_completed, 0) >= 1) as milestone_1_completed,
  (coalesce(sp.seeds_completed, 0) >= 2) as milestone_2_completed,
  (coalesce(sp.seeds_completed, 0) >= 3) as milestone_3_completed,
  (coalesce(sp.seeds_completed, 0) >= 5) as milestone_5_completed,
  (
    coalesce(sp.seeds_completed, 0) >= 3
    and coalesce(df.direction_finder_views, 0) > 0
  ) as hypothesis_3_seeds_signal
from seed_progress sp
full outer join direction_finder df
  on df.user_id = sp.user_id
left join first_df_seed_count fd
  on fd.user_id = coalesce(sp.user_id, df.user_id);

comment on view public.analytics_seed_velocity_user_metrics is
  'Per-user seed velocity metrics and Direction Finder readiness.';

create or replace view public.analytics_seed_velocity_engagement_by_seed_count as
select
  seeds_completed,
  count(*) as users_at_seed_count,
  count(*) filter (where has_direction_finder_engaged) as engaged_users,
  round(
    count(*) filter (where has_direction_finder_engaged)::numeric / nullif(count(*), 0),
    4
  ) as direction_finder_engagement_rate
from public.analytics_seed_velocity_user_metrics
group by seeds_completed
order by seeds_completed;

comment on view public.analytics_seed_velocity_engagement_by_seed_count is
  'Direction Finder engagement rate by completed seed count.';

create or replace view public.analytics_seed_velocity_dashboard as
with engagement as (
  select *
  from public.analytics_seed_velocity_engagement_by_seed_count
),
aha as (
  select min(seeds_completed) as aha_seed_count
  from engagement
  where direction_finder_engagement_rate >= 0.5
)
select
  (
    select round(avg(seeds_completed_before_first_df_view)::numeric, 2)
    from public.analytics_seed_velocity_user_metrics
    where has_direction_finder_engaged
  ) as avg_seeds_to_first_direction_finder_view,
  coalesce(aha.aha_seed_count, 0) as aha_seed_count,
  coalesce(
    (
      select direction_finder_engagement_rate
      from engagement
      where seeds_completed = 3
    ),
    0
  ) as engagement_rate_at_3_seeds,
  (
    coalesce(
      (
        select direction_finder_engagement_rate
        from engagement
        where seeds_completed = 3
      ),
      0
    ) >= 0.5
  ) as hypothesis_3_seeds_is_meaningful_signal
from aha;

comment on view public.analytics_seed_velocity_dashboard is
  'Dashboard export for seed velocity, aha threshold, and the 3-seed hypothesis.';
