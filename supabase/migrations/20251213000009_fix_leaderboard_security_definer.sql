-- Fix: Make leaderboard functions run with SECURITY DEFINER
-- This allows them to bypass RLS policies and access all necessary tables

-- Drop and recreate functions with SECURITY DEFINER
DROP FUNCTION IF EXISTS get_seed_room_leaderboard(UUID, INT);
DROP FUNCTION IF EXISTS get_user_seed_total_points(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_seed_percentile(UUID, UUID);

-- Function: Get leaderboard for a seed room
CREATE OR REPLACE FUNCTION get_seed_room_leaderboard(
    p_room_id UUID,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    full_name TEXT,
    total_points BIGINT,
    rank BIGINT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH seed_info AS (
        SELECT sr.seed_id, s.map_id
        FROM seed_rooms sr
        JOIN seeds s ON s.id = sr.seed_id
        WHERE sr.id = p_room_id
    ),
    completed_users AS (
        SELECT DISTINCT src.user_id
        FROM seed_room_completions src
        WHERE src.room_id = p_room_id
    ),
    user_points AS (
        SELECT 
            snp.user_id,
            COALESCE(SUM(sg.points_awarded), 0) as total_points
        FROM student_node_progress snp
        JOIN map_nodes mn ON mn.id = snp.node_id
        JOIN seed_info si ON si.map_id = mn.map_id
        JOIN assessment_submissions asub ON asub.progress_id = snp.id
        LEFT JOIN submission_grades sg ON sg.submission_id = asub.id
        WHERE snp.user_id IN (SELECT user_id FROM completed_users)
        GROUP BY snp.user_id
    ),
    ranked_users AS (
        SELECT 
            up.user_id,
            up.total_points,
            RANK() OVER (ORDER BY up.total_points DESC) as rank
        FROM user_points up
    )
    SELECT 
        ru.user_id,
        p.username,
        p.full_name,
        ru.total_points,
        ru.rank
    FROM ranked_users ru
    JOIN profiles p ON p.id = ru.user_id
    ORDER BY ru.rank ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get total points for a specific user in a seed room
CREATE OR REPLACE FUNCTION get_user_seed_total_points(
    p_user_id UUID,
    p_room_id UUID
)
RETURNS BIGINT 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_points BIGINT;
BEGIN
    WITH seed_info AS (
        SELECT sr.seed_id, s.map_id
        FROM seed_rooms sr
        JOIN seeds s ON s.id = sr.seed_id
        WHERE sr.id = p_room_id
    )
    SELECT COALESCE(SUM(sg.points_awarded), 0)
    INTO v_total_points
    FROM student_node_progress snp
    JOIN map_nodes mn ON mn.id = snp.node_id
    JOIN seed_info si ON si.map_id = mn.map_id
    JOIN assessment_submissions asub ON asub.progress_id = snp.id
    LEFT JOIN submission_grades sg ON sg.submission_id = asub.id
    WHERE snp.user_id = p_user_id;
    
    RETURN v_total_points;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Calculate percentile for a user in a seed room
CREATE OR REPLACE FUNCTION get_user_seed_percentile(
    p_user_id UUID,
    p_room_id UUID
)
RETURNS TABLE (
    total_points BIGINT,
    percentile NUMERIC,
    rank BIGINT,
    total_completers BIGINT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH seed_info AS (
        SELECT sr.seed_id, s.map_id
        FROM seed_rooms sr
        JOIN seeds s ON s.id = sr.seed_id
        WHERE sr.id = p_room_id
    ),
    completed_users AS (
        SELECT DISTINCT src.user_id
        FROM seed_room_completions src
        WHERE src.room_id = p_room_id
    ),
    user_points AS (
        SELECT 
            snp.user_id,
            COALESCE(SUM(sg.points_awarded), 0) as points
        FROM student_node_progress snp
        JOIN map_nodes mn ON mn.id = snp.node_id
        JOIN seed_info si ON si.map_id = mn.map_id
        JOIN assessment_submissions asub ON asub.progress_id = snp.id
        LEFT JOIN submission_grades sg ON sg.submission_id = asub.id
        WHERE snp.user_id IN (SELECT user_id FROM completed_users)
        GROUP BY snp.user_id
    ),
    ranked_users AS (
        SELECT 
            user_id,
            points,
            RANK() OVER (ORDER BY points DESC) as user_rank,
            COUNT(*) OVER () as total_users
        FROM user_points
    ),
    target_user AS (
        SELECT 
            ru.points,
            ru.user_rank,
            ru.total_users,
            CASE 
                WHEN ru.total_users = 1 THEN 100.0
                ELSE ROUND(((ru.total_users - ru.user_rank)::NUMERIC / (ru.total_users - 1)::NUMERIC) * 100, 1)
            END as percentile_score
        FROM ranked_users ru
        WHERE ru.user_id = p_user_id
    )
    SELECT 
        tu.points as total_points,
        COALESCE(tu.percentile_score, 0) as percentile,
        COALESCE(tu.user_rank, 0) as rank,
        COALESCE(tu.total_users, 0) as total_completers
    FROM target_user tu;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::BIGINT, 0::NUMERIC, 0::BIGINT, 0::BIGINT;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION get_seed_room_leaderboard(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_seed_room_leaderboard(UUID, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_seed_total_points(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_seed_total_points(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_user_seed_percentile(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_seed_percentile(UUID, UUID) TO anon;

-- Add comments
COMMENT ON FUNCTION get_seed_room_leaderboard IS 'Returns top scoring students in a seed room. Runs with SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION get_user_seed_total_points IS 'Returns total points for a user in a seed room. Runs with SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION get_user_seed_percentile IS 'Calculates percentile ranking for a user. Runs with SECURITY DEFINER to bypass RLS.';
