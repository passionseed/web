-- Lock down student data that the public anon key or any signed-in account could read or change.
-- Found by a read-only audit of production on 2026-11-22 (pg_policies + Supabase security advisor).
--
-- Everything here only removes access from the `anon` and `authenticated` roles.
-- Server code that uses the service-role client (lib/hackathon/db.ts, utils/supabase/admin.ts)
-- bypasses RLS and keeps working. Idempotent: safe to run twice.

begin;

-- ---------------------------------------------------------------------------
-- 1. Hackathon tables (hackathon ended June 2026; web reads them via service role).
--    The old ps_app mobile build read some of these with the anon key; it stops
--    seeing hackathon data, which is the point.
-- ---------------------------------------------------------------------------

-- Anyone with the anon key could read, edit and delete every team submission.
drop policy if exists allow_all_hackathon_team_submissions on public.hackathon_phase_activity_team_submissions;

-- Anyone could read every participant's inbox and rewrite messages (title, body, action_url).
drop policy if exists hackathon_inbox_items_anon_select on public.hackathon_participant_inbox_items;
drop policy if exists hackathon_inbox_items_authenticated_select on public.hackathon_participant_inbox_items;
drop policy if exists hackathon_inbox_items_anon_update on public.hackathon_participant_inbox_items;
drop policy if exists hackathon_inbox_items_authenticated_update on public.hackathon_participant_inbox_items;

-- Team rosters and lobby codes were public.
drop policy if exists anon_read_hackathon_team_members on public.hackathon_team_members;
drop policy if exists anon_read_hackathon_teams on public.hackathon_teams;
drop policy if exists allow_read_hackathon_team_enrollments on public.hackathon_team_program_enrollments;

-- Team reflections: public read and anonymous insert.
drop policy if exists "Allow public read access on team reflections" on public.hackathon_team_reflections;
drop policy if exists hackathon_team_reflections_insert on public.hackathon_team_reflections;

-- Click log carried participant names and was world-readable. Inserts stay.
drop policy if exists hackathon_journey_alien_clicks_anon_select on public.hackathon_journey_alien_clicks;
drop policy if exists hackathon_journey_alien_clicks_authenticated_select on public.hackathon_journey_alien_clicks;

-- Mentor guide progress: anyone could read it and insert rows for any participant.
drop policy if exists "Participants can read own completions" on public.mentor_guide_completions;
drop policy if exists "Participants can insert own completions" on public.mentor_guide_completions;
drop policy if exists "Participants can read own day progress" on public.mentor_guide_day_progress;
drop policy if exists "Participants can insert own day progress" on public.mentor_guide_day_progress;

-- Visitor fingerprints and user agents were readable by any signed-in account.
-- The anonymous insert used by /api/hackathon/track-view stays.
drop policy if exists "Authenticated users can view page views" on public.hackathon_page_views;

-- ---------------------------------------------------------------------------
-- 2. Analytics materialized views and the SECURITY DEFINER view bypass RLS.
--    Only the admin analytics route reads them, and it now uses the service role
--    after its admin check.
-- ---------------------------------------------------------------------------
revoke all on public.analytics_cohort_retention_weekly from anon, authenticated;
revoke all on public.analytics_complete_user_journey from anon, authenticated;
revoke all on public.analytics_daily_active_users from anon, authenticated;
revoke all on public.analytics_funnel_by_cohort from anon, authenticated;
revoke all on public.analytics_onboarding_funnel from anon, authenticated;
revoke all on public.analytics_session_duration from anon, authenticated;
revoke all on public.analytics_user_cohorts from anon, authenticated;
revoke all on public.analytics_weekly_active_users from anon, authenticated;
revoke all on public.analytics_weekly_report from anon, authenticated;
revoke all on public.analytics_retention_summary from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Classroom memberships: the insert policies only checked user_id, so any
--    signed-in user could add themselves to any classroom as 'instructor'
--    (is_classroom_instructor trusts that role), and an instructor could add
--    any other user without their consent.
--    Now: you can only insert yourself, as a student, or as instructor/ta of a
--    classroom you own (or if you are platform staff). This matches the two
--    app flows in lib/supabase/classrooms.ts (create classroom, join by code).
-- ---------------------------------------------------------------------------
drop policy if exists "Users can join classrooms" on public.classroom_memberships;
drop policy if exists manage_memberships_insert on public.classroom_memberships;
drop policy if exists classroom_memberships_insert_self on public.classroom_memberships;
create policy classroom_memberships_insert_self on public.classroom_memberships
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      role = 'student'
      or (
        role in ('instructor', 'ta')
        and (
          exists (
            select 1 from public.classrooms c
            where c.id = classroom_id and c.instructor_id = (select auth.uid())
          )
          or public.is_admin_or_instructor((select auth.uid()))
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. SECURITY DEFINER functions no client code calls (or only the service role
--    calls) but every signed-in user could run through /rest/v1/rpc.
--    get_student_progress_overview returned members' auth emails;
--    bulk_enroll_students force-enrolled anyone by email.
-- ---------------------------------------------------------------------------
revoke execute on function public.get_student_progress_overview(uuid) from public, anon, authenticated;
revoke execute on function public.bulk_enroll_students(uuid, text[]) from public, anon, authenticated;
revoke execute on function public.create_waitlist_entry(text, text, text) from public, anon, authenticated;
revoke execute on function public.get_waitlist_position(uuid) from public, anon, authenticated;
revoke execute on function public.get_waitlist_count() from public, anon, authenticated;
revoke execute on function public.get_hackathon_activity_submission_counts(uuid[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. expert_profiles: anyone could insert a row with any email and a claim
--    token of their choosing, and /api/expert-interview/claim then signed them
--    in as that email. Only /api/expert-interview/submit (service role)
--    creates these rows. The claim route no longer mints login links either.
-- ---------------------------------------------------------------------------
-- Admin approve/reject keep working through admins_manage_expert_profiles.
drop policy if exists public_insert_expert_profiles on public.expert_profiles;
revoke insert, update, delete, truncate on public.expert_profiles from anon;

-- ---------------------------------------------------------------------------
-- 6. get_my_profile(): your own full profile row. App code reads private
--    profile columns (date of birth, GPAX, school, push token...) through this,
--    so a follow-up migration can stop other users from selecting them.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.profiles where id = (select auth.uid());
$$;
revoke execute on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

commit;
