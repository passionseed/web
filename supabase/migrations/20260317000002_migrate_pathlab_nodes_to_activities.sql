-- =====================================================
-- PATHLAB MIGRATION FUNCTION
-- Converts node_ids references to path_activities
-- This function migrates existing PathLab data from
-- the maps/nodes system to the new PathLab content system
-- =====================================================

CREATE OR REPLACE FUNCTION migrate_pathlab_nodes_to_activities()
RETURNS TABLE (
  path_day_id UUID,
  activities_created INT,
  content_items_migrated INT,
  assessments_migrated INT,
  quiz_questions_migrated INT,
  status TEXT,
  error_message TEXT
) AS $$
DECLARE
  day_record RECORD;
  current_node_id UUID;
  new_activity_id UUID;
  new_assessment_id UUID;
  content_record RECORD;
  assessment_record RECORD;
  question_record RECORD;
  activities_count INT := 0;
  content_count INT := 0;
  assessment_count INT := 0;
  quiz_count INT := 0;
  node_title TEXT;
  node_instructions TEXT;
  display_idx INT;
BEGIN
  -- Loop through all path_days that haven't been migrated
  FOR day_record IN
    SELECT * FROM public.path_days
    WHERE migrated_from_nodes = false OR migrated_from_nodes IS NULL
    ORDER BY path_id, day_number
  LOOP
    -- Reset counters for this day
    activities_count := 0;
    content_count := 0;
    assessment_count := 0;
    quiz_count := 0;
    display_idx := 0;

    BEGIN
      -- Process each node_id in the array
      IF day_record.node_ids IS NOT NULL THEN
        FOREACH current_node_id IN ARRAY day_record.node_ids
        LOOP
          -- Get node details
          SELECT title, instructions INTO node_title, node_instructions
          FROM public.map_nodes WHERE id = current_node_id;

          IF node_title IS NOT NULL THEN
            -- Create path_activity for this node
            INSERT INTO public.path_activities (
              path_day_id,
              title,
              instructions,
              activity_type,
              display_order,
              is_required,
              created_at,
              updated_at
            ) VALUES (
              day_record.id,
              node_title,
              COALESCE(node_instructions, ''),
              'learning', -- Default activity type
              display_idx,
              true, -- All migrated activities are required
              now(),
              now()
            ) RETURNING id INTO new_activity_id;

            activities_count := activities_count + 1;
            display_idx := display_idx + 1;

            -- Migrate node_content to path_content
            FOR content_record IN
              SELECT * FROM public.node_content
              WHERE node_content.node_id = current_node_id
              ORDER BY display_order
            LOOP
              INSERT INTO public.path_content (
                activity_id,
                content_type,
                content_title,
                content_url,
                content_body,
                display_order,
                metadata,
                created_at
              ) VALUES (
                new_activity_id,
                content_record.content_type,
                content_record.content_title,
                content_record.content_url,
                content_record.content_body,
                content_record.display_order,
                COALESCE(content_record.metadata, '{}'::jsonb),
                content_record.created_at
              );

              content_count := content_count + 1;
            END LOOP;

            -- Migrate node_assessments to path_assessments
            FOR assessment_record IN
              SELECT * FROM public.node_assessments
              WHERE node_assessments.node_id = current_node_id
            LOOP
              -- Insert assessment
              INSERT INTO public.path_assessments (
                activity_id,
                assessment_type,
                points_possible,
                is_graded,
                metadata,
                created_at,
                updated_at
              ) VALUES (
                new_activity_id,
                assessment_record.assessment_type,
                assessment_record.points_possible,
                COALESCE(assessment_record.is_graded, false),
                COALESCE(assessment_record.metadata, '{}'::jsonb),
                now(),
                now()
              ) RETURNING id INTO new_assessment_id;

              assessment_count := assessment_count + 1;

              -- Migrate quiz questions if quiz type
              IF assessment_record.assessment_type = 'quiz' THEN
                FOR question_record IN
                  SELECT * FROM public.quiz_questions
                  WHERE assessment_id = assessment_record.id
                  ORDER BY created_at
                LOOP
                  INSERT INTO public.path_quiz_questions (
                    assessment_id,
                    question_text,
                    options,
                    correct_option,
                    created_at
                  ) VALUES (
                    new_assessment_id,
                    question_record.question_text,
                    question_record.options,
                    question_record.correct_option,
                    question_record.created_at
                  );

                  quiz_count := quiz_count + 1;
                END LOOP;
              END IF;
            END LOOP;
          ELSE
            -- Node not found, log warning but continue
            RAISE NOTICE 'Node % not found for path_day %, skipping', current_node_id, day_record.id;
          END IF;
        END LOOP;
      END IF;

      -- Mark day as migrated
      UPDATE public.path_days
      SET
        migrated_from_nodes = true,
        migration_completed_at = now()
      WHERE id = day_record.id;

      -- Return stats for this day
      path_day_id := day_record.id;
      activities_created := activities_count;
      content_items_migrated := content_count;
      assessments_migrated := assessment_count;
      quiz_questions_migrated := quiz_count;
      status := 'success';
      error_message := NULL;

      RETURN NEXT;

    EXCEPTION
      WHEN OTHERS THEN
        -- Catch any errors and return them
        path_day_id := day_record.id;
        activities_created := activities_count;
        content_items_migrated := content_count;
        assessments_migrated := assessment_count;
        quiz_questions_migrated := quiz_count;
        status := 'error';
        error_message := SQLERRM;

        RETURN NEXT;

        -- Continue to next day instead of aborting entire migration
        CONTINUE;
    END;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_pathlab_nodes_to_activities IS 'Migrates existing PathLab data from node_ids to path_activities system. Returns stats for each migrated day.';

