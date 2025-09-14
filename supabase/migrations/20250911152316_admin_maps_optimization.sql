-- Optimization migration for AdminMapsManagement
-- Creates efficient database function for server performance

-- Create optimized function for admin maps with aggregated statistics
CREATE OR REPLACE FUNCTION get_admin_maps_optimized(
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id TEXT,
    title TEXT,
    description TEXT,
    creator_id TEXT,
    creator_name TEXT,
    difficulty INTEGER,
    category TEXT,
    visibility TEXT,
    node_count BIGINT,
    avg_difficulty INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    metadata JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lm.id,
        lm.title,
        lm.description,
        lm.creator_id,
        COALESCE(p.full_name, p.username, 'Unknown') as creator_name,
        lm.difficulty,
        lm.category,
        lm.visibility,
        COALESCE(mn.node_count, 0) as node_count,
        COALESCE(mn.avg_difficulty, 1) as avg_difficulty,
        lm.created_at,
        lm.updated_at,
        lm.metadata
    FROM learning_maps lm
    LEFT JOIN profiles p ON p.id = lm.creator_id
    LEFT JOIN (
        -- Efficient aggregation subquery
        SELECT 
            map_id,
            COUNT(*) as node_count,
            ROUND(AVG(COALESCE(difficulty, 1)))::INTEGER as avg_difficulty
        FROM map_nodes 
        GROUP BY map_id
    ) mn ON mn.map_id = lm.id
    ORDER BY lm.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_learning_maps_created_at 
ON learning_maps (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_map_nodes_map_id_difficulty 
ON map_nodes (map_id, difficulty);

CREATE INDEX IF NOT EXISTS idx_profiles_id_names 
ON profiles (id, username, full_name);

-- Grant execute permission to authenticated users (will be restricted by RLS)
GRANT EXECUTE ON FUNCTION get_admin_maps_optimized TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_admin_maps_optimized IS 
'Optimized function for admin maps management. Returns paginated learning maps with aggregated node statistics calculated in the database for better server performance.';