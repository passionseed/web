import { createClient } from "@/utils/supabase/client";
import type { LeaderboardEntry, PercentileData } from "@/types/seeds";

/**
 * Get leaderboard for a seed room
 * Returns top scoring students based on aggregated submission grades
 */
export async function getSeedRoomLeaderboard(
    roomId: string,
    limit: number = 10
): Promise<LeaderboardEntry[]> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_seed_room_leaderboard", {
        p_room_id: roomId,
        p_limit: limit,
    });

    if (error) {
        console.error("Error fetching seed room leaderboard:", {
            message: error.message,
            code: error.code,
            details: error.details,
        });
        return [];
    }

    return (data as LeaderboardEntry[]) || [];
}

/**
 * Get total points for a user in a seed room
 */
export async function getUserSeedTotalPoints(
    userId: string,
    roomId: string
): Promise<number> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_user_seed_total_points", {
        p_user_id: userId,
        p_room_id: roomId,
    });

    if (error) {
        console.error("Error fetching user seed total points:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
        });
        return 0;
    }

    return data || 0;
}

/**
 * Get percentile data for a user in a seed room
 * Only counts students who have completed the seed
 */
export async function getUserSeedPercentile(
    userId: string,
    roomId: string
): Promise<PercentileData | null> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_user_seed_percentile", {
        p_user_id: userId,
        p_room_id: roomId,
    });

    if (error) {
        console.error("Error fetching user seed percentile:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
        });
        return null;
    }

    // The function returns an array with one row
    const result = data?.[0];
    if (!result) return null;

    return {
        total_points: result.total_points,
        percentile: parseFloat(result.percentile),
        rank: result.rank,
        total_completers: result.total_completers,
    };
}
