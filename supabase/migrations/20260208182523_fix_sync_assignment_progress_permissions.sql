-- Fix permission issues with sync_assignment_progress function
-- The function needs SECURITY DEFINER to access assignment_enrollments table
-- when triggered by service role operations

CREATE OR REPLACE FUNCTION "public"."sync_assignment_progress"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER  -- This makes the function run with owner (postgres) privileges
SET search_path = public
AS $$
DECLARE
    affected_enrollments RECORD;
    completion_data JSON;
BEGIN
    -- Find all enrollments that include this node
    FOR affected_enrollments IN
        SELECT DISTINCT ae.id as enrollment_id, ae.assignment_id, ae.user_id
        FROM public.assignment_enrollments ae
        JOIN public.assignment_nodes an ON ae.assignment_id = an.assignment_id
        WHERE an.node_id = COALESCE(NEW.node_id, OLD.node_id)
        AND ae.user_id = COALESCE(NEW.user_id, OLD.user_id)
    LOOP
        -- Calculate new completion data
        SELECT public.calculate_assignment_completion(affected_enrollments.enrollment_id) INTO completion_data;

        -- Update the enrollment record
        UPDATE public.assignment_enrollments
        SET
            completion_percentage = (completion_data->>'completion_percentage')::INTEGER,
            total_points_earned = (completion_data->>'total_points_earned')::INTEGER,
            total_points_possible = (completion_data->>'total_points_possible')::INTEGER,
            status = CASE
                WHEN (completion_data->>'completion_percentage')::INTEGER = 100 AND completed_at IS NULL THEN 'completed'
                WHEN (completion_data->>'completion_percentage')::INTEGER > 0 AND started_at IS NULL THEN 'in_progress'
                ELSE status
            END,
            started_at = CASE
                WHEN (completion_data->>'completion_percentage')::INTEGER > 0 AND started_at IS NULL THEN now()
                ELSE started_at
            END,
            completed_at = CASE
                WHEN (completion_data->>'completion_percentage')::INTEGER = 100 AND completed_at IS NULL THEN now()
                WHEN (completion_data->>'completion_percentage')::INTEGER < 100 THEN NULL
                ELSE completed_at
            END
        WHERE id = affected_enrollments.enrollment_id;
    END LOOP;

    RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION "public"."sync_assignment_progress"() IS 'Trigger function to automatically sync assignment progress when node progress changes. Uses SECURITY DEFINER to access assignment_enrollments table with owner privileges.';
