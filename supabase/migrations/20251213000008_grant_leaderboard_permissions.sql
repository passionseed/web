-- Add GRANT permissions for leaderboard functions
-- These were missing from the original migration

GRANT EXECUTE ON FUNCTION get_seed_room_leaderboard(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_seed_room_leaderboard(UUID, INT) TO anon;

GRANT EXECUTE ON FUNCTION get_user_seed_total_points(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_seed_total_points(UUID, UUID) TO anon;

GRANT EXECUTE ON FUNCTION get_user_seed_percentile(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_seed_percentile(UUID, UUID) TO anon;
