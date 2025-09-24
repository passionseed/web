-- Performance optimization indexes for learning maps queries
-- This migration adds indexes to speed up the common queries in getMapsWithStats

-- Index for learning_maps ordering and visibility filtering
CREATE INDEX IF NOT EXISTS idx_learning_maps_visibility_created_at 
ON learning_maps (visibility, created_at DESC);

-- Index for learning_maps creator filtering
CREATE INDEX IF NOT EXISTS idx_learning_maps_creator_created_at 
ON learning_maps (creator_id, created_at DESC);

-- Index for map_nodes aggregation queries (node count, difficulty avg)
CREATE INDEX IF NOT EXISTS idx_map_nodes_map_id_difficulty 
ON map_nodes (map_id, difficulty);

-- Index for user_map_enrollments filtering
CREATE INDEX IF NOT EXISTS idx_user_map_enrollments_user_map 
ON user_map_enrollments (user_id, map_id);

-- Index for classroom_memberships user lookup
CREATE INDEX IF NOT EXISTS idx_classroom_memberships_user_id 
ON classroom_memberships (user_id);

-- Index for team_memberships user lookup
CREATE INDEX IF NOT EXISTS idx_team_memberships_user_id_left_at 
ON team_memberships (user_id, left_at);

-- Index for classroom_team_maps team filtering
CREATE INDEX IF NOT EXISTS idx_classroom_team_maps_team_id 
ON classroom_team_maps (team_id);

-- Composite index for learning_maps with all common filters
CREATE INDEX IF NOT EXISTS idx_learning_maps_composite 
ON learning_maps (visibility, creator_id, created_at DESC);

-- Comment on the indexes for documentation
COMMENT ON INDEX idx_learning_maps_visibility_created_at IS 
'Optimizes queries filtering by visibility and ordering by created_at';

COMMENT ON INDEX idx_learning_maps_creator_created_at IS 
'Optimizes queries filtering by creator_id and ordering by created_at';

COMMENT ON INDEX idx_map_nodes_map_id_difficulty IS 
'Optimizes aggregation queries for node counts and average difficulty';

COMMENT ON INDEX idx_user_map_enrollments_user_map IS 
'Optimizes user enrollment status lookups';

COMMENT ON INDEX idx_learning_maps_composite IS 
'Composite index for the most common learning_maps query patterns';