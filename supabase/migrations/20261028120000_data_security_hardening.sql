-- Data security hardening.
--
-- Closes database paths that let a signed-out visitor (anon key) or any
-- signed-in account read or change data it does not own. Every statement is
-- idempotent. Tables still read directly by the mobile app with the anon key
-- (hackathon team submissions, team members, mentor guides) are left for a
-- follow-up that moves those calls behind API routes.

-- ---------------------------------------------------------------------------
-- 1. career_survival: RLS was off, so anon could update, delete or truncate.
--    Reads stay public; writes go through the service role and the
--    get_career_survival() SECURITY DEFINER function.
-- ---------------------------------------------------------------------------
alter table public.career_survival enable row level security;
alter table public.career_survival_unmatched enable row level security;

revoke insert, update, delete, truncate, references, trigger
  on public.career_survival from anon, authenticated;
revoke all on public.career_survival_unmatched from anon, authenticated;

drop policy if exists "career_survival_public_read" on public.career_survival;
create policy "career_survival_public_read" on public.career_survival
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2. Personal data readable or writable by anyone.
-- ---------------------------------------------------------------------------

-- Beta sign-up funnel (names, emails): server actions and the admin page use
-- the service role, so no client policy is needed.
drop policy if exists "Allow insert to funnel" on public.beta_registration_funnel;
drop policy if exists "Allow select from funnel" on public.beta_registration_funnel;
drop policy if exists "Allow update to funnel" on public.beta_registration_funnel;

-- Student plans are served by share token through the service role only.
drop policy if exists "student_plans_public_read" on public.student_plans;

