-- Create delete_learning_map_cascade RPC function for proper deletion of learning maps
-- This function ensures all related data is deleted in the correct order

BEGIN;

CREATE OR REPLACE FUNCTION delete_learning_map_cascade(map_uuid UUID)
RETURNS JSON AS $$
DECLARE
    deleted_counts JSON;
    node_ids UUID[];
    assessment_ids UUID[];
    submission_ids UUID[];
    group_ids UUID[];
BEGIN
    -- Get all node IDs for this map
    SELECT ARRAY(
        SELECT id FROM map_nodes WHERE map_id = map_uuid
    ) INTO node_ids;
    
    -- Get all assessment IDs for these nodes
    SELECT ARRAY(
        SELECT id FROM node_assessments WHERE node_id = ANY(node_ids)
    ) INTO assessment_ids;
    
    -- Get all submission IDs for these assessments
    SELECT ARRAY(
        SELECT id FROM assessment_submissions WHERE assessment_id = ANY(assessment_ids)
    ) INTO submission_ids;
    
    -- Get all group IDs for these assessments
    SELECT ARRAY(
        SELECT id FROM assessment_groups WHERE assessment_id = ANY(assessment_ids)
    ) INTO group_ids;
    
    -- Delete in correct order to avoid foreign key violations
    
    -- 1. Delete assessment group members
    DELETE FROM assessment_group_members WHERE group_id = ANY(group_ids);
    
    -- 2. Delete submission grades
    DELETE FROM submission_grades WHERE submission_id = ANY(submission_ids);
    
    -- 3. Delete assessment submissions
    DELETE FROM assessment_submissions WHERE id = ANY(submission_ids);
    
    -- 4. Delete assessment groups
    DELETE FROM assessment_groups WHERE id = ANY(group_ids);
    
    -- 5. Delete quiz questions
    DELETE FROM quiz_questions WHERE assessment_id = ANY(assessment_ids);
    
    -- 6. Delete node assessments
    DELETE FROM node_assessments WHERE id = ANY(assessment_ids);
    
    -- 7. Delete node submissions
    DELETE FROM node_submissions WHERE node_id = ANY(node_ids);
    
    -- 8. Delete student node progress
    DELETE FROM student_node_progress WHERE node_id = ANY(node_ids);
    
    -- 9. Delete node content
    DELETE FROM node_content WHERE node_id = ANY(node_ids);
    
    -- 10. Delete node paths
    DELETE FROM node_paths 
    WHERE source_node_id = ANY(node_ids) OR destination_node_id = ANY(node_ids);
    
    -- 11. Delete map nodes
    DELETE FROM map_nodes WHERE id = ANY(node_ids);
    
    -- 12. Delete classroom map features
    DELETE FROM classroom_map_features WHERE map_id = map_uuid;
    
    -- 13. Delete classroom maps (links)
    DELETE FROM classroom_maps WHERE map_id = map_uuid;
    
    -- 14. Delete user map enrollments
    DELETE FROM user_map_enrollments WHERE map_id = map_uuid;
    
    -- 15. Delete cohort map enrollments
    DELETE FROM cohort_map_enrollments WHERE map_id = map_uuid;
    
    -- 16. Finally delete the learning map itself
    DELETE FROM learning_maps WHERE id = map_uuid;
    
    -- Return success
    SELECT json_build_object(
        'success', true,
        'deleted_map_id', map_uuid,
        'node_count', array_length(node_ids, 1),
        'assessment_count', array_length(assessment_ids, 1)
    ) INTO deleted_counts;
    
    RETURN deleted_counts;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error details
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_learning_map_cascade(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION delete_learning_map_cascade(UUID) IS 
'Safely deletes a learning map and all related data in the correct order to avoid foreign key violations. Only admins and map creators can delete maps (enforced by application logic).';

COMMIT;