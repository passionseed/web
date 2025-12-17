import { createClient } from "@/utils/supabase/client";
import type { SeedBadgeConfig, UserBadge, BadgeData, UserBadgeWithSeed, BadgeStats } from "@/types/badges";

/**
 * Get badge configuration for a seed
 */
export async function getBadgeConfig(seedId: string) {
    // Validate seedId
    if (!seedId || seedId === "") {
        return null;
    }

    const supabase = createClient();

    const { data, error } = await supabase
        .from("seed_badges")
        .select("*")
        .eq("seed_id", seedId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching badge config:", error);
        return null;
    }

    return data as SeedBadgeConfig | null;
}

/**
 * Create or update badge configuration for a seed
 */
export async function upsertBadgeConfig(
    seedId: string,
    config: Partial<Omit<SeedBadgeConfig, "id" | "seed_id" | "created_at" | "updated_at">>
) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("seed_badges")
        .upsert({
            seed_id: seedId,
            ...config,
        }, {
            onConflict: "seed_id",
        })
        .select()
        .single();

    if (error) {
        console.error("Error upserting badge config:", error);
        throw error;
    }

    return data as SeedBadgeConfig;
}

/**
 * Award badge to a user
 */
export async function awardBadge(
    userId: string,
    seedId: string,
    seedTitle: string,
    roomId: string | null,
    completionId: string | null,
    completionDate: string
): Promise<UserBadge | null> {
    const supabase = createClient();

    // Get badge config
    const badgeConfig = await getBadgeConfig(seedId);

    // Build badge data
    const badgeData: BadgeData = {
        badge_name: badgeConfig?.badge_name || `${seedTitle} - Completed`,
        badge_description: badgeConfig?.badge_description || null,
        badge_image_url: badgeConfig?.badge_image_url || null,
        primary_color: badgeConfig?.primary_color || "#f59e0b",
        secondary_color: badgeConfig?.secondary_color || "#f97316",
        seed_title: seedTitle,
        seed_id: seedId,
        completion_date: completionDate,
        room_id: roomId,
    };

    // Call database function to award badge
    const { data, error } = await supabase.rpc("award_badge_to_user", {
        p_user_id: userId,
        p_seed_id: seedId,
        p_room_id: roomId,
        p_completion_id: completionId,
        p_badge_data: badgeData,
    });

    if (error) {
        console.error("Error awarding badge:", error);
        return null;
    }

    // Fetch the created badge
    const { data: badge, error: fetchError } = await supabase
        .from("user_badges")
        .select("*")
        .eq("id", data)
        .single();

    if (fetchError) {
        console.error("Error fetching awarded badge:", fetchError);
        return null;
    }

    return badge as UserBadge;
}

/**
 * Check if user has earned a specific badge
 */
export async function hasUserEarnedBadge(userId: string, seedId: string): Promise<boolean> {
    const supabase = createClient();

    const { data } = await supabase.rpc("has_user_earned_badge", {
        p_user_id: userId,
        p_seed_id: seedId,
    });

    return data || false;
}

/**
 * Get all badges earned by a user
 */
export async function getUserBadges(userId: string): Promise<UserBadgeWithSeed[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("user_badges")
        .select(`
            *,
            seed:seed_id (
                id,
                title,
                cover_image_url
            )
        `)
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });

    if (error) {
        console.error("Error fetching user badges:", error);
        return [];
    }

    return (data as any[]) || [];
}

/**
 * Get a specific badge with seed info
 */
export async function getBadgeWithSeed(badgeId: string): Promise<UserBadgeWithSeed | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("user_badges")
        .select(`
            *,
            seed:seed_id (
                id,
                title,
                cover_image_url
            )
        `)
        .eq("id", badgeId)
        .single();

    if (error) {
        console.error("Error fetching badge:", error);
        return null;
    }

    return data as any;
}

/**
 * Get user badge count
 */
export async function getUserBadgeCount(userId: string): Promise<number> {
    const supabase = createClient();

    const { data } = await supabase.rpc("get_user_badge_count", {
        p_user_id: userId,
    });

    return data || 0;
}

/**
 * Get badge statistics for a seed
 */
export async function getSeedBadgeStats(seedId: string): Promise<BadgeStats | null> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_seed_badge_stats", {
        p_seed_id: seedId,
    });

    if (error) {
        console.error("Error fetching badge stats:", error);
        return null;
    }

    return data?.[0] || null;
}

/**
 * Get recent badges across all users (for leaderboard/activity feed)
 */
export async function getRecentBadges(limit: number = 10): Promise<UserBadgeWithSeed[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("user_badges")
        .select(`
            *,
            seed:seed_id (
                id,
                title,
                cover_image_url
            ),
            profile:user_id (
                id,
                full_name,
                username,
                avatar_url
            )
        `)
        .order("earned_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching recent badges:", error);
        return [];
    }

    return (data as any[]) || [];
}

/**
 * Delete badge configuration (admin only)
 */
export async function deleteBadgeConfig(seedId: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("seed_badges")
        .delete()
        .eq("seed_id", seedId);

    if (error) {
        console.error("Error deleting badge config:", error);
        throw error;
    }
}

/**
 * Mark badge as seen
 */
export async function markBadgeSeen(badgeId: string) {
    const supabase = createClient();

    const { error } = await supabase
        .from("user_badges")
        .update({ is_seen: true })
        .eq("id", badgeId);

    if (error) {
        console.error("Error marking badge as seen:", error);
    }
}
