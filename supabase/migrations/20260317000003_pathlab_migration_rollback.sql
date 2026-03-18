-- =====================================================
-- PATHLAB MIGRATION ROLLBACK FUNCTION
-- Reverts path_activities migration back to node_ids
-- Safely removes migrated data while preserving originals
-- =====================================================

CREATE OR REPLACE FUNCTION rollback_pathlab_migration()
RETURNS TABLE (
  path_day_id UUID,
  activities_deleted INT,
  content_deleted INT,
  assessments_deleted INT,
  quiz_questions_deleted INT,
  status TEXT,
  error_message TEXT
) AS $$
DECLARE
  day_record RECORD;
  activities_count INT := 0;
  content_count INT := 0;
  assessment_count INT := 0;
  quiz_count INT := 0;
BEGIN
  -- Loop through all migrated path_days
  FOR day_record IN
    SELECT * FROM public.path_days
    WHERE migrated_from_nodes = true
    ORDER BY path_id, day_number
  LOOP
    -- Reset counters
    activities_count := 0;
    content_count := 0;
    assessment_count := 0;
    quiz_count := 0;

    BEGIN
      -- Count quiz questions before deletion
      SELECT COUNT(*)::INT INTO quiz_count
      FROM public.path_quiz_questions pqq
      JOIN public.path_assessments pa ON pa.id = pqq.assessment_id
      JOIN public.path_activities pact ON pact.id = pa.activity_id
      WHERE pact.path_day_id = day_record.id;

      -- Delete quiz questions (must be first due to FK constraints)
      DELETE FROM public.path_quiz_questions
      WHERE assessment_id IN (
        SELECT pa.id FROM public.path_assessments pa
        JOIN public.path_activities pact ON pact.id = pa.activity_id
        WHERE pact.path_day_id = day_record.id
      );

      -- Count and delete assessments
      SELECT COUNT(*)::INT INTO assessment_count
      FROM public.path_assessments pa
      JOIN public.path_activities pact ON pact.id = pa.activity_id
      WHERE pact.path_day_id = day_record.id;

      DELETE FROM public.path_assessments
      WHERE activity_id IN (
        SELECT id FROM public.path_activities
        WHERE path_day_id = day_record.id
      );

      -- Count and delete content
      SELECT COUNT(*)::INT INTO content_count
      FROM public.path_content pc
      WHERE pc.activity_id IN (
        SELECT id FROM public.path_activities
        WHERE path_day_id = day_record.id
      );

      DELETE FROM public.path_content
      WHERE activity_id IN (
        SELECT id FROM public.path_activities
        WHERE path_day_id = day_record.id
      );

      -- Count and delete activities
      SELECT COUNT(*)::INT INTO activities_count
      FROM public.path_activities
      WHERE path_day_id = day_record.id;

      DELETE FROM public.path_activities
      WHERE path_day_id = day_record.id;

      -- Reset migration flags
      UPDATE public.path_days
      SET
        migrated_from_nodes = false,
        migration_completed_at = NULL
      WHERE id = day_record.id;

      -- Return stats
      path_day_id := day_record.id;
      activities_deleted := activities_count;
      content_deleted := content_count;
      assessments_deleted := assessment_count;
      quiz_questions_deleted := quiz_count;
      status := 'rolled_back';
      error_message := NULL;

      RETURN NEXT;

    EXCEPTION
      WHEN OTHERS THEN
        -- Catch any errors and return them
        path_day_id := day_record.id;
        activities_deleted := activities_count;
        content_deleted := content_count;
        assessments_deleted := assessment_count;
        quiz_questions_deleted := quiz_count;
        status := 'error';
        error_message := SQLERRM;

        RETURN NEXT;

        -- Continue to next day
        CONTINUE;
    END;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rollback_pathlab_migration IS 'Rolls back PathLab migration by deleting path_activities and resetting migration flags. Original node_ids are preserved.';

-- =====================================================
-- ROLLBACK HELPER FUNCTIONS
-- =====================================================

