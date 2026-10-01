-- Harden purge_user_account_data authorization (follow-up to
-- 20260930000000_restrict_account_purge_rpc.sql).
-- The old check (auth.uid() IS NOT NULL AND ...) failed open: anon requests
-- carry no uid, skipped the check, and could purge any account. EXECUTE is now
-- restricted to service_role; this makes the body fail closed too, so a
-- future re-grant cannot silently reopen the hole.

CREATE OR REPLACE FUNCTION public.purge_user_account_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int := 0;
  v_table text;
  v_sql text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id required';
  END IF;

  -- Only service_role (request JWT role claim) or the user themselves.
  -- A NULL auth.uid() alone proves nothing: anon requests have no uid.
  IF COALESCE(auth.role(), '') IS DISTINCT FROM 'service_role'
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not authorized to purge this account';
  END IF;

  -- --- Attribution: null out (shared content stays) -------------------------
  UPDATE public.learning_maps SET creator_id = NULL WHERE creator_id = p_user_id;
  UPDATE public.seeds SET created_by = NULL WHERE created_by = p_user_id;
  UPDATE public.paths SET created_by = NULL WHERE created_by = p_user_id;
  UPDATE public.path_reports SET generated_by = NULL WHERE generated_by = p_user_id;

  IF to_regclass('public.path_assessment_submissions') IS NOT NULL THEN
    EXECUTE 'UPDATE public.path_assessment_submissions SET scored_by = NULL WHERE scored_by = $1'
      USING p_user_id;
  END IF;

  IF to_regclass('public.radar_drafts') IS NOT NULL THEN
    EXECUTE 'UPDATE public.radar_drafts SET updated_by = NULL WHERE updated_by = $1'
      USING p_user_id;
  END IF;

  IF to_regclass('public.submission_grades') IS NOT NULL THEN
    EXECUTE 'UPDATE public.submission_grades SET graded_by = NULL WHERE graded_by = $1'
      USING p_user_id;
  END IF;

  IF to_regclass('public.map_nodes') IS NOT NULL THEN
    BEGIN
      EXECUTE 'UPDATE public.map_nodes SET last_modified_by = NULL WHERE last_modified_by = $1'
        USING p_user_id;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
  END IF;

  IF to_regclass('public.learning_maps') IS NOT NULL THEN
    BEGIN
      EXECUTE 'UPDATE public.learning_maps SET last_modified_by = NULL WHERE last_modified_by = $1'
        USING p_user_id;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
  END IF;

  -- Expert profile is PII — hard delete (not just SET NULL user_id)
  IF to_regclass('public.expert_profiles') IS NOT NULL THEN
    DELETE FROM public.expert_profiles WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  END IF;

  -- --- Hosted seed rooms (host_id NOT NULL) ---------------------------------
  IF to_regclass('public.seed_rooms') IS NOT NULL THEN
    DELETE FROM public.seed_rooms WHERE host_id = p_user_id;
  END IF;
  IF to_regclass('public.seed_room_members') IS NOT NULL THEN
    DELETE FROM public.seed_room_members WHERE user_id = p_user_id;
  END IF;

  -- --- PathLab personal tree (progress cascades from enrollments) ----------
  DELETE FROM public.path_enrollments WHERE user_id = p_user_id;

  -- --- Tables keyed by user_id / profile id (best-effort) ------------------
  FOREACH v_table IN ARRAY ARRAY[
    'build_todos',
    'score_events',
    'node_leaderboard',
    'user_roles',
    'classroom_memberships',
    'team_memberships',
    'chat_messages',
    'student_node_progress',
    'user_map_enrollments',
    'user_settings',
    'public_profiles',
    'user_events',
    'ai_chat_usage',
    'support_messages',
    'north_stars',
    'radar_reflections',
    'career_comparisons',
    'saved_programs',
    'admission_plans',
    'seed_recommendation_snapshots',
    'profile_guardian_consents',
    'lobby_members',
    'assessment_group_members',
    'map_editors',
    'pre_questionnaires',
    'direction_finder_jobs',
    'song_of_the_day'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      CONTINUE;
    END IF;

    -- Prefer user_id column; fall back to id for profiles-shaped tables
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'user_id'
    ) THEN
      v_sql := format('DELETE FROM public.%I WHERE user_id = $1', v_table);
      EXECUTE v_sql USING p_user_id;
    END IF;
  END LOOP;

  -- Journey / my_path (CASCADE children usually hang off parent)
  IF to_regclass('public.my_paths') IS NOT NULL THEN
    DELETE FROM public.my_paths WHERE user_id = p_user_id;
  END IF;

  IF to_regclass('public.student_journeys') IS NOT NULL THEN
    DELETE FROM public.student_journeys WHERE student_id = p_user_id;
  END IF;

  IF to_regclass('public.reflections') IS NOT NULL THEN
    BEGIN
      DELETE FROM public.reflections WHERE user_id = p_user_id;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
  END IF;

  -- Assignment groups created by user (blocks profile delete)
  IF to_regclass('public.assignment_groups') IS NOT NULL THEN
    DELETE FROM public.assignment_groups WHERE created_by = p_user_id;
  END IF;

  IF to_regclass('public.assessment_groups') IS NOT NULL THEN
    BEGIN
      DELETE FROM public.assessment_groups WHERE created_by = p_user_id;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
  END IF;

  -- Lobby creator attribution already SET NULL on profile delete; members wiped above
  IF to_regclass('public.map_lobbies') IS NOT NULL THEN
    BEGIN
      UPDATE public.map_lobbies SET created_by = NULL WHERE created_by = p_user_id;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
  END IF;

  -- Activity / page templates owned by user
  IF to_regclass('public.activity_templates') IS NOT NULL THEN
    DELETE FROM public.activity_templates WHERE created_by = p_user_id;
  END IF;
  IF to_regclass('public.page_templates') IS NOT NULL THEN
    DELETE FROM public.page_templates WHERE created_by = p_user_id;
  END IF;

  -- ps_* admin leftovers that NO ACTION-block
  IF to_regclass('public.ps_requests') IS NOT NULL THEN
    DELETE FROM public.ps_requests WHERE created_by = p_user_id;
  END IF;

  IF to_regclass('public.mentor_bookings') IS NOT NULL THEN
    UPDATE public.mentor_bookings SET student_id = NULL WHERE student_id = p_user_id;
  END IF;

  -- Profile last (dependents should be gone)
  DELETE FROM public.profiles WHERE id = p_user_id;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'profile row still present after purge for %', p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', p_user_id
  );
END;
$$;