-- Hackathon reviews (scores and feedback on students' work): only server
-- routes using the service role read or write them.
drop policy if exists "hackathon_submission_reviews_anon_insert" on public.hackathon_submission_reviews;
drop policy if exists "hackathon_submission_reviews_anon_select" on public.hackathon_submission_reviews;
drop policy if exists "hackathon_submission_reviews_anon_update" on public.hackathon_submission_reviews;
drop policy if exists "hackathon_submission_reviews_authenticated_insert" on public.hackathon_submission_reviews;
drop policy if exists "hackathon_submission_reviews_authenticated_select" on public.hackathon_submission_reviews;
drop policy if exists "hackathon_submission_reviews_authenticated_update" on public.hackathon_submission_reviews;

-- Team finder preferences: server-side service role only.
drop policy if exists "anon_read_hackathon_team_finder" on public.hackathon_team_finder;

-- Participant inbox: the mobile app only marks items read. Without this,
-- anyone could rewrite the title and body of a message shown to a student.
revoke update on public.hackathon_participant_inbox_items from anon, authenticated;
grant update (read_at) on public.hackathon_participant_inbox_items to anon, authenticated;

-- Team reflections: the mobile app reads and inserts. Stop anyone from
-- editing or deleting other teams' reflections.
drop policy if exists "Allow all operations for team reflections" on public.hackathon_team_reflections;
drop policy if exists "hackathon_team_reflections_insert" on public.hackathon_team_reflections;
create policy "hackathon_team_reflections_insert" on public.hackathon_team_reflections
  for insert to anon, authenticated with check (true);

-- Signed-in anonymous sessions need no access to other people's profiles.
-- Anonymous sign-in is open to anyone, so without this the email, birth date
-- and school of every profile were one API call away.
drop policy if exists "profiles_anonymous_own_row_only" on public.profiles;
create policy "profiles_anonymous_own_row_only" on public.profiles
  as restrictive for select to authenticated
  using (
    coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    or id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 3. Shared reference data that any signed-in account could rewrite.
-- ---------------------------------------------------------------------------
drop policy if exists "Service role can update jobs" on public.direction_finder_jobs;

drop policy if exists "Allow authenticated users to delete jobs" on public.jobs;
drop policy if exists "Allow authenticated users to insert jobs" on public.jobs;
drop policy if exists "Allow authenticated users to update jobs" on public.jobs;
drop policy if exists "jobs_admin_write" on public.jobs;
create policy "jobs_admin_write" on public.jobs
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Only system can insert job listings" on public.job_listings;
drop policy if exists "Authenticated users can insert job listings" on public.job_listings;

drop policy if exists "Allow authenticated users to delete program_career_mappings" on public.program_career_mappings;
drop policy if exists "Allow authenticated users to insert program_career_mappings" on public.program_career_mappings;
drop policy if exists "Allow authenticated users to update program_career_mappings" on public.program_career_mappings;
drop policy if exists "program_career_mappings_admin_write" on public.program_career_mappings;
create policy "program_career_mappings_admin_write" on public.program_career_mappings
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can manage universities" on public.universities;
drop policy if exists "Admins can update universities" on public.universities;
drop policy if exists "Admins can delete universities" on public.universities;
drop policy if exists "universities_admin_write" on public.universities;
create policy "universities_admin_write" on public.universities
  for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "Authenticated users can manage seed categories (dev)" on public.seed_categories;
drop policy if exists "seed_categories_staff_write" on public.seed_categories;
create policy "seed_categories_staff_write" on public.seed_categories
  for all to authenticated
  using (public.is_admin_or_instructor(auth.uid()))
  with check (public.is_admin_or_instructor(auth.uid()));

drop policy if exists "Allow public update access" on public.angpao_countdown;

-- Team progress is written by the SECURITY DEFINER trigger, which bypasses
-- RLS; this policy only let clients forge progress rows.
drop policy if exists "Allow database triggers to insert team progress" on public.team_node_progress;

-- ---------------------------------------------------------------------------
-- 4. delete_learning_map_cascade: SECURITY DEFINER with no caller check, so
--    anyone could delete any map and every student's progress on it.
-- ---------------------------------------------------------------------------
create or replace function public.delete_learning_map_cascade(map_uuid uuid)
returns json
language plpgsql
security definer
set search_path = public
as $function$
DECLARE
    deleted_counts JSON;
    node_ids UUID[];
    assessment_ids UUID[];
    submission_ids UUID[];
    group_ids UUID[];
BEGIN
    IF coalesce(auth.role(), '') <> 'service_role'
       AND NOT public.is_admin(auth.uid())
       AND NOT EXISTS (
           SELECT 1 FROM learning_maps WHERE id = map_uuid AND creator_id = auth.uid()
       )
       AND NOT EXISTS (
           -- Only the owning classroom's staff, and only for its exclusive maps:
           -- any instructor can link any map to their classroom.
           SELECT 1 FROM learning_maps lm
           JOIN classroom_memberships cm ON cm.classroom_id = lm.parent_classroom_id
           WHERE lm.id = map_uuid
             AND lm.map_type = 'classroom_exclusive'
             AND cm.user_id = auth.uid()
             AND cm.role IN ('instructor', 'ta')
       )
    THEN
        RETURN json_build_object('success', false, 'error', 'not allowed', 'error_code', '42501');
    END IF;

    SELECT ARRAY(SELECT id FROM map_nodes WHERE map_id = map_uuid) INTO node_ids;
    SELECT ARRAY(SELECT id FROM node_assessments WHERE node_id = ANY(node_ids)) INTO assessment_ids;
    SELECT ARRAY(SELECT id FROM assessment_submissions WHERE assessment_id = ANY(assessment_ids)) INTO submission_ids;
    SELECT ARRAY(SELECT id FROM assessment_groups WHERE assessment_id = ANY(assessment_ids)) INTO group_ids;

    DELETE FROM assessment_group_members WHERE group_id = ANY(group_ids);
    DELETE FROM submission_grades WHERE submission_id = ANY(submission_ids);
    DELETE FROM assessment_submissions WHERE id = ANY(submission_ids);
    DELETE FROM assessment_groups WHERE id = ANY(group_ids);
    DELETE FROM quiz_questions WHERE assessment_id = ANY(assessment_ids);
    DELETE FROM node_assessments WHERE id = ANY(assessment_ids);
    DELETE FROM node_submissions WHERE node_id = ANY(node_ids);
    DELETE FROM student_node_progress WHERE node_id = ANY(node_ids);
    DELETE FROM node_content WHERE node_id = ANY(node_ids);
    DELETE FROM node_paths WHERE source_node_id = ANY(node_ids) OR destination_node_id = ANY(node_ids);
    DELETE FROM map_nodes WHERE id = ANY(node_ids);
    DELETE FROM classroom_map_features WHERE map_id = map_uuid;
    DELETE FROM classroom_maps WHERE map_id = map_uuid;
    DELETE FROM user_map_enrollments WHERE map_id = map_uuid;
    DELETE FROM cohort_map_enrollments WHERE map_id = map_uuid;
    DELETE FROM learning_maps WHERE id = map_uuid;

    SELECT json_build_object(
        'success', true,
        'deleted_map_id', map_uuid,
        'node_count', array_length(node_ids, 1),
        'assessment_count', array_length(assessment_ids, 1)
    ) INTO deleted_counts;

    RETURN deleted_counts;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM, 'error_code', SQLSTATE);
END;
$function$;

-- The revision trigger reads hackathon_submission_reviews, whose client
-- policies are dropped above. Run it as owner so mobile resubmissions still
-- snapshot the prior review.
create or replace function public.hackathon_archive_submission_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
DECLARE
  _has_old_content boolean;
  _is_content_change boolean;
  _review record;
  _review_json jsonb;
  _snapshot jsonb;
  _n int;
BEGIN
  _has_old_content := (
    (OLD.text_answer IS NOT NULL AND OLD.text_answer <> '') OR
    OLD.image_url IS NOT NULL OR
    (OLD.file_urls IS NOT NULL AND array_length(OLD.file_urls, 1) > 0)
  );

  IF NOT _has_old_content THEN
    RETURN NEW;
  END IF;

  _is_content_change := (
    OLD.text_answer IS DISTINCT FROM NEW.text_answer OR
    OLD.image_url IS DISTINCT FROM NEW.image_url OR
    OLD.file_urls IS DISTINCT FROM NEW.file_urls
  );

  IF NOT _is_content_change THEN
    RETURN NEW;
  END IF;

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

  IF jsonb_array_length(COALESCE(NEW.revisions, '[]'::jsonb)) > jsonb_array_length(COALESCE(OLD.revisions, '[]'::jsonb)) THEN
    RETURN NEW;
  END IF;

  NEW.revisions := COALESCE(OLD.revisions, '[]'::jsonb) || _snapshot;

  RETURN NEW;
END;
$function$;

-- team_node_progress: "auth.uid() IS NULL" was meant for triggers but also
-- matches every signed-out anon request. The progress trigger is SECURITY
-- DEFINER and bypasses RLS, so drop that branch.
drop policy if exists "Team leaders can update assignments" on public.team_node_progress;
create policy "Team leaders can update assignments" on public.team_node_progress
  for update to authenticated
  using (team_id in (
    select team_id from public.team_memberships
    where user_id = auth.uid() and is_leader = true and left_at is null
  ));

drop policy if exists "Team members can update help requests" on public.team_node_progress;
create policy "Team members can update help requests" on public.team_node_progress
  for update to authenticated
  using (team_id in (
    select team_id from public.team_memberships
    where user_id = auth.uid() and left_at is null
  ));

-- Same null-UID hole; the FOR ALL instructor policy below already covers comments.
drop policy if exists "Instructors can add comments to team progress" on public.team_node_progress;

drop policy if exists "Instructors can manage all team progress" on public.team_node_progress;
create policy "Instructors can manage all team progress" on public.team_node_progress
  for all to authenticated
  using (exists (
    select 1 from public.classroom_teams ct
    join public.classroom_memberships cm on cm.classroom_id = ct.classroom_id
    where ct.id = team_node_progress.team_id
      and cm.user_id = auth.uid()
      and cm.role in ('instructor', 'ta')
  ));

-- These SECURITY DEFINER functions took any user id from the caller. Both web
-- callers pass the signed-in user's own id.
create or replace function public.get_or_create_user_settings(request_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
    settings_record record;
begin
    if coalesce(auth.role(), '') <> 'service_role' and request_user_id is distinct from auth.uid() then
        raise exception 'not allowed' using errcode = '42501';
    end if;

    insert into public.user_settings (user_id)
    values (request_user_id)
    on conflict (user_id) do nothing;

    select * into settings_record from public.user_settings where user_id = request_user_id;
    return row_to_json(settings_record);
end;
$function$;

create or replace function public.award_badge_to_user(
    p_user_id uuid,
    p_seed_id uuid,
    p_room_id uuid,
    p_completion_id uuid,
    p_badge_data jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
DECLARE
    v_badge_id UUID;
BEGIN
    IF coalesce(auth.role(), '') <> 'service_role' AND p_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
    END IF;

    INSERT INTO user_badges (
        user_id,
        seed_id,
        seed_badge_id,
        badge_data,
        room_id,
        completion_id
    )
    VALUES (
        p_user_id,
        p_seed_id,
        (SELECT id FROM seed_badges WHERE seed_id = p_seed_id),
        p_badge_data,
        p_room_id,
        p_completion_id
    )
    ON CONFLICT (user_id, seed_id) DO UPDATE
    SET badge_data = EXCLUDED.badge_data
    RETURNING id INTO v_badge_id;

    RETURN v_badge_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. SECURITY DEFINER functions callable through /rest/v1/rpc.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  sig text;
  -- Maintenance and data-dump functions with no caller check: service role only.
  service_only text[] := array[
    'public.get_beta_submission_by_code(text)',
    'public.get_admin_maps_optimized(integer, integer)',
    'public.get_orphaned_image_keys(integer)',
    'public.fix_group_submissions(uuid)',
    'public.simple_fix_group_submissions(uuid)',
    'public.debug_group_submissions(uuid)',
    -- Direction-finder cache: returns other users' results; only the server action calls it.
    'public.find_cached_direction_result(jsonb, text)',
    'public.increment_cache_hit_count(uuid)'
  ];
  -- Signed-in features: keep for authenticated, remove for signed-out callers.
  signed_in_only text[] := array[
    'public.archive_old_assignments(integer)',
    'public.auto_enroll_classroom_members(uuid)',
    'public.award_badge_to_user(uuid, uuid, uuid, uuid, jsonb)',
    'public.bulk_enroll_students(uuid, text[])',
    'public.create_assessment_groups_shuffle(uuid, integer, boolean)',
    'public.create_assignment_from_map(uuid, uuid, text, text, uuid[], boolean)',
    'public.create_classroom_exclusive_map(uuid, text, text)',
    'public.delete_learning_map_cascade(uuid)',
    'public.get_or_create_seed_room_assessment_group(uuid, uuid)',
    'public.get_or_create_user_settings(uuid)',
    'public.link_map_to_classroom(uuid, uuid, text)',
    'public.reorder_classroom_maps(uuid, json)',
    'public.unlink_map_from_classroom(uuid, uuid)',
    'public.update_classroom_map_feature(uuid, text, jsonb, boolean)',
    'public.update_journey_projects_positions(jsonb)',
    'public.update_project_milestones_positions(jsonb)',
    'public.calculate_assignment_completion(uuid)',
    'public.get_assessment_groups(uuid)',
    'public.get_classroom_analytics(uuid)',
    'public.get_classroom_available_nodes(uuid)',
    'public.get_classroom_exclusive_maps(uuid)',
    'public.get_classroom_maps(uuid)',
    'public.get_classroom_stats(uuid)',
    'public.get_hackathon_activity_submission_counts(uuid[])',
    'public.get_journey_overview(uuid)',
    'public.get_project_stats(uuid)',
    'public.get_student_progress_overview(uuid)',
    'public.get_team_map_progress(uuid)',
    'public.get_user_assessment_group_ids(uuid)',
    'public.get_user_seed_percentile(uuid, uuid)',
    'public.get_user_seed_total_points(uuid, uuid)',
    'public.get_waitlist_position(uuid)',
    'public.join_lobby_by_code(text)',
    'public.is_community_admin(uuid, uuid)',
    'public.is_community_member(uuid, uuid)'
  ];
  -- Trigger functions never need to be called directly.
  trigger_only text[] := array[
    'public.assign_group_assignment_to_members()',
    'public.auto_complete_empty_seed_room()',
    'public.enroll_new_group_member_in_assignments()',
    'public.handle_auto_enroll_new_student()',
    'public.handle_group_submission()',
    'public.handle_new_user()',
    'public.increment_gallery_match_count()',
    'public.sync_assignment_progress()',
    'public.techseed_apply_referral()',
    'public.update_comment_engagement_score()',
    'public.update_progress_on_grade()',
    'public.update_team_progress_from_individual()',
    'public.hackathon_archive_submission_revision()'
  ];
BEGIN
  FOREACH sig IN ARRAY service_only || trigger_only LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('revoke execute on function %s from public, anon, authenticated', sig);
      EXECUTE format('grant execute on function %s to service_role', sig);
    END IF;
  END LOOP;

  FOREACH sig IN ARRAY signed_in_only LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('revoke execute on function %s from public, anon', sig);
      EXECUTE format('grant execute on function %s to authenticated, service_role', sig);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Analytics views and materialized views: admin dashboards read them
--    signed in; signed-out callers have no reason to.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rel record;
BEGIN
  FOR rel IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('v', 'm')
      AND c.relname LIKE 'analytics\_%'
  LOOP
    EXECUTE format('revoke all on public.%I from anon', rel.relname);
  END LOOP;
END $$;