-- Function to rollback a single path
CREATE OR REPLACE FUNCTION rollback_single_path(p_path_id UUID)
RETURNS TABLE (
  path_day_id UUID,
  activities_deleted INT,
  content_deleted INT,
  assessments_deleted INT,
  quiz_questions_deleted INT,
  status TEXT,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM rollback_pathlab_migration()
  WHERE path_day_id IN (
    SELECT id FROM public.path_days WHERE path_id = p_path_id
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rollback_single_path IS 'Rolls back migration for a single path by ID';

-- Function to rollback a single day
CREATE OR REPLACE FUNCTION rollback_single_day(p_day_id UUID)
RETURNS TABLE (
  path_day_id UUID,
  activities_deleted INT,
  content_deleted INT,
  assessments_deleted INT,
  quiz_questions_deleted INT,
  status TEXT,
  error_message TEXT
) AS $$
DECLARE
  activities_count INT := 0;
  content_count INT := 0;
  assessment_count INT := 0;
  quiz_count INT := 0;
BEGIN
  -- Check if day is migrated
  IF NOT EXISTS (
    SELECT 1 FROM public.path_days
    WHERE id = p_day_id AND migrated_from_nodes = true
  ) THEN
    path_day_id := p_day_id;
    activities_deleted := 0;
    content_deleted := 0;
    assessments_deleted := 0;
    quiz_questions_deleted := 0;
    status := 'not_migrated';
    error_message := 'Day is not migrated';
    RETURN NEXT;
    RETURN;
  END IF;

  BEGIN
    -- Count quiz questions
    SELECT COUNT(*)::INT INTO quiz_count
    FROM public.path_quiz_questions pqq
    JOIN public.path_assessments pa ON pa.id = pqq.assessment_id
    JOIN public.path_activities pact ON pact.id = pa.activity_id
    WHERE pact.path_day_id = p_day_id;

    -- Delete quiz questions
    DELETE FROM public.path_quiz_questions
    WHERE assessment_id IN (
      SELECT pa.id FROM public.path_assessments pa
      JOIN public.path_activities pact ON pact.id = pa.activity_id
      WHERE pact.path_day_id = p_day_id
    );

    -- Count and delete assessments
    SELECT COUNT(*)::INT INTO assessment_count
    FROM public.path_assessments pa
    JOIN public.path_activities pact ON pact.id = pa.activity_id
    WHERE pact.path_day_id = p_day_id;

    DELETE FROM public.path_assessments
    WHERE activity_id IN (
      SELECT id FROM public.path_activities WHERE path_day_id = p_day_id
    );

    -- Count and delete content
    SELECT COUNT(*)::INT INTO content_count
    FROM public.path_content pc
    WHERE pc.activity_id IN (
      SELECT id FROM public.path_activities WHERE path_day_id = p_day_id
    );

    DELETE FROM public.path_content
    WHERE activity_id IN (
      SELECT id FROM public.path_activities WHERE path_day_id = p_day_id
    );

    -- Count and delete activities
    SELECT COUNT(*)::INT INTO activities_count
    FROM public.path_activities WHERE path_day_id = p_day_id;

    DELETE FROM public.path_activities WHERE path_day_id = p_day_id;

    -- Reset migration flags
    UPDATE public.path_days
    SET
      migrated_from_nodes = false,
      migration_completed_at = NULL
    WHERE id = p_day_id;

    -- Return stats
    path_day_id := p_day_id;
    activities_deleted := activities_count;
    content_deleted := content_count;
    assessments_deleted := assessment_count;
    quiz_questions_deleted := quiz_count;
    status := 'rolled_back';
    error_message := NULL;

    RETURN NEXT;

  EXCEPTION
    WHEN OTHERS THEN
      path_day_id := p_day_id;
      activities_deleted := activities_count;
      content_deleted := content_count;
      assessments_deleted := assessment_count;
      quiz_questions_deleted := quiz_count;
      status := 'error';
      error_message := SQLERRM;

      RETURN NEXT;
  END;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rollback_single_day IS 'Rolls back migration for a single day by ID';

-- =====================================================
-- VERIFICATION FUNCTIONS
-- =====================================================

-- Function to verify migration integrity
CREATE OR REPLACE FUNCTION verify_pathlab_migration()
RETURNS TABLE (
  path_day_id UUID,
  day_number INT,
  has_node_ids BOOLEAN,
  node_count INT,
  activity_count INT,
  is_migrated BOOLEAN,
  integrity_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pd.id AS path_day_id,
    pd.day_number,
    (pd.node_ids IS NOT NULL AND array_length(pd.node_ids, 1) > 0) AS has_node_ids,
    COALESCE(array_length(pd.node_ids, 1), 0) AS node_count,
    (SELECT COUNT(*)::INT FROM public.path_activities pa WHERE pa.path_day_id = pd.id) AS activity_count,
    COALESCE(pd.migrated_from_nodes, false) AS is_migrated,
    CASE
      WHEN pd.migrated_from_nodes = true AND (SELECT COUNT(*) FROM public.path_activities pa WHERE pa.path_day_id = pd.id) > 0 THEN 'valid_migration'
      WHEN pd.migrated_from_nodes = false AND pd.node_ids IS NOT NULL AND array_length(pd.node_ids, 1) > 0 THEN 'ready_for_migration'
      WHEN pd.migrated_from_nodes = true AND (SELECT COUNT(*) FROM public.path_activities pa WHERE pa.path_day_id = pd.id) = 0 THEN 'INVALID_migrated_no_activities'
      WHEN pd.migrated_from_nodes = false AND (SELECT COUNT(*) FROM public.path_activities pa WHERE pa.path_day_id = pd.id) > 0 THEN 'INVALID_has_activities_not_marked'
      ELSE 'unknown'
    END AS integrity_status
  FROM public.path_days pd
  ORDER BY pd.path_id, pd.day_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_pathlab_migration IS 'Verifies migration integrity and identifies potential issues';