-- =====================================================
-- MIGRATION HELPER FUNCTIONS
-- =====================================================

-- Function to check migration status
CREATE OR REPLACE FUNCTION get_pathlab_migration_status()
RETURNS TABLE (
  total_days BIGINT,
  migrated_days BIGINT,
  unmigrated_days BIGINT,
  migration_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_days,
    COUNT(*) FILTER (WHERE migrated_from_nodes = true) AS migrated_days,
    COUNT(*) FILTER (WHERE migrated_from_nodes = false OR migrated_from_nodes IS NULL) AS unmigrated_days,
    ROUND(
      (COUNT(*) FILTER (WHERE migrated_from_nodes = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS migration_percentage
  FROM public.path_days;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pathlab_migration_status IS 'Returns migration status statistics for PathLab days';

-- Function to get detailed migration info for a specific path
CREATE OR REPLACE FUNCTION get_path_migration_details(p_path_id UUID)
RETURNS TABLE (
  day_number INT,
  day_id UUID,
  is_migrated BOOLEAN,
  node_count INT,
  activity_count INT,
  migration_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pd.day_number,
    pd.id,
    COALESCE(pd.migrated_from_nodes, false) AS is_migrated,
    COALESCE(array_length(pd.node_ids, 1), 0) AS node_count,
    (SELECT COUNT(*)::INT FROM public.path_activities pa WHERE pa.path_day_id = pd.id) AS activity_count,
    pd.migration_completed_at
  FROM public.path_days pd
  WHERE pd.path_id = p_path_id
  ORDER BY pd.day_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_path_migration_details IS 'Returns detailed migration information for a specific path';

-- Function to migrate a single path
CREATE OR REPLACE FUNCTION migrate_single_path(p_path_id UUID)
RETURNS TABLE (
  path_day_id UUID,
  activities_created INT,
  content_items_migrated INT,
  assessments_migrated INT,
  quiz_questions_migrated INT,
  status TEXT,
  error_message TEXT
) AS $$
DECLARE
  day_record RECORD;
BEGIN
  -- Temporarily set migrated_from_nodes to false for this path's days
  UPDATE public.path_days
  SET migrated_from_nodes = false
  WHERE path_id = p_path_id;

  -- Run migration for this path only
  RETURN QUERY
  SELECT * FROM migrate_pathlab_nodes_to_activities()
  WHERE path_day_id IN (
    SELECT id FROM public.path_days WHERE path_id = p_path_id
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_single_path IS 'Migrates a single path by ID, useful for testing or gradual rollout';
