-- Seed Leaderboard System: Aggregate submission grades into leaderboard data
-- This migration creates functions to calculate leaderboard rankings and percentiles
-- by aggregating points_awarded from the existing submission_grades table

-- Function: Get leaderboard for a seed room
-- Aggregates all points from submission grades for students in the seed room
-- Only includes students who have completed the seed
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
) AS $$
BEGIN
    RETURN QUERY
    WITH seed_info AS (
        -- Get the seed and map associated with this room
        SELECT sr.seed_id, s.map_id
        FROM seed_rooms sr
        JOIN seeds s ON s.id = sr.seed_id
        WHERE sr.id = p_room_id
    ),
    completed_users AS (
        -- Only include users who have completed this seed
        SELECT DISTINCT src.user_id
        FROM seed_room_completions src
        WHERE src.room_id = p_room_id
    ),
    user_points AS (
        -- Aggregate points from all submissions for this seed's map
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
RETURNS BIGINT AS $$
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
-- Percentile is calculated only among students who completed the seed
-- Returns 0-100 where 100 means top performer
CREATE OR REPLACE FUNCTION get_user_seed_percentile(
    p_user_id UUID,
    p_room_id UUID
)
RETURNS TABLE (
    total_points BIGINT,
    percentile NUMERIC,
    rank BIGINT,
    total_completers BIGINT
) AS $$
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
            -- Calculate percentile: what percentage of students this user beat
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
    
    -- If user not found in completions, return zeros
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::BIGINT, 0::NUMERIC, 0::BIGINT, 0::BIGINT;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_submission_grades_points ON submission_grades(points_awarded) WHERE points_awarded IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seed_room_completions_room_user ON seed_room_completions(room_id, user_id);

-- Comments for documentation
COMMENT ON FUNCTION get_seed_room_leaderboard IS 'Returns top scoring students in a seed room based on aggregated submission grades. Only includes students who completed the seed.';
COMMENT ON FUNCTION get_user_seed_total_points IS 'Returns total points awarded to a user across all graded submissions in a seed room.';
COMMENT ON FUNCTION get_user_seed_percentile IS 'Calculates user''s percentile ranking among all students who completed the seed. 100 = top performer, 0 = lowest.';
